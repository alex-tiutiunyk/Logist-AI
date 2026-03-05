import { PrismaClient, TripStatus, TruckStatus, TerminalEventType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3_600_000);
}

function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 3_600_000);
}

function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60_000);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function tripCode(i: number): string {
  return `TR-${String(i).padStart(4, '0')}`;
}

async function main() {
  console.log('🌱 Seeding database…');

  // ── Users ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10);
  const managerHash = await bcrypt.hash('manager123', 10);
  const operatorHash = await bcrypt.hash('operator123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: { email: 'admin@demo.com', passwordHash: adminHash, role: 'ADMIN' },
  });
  await prisma.user.upsert({
    where: { email: 'manager@demo.com' },
    update: {},
    create: { email: 'manager@demo.com', passwordHash: managerHash, role: 'MANAGER' },
  });
  await prisma.user.upsert({
    where: { email: 'operator@demo.com' },
    update: {},
    create: { email: 'operator@demo.com', passwordHash: operatorHash, role: 'TERMINAL_OPERATOR' },
  });

  console.log('  ✓ Users');

  // ── Terminals ──────────────────────────────────────────────────────────────
  const terminalData = [
    { name: 'Terminal Alpha', type: 'OWN' as const, slaMinutes: 180, lat: 48.85, lng: 2.35 },
    { name: 'Terminal Beta', type: 'OWN' as const, slaMinutes: 180, lat: 45.76, lng: 4.83 },
    { name: 'Terminal Gamma', type: 'OWN' as const, slaMinutes: 180, lat: 43.30, lng: 5.38 },
    { name: 'Hub Nord', type: 'PARTNER' as const, slaMinutes: 90, lat: 50.63, lng: 3.07 },
    { name: 'Hub Est', type: 'PARTNER' as const, slaMinutes: 90, lat: 48.57, lng: 7.75 },
    { name: 'Hub Sud', type: 'PARTNER' as const, slaMinutes: 90, lat: 43.60, lng: 1.44 },
  ];

  const terminals = await Promise.all(
    terminalData.map((t) =>
      prisma.terminal.upsert({
        where: { name: t.name },
        update: {},
        create: t,
      })
    )
  );

  console.log('  ✓ Terminals');

  // ── Drivers ────────────────────────────────────────────────────────────────
  const driverNames = [
    'Jean Dupont', 'Marie Martin', 'Pierre Bernard', 'Sophie Leclerc',
    'Lucas Moreau', 'Emma Petit', 'Antoine Richard', 'Chloé Simon',
    'Nicolas Lefebvre', 'Lea Thomas', 'Julien Roux', 'Camille Dubois',
    'Maxime Fontaine', 'Ines Garnier', 'Romain Morel', 'Alice Muller',
    'Thomas Girard', 'Sarah Boyer', 'Alexandre Laurent', 'Julie Mercier',
  ];

  const drivers = await Promise.all(
    driverNames.map((name, i) =>
      prisma.driver.upsert({
        where: { id: `driver-${i + 1}` },
        update: {},
        create: {
          id: `driver-${i + 1}`,
          name,
          phone: `+33 6 ${String(10 + i).padStart(2, '0')} ${30 + i} ${40 + i} ${50 + i}`,
        },
      })
    )
  );

  console.log('  ✓ Drivers');

  // ── Trucks ─────────────────────────────────────────────────────────────────
  // Status distribution: 15 IDLE, 12 EN_ROUTE, 5 LOADING, 5 UNLOADING, 3 MAINTENANCE
  const truckStatuses: TruckStatus[] = [
    ...Array(15).fill('IDLE'),
    ...Array(12).fill('EN_ROUTE'),
    ...Array(5).fill('LOADING'),
    ...Array(5).fill('UNLOADING'),
    ...Array(3).fill('MAINTENANCE'),
  ];

  const trucks = [];
  for (let i = 1; i <= 40; i++) {
    const status = truckStatuses[i - 1] as TruckStatus;
    const isAtTerminal = status === 'LOADING' || status === 'UNLOADING';
    const terminal = isAtTerminal ? terminals[(i - 1) % terminals.length] : null;

    const truck = await prisma.truck.upsert({
      where: { code: `TRK-${String(i).padStart(3, '0')}` },
      update: {},
      create: {
        code: `TRK-${String(i).padStart(3, '0')}`,
        status,
        lastTerminalId: terminal?.id ?? null,
        lastLat: 43 + Math.random() * 8,
        lastLng: 1 + Math.random() * 7,
      },
    });
    trucks.push(truck);
  }

  console.log('  ✓ Trucks');

  // ── Trips ──────────────────────────────────────────────────────────────────
  // Status distribution:
  //  PLANNED: 10, EN_ROUTE: 12, ARRIVED_ORIGIN: 5, LOADING: 8,
  //  DEPARTED_ORIGIN: 5, ARRIVED_DEST: 7, UNLOADING: 6, COMPLETED: 7
  // Total = 60
  const tripStatuses: TripStatus[] = [
    ...Array(10).fill('PLANNED'),
    ...Array(12).fill('EN_ROUTE'),
    ...Array(5).fill('ARRIVED_ORIGIN'),
    ...Array(8).fill('LOADING'),
    ...Array(5).fill('DEPARTED_ORIGIN'),
    ...Array(7).fill('ARRIVED_DEST'),
    ...Array(6).fill('UNLOADING'),
    ...Array(7).fill('COMPLETED'),
  ];

  // Trucks already in use map (truckId -> true)
  const usedTrucks = new Set<string>();
  const usedDrivers = new Set<string>();

  for (let i = 1; i <= 60; i++) {
    const status = tripStatuses[i - 1];
    const origin = terminals[(i - 1) % 6];
    const dest = terminals[(i + 2) % 6];

    // Pick truck (active trips get a real truck; PLANNED can be unassigned)
    let truck: (typeof trucks)[0] | undefined;
    let driver: (typeof drivers)[0] | undefined;

    if (status !== 'PLANNED') {
      truck = trucks.find((t) => !usedTrucks.has(t.id));
      if (truck) usedTrucks.add(truck.id);
      driver = drivers.find((d) => !usedDrivers.has(d.id));
      if (driver) usedDrivers.add(driver.id);
    } else if (i <= 5) {
      // Half of PLANNED trips have trucks assigned
      truck = trucks.find((t) => !usedTrucks.has(t.id) && t.status === 'IDLE');
      if (truck) usedTrucks.add(truck.id);
      driver = drivers.find((d) => !usedDrivers.has(d.id));
      if (driver) usedDrivers.add(driver.id);
    }

    // Compute timing based on status
    const distance = 200 + Math.round(Math.random() * 600);
    const durationHours = distance / 80; // avg 80 km/h

    let plannedStartAt: Date;
    let plannedEtaAt: Date;
    let actualStartAt: Date | null = null;
    let actualEtaAt: Date | null = null;

    switch (status) {
      case 'PLANNED':
        plannedStartAt = hoursFromNow(2 + i);
        plannedEtaAt = new Date(plannedStartAt.getTime() + durationHours * 3_600_000);
        break;
      case 'EN_ROUTE': {
        plannedStartAt = hoursAgo(2 + i * 0.2);
        plannedEtaAt = hoursFromNow(3 + (i % 4));
        actualStartAt = plannedStartAt;
        // Simulate some late trips (i % 3 === 0 → late by 45 min)
        actualEtaAt =
          i % 3 === 0
            ? new Date(plannedEtaAt.getTime() + 45 * 60_000)
            : plannedEtaAt;
        break;
      }
      case 'ARRIVED_ORIGIN':
        plannedStartAt = hoursAgo(3);
        plannedEtaAt = hoursFromNow(5);
        actualStartAt = hoursAgo(3);
        break;
      case 'LOADING':
        plannedStartAt = hoursAgo(5);
        plannedEtaAt = hoursFromNow(3);
        actualStartAt = hoursAgo(5);
        break;
      case 'DEPARTED_ORIGIN':
        plannedStartAt = hoursAgo(4);
        plannedEtaAt = hoursFromNow(2);
        actualStartAt = hoursAgo(4);
        break;
      case 'ARRIVED_DEST':
        plannedStartAt = hoursAgo(8);
        plannedEtaAt = hoursAgo(1);
        actualStartAt = hoursAgo(8);
        actualEtaAt = hoursAgo(1);
        break;
      case 'UNLOADING':
        plannedStartAt = hoursAgo(10);
        plannedEtaAt = hoursAgo(2);
        actualStartAt = hoursAgo(10);
        actualEtaAt = hoursAgo(2);
        break;
      case 'COMPLETED':
        plannedStartAt = hoursAgo(12 + i);
        plannedEtaAt = hoursAgo(5);
        actualStartAt = hoursAgo(12 + i);
        actualEtaAt = hoursAgo(5);
        break;
      default:
        plannedStartAt = hoursFromNow(1);
        plannedEtaAt = hoursFromNow(6);
    }

    const rateIncome = 800 + Math.round(Math.random() * 1200);
    const fuelCostEst = Math.round(distance * 0.35);
    const otherCostEst = 50 + Math.round(Math.random() * 100);
    const marginComputed = rateIncome - fuelCostEst - otherCostEst;

    const trip = await prisma.trip.upsert({
      where: { code: tripCode(i) },
      update: {},
      create: {
        code: tripCode(i),
        originTerminalId: origin.id,
        destinationTerminalId: dest.id,
        truckId: truck?.id ?? null,
        driverId: driver?.id ?? null,
        status,
        plannedStartAt,
        plannedEtaAt,
        actualStartAt,
        actualEtaAt,
        distanceKm: distance,
        cargoWeightKg: 5000 + Math.round(Math.random() * 15000),
        rateIncome,
        fuelCostEst,
        otherCostEst,
        marginComputed,
      },
    });

    // Create appropriate terminal events for active statuses
    if (truck) {
      if (['ARRIVED_ORIGIN', 'LOADING', 'DEPARTED_ORIGIN', 'ARRIVED_DEST', 'UNLOADING', 'COMPLETED'].includes(status)) {
        await prisma.terminalEvent.create({
          data: {
            tripId: trip.id,
            terminalId: origin.id,
            truckId: truck.id,
            type: TerminalEventType.ARRIVED,
            at: hoursAgo(5 + (i % 3)),
          },
        });
      }
      if (['LOADING', 'DEPARTED_ORIGIN', 'ARRIVED_DEST', 'UNLOADING', 'COMPLETED'].includes(status)) {
        await prisma.terminalEvent.create({
          data: {
            tripId: trip.id,
            terminalId: origin.id,
            truckId: truck.id,
            type: TerminalEventType.LOADING_STARTED,
            at: hoursAgo(4 + (i % 2)),
          },
        });
      }
      if (['DEPARTED_ORIGIN', 'ARRIVED_DEST', 'UNLOADING', 'COMPLETED'].includes(status)) {
        await prisma.terminalEvent.create({
          data: {
            tripId: trip.id,
            terminalId: origin.id,
            truckId: truck.id,
            type: TerminalEventType.LOADING_FINISHED,
            at: hoursAgo(3),
          },
        });
        await prisma.terminalEvent.create({
          data: {
            tripId: trip.id,
            terminalId: origin.id,
            truckId: truck.id,
            type: TerminalEventType.DEPARTED,
            at: hoursAgo(3),
          },
        });
      }
      if (['ARRIVED_DEST', 'UNLOADING', 'COMPLETED'].includes(status)) {
        await prisma.terminalEvent.create({
          data: {
            tripId: trip.id,
            terminalId: dest.id,
            truckId: truck.id,
            type: TerminalEventType.ARRIVED,
            at: hoursAgo(2),
          },
        });
      }
      if (['UNLOADING', 'COMPLETED'].includes(status)) {
        await prisma.terminalEvent.create({
          data: {
            tripId: trip.id,
            terminalId: dest.id,
            truckId: truck.id,
            type: TerminalEventType.UNLOADING_STARTED,
            at: hoursAgo(1.5),
          },
        });
      }
      if (status === 'COMPLETED') {
        await prisma.terminalEvent.create({
          data: {
            tripId: trip.id,
            terminalId: dest.id,
            truckId: truck.id,
            type: TerminalEventType.UNLOADING_FINISHED,
            at: hoursAgo(0.5),
          },
        });
        await prisma.terminalEvent.create({
          data: {
            tripId: trip.id,
            terminalId: dest.id,
            truckId: truck.id,
            type: TerminalEventType.DEPARTED,
            at: hoursAgo(0.5),
          },
        });
      }
    }
  }

  console.log('  ✓ Trips + terminal events');

  // ── Seed some demo alerts ──────────────────────────────────────────────────
  const someTrucks = trucks.slice(0, 5);
  const alertMessages = [
    { type: 'LATE_RISK' as const, severity: 'WARNING' as const, message: 'Trip TR-0002 is 45 min past planned ETA.' },
    { type: 'DWELL_RISK' as const, severity: 'CRITICAL' as const, message: 'Truck TRK-016 at Hub Nord exceeded SLA by 30 min.' },
    { type: 'IDLE_TOO_LONG' as const, severity: 'INFO' as const, message: 'Truck TRK-001 has been idle for 7+ hours.' },
    { type: 'LATE_RISK' as const, severity: 'WARNING' as const, message: 'Trip TR-0005 is 35 min past planned ETA.' },
    { type: 'DWELL_RISK' as const, severity: 'WARNING' as const, message: 'Truck TRK-021 at Hub Est is approaching SLA limit.' },
  ];

  for (let i = 0; i < alertMessages.length; i++) {
    const a = alertMessages[i];
    await prisma.alert.create({
      data: {
        type: a.type,
        severity: a.severity,
        message: a.message,
        truckId: someTrucks[i]?.id ?? null,
        terminalId: i % 2 === 0 ? terminals[3].id : null,
        createdAt: minutesAgo(30 - i * 5),
        acknowledgedAt: i === 2 ? minutesAgo(10) : null, // one ack'd
      },
    });
  }

  console.log('  ✓ Alerts');
  console.log('\n✅ Seed complete!\n');
  console.log('Demo users:');
  console.log('  admin@demo.com    / admin123    (ADMIN)');
  console.log('  manager@demo.com  / manager123  (MANAGER)');
  console.log('  operator@demo.com / operator123 (TERMINAL_OPERATOR)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
