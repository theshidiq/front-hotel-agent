import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { SkipAuth } from './auth/permission.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  getHealth(): { status: string; timestamp: string } {
    return this.appService.getHealth();
  }

  @Get('organizations/by-slug/:slug')
  @SkipAuth()
  @ApiOperation({ summary: 'Resolve organization by slug (public)' })
  async getOrgBySlug(@Param('slug') slug: string) {
    const org = await this.appService.findOrgBySlug(slug);
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }
}
