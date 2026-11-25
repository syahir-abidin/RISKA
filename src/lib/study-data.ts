import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as T from "@/db/schema";
import { GRIDS, type GridKey, type Computed } from "./grids";
import { riskScore, zoneOf, ZONE_LABEL, lopaCalc, rpn, actionPriority, cosoAppetite, fmtSci, type RiskConfig, type Zone } from "./risk";
import { GRID_TABLES } from "./grid-tables";

export interface Sheet { key: GridKey; title: string; group?: string; headers: string[]; rows: string[][]; zones: (Zone | null)[] }

const num = (v: unknown) => (typeof v === "number" ? v : null);

function computedText(c: Computed, r: Record<string, unknown>, cfg: RiskConfig): string {
  switch (c.kind) {
    case "risk": { const sc = riskScore(num(r[c.s]), num(r[c.l])); const z = zoneOf(sc, cfg); return z ? `${sc} ${ZONE_LABEL[z]}` : ""; }
    case "lopaFlag": return (num(r[c.s]) ?? 0) >= 4 ? "Kandidat LOPA" : "";
    case "lopa": {
      const x = lopaCalc({ ief: num(r.ief), ipls: String(r.ipls ?? ""), modifiers: String(r.modifiers ?? ""), severity: num(r.severity), tmelOverride: num(r.tmelOverride) }, cfg);
      return `f_mit ${fmtSci(x.mitigated)}; TMEL ${fmtSci(x.tmel)}; RRF ${x.rrf == null ? "–" : x.rrf < 1 ? "≤1" : Math.round(x.rrf)}; ${x.sil}`;
    }
    case "rpn": return String(rpn(num(r[c.s]), num(r[c.o]), num(r[c.d])) ?? "");
    case "ap": return actionPriority(num(r[c.s]), num(r[c.o]), num(r[c.d])) ?? "";
    case "appetite": return cosoAppetite(riskScore(num(r[c.i]), num(r[c.l])), String(r[c.category] ?? ""), cfg) ?? "";
    case "kri": return r.kriValue != null && r.kriThreshold != null ? `${r.kriValue} / ${r.kriThreshold}` : "";
  }
}

function toSheet(key: GridKey, rows: Record<string, unknown>[], cfg: RiskConfig, group?: string): Sheet {
  const g = GRIDS[key];
  const riskC = g.computed.filter((c) => c.kind === "risk");
  const lastRisk = riskC[riskC.length - 1] as Extract<Computed, { kind: "risk" }> | undefined;
  return {
    key, title: g.title, group,
    headers: [...g.columns.map((c) => c.label), ...g.computed.map((c) => c.label)],
    rows: rows.map((r) => [
      ...g.columns.map((c) => (c.type === "bool" ? (r[c.key] ? "Ya" : "") : r[c.key] == null ? "" : String(r[c.key]))),
      ...g.computed.map((c) => computedText(c, r, cfg)),
    ]),
    zones: rows.map((r) => (lastRisk ? zoneOf(riskScore(num(r[lastRisk.s]), num(r[lastRisk.l])), cfg) : null)),
  };
}

export async function studySheets(orgId: string, study: typeof T.studies.$inferSelect, cfg: RiskConfig): Promise<Sheet[]> {
  const load = async (key: GridKey) => {
    const t = GRID_TABLES[key];
    return (await db.select().from(t).where(and(eq(t.orgId, orgId), eq(t.studyId, study.id))).orderBy(asc(t.sort))) as Record<string, unknown>[];
  };
  if (study.module === "HAZOP") {
    const nodes = await load("hazopNode");
    const rows = await load("hazopRow");
    return [toSheet("hazopNode", nodes, cfg), ...nodes.map((n) => toSheet("hazopRow", rows.filter((r) => r.nodeId === n.id), cfg, `${n.code} ${n.name}`))];
  }
  if (study.module === "FRA") {
    const areas = await load("fireArea");
    const sc = await load("fireScenario");
    const cp = await load("compliance");
    return [toSheet("fireArea", areas, cfg), ...areas.flatMap((a) => [
      toSheet("fireScenario", sc.filter((r) => r.areaId === a.id), cfg, `${a.code} ${a.name}`),
      toSheet("compliance", cp.filter((r) => r.areaId === a.id), cfg, `${a.code} ${a.name}`),
    ])];
  }
  const key = ({ LOPA: "lopa", HIRADC: "hiradc", FMEA: "fmea", COSO: "coso" } as const)[study.module];
  return [toSheet(key, await load(key), cfg)];
}
