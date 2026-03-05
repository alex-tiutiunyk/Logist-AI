// ─── Enums ──────────────────────────────────────────────────────────────────

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  TERMINAL_OPERATOR = 'TERMINAL_OPERATOR',
}

export enum TruckStatus {
  IDLE = 'IDLE',
  EN_ROUTE = 'EN_ROUTE',
  LOADING = 'LOADING',
  UNLOADING = 'UNLOADING',
  MAINTENANCE = 'MAINTENANCE',
}

export enum TripStatus {
  PLANNED = 'PLANNED',
  EN_ROUTE = 'EN_ROUTE',
  ARRIVED_ORIGIN = 'ARRIVED_ORIGIN',
  LOADING = 'LOADING',
  DEPARTED_ORIGIN = 'DEPARTED_ORIGIN',
  ARRIVED_DEST = 'ARRIVED_DEST',
  UNLOADING = 'UNLOADING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export enum TerminalType {
  OWN = 'OWN',
  PARTNER = 'PARTNER',
}

export enum AlertType {
  LATE_RISK = 'LATE_RISK',
  DWELL_RISK = 'DWELL_RISK',
  IDLE_TOO_LONG = 'IDLE_TOO_LONG',
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum TerminalEventType {
  ARRIVED = 'ARRIVED',
  LOADING_STARTED = 'LOADING_STARTED',
  LOADING_FINISHED = 'LOADING_FINISHED',
  UNLOADING_STARTED = 'UNLOADING_STARTED',
  UNLOADING_FINISHED = 'UNLOADING_FINISHED',
  DEPARTED = 'DEPARTED',
}

// ─── WebSocket event payloads ────────────────────────────────────────────────

export interface WsTruckUpdated {
  event: 'truck.updated';
  data: { truckId: string };
}

export interface WsTripUpdated {
  event: 'trip.updated';
  data: { tripId: string };
}

export interface WsAlertCreated {
  event: 'alert.created';
  data: { alertId: string; type: AlertType; message: string };
}

export interface WsAlertUpdated {
  event: 'alert.updated';
  data: { alertId: string };
}
