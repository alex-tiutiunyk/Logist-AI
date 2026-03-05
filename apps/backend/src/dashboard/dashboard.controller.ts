import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TruckStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('trucks')
  getTruckTable(
    @Query('status') status?: TruckStatus,
    @Query('terminalId') terminalId?: string,
    @Query('risk') risk?: string,
    @Query('search') search?: string,
  ) {
    return this.dashboardService.getTruckTable({ status, terminalId, risk, search });
  }
}
