CREATE TYPE "public"."action_status" AS ENUM('OPEN', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'CLOSED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."module_key" AS ENUM('HAZOP', 'LOPA', 'FRA', 'HIRADC', 'FMEA', 'COSO');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('OWNER', 'ADMIN', 'FACILITATOR', 'MEMBER', 'REVIEWER', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."study_status" AS ENUM('DRAFT', 'IN_REVIEW', 'APPROVED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "actions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"number" integer NOT NULL,
	"module" "module_key" NOT NULL,
	"study_id" text,
	"source_ref" text DEFAULT '' NOT NULL,
	"source_label" text DEFAULT '' NOT NULL,
	"description" text NOT NULL,
	"owner" text DEFAULT '' NOT NULL,
	"due_date" timestamp with time zone,
	"priority" text DEFAULT 'Sedang' NOT NULL,
	"status" "action_status" DEFAULT 'OPEN' NOT NULL,
	"justification" text DEFAULT '' NOT NULL,
	"evidence" text DEFAULT '' NOT NULL,
	"verifier" text DEFAULT '' NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text,
	"user_name" text DEFAULT '' NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"diff" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance_items" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"study_id" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"area_id" text NOT NULL,
	"requirement" text DEFAULT '' NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Belum dinilai' NOT NULL,
	"justification" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coso_risks" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"study_id" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"code" text DEFAULT '' NOT NULL,
	"objective" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'Operations' NOT NULL,
	"component" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"owner" text DEFAULT '' NOT NULL,
	"i0" integer,
	"l0" integer,
	"response" text DEFAULT '' NOT NULL,
	"response_plan" text DEFAULT '' NOT NULL,
	"i1" integer,
	"l1" integer,
	"kri" text DEFAULT '' NOT NULL,
	"kri_value" double precision,
	"kri_threshold" double precision,
	"trend" text DEFAULT 'Stabil' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fire_areas" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"study_id" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"code" text DEFAULT '' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"barriers" text DEFAULT '' NOT NULL,
	"fuel_load" text DEFAULT '' NOT NULL,
	"occupancy" text DEFAULT '' NOT NULL,
	"critical_assets" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fire_scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"study_id" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"area_id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"sequence" text DEFAULT '' NOT NULL,
	"detection" text DEFAULT '' NOT NULL,
	"suppression" text DEFAULT '' NOT NULL,
	"passive" text DEFAULT '' NOT NULL,
	"reliability" text DEFAULT '' NOT NULL,
	"consequence" text DEFAULT '' NOT NULL,
	"s0" integer,
	"l0" integer,
	"s1" integer,
	"l1" integer,
	"recommendation" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fmea_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"study_id" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"item" text DEFAULT '' NOT NULL,
	"function" text DEFAULT '' NOT NULL,
	"failure_mode" text DEFAULT '' NOT NULL,
	"effect" text DEFAULT '' NOT NULL,
	"cause" text DEFAULT '' NOT NULL,
	"prevention" text DEFAULT '' NOT NULL,
	"detection_ctl" text DEFAULT '' NOT NULL,
	"sev" integer,
	"occ" integer,
	"det" integer,
	"action" text DEFAULT '' NOT NULL,
	"pic" text DEFAULT '' NOT NULL,
	"sev2" integer,
	"occ2" integer,
	"det2" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hazop_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"study_id" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"code" text DEFAULT '' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"boundary" text DEFAULT '' NOT NULL,
	"design_intent" text DEFAULT '' NOT NULL,
	"mode" text DEFAULT 'Normal' NOT NULL,
	"drawings" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hazop_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"study_id" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"node_id" text NOT NULL,
	"parameter" text DEFAULT '' NOT NULL,
	"guideword" text DEFAULT '' NOT NULL,
	"deviation" text DEFAULT '' NOT NULL,
	"cause" text DEFAULT '' NOT NULL,
	"consequence" text DEFAULT '' NOT NULL,
	"safeguards" text DEFAULT '' NOT NULL,
	"ipl_candidate" boolean DEFAULT false NOT NULL,
	"s" integer,
	"l" integer,
	"recommendation" text DEFAULT '' NOT NULL,
	"discipline" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hiradc_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"study_id" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"area" text DEFAULT '' NOT NULL,
	"activity" text DEFAULT '' NOT NULL,
	"routine" text DEFAULT 'Rutin' NOT NULL,
	"hazard" text DEFAULT '' NOT NULL,
	"risk" text DEFAULT '' NOT NULL,
	"existing_controls" text DEFAULT '' NOT NULL,
	"s0" integer,
	"l0" integer,
	"hierarchy" text DEFAULT '' NOT NULL,
	"additional_controls" text DEFAULT '' NOT NULL,
	"s1" integer,
	"l1" integer,
	"pic" text DEFAULT '' NOT NULL,
	"legal_ref" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"email" text NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lopa_scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"study_id" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"code" text DEFAULT '' NOT NULL,
	"hazop_ref" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"severity" integer,
	"initiating_event" text DEFAULT '' NOT NULL,
	"ief" double precision,
	"ipls" text DEFAULT '' NOT NULL,
	"modifiers" text DEFAULT '' NOT NULL,
	"tmel_override" double precision,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"role" "role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"risk_config" jsonb NOT NULL,
	"action_seq" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sites" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"location" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studies" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"site_id" text,
	"module" "module_key" NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"references" text DEFAULT '' NOT NULL,
	"team" text DEFAULT '' NOT NULL,
	"assumptions" text DEFAULT '' NOT NULL,
	"status" "study_status" DEFAULT 'DRAFT' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actions" ADD CONSTRAINT "actions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "actions" ADD CONSTRAINT "actions_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_area_id_fire_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."fire_areas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coso_risks" ADD CONSTRAINT "coso_risks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coso_risks" ADD CONSTRAINT "coso_risks_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fire_areas" ADD CONSTRAINT "fire_areas_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fire_areas" ADD CONSTRAINT "fire_areas_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fire_scenarios" ADD CONSTRAINT "fire_scenarios_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fire_scenarios" ADD CONSTRAINT "fire_scenarios_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fire_scenarios" ADD CONSTRAINT "fire_scenarios_area_id_fire_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."fire_areas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fmea_rows" ADD CONSTRAINT "fmea_rows_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fmea_rows" ADD CONSTRAINT "fmea_rows_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hazop_nodes" ADD CONSTRAINT "hazop_nodes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hazop_nodes" ADD CONSTRAINT "hazop_nodes_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hazop_rows" ADD CONSTRAINT "hazop_rows_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hazop_rows" ADD CONSTRAINT "hazop_rows_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hazop_rows" ADD CONSTRAINT "hazop_rows_node_id_hazop_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."hazop_nodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hiradc_rows" ADD CONSTRAINT "hiradc_rows_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hiradc_rows" ADD CONSTRAINT "hiradc_rows_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invitations" ADD CONSTRAINT "invitations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lopa_scenarios" ADD CONSTRAINT "lopa_scenarios_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lopa_scenarios" ADD CONSTRAINT "lopa_scenarios_study_id_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."studies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sites" ADD CONSTRAINT "sites_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studies" ADD CONSTRAINT "studies_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studies" ADD CONSTRAINT "studies_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "action_org_number" ON "actions" USING btree ("org_id","number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "action_org_status" ON "actions" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_org_created" ON "audit_logs" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_org_study" ON "compliance_items" USING btree ("org_id","study_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coso_org_study" ON "coso_risks" USING btree ("org_id","study_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_areas_org_study" ON "fire_areas" USING btree ("org_id","study_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fire_scen_org_study" ON "fire_scenarios" USING btree ("org_id","study_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fmea_org_study" ON "fmea_rows" USING btree ("org_id","study_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hazop_nodes_org_study" ON "hazop_nodes" USING btree ("org_id","study_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hazop_rows_org_study" ON "hazop_rows" USING btree ("org_id","study_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hiradc_org_study" ON "hiradc_rows" USING btree ("org_id","study_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invitation_org_email" ON "invitations" USING btree ("org_id","email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lopa_org_study" ON "lopa_scenarios" USING btree ("org_id","study_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "membership_user_org" ON "memberships" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "membership_org" ON "memberships" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_org" ON "sites" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_org_module" ON "studies" USING btree ("org_id","module");