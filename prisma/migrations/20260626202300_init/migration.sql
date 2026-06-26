-- CreateEnum
CREATE TYPE "HubType" AS ENUM ('warehouse', 'transit', 'delivery');

-- CreateEnum
CREATE TYPE "RoadType" AS ENUM ('highway', 'state_road', 'city_road');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('pending', 'in_transit', 'rerouted', 'delayed', 'delivered', 'at_risk');

-- CreateEnum
CREATE TYPE "ShipmentPriority" AS ENUM ('standard', 'express', 'critical');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('slack', 'email', 'sms', 'webhook');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('sent', 'failed', 'pending');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'warehouse_manager', 'viewer');

-- CreateEnum
CREATE TYPE "AgentLogStatus" AS ENUM ('success', 'error', 'skipped');

-- CreateTable
CREATE TABLE "hubs" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100),
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "hub_type" "HubType" NOT NULL,
    "manager_name" VARCHAR(100),
    "manager_email" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" SERIAL NOT NULL,
    "origin_hub_id" INTEGER NOT NULL,
    "destination_hub_id" INTEGER NOT NULL,
    "base_distance_km" DECIMAL(8,2) NOT NULL,
    "base_duration_minutes" INTEGER NOT NULL,
    "road_type" "RoadType",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- PRD constraint: prevent self-loop routes
ALTER TABLE "routes" ADD CONSTRAINT "no_self_loop" CHECK (origin_hub_id <> destination_hub_id);

-- CreateTable
CREATE TABLE "weather_events" (
    "id" SERIAL NOT NULL,
    "hub_id" INTEGER NOT NULL,
    "condition" VARCHAR(50),
    "condition_code" INTEGER,
    "temperature" DECIMAL(5,2),
    "feels_like" DECIMAL(5,2),
    "humidity" INTEGER,
    "precipitation_mm" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "wind_speed_kmh" DECIMAL(6,2),
    "visibility_km" DECIMAL(6,2),
    "forecast_for" TIMESTAMP(6) NOT NULL,
    "fetched_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_scores" (
    "id" SERIAL NOT NULL,
    "hub_id" INTEGER NOT NULL,
    "weather_event_id" INTEGER,
    "delay_probability" DECIMAL(5,4) NOT NULL,
    "risk_level" "RiskLevel" NOT NULL,
    "shap_values" JSONB,
    "top_risk_factors" JSONB,
    "human_explanation" TEXT,
    "model_version" VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    "computed_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(6),

    CONSTRAINT "risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" SERIAL NOT NULL,
    "tracking_id" VARCHAR(50) NOT NULL,
    "origin_hub_id" INTEGER NOT NULL,
    "destination_hub_id" INTEGER NOT NULL,
    "current_hub_id" INTEGER,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'pending',
    "planned_route" JSONB NOT NULL,
    "active_route" JSONB NOT NULL,
    "planned_route_names" JSONB,
    "active_route_names" JSONB,
    "priority" "ShipmentPriority" NOT NULL DEFAULT 'standard',
    "weight_kg" DECIMAL(8,2),
    "eta" TIMESTAMP(6),
    "actual_delivery" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_changes" (
    "id" SERIAL NOT NULL,
    "shipment_id" INTEGER NOT NULL,
    "old_route" JSONB NOT NULL,
    "new_route" JSONB NOT NULL,
    "old_route_names" JSONB,
    "new_route_names" JSONB,
    "reason" TEXT NOT NULL,
    "risk_level_triggered" VARCHAR(20),
    "triggered_by_hub_id" INTEGER,
    "triggered_by_risk_score_id" INTEGER,
    "agent_decision_log" TEXT,
    "webhook_fired" BOOLEAN NOT NULL DEFAULT false,
    "webhook_fired_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "route_change_id" INTEGER,
    "shipment_id" INTEGER,
    "channel" "AlertChannel" NOT NULL,
    "recipient" VARCHAR(255),
    "subject" VARCHAR(500),
    "message" TEXT NOT NULL,
    "is_anomaly_alert" BOOLEAN NOT NULL DEFAULT false,
    "anomaly_details" JSONB,
    "status" "AlertStatus" NOT NULL DEFAULT 'pending',
    "n8n_execution_id" VARCHAR(100),
    "sent_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "assigned_hub_id" INTEGER,
    "phone" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_logs" (
    "id" SERIAL NOT NULL,
    "agent_name" VARCHAR(50) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "input_data" JSONB,
    "output_data" JSONB,
    "duration_ms" INTEGER,
    "status" "AgentLogStatus",
    "error_message" TEXT,
    "shipment_id" INTEGER,
    "hub_id" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_weather_events_hub_id" ON "weather_events"("hub_id");

-- CreateIndex
CREATE INDEX "idx_risk_scores_hub_id" ON "risk_scores"("hub_id");

-- CreateIndex
CREATE INDEX "idx_risk_scores_computed_at" ON "risk_scores"("computed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tracking_id_key" ON "shipments"("tracking_id");

-- CreateIndex
CREATE INDEX "idx_shipments_status" ON "shipments"("status");

-- CreateIndex
CREATE INDEX "idx_shipments_tracking" ON "shipments"("tracking_id");

-- CreateIndex
CREATE INDEX "idx_route_changes_shipment" ON "route_changes"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_agent_logs_created" ON "agent_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_origin_hub_id_fkey" FOREIGN KEY ("origin_hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_destination_hub_id_fkey" FOREIGN KEY ("destination_hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_events" ADD CONSTRAINT "weather_events_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_weather_event_id_fkey" FOREIGN KEY ("weather_event_id") REFERENCES "weather_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_origin_hub_id_fkey" FOREIGN KEY ("origin_hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_destination_hub_id_fkey" FOREIGN KEY ("destination_hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_current_hub_id_fkey" FOREIGN KEY ("current_hub_id") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_changes" ADD CONSTRAINT "route_changes_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_changes" ADD CONSTRAINT "route_changes_triggered_by_hub_id_fkey" FOREIGN KEY ("triggered_by_hub_id") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_changes" ADD CONSTRAINT "route_changes_triggered_by_risk_score_id_fkey" FOREIGN KEY ("triggered_by_risk_score_id") REFERENCES "risk_scores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_route_change_id_fkey" FOREIGN KEY ("route_change_id") REFERENCES "route_changes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_assigned_hub_id_fkey" FOREIGN KEY ("assigned_hub_id") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
