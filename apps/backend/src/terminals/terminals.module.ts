import { Module } from '@nestjs/common';
import { TerminalsController } from './terminals.controller';
import { TerminalsService } from './terminals.service';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [GatewayModule],
  controllers: [TerminalsController],
  providers: [TerminalsService],
  exports: [TerminalsService],
})
export class TerminalsModule {}
