import "server-only";
import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { studies, hazopRows, hazopNodes, fireScenarios, fireAreas, hiradcRows, cosoRisks, actions, type ModuleKey } from "@/db/schema";
import { riskScore, zoneOf, type RiskConfig, type Zone } from "./risk";

export interface RiskItem {
  module: ModuleKey;
  studyId: string;
  studyCode: string;
  siteId: string | null;
  ref: string;
  description: string;
  s: number | null;
  l: number | null;
  score: number | null;
  zone: Zone | null;
  basis: "Residual" | "Awal" | "Inheren" | "Unmitigated";
}

/** Risiko dari semua modul berbasis matriks S×L. FMEA (RPN) dan LOPA (frekuensi) ditampilkan di modulnya sendiri. */
export async function riskItems(orgId: string, cfg: RiskConfig): Promise<RiskItem[]> {
  const st = await db.select().from(studies).where(eq(studies.orgId, orgId));
  const byId = new Map(st.map((x) => [x.id, x]));
  const out: RiskItem[] = [];
  const push = (module: ModuleKey, studyId: string, ref: string, description: string, s: number | null, l: number | null, basis: RiskItem["basis"]) => {
    const study = byId.get(studyId);
    if (!study) return;
    const score = riskScore(s, l);
    out.push({ module, studyId, studyCode: study.code, siteId: study.siteId, ref, description, s, l, score, zone: zoneOf(score, cfg), basis });
  };
  const hz = await db.select({ r: hazopRows, n: hazopNodes }).from(hazopRows).innerJoin(hazopNodes, eq(hazopRows.nodeId, hazopNodes.id)).where(eq(hazopRows.orgId, orgId));
  for (const { r, n } of hz) push("HAZOP", r.studyId, `${n.code} · ${r.deviation || r.guideword + " " + r.parameter}`, r.consequence || r.cause, r.s, r.l, "Unmitigated");
  const fs = await db.select({ r: fireScenarios, a: fireAreas }).from(fireScenarios).innerJoin(fireAreas, eq(fireScenarios.areaId, fireAreas.id)).where(eq(fireScenarios.orgId, orgId));
  for (const { r, a } of fs) {
    const res = r.s1 != null && r.l1 != null;
    push("FRA", r.studyId, `${a.code} · ${r.title}`, r.consequence || r.sequence, res ? r.s1 : r.s0, res ? r.l1 : r.l0, res ? "Residual" : "Awal");
  }
  for (const r of await db.select().from(hiradcRows).where(eq(hiradcRows.orgId, orgId))) {
    const res = r.s1 != null && r.l1 != null;
    push("HIRADC", r.studyId, `${r.area} · ${r.activity}`.slice(0, 120), r.hazard + (r.risk ? ` → ${r.risk}` : ""), res ? r.s1 : r.s0, res ? r.l1 : r.l0, res ? "Residual" : "Awal");
  }
  for (const r of await db.select().from(cosoRisks).where(eq(cosoRisks.orgId, orgId))) {
    const res = r.i1 != null && r.l1 != null;
    push("COSO", r.studyId, `${r.code} · ${r.category}`, r.description, res ? r.i1 : r.i0, res ? r.l1 : r.l0, res ? "Residual" : "Inheren");
  }
  return out;
}

export async function actionNumbersForStudy(orgId: string, studyId: string): Promise<Record<string, number>> {
  const rows = await db.select({ ref: actions.sourceRef, n: actions.number }).from(actions).where(and(eq(actions.orgId, orgId), eq(actions.studyId, studyId), like(actions.sourceRef, "%:%")));
  const m: Record<string, number> = {};
  for (const r of rows) m[r.ref.split(":")[1]] = r.n;
  return m;
}

export function heatCounts(items: RiskItem[]) {
  const c: Record<string, number> = {};
  for (const i of items) if (i.s && i.l) c[`${i.s}-${i.l}`] = (c[`${i.s}-${i.l}`] ?? 0) + 1;
  return c;
}
