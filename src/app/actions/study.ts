"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, gte, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { studies, sites, fireAreas, complianceItems, hazopRows, hazopNodes, lopaScenarios, moduleEnum, type ModuleKey } from "@/db/schema";
import { requirePerm, audit, getCtx } from "@/lib/context";
import { slugOf } from "@/lib/grids";
import { PLTU_FIRE_AREAS, complianceFor, STUDY_PREFIX } from "@/lib/templates";

const Info = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(200),
  code: z.string().trim().max(40).optional(),
  siteId: z.string().optional(),
  scope: z.string().max(8000).default(""),
  references: z.string().max(8000).default(""),
  team: z.string().max(8000).default(""),
  assumptions: z.string().max(8000).default(""),
});

async function ownStudy(orgId: string, id: string) {
  const [st] = await db.select().from(studies).where(and(eq(studies.id, id), eq(studies.orgId, orgId))).limit(1);
  if (!st) redirect("/dashboard");
  return st;
}

async function validSite(orgId: string, siteId?: string) {
  if (!siteId) return null;
  const [s] = await db.select({ id: sites.id }).from(sites).where(and(eq(sites.id, siteId), eq(sites.orgId, orgId))).limit(1);
  return s?.id ?? null;
}

export async function createStudy(fd: FormData) {
  const ctx = await requirePerm("createStudy");
  const module = z.enum(moduleEnum.enumValues).parse(fd.get("module"));
  const p = Info.safeParse(Object.fromEntries(fd));
  if (!p.success) redirect(`/m/${slugOf(module)}?e=${encodeURIComponent(p.error.issues[0].message)}`);
  const [{ c }] = await db.select({ c: count() }).from(studies).where(and(eq(studies.orgId, ctx.orgId), eq(studies.module, module)));
  const code = p.data.code || `${STUDY_PREFIX[module]}-${new Date().getFullYear()}-${String(c + 1).padStart(3, "0")}`;
  const [st] = await db.insert(studies).values({
    orgId: ctx.orgId, module, code, title: p.data.title, siteId: await validSite(ctx.orgId, p.data.siteId),
    scope: p.data.scope, references: p.data.references, team: p.data.team, assumptions: p.data.assumptions, createdById: ctx.userId,
  }).returning();
  await audit(ctx, "study", st.id, "create", { module, code });
  redirect(`/m/${slugOf(module)}/${st.id}`);
}

export async function updateStudyInfo(fd: FormData) {
  const ctx = await requirePerm("edit");
  const st = await ownStudy(ctx.orgId, String(fd.get("id")));
  const back = `/m/${slugOf(st.module)}/${st.id}?tab=info`;
  if (st.status === "APPROVED") redirect(`${back}&e=${encodeURIComponent("Studi terkunci karena sudah disetujui.")}`);
  const p = Info.safeParse(Object.fromEntries(fd));
  if (!p.success) redirect(`${back}&e=${encodeURIComponent(p.error.issues[0].message)}`);
  await db.update(studies).set({
    title: p.data.title, code: p.data.code || st.code, siteId: await validSite(ctx.orgId, p.data.siteId),
    scope: p.data.scope, references: p.data.references, team: p.data.team, assumptions: p.data.assumptions, updatedAt: new Date(),
  }).where(and(eq(studies.id, st.id), eq(studies.orgId, ctx.orgId)));
  await audit(ctx, "study", st.id, "update-info");
  revalidatePath(back);
  redirect(`${back}&m=${encodeURIComponent("Informasi studi disimpan.")}`);
}

/** Alur status: DRAFT → IN_REVIEW → APPROVED; reviewer dapat mengembalikan ke DRAFT; revisi baru membuka kunci. */
export async function setStudyStatus(fd: FormData) {
  const op = String(fd.get("op"));
  const ctx = await getCtx();
  const st = await ownStudy(ctx.orgId, String(fd.get("id")));
  const back = `/m/${slugOf(st.module)}/${st.id}`;
  const deny = (m: string) => redirect(`${back}?e=${encodeURIComponent(m)}`);
  if (op === "submit") {
    await requirePerm("edit").catch(() => deny("Peran Anda tidak dapat mengajukan review."));
    if (st.status !== "DRAFT") deny("Hanya studi Draft yang dapat diajukan.");
    await db.update(studies).set({ status: "IN_REVIEW", updatedAt: new Date() }).where(eq(studies.id, st.id));
  } else if (op === "approve" || op === "return") {
    await requirePerm("approve").catch(() => deny("Hanya Reviewer, Admin, atau Owner yang dapat menyetujui."));
    if (st.status !== "IN_REVIEW") deny("Studi harus berstatus In Review.");
    if (op === "approve") await db.update(studies).set({ status: "APPROVED", approvedBy: ctx.userName, approvedAt: new Date(), updatedAt: new Date() }).where(eq(studies.id, st.id));
    else await db.update(studies).set({ status: "DRAFT", updatedAt: new Date() }).where(eq(studies.id, st.id));
  } else if (op === "revise") {
    await requirePerm("createStudy").catch(() => deny("Peran Anda tidak dapat membuat revisi."));
    if (st.status !== "APPROVED") deny("Revisi hanya untuk studi yang sudah disetujui.");
    await db.update(studies).set({ status: "DRAFT", version: st.version + 1, approvedBy: null, approvedAt: null, updatedAt: new Date() }).where(eq(studies.id, st.id));
  } else deny("Operasi tidak dikenal.");
  await audit(ctx, "study", st.id, `status:${op}`, { from: st.status });
  revalidatePath(back);
  redirect(back);
}

export async function deleteStudy(fd: FormData) {
  const ctx = await requirePerm("manageOrg");
  const st = await ownStudy(ctx.orgId, String(fd.get("id")));
  if (String(fd.get("confirm") ?? "").trim() !== st.code) redirect(`/m/${slugOf(st.module)}/${st.id}?tab=info&e=${encodeURIComponent("Ketik kode studi persis untuk menghapus.")}`);
  await db.delete(studies).where(and(eq(studies.id, st.id), eq(studies.orgId, ctx.orgId)));
  await audit(ctx, "study", st.id, "delete", { code: st.code });
  redirect(`/m/${slugOf(st.module)}`);
}

export async function loadFraTemplate(fd: FormData) {
  const ctx = await requirePerm("edit");
  const st = await ownStudy(ctx.orgId, String(fd.get("id")));
  const back = `/m/fra/${st.id}`;
  if (st.module !== "FRA" || st.status === "APPROVED") redirect(`${back}?e=${encodeURIComponent("Template hanya untuk studi FRA yang belum disetujui.")}`);
  const existing = await db.select({ code: fireAreas.code }).from(fireAreas).where(and(eq(fireAreas.studyId, st.id), eq(fireAreas.orgId, ctx.orgId)));
  const have = new Set(existing.map((e) => e.code));
  let added = 0;
  await db.transaction(async (tx) => {
    for (const [i, t] of PLTU_FIRE_AREAS.entries()) {
      if (have.has(t.code)) continue;
      const [a] = await tx.insert(fireAreas).values({ orgId: ctx.orgId, studyId: st.id, sort: existing.length + i + 1, code: t.code, name: t.name, fuelLoad: t.fuelLoad, criticalAssets: t.criticalAssets }).returning();
      await tx.insert(complianceItems).values(complianceFor(t).map((c, j) => ({ orgId: ctx.orgId, studyId: st.id, areaId: a.id, sort: j + 1, requirement: c.requirement, reference: c.reference })));
      added++;
    }
  });
  await audit(ctx, "study", st.id, "fra-template", { added });
  revalidatePath(back);
  redirect(`${back}?m=${encodeURIComponent(`${added} fire area template ditambahkan. Lengkapi batas, barrier, dan skenario sesuai kondisi plant.`)}`);
}

export async function importLopaCandidates(fd: FormData) {
  const ctx = await requirePerm("edit");
  const st = await ownStudy(ctx.orgId, String(fd.get("id")));
  const src = await ownStudy(ctx.orgId, String(fd.get("hazopStudyId")));
  const back = `/m/lopa/${st.id}`;
  if (st.module !== "LOPA" || src.module !== "HAZOP" || st.status === "APPROVED") redirect(`${back}?e=${encodeURIComponent("Pilih studi HAZOP sebagai sumber dan pastikan studi LOPA belum disetujui.")}`);
  const rows = await db.select({ r: hazopRows, n: hazopNodes }).from(hazopRows).innerJoin(hazopNodes, eq(hazopRows.nodeId, hazopNodes.id))
    .where(and(eq(hazopRows.studyId, src.id), eq(hazopRows.orgId, ctx.orgId), gte(hazopRows.s, 4)));
  const existing = await db.select({ ref: lopaScenarios.hazopRef }).from(lopaScenarios).where(and(eq(lopaScenarios.studyId, st.id), eq(lopaScenarios.orgId, ctx.orgId)));
  const have = new Set(existing.map((e) => e.ref));
  let n = existing.length, added = 0;
  for (const { r, n: node } of rows) {
    const ref = `${src.code} / ${node.code} / ${r.deviation || r.guideword + " " + r.parameter} [${r.id.slice(0, 8)}]`;
    if (have.has(ref)) continue;
    n++; added++;
    await db.insert(lopaScenarios).values({ orgId: ctx.orgId, studyId: st.id, sort: n, code: `LP-${String(n).padStart(2, "0")}`, hazopRef: ref, description: `${r.cause} → ${r.consequence}`.slice(0, 2000), severity: r.s, initiatingEvent: r.cause.slice(0, 500), notes: `Safeguard HAZOP: ${r.safeguards}`.slice(0, 2000) });
  }
  await audit(ctx, "study", st.id, "lopa-import", { from: src.code, added });
  revalidatePath(back);
  redirect(`${back}?m=${encodeURIComponent(`${added} kandidat LOPA (S≥4) diimpor dari ${src.code}. Isi IEF dan IPL yang memenuhi kriteria.`)}`);
}

export async function listModuleStudies(module: ModuleKey) {
  const ctx = await getCtx();
  return db.select().from(studies).where(and(eq(studies.orgId, ctx.orgId), eq(studies.module, module)));
}
