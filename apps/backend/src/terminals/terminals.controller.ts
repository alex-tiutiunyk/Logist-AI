import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TerminalsService } from './terminals.service';

class TerminalActionDto {
  @IsString()
  tripId!: string;

  @IsIn(['start_loading', 'finish_loading', 'start_unloading', 'finish_unloading'])
  action!: 'start_loading' | 'finish_loading' | 'start_unloading' | 'finish_unloading';
}

@Controller('terminals')
@UseGuards(JwtAuthGuard)
export class TerminalsController {
  constructor(private terminalsService: TerminalsService) {}

  @Get()
  findAll() {
    return this.terminalsService.findAll();
  }

  @Get('queue')
  getQueue() {
    return this.terminalsService.getQueue();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.terminalsService.findOne(id);
  }

  @Post(':id/action')
  performAction(@Param('id') id: string, @Body() dto: TerminalActionDto) {
    return this.terminalsService.performAction(id, dto.tripId, dto.action);
  }
}
