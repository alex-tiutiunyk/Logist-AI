import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TripStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import { SuggestTruckDto } from './dto/suggest-truck.dto';

@Controller('trips')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TripsController {
  constructor(private tripsService: TripsService) {}

  @Get()
  findAll(
    @Query('status') status?: TripStatus,
    @Query('terminalId') terminalId?: string,
    @Query('search') search?: string,
  ) {
    return this.tripsService.findAll({ status, terminalId, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tripsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() dto: CreateTripDto) {
    return this.tripsService.create(dto);
  }

  @Post('suggest-truck')
  suggestTruck(@Body() dto: SuggestTruckDto) {
    return this.tripsService.suggestTruck(dto);
  }

  @Post(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TERMINAL_OPERATOR)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTripStatusDto) {
    return this.tripsService.updateStatus(id, dto.status);
  }
}
