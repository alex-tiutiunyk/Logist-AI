import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TruckStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrucksService } from './trucks.service';

@Controller('trucks')
@UseGuards(JwtAuthGuard)
export class TrucksController {
  constructor(private trucksService: TrucksService) {}

  @Get()
  findAll(
    @Query('status') status?: TruckStatus,
    @Query('terminalId') terminalId?: string,
  ) {
    return this.trucksService.findAll({ status, terminalId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trucksService.findOne(id);
  }
}
