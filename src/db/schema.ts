// RISKA — skema multi-tenant (shared database; isolasi baris memakai orgId)
import { pgTable, pgEnum, text, integer, boolean, timestamp, doublePrecision, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum("role", ["OWNER", "ADMIN", "FACILITATOR", "MEMBER", "REVIEWER", "VIEWER"]);
export const moduleEnum = pgEnum("module_key", ["HAZOP", "LOPA", "FRA", "HIRADC", "FMEA", "COSO"]);
export const studyStatusEnum = pgEnum("study_status", ["DRAFT", "IN_REVIEW", "APPROVED"]);
export const actionStatusEnum = pgEnum("action_status", ["OPEN", "IN_PROGRESS", "PENDING_VERIFICATION", "CLOSED", "REJECTED"]);

export type Role = (typeof roleEnum.enumValues)[number];
export type ModuleKey = (typeof moduleEnum.enumValues)[number];
export type StudyStatus = (typeof studyStatusEnum.enumValues)[number];
export type ActionStatus = (typeof actionStatusEnum.enumValues)[number];

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: created(),
});

export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  isDemo: boolean("is_demo").notNull().default(false),
  riskConfig: jsonb("risk_config").notNull(),
  actionSeq: integer("action_seq").notNull().default(0),
  createdAt: created(),
});

export const memberships = pgTable("memberships", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull(),
  createdAt: created(),
}, (t) => ({ uq: uniqueIndex("membership_user_org").on(t.userId, t.orgId), org: index("membership_org").on(t.orgId) }));

export const invitations = pgTable("invitations", {
  id: id(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: roleEnum("role").notNull(),
  createdAt: created(),
}, (t) => ({ uq: uniqueIndex("invitation_org_email").on(t.orgId, t.email) }));

export const sites = pgTable("sites", {
  id: id(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  location: text("location").notNull().default(""),
}, (t) => ({ org: index("site_org").on(t.orgId) }));

export const studies = pgTable("studies", {
  id: id(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  siteId: text("site_id").references(() => sites.id, { onDelete: "set null" }),
  module: moduleEnum("module").notNull(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  scope: text("scope").notNull().default(""),
  references: text("references").notNull().default(""),
  team: text("team").notNull().default(""),
  assumptions: text("assumptions").notNull().default(""),
  status: studyStatusEnum("status").notNull().default("DRAFT"),
  version: integer("version").notNull().default(1),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdById: text("created_by_id"),
  createdAt: created(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ orgMod: index("study_org_module").on(t.orgId, t.module) }));

// Kolom bersama untuk baris worksheet milik sebuah studi
const rowBase = () => ({
  id: id(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  studyId: text("study_id").notNull().references(() => studies.id, { onDelete: "cascade" }),
  sort: integer("sort").notNull().default(0),
});
const s = (n: string) => text(n).notNull().default("");

// ---------- HAZOP (IEC 61882) ----------
export const hazopNodes = pgTable("hazop_nodes", {
  ...rowBase(),
  code: s("code"),
  name: s("name"),
  boundary: s("boundary"),
  designIntent: s("design_intent"),
  mode: text("mode").notNull().default("Normal"),
  drawings: s("drawings"),
}, (t) => ({ ix: index("hazop_nodes_org_study").on(t.orgId, t.studyId) }));

export const hazopRows = pgTable("hazop_rows", {
  ...rowBase(),
  nodeId: text("node_id").notNull().references(() => hazopNodes.id, { onDelete: "cascade" }),
  parameter: s("parameter"),
  guideword: s("guideword"),
  deviation: s("deviation"),
  cause: s("cause"),
  consequence: s("consequence"),
  safeguards: s("safeguards"),
  iplCandidate: boolean("ipl_candidate").notNull().default(false),
  s: integer("s"),
  l: integer("l"),
  recommendation: s("recommendation"),
  discipline: s("discipline"),
}, (t) => ({ ix: index("hazop_rows_org_study").on(t.orgId, t.studyId) }));

// ---------- LOPA (IEC 61511 / CCPS) ----------
export const lopaScenarios = pgTable("lopa_scenarios", {
  ...rowBase(),
  code: s("code"),
  hazopRef: s("hazop_ref"),
  description: s("description"),
  severity: integer("severity"),
  initiatingEvent: s("initiating_event"),
  ief: doublePrecision("ief"),
  ipls: s("ipls"), // satu IPL per baris: "Nama | PFD"
  modifiers: s("modifiers"), // satu per baris: "Nama | nilai"
  tmelOverride: doublePrecision("tmel_override"),
  notes: s("notes"),
}, (t) => ({ ix: index("lopa_org_study").on(t.orgId, t.studyId) }));

// ---------- FRA (NFPA 850 / NFPA 551) ----------
export const fireAreas = pgTable("fire_areas", {
  ...rowBase(),
  code: s("code"),
  name: s("name"),
  location: s("location"),
  barriers: s("barriers"),
  fuelLoad: s("fuel_load"),
  occupancy: s("occupancy"),
  criticalAssets: s("critical_assets"),
}, (t) => ({ ix: index("fire_areas_org_study").on(t.orgId, t.studyId) }));

export const fireScenarios = pgTable("fire_scenarios", {
  ...rowBase(),
  areaId: text("area_id").notNull().references(() => fireAreas.id, { onDelete: "cascade" }),
  title: s("title"),
  sequence: s("sequence"),
  detection: s("detection"),
  suppression: s("suppression"),
  passive: s("passive"),
  reliability: s("reliability"),
  consequence: s("consequence"),
  s0: integer("s0"),
  l0: integer("l0"),
  s1: integer("s1"),
  l1: integer("l1"),
  recommendation: s("recommendation"),
}, (t) => ({ ix: index("fire_scen_org_study").on(t.orgId, t.studyId) }));

export const complianceItems = pgTable("compliance_items", {
  ...rowBase(),
  areaId: text("area_id").notNull().references(() => fireAreas.id, { onDelete: "cascade" }),
  requirement: s("requirement"),
  reference: s("reference"),
  status: text("status").notNull().default("Belum dinilai"),
  justification: s("justification"),
}, (t) => ({ ix: index("compliance_org_study").on(t.orgId, t.studyId) }));

// ---------- HIRADC (PP 50/2012, ISO 45001) ----------
export const hiradcRows = pgTable("hiradc_rows", {
  ...rowBase(),
  area: s("area"),
  activity: s("activity"),
  routine: text("routine").notNull().default("Rutin"),
  hazard: s("hazard"),
  risk: s("risk"),
  existingControls: s("existing_controls"),
  s0: integer("s0"),
  l0: integer("l0"),
  hierarchy: s("hierarchy"),
  additionalControls: s("additional_controls"),
  s1: integer("s1"),
  l1: integer("l1"),
  pic: s("pic"),
  legalRef: s("legal_ref"),
}, (t) => ({ ix: index("hiradc_org_study").on(t.orgId, t.studyId) }));

// ---------- FMEA ----------
export const fmeaRows = pgTable("fmea_rows", {
  ...rowBase(),
  item: s("item"),
  function: s("function"),
  failureMode: s("failure_mode"),
  effect: s("effect"),
  cause: s("cause"),
  prevention: s("prevention"),
  detectionCtl: s("detection_ctl"),
  sev: integer("sev"),
  occ: integer("occ"),
  det: integer("det"),
  action: s("action"),
  pic: s("pic"),
  sev2: integer("sev2"),
  occ2: integer("occ2"),
  det2: integer("det2"),
}, (t) => ({ ix: index("fmea_org_study").on(t.orgId, t.studyId) }));

// ---------- COSO ERM 2017 ----------
export const cosoRisks = pgTable("coso_risks", {
  ...rowBase(),
  code: s("code"),
  objective: s("objective"),
  category: text("category").notNull().default("Operations"),
  component: s("component"),
  description: s("description"),
  owner: s("owner"),
  i0: integer("i0"),
  l0: integer("l0"),
  response: s("response"),
  responsePlan: s("response_plan"),
  i1: integer("i1"),
  l1: integer("l1"),
  kri: s("kri"),
  kriValue: doublePrecision("kri_value"),
  kriThreshold: doublePrecision("kri_threshold"),
  trend: text("trend").notNull().default("Stabil"),
}, (t) => ({ ix: index("coso_org_study").on(t.orgId, t.studyId) }));

// ---------- Rekomendasi / action tracker ----------
export const actions = pgTable("actions", {
  id: id(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  module: moduleEnum("module").notNull(),
  studyId: text("study_id").references(() => studies.id, { onDelete: "set null" }),
  sourceRef: s("source_ref"),
  sourceLabel: s("source_label"),
  description: text("description").notNull(),
  owner: s("owner"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  priority: text("priority").notNull().default("Sedang"),
  status: actionStatusEnum("status").notNull().default("OPEN"),
  justification: s("justification"),
  evidence: s("evidence"),
  verifier: s("verifier"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: created(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ uq: uniqueIndex("action_org_number").on(t.orgId, t.number), st: index("action_org_status").on(t.orgId, t.status) }));

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  orgId: text("org_id").notNull(),
  userId: text("user_id"),
  userName: s("user_name"),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  diff: jsonb("diff"),
  createdAt: created(),
}, (t) => ({ ix: index("audit_org_created").on(t.orgId, t.createdAt) }));
