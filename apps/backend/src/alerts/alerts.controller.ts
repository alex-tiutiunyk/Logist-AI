import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AlertsService } from './alerts.service';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.alertsService.findAll(all === 'true');
  }

  @Post(':id/ack')
  acknowledge(@Param('id') id: string) {
    return this.alertsService.acknowledge(id);
  }
}
