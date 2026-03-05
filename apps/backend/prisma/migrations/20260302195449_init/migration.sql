-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'TERMINAL_OPERATOR');

-- CreateEnum
CREATE TYPE "TruckStatus" AS ENUM ('IDLE', 'EN_ROUTE', 'LOADING', 'UNLOADING', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PLANNED', 'EN_ROUTE', 'ARRIVED_ORIGIN', 'LOADING', 'DEPARTED_ORIGIN', 'ARRIVED_DEST', 'UNLOADING', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "TerminalType" AS ENUM ('OWN', 'PARTNER');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('LATE_RISK', 'DWELL_RISK', 'IDLE_TOO_LONG');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TerminalEventType" AS ENUM ('ARRIVED', 'LOADING_STARTED', 'LOADING_FINISHED', 'UNLOADING_STARTED', 'UNLOADING_FINISHED', 'DEPARTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "TruckStatus" NOT NULL DEFAULT 'IDLE',
    "lastTerminalId" TEXT,
    "lastLat" DOUBLE PRECISION,
    "lastLng" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Terminal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TerminalType" NOT NULL DEFAULT 'OWN',
    "slaMinutes" INTEGER NOT NULL DEFAULT 120,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "Terminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "originTerminalId" TEXT NOT NULL,
    "destinationTerminalId" TEXT NOT NULL,
    "truckId" TEXT,
    "driverId" TEXT,
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedStartAt" TIMESTAMP(3) NOT NULL,
    "plannedEtaAt" TIMESTAMP(3) NOT NULL,
    "actualStartAt" TIMESTAMP(3),
    "actualEtaAt" TIMESTAMP(3),
    "distanceKm" DOUBLE PRECISION,
    "cargoWeightKg" DOUBLE PRECISION,
    "rateIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuelCostEst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCostEst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marginComputed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerminalEvent" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "truckId" TEXT,
    "type" "TerminalEventType" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerminalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "truckId" TEXT,
    "tripId" TEXT,
    "terminalId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_code_key" ON "Truck"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Terminal_name_key" ON "Terminal"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_code_key" ON "Trip"("code");

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_lastTerminalId_fkey" FOREIGN KEY ("lastTerminalId") REFERENCES "Terminal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_originTerminalId_fkey" FOREIGN KEY ("originTerminalId") REFERENCES "Terminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_destinationTerminalId_fkey" FOREIGN KEY ("destinationTerminalId") REFERENCES "Terminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminalEvent" ADD CONSTRAINT "TerminalEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminalEvent" ADD CONSTRAINT "TerminalEvent_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "Terminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerminalEvent" ADD CONSTRAINT "TerminalEvent_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "Terminal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
