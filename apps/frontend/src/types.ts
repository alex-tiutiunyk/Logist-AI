// Mirror of backend Prisma types for frontend use

export type Role = 'ADMIN' | 'MANAGER' | 'TERMINAL_OPERATOR';
export type TruckStatus = 'IDLE' | 'EN_ROUTE' | 'LOADING' | 'UNLOADING' | 'MAINTENANCE';
export type TripStatus =
  | 'PLANNED'
  | 'EN_ROUTE'
  | 'ARRIVED_ORIGIN'
  | 'LOADING'
  | 'DEPARTED_ORIGIN'
  | 'ARRIVED_DEST'
  | 'UNLOADING'
  | 'COMPLETED'
  | 'CANCELED';
export type TerminalType = 'OWN' | 'PARTNER';
export type AlertType = 'LATE_RISK' | 'DWELL_RISK' | 'IDLE_TOO_LONG';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type Risk = 'LATE' | 'DWELL' | 'NONE';

export interface User {
  id: string;
  email: string;
  role: Role;
}

export interface Driver {
  id: string;
  name: string;
  phone?: string;
}

export interface Terminal {
  id: string;
  name: string;
  type: TerminalType;
  slaMinutes: number;
  lat?: number;
  lng?: number;
}

export interface Truck {
  id: string;
  code: string;
  status: TruckStatus;
  lastTerminalId?: string;
  lastTerminal?: Pick<Terminal, 'id' | 'name' | 'type'>;
  updatedAt: string;
}

export interface Trip {
  id: string;
  code: string;
  status: TripStatus;
  originTerminalId: string;
  originTerminal: Pick<Terminal, 'id' | 'name' | 'type'>;
  destinationTerminalId: string;
  destinationTerminal: Pick<Terminal, 'id' | 'name' | 'type'>;
  truckId?: string;
  truck?: Pick<Truck, 'id' | 'code' | 'status'>;
  driverId?: string;
  driver?: Pick<Driver, 'id' | 'name'>;
  plannedStartAt: string;
  plannedEtaAt: string;
  actualStartAt?: string;
  actualEtaAt?: string;
  distanceKm?: number;
  cargoWeightKg?: number;
  rateIncome: number;
  fuelCostEst: number;
  otherCostEst: number;
  marginComputed: number;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  truckId?: string;
  truck?: Pick<Truck, 'id' | 'code'>;
  tripId?: string;
  trip?: Pick<Trip, 'id' | 'code'>;
  terminalId?: string;
  terminal?: Pick<Terminal, 'id' | 'name'>;
  message: string;
  createdAt: string;
  acknowledgedAt?: string;
}

export interface DashboardSummary {
  activeTrips: number;
  idleTrucks: number;
  lateRisk: number;
  avgDwellMinutes: number;
  marginToday: number;
}

export interface DashboardTruckRow {
  truckId: string;
  code: string;
  status: TruckStatus;
  lastTerminal?: Pick<Terminal, 'id' | 'name'>;
  activeTrip?: {
    id: string;
    code: string;
    status: TripStatus;
    plannedEtaAt: string;
    actualEtaAt?: string;
    etaDriftMinutes: number;
    originTerminal: Pick<Terminal, 'id' | 'name'>;
    destinationTerminal: Pick<Terminal, 'id' | 'name'>;
    driver?: Pick<Driver, 'id' | 'name'>;
  };
  risk: Risk;
  eta?: string;
}

export interface TerminalQueueEntry {
  terminal: Terminal;
  trips: Array<
    Trip & {
      terminalEvents: Array<{ type: string; at: string }>;
    }
  >;
}

export interface SuggestedTruck {
  truckId: string;
  code: string;
  status: TruckStatus;
  lastTerminal?: Pick<Terminal, 'id' | 'name'>;
  reason: string;
}
