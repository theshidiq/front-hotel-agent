import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

// Message types matching the original Go WebSocket protocol
export enum MessageType {
  // Connection
  CONNECTION_ACK = 'CONNECTION_ACK',
  ERROR = 'ERROR',
  PING = 'PING',
  PONG = 'PONG',

  // Sync
  SYNC_REQUEST = 'SYNC_REQUEST',
  SYNC_RESPONSE = 'SYNC_RESPONSE',

  // Staff operations
  STAFF_CREATE = 'STAFF_CREATE',
  STAFF_UPDATE = 'STAFF_UPDATE',
  STAFF_DELETE = 'STAFF_DELETE',
  STAFF_REORDER = 'STAFF_REORDER',
  STAFF_SYNC = 'STAFF_SYNC',

  // Schedule operations
  CELL_UPDATE = 'CELL_UPDATE',
  BULK_CELL_UPDATE = 'BULK_CELL_UPDATE',
  SCHEDULE_SYNC = 'SCHEDULE_SYNC',

  // Optimization
  OPTIMIZE_START = 'OPTIMIZE_START',
  OPTIMIZE_PROGRESS = 'OPTIMIZE_PROGRESS',
  OPTIMIZE_COMPLETE = 'OPTIMIZE_COMPLETE',
  OPTIMIZE_ERROR = 'OPTIMIZE_ERROR',

  // Subscription
  SUBSCRIBE = 'SUBSCRIBE',
  UNSUBSCRIBE = 'UNSUBSCRIBE',
}

interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp?: number;
  clientId?: string;
}

interface ClientInfo {
  id: string;
  userId: string;
  restaurantId: string;
  subscribedPeriods: Set<string>;
  connectedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/shifts',
  transports: ['websocket', 'polling'],
})
export class ShiftsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ShiftsGateway.name);
  private clients: Map<string, ClientInfo> = new Map();
  private restaurantClients: Map<string, Set<string>> = new Map(); // restaurantId -> clientIds

  constructor(private readonly shiftsService: ShiftsService) {}

  afterInit(server: Server) {
    this.logger.log('Shifts WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract auth info from handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization;
      const restaurantId = client.handshake.auth?.restaurantId || client.handshake.query?.restaurantId;

      if (!restaurantId) {
        this.logger.warn(`Client ${client.id} connected without restaurantId`);
        client.emit('message', {
          type: MessageType.ERROR,
          payload: { message: 'Restaurant ID required' },
        });
        client.disconnect();
        return;
      }

      // Store client info
      const clientInfo: ClientInfo = {
        id: client.id,
        userId: client.handshake.auth?.userId || 'anonymous',
        restaurantId: restaurantId as string,
        subscribedPeriods: new Set(),
        connectedAt: new Date(),
      };

      this.clients.set(client.id, clientInfo);

      // Add to restaurant clients
      if (!this.restaurantClients.has(clientInfo.restaurantId)) {
        this.restaurantClients.set(clientInfo.restaurantId, new Set());
      }
      this.restaurantClients.get(clientInfo.restaurantId)!.add(client.id);

      // Join restaurant room
      client.join(`restaurant:${clientInfo.restaurantId}`);

      this.logger.log(`Client ${client.id} connected for restaurant ${clientInfo.restaurantId}`);

      // Send connection acknowledgment
      client.emit('message', {
        type: MessageType.CONNECTION_ACK,
        payload: {
          clientId: client.id,
          restaurantId: clientInfo.restaurantId,
          connectedAt: clientInfo.connectedAt.toISOString(),
        },
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('message', {
        type: MessageType.ERROR,
        payload: { message: error.message },
      });
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      // Remove from restaurant clients
      this.restaurantClients.get(clientInfo.restaurantId)?.delete(client.id);
      this.clients.delete(client.id);

      this.logger.log(`Client ${client.id} disconnected`);
    }
  }

  // ==================== SYNC ====================

  @SubscribeMessage('SYNC_REQUEST')
  async handleSyncRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { periodId?: string },
  ) {
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo) {
      return { type: MessageType.ERROR, payload: { message: 'Not authenticated' } };
    }

    try {
      const staff = await this.shiftsService.getStaff(clientInfo.restaurantId);
      const periods = await this.shiftsService.getPeriods(clientInfo.restaurantId);

      let schedule = null;
      if (payload.periodId) {
        schedule = await this.shiftsService.getSchedule(clientInfo.restaurantId, payload.periodId);
      }

      return {
        type: MessageType.SYNC_RESPONSE,
        payload: {
          staff,
          periods,
          schedule,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      this.logger.error(`Sync error: ${error.message}`);
      return { type: MessageType.ERROR, payload: { message: error.message } };
    }
  }

  // ==================== STAFF OPERATIONS ====================

  @SubscribeMessage('STAFF_CREATE')
  async handleStaffCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo) {
      return { type: MessageType.ERROR, payload: { message: 'Not authenticated' } };
    }

    try {
      const staff = await this.shiftsService.createStaff(clientInfo.restaurantId, payload);

      // Broadcast to all clients in the restaurant
      this.broadcastToRestaurant(clientInfo.restaurantId, {
        type: MessageType.STAFF_SYNC,
        payload: { action: 'create', staff },
      }, client.id);

      return { type: MessageType.STAFF_SYNC, payload: { action: 'create', staff } };
    } catch (error) {
      this.logger.error(`Staff create error: ${error.message}`);
      return { type: MessageType.ERROR, payload: { message: error.message } };
    }
  }

  @SubscribeMessage('STAFF_UPDATE')
  async handleStaffUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { id: string; data: any },
  ) {
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo) {
      return { type: MessageType.ERROR, payload: { message: 'Not authenticated' } };
    }

    try {
      const staff = await this.shiftsService.updateStaff(
        clientInfo.restaurantId,
        payload.id,
        payload.data,
      );

      // Broadcast to all clients in the restaurant
      this.broadcastToRestaurant(clientInfo.restaurantId, {
        type: MessageType.STAFF_SYNC,
        payload: { action: 'update', staff },
      }, client.id);

      return { type: MessageType.STAFF_SYNC, payload: { action: 'update', staff } };
    } catch (error) {
      this.logger.error(`Staff update error: ${error.message}`);
      return { type: MessageType.ERROR, payload: { message: error.message } };
    }
  }

  @SubscribeMessage('STAFF_DELETE')
  async handleStaffDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { id: string },
  ) {
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo) {
      return { type: MessageType.ERROR, payload: { message: 'Not authenticated' } };
    }

    try {
      await this.shiftsService.deleteStaff(clientInfo.restaurantId, payload.id);

      // Broadcast to all clients in the restaurant
      this.broadcastToRestaurant(clientInfo.restaurantId, {
        type: MessageType.STAFF_SYNC,
        payload: { action: 'delete', staffId: payload.id },
      }, client.id);

      return { type: MessageType.STAFF_SYNC, payload: { action: 'delete', staffId: payload.id } };
    } catch (error) {
      this.logger.error(`Staff delete error: ${error.message}`);
      return { type: MessageType.ERROR, payload: { message: error.message } };
    }
  }

  @SubscribeMessage('STAFF_REORDER')
  async handleStaffReorder(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { staffIds: string[] },
  ) {
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo) {
      return { type: MessageType.ERROR, payload: { message: 'Not authenticated' } };
    }

    try {
      await this.shiftsService.reorderStaff(clientInfo.restaurantId, payload.staffIds);

      // Broadcast to all clients in the restaurant
      this.broadcastToRestaurant(clientInfo.restaurantId, {
        type: MessageType.STAFF_SYNC,
        payload: { action: 'reorder', staffIds: payload.staffIds },
      }, client.id);

      return { type: MessageType.STAFF_SYNC, payload: { action: 'reorder', staffIds: payload.staffIds } };
    } catch (error) {
      this.logger.error(`Staff reorder error: ${error.message}`);
      return { type: MessageType.ERROR, payload: { message: error.message } };
    }
  }

  // ==================== SCHEDULE OPERATIONS ====================

  @SubscribeMessage('CELL_UPDATE')
  async handleCellUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { periodId: string; staffId: string; date: string; symbol: string },
  ) {
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo) {
      return { type: MessageType.ERROR, payload: { message: 'Not authenticated' } };
    }

    try {
      const result = await this.shiftsService.updateCell(
        clientInfo.restaurantId,
        payload.periodId,
        payload.staffId,
        payload.date,
        payload.symbol,
      );

      // Broadcast to all clients subscribed to this period
      this.broadcastToPeriod(clientInfo.restaurantId, payload.periodId, {
        type: MessageType.SCHEDULE_SYNC,
        payload: {
          action: 'cell_update',
          periodId: payload.periodId,
          staffId: payload.staffId,
          date: payload.date,
          symbol: payload.symbol,
        },
      }, client.id);

      return {
        type: MessageType.SCHEDULE_SYNC,
        payload: {
          action: 'cell_update',
          periodId: payload.periodId,
          staffId: payload.staffId,
          date: payload.date,
          symbol: payload.symbol,
        },
      };
    } catch (error) {
      this.logger.error(`Cell update error: ${error.message}`);
      return { type: MessageType.ERROR, payload: { message: error.message } };
    }
  }

  @SubscribeMessage('BULK_CELL_UPDATE')
  async handleBulkCellUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { periodId: string; updates: Array<{ staffId: string; date: string; symbol: string }> },
  ) {
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo) {
      return { type: MessageType.ERROR, payload: { message: 'Not authenticated' } };
    }

    try {
      await this.shiftsService.bulkUpdateCells(
        clientInfo.restaurantId,
        payload.periodId,
        payload.updates,
      );

      // Broadcast to all clients subscribed to this period
      this.broadcastToPeriod(clientInfo.restaurantId, payload.periodId, {
        type: MessageType.SCHEDULE_SYNC,
        payload: {
          action: 'bulk_update',
          periodId: payload.periodId,
          updates: payload.updates,
        },
      }, client.id);

      return {
        type: MessageType.SCHEDULE_SYNC,
        payload: {
          action: 'bulk_update',
          periodId: payload.periodId,
          updates: payload.updates,
        },
      };
    } catch (error) {
      this.logger.error(`Bulk cell update error: ${error.message}`);
      return { type: MessageType.ERROR, payload: { message: error.message } };
    }
  }

  // ==================== OPTIMIZATION ====================

  @SubscribeMessage('OPTIMIZE_START')
  async handleOptimizeStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { periodId: string; timeout?: number; penaltyWeights?: any; preservePrefilled?: boolean },
  ) {
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo) {
      return { type: MessageType.ERROR, payload: { message: 'Not authenticated' } };
    }

    try {
      // Notify client that optimization is starting
      client.emit('message', {
        type: MessageType.OPTIMIZE_PROGRESS,
        payload: { status: 'starting', message: 'Starting optimization...' },
      });

      const result = await this.shiftsService.optimizeSchedule(clientInfo.restaurantId, {
        periodId: payload.periodId,
        timeout: payload.timeout,
        penaltyWeights: payload.penaltyWeights,
        preservePrefilled: payload.preservePrefilled,
      });

      if (result.success) {
        // Broadcast optimized schedule to all clients
        this.broadcastToPeriod(clientInfo.restaurantId, payload.periodId, {
          type: MessageType.OPTIMIZE_COMPLETE,
          payload: {
            periodId: payload.periodId,
            schedule: result.schedule,
            solve_time: result.solve_time,
            is_optimal: result.is_optimal,
            violations: result.violations,
          },
        });

        return {
          type: MessageType.OPTIMIZE_COMPLETE,
          payload: {
            periodId: payload.periodId,
            schedule: result.schedule,
            solve_time: result.solve_time,
            is_optimal: result.is_optimal,
            violations: result.violations,
          },
        };
      } else {
        return {
          type: MessageType.OPTIMIZE_ERROR,
          payload: { message: result.error || 'Optimization failed' },
        };
      }
    } catch (error) {
      this.logger.error(`Optimize error: ${error.message}`);
      return { type: MessageType.OPTIMIZE_ERROR, payload: { message: error.message } };
    }
  }

  // ==================== SUBSCRIPTIONS ====================

  @SubscribeMessage('SUBSCRIBE')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { periodId: string },
  ) {
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo) {
      return { type: MessageType.ERROR, payload: { message: 'Not authenticated' } };
    }

    clientInfo.subscribedPeriods.add(payload.periodId);
    client.join(`period:${clientInfo.restaurantId}:${payload.periodId}`);

    this.logger.debug(`Client ${client.id} subscribed to period ${payload.periodId}`);

    return { type: 'SUBSCRIBED', payload: { periodId: payload.periodId } };
  }

  @SubscribeMessage('UNSUBSCRIBE')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { periodId: string },
  ) {
    const clientInfo = this.clients.get(client.id);
    if (!clientInfo) {
      return { type: MessageType.ERROR, payload: { message: 'Not authenticated' } };
    }

    clientInfo.subscribedPeriods.delete(payload.periodId);
    client.leave(`period:${clientInfo.restaurantId}:${payload.periodId}`);

    this.logger.debug(`Client ${client.id} unsubscribed from period ${payload.periodId}`);

    return { type: 'UNSUBSCRIBED', payload: { periodId: payload.periodId } };
  }

  // ==================== PING/PONG ====================

  @SubscribeMessage('PING')
  handlePing(@ConnectedSocket() client: Socket) {
    return { type: MessageType.PONG, payload: { timestamp: Date.now() } };
  }

  // ==================== HELPERS ====================

  private broadcastToRestaurant(restaurantId: string, message: any, excludeClientId?: string) {
    const room = `restaurant:${restaurantId}`;
    if (excludeClientId) {
      this.server.to(room).except(excludeClientId).emit('message', message);
    } else {
      this.server.to(room).emit('message', message);
    }
  }

  private broadcastToPeriod(restaurantId: string, periodId: string, message: any, excludeClientId?: string) {
    const room = `period:${restaurantId}:${periodId}`;
    if (excludeClientId) {
      this.server.to(room).except(excludeClientId).emit('message', message);
    } else {
      this.server.to(room).emit('message', message);
    }
  }

  // Public method for service to broadcast messages
  broadcastScheduleUpdate(restaurantId: string, periodId: string, schedule: any) {
    this.broadcastToPeriod(restaurantId, periodId, {
      type: MessageType.SCHEDULE_SYNC,
      payload: { action: 'full_update', periodId, schedule },
    });
  }

  // Get connected clients count
  getConnectedClientsCount(restaurantId?: string): number {
    if (restaurantId) {
      return this.restaurantClients.get(restaurantId)?.size || 0;
    }
    return this.clients.size;
  }
}
