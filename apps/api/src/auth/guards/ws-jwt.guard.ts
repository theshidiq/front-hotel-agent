import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Missing authentication token');
    }

    try {
      const supabase = this.supabaseService.getClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        throw new WsException('Invalid or expired token');
      }

      const email = user.email;
      if (!email) {
        throw new WsException('No email associated with this account');
      }

      // Check if this user is a staff member
      const restaurantId = this.supabaseService.getRestaurantId();
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id, name, email, position, is_admin, role_id')
        .eq('email', email)
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .single();

      if (staffError || !staff) {
        throw new WsException('You are not registered as staff');
      }

      // Attach user info to the socket
      client.data.user = {
        authId: user.id,
        email: staff.email,
        staffId: staff.id,
        name: staff.name,
        position: staff.position,
        isAdmin: staff.is_admin ?? false,
        roleId: staff.role_id,
        restaurantId,
      };

      return true;
    } catch (error) {
      this.logger.error(`WebSocket auth error: ${error.message}`);
      throw new WsException(error.message || 'Authentication failed');
    }
  }

  private extractToken(client: Socket): string | null {
    // Try to get token from auth object
    const authToken = client.handshake.auth?.token;
    if (authToken) {
      return authToken;
    }

    // Try to get token from authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from query string
    const queryToken = client.handshake.query?.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }
}
