import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { AlertType } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private jwtService: JwtService) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token, disconnecting`);
        client.disconnect();
        return;
      }

      const bearer = token.startsWith('Bearer ') ? token.slice(7) : token;
      const payload = this.jwtService.verify(bearer);
      // Attach user info to socket data for future use
      client.data.user = payload;
      this.logger.log(`Client connected: ${client.id} (${payload.email})`);
    } catch {
      this.logger.warn(`Client ${client.id}: invalid token, disconnecting`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Emit helpers ────────────────────────────────────────────────────────

  emitTruckUpdated(truckId: string) {
    this.server.emit('truck.updated', { truckId });
  }

  emitTripUpdated(tripId: string) {
    this.server.emit('trip.updated', { tripId });
  }

  emitAlertCreated(alertId: string, type: AlertType, message: string) {
    this.server.emit('alert.created', { alertId, type, message });
  }

  emitAlertUpdated(alertId: string) {
    this.server.emit('alert.updated', { alertId });
  }
}
