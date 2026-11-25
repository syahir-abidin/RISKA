"use server";
import { revalidatePath } from "next/cache";
import { and, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { studies, actions } from "@/db/schema";
import { requirePerm, audit, ForbiddenError } from "@/lib/context";
import { GRIDS, composeDeviation, rowLabel, slugOf, type GridKey, type Column } from "@/lib/grids";
import { GRID_TABLES, PARENT_TABLES } from "@/lib/grid-tables";
import { nextActionNumber } from "@/lib/orgs";

export type Row = Record<string, unknown> & { id: string };
type Result = { ok: true; row?: Row; actionNumber?: number } | { ok: false; error: string };

function fail(e: unknown): Result {
  if (e instanceof ForbiddenError) return { ok: false, error: e.message };
  if (e instanceof Error && e.message.startsWith("VALIDASI:")) return { ok: false, error: e.message.slice(9).trim() };
  console.error(e);
  return { ok: false, error: "Terjadi kesalahan server. Coba lagi." };
}

async function editableStudy(orgId: string, studyId: string) {
  const [st] = await db.select().from(studies).where(and(eq(studies.id, studyId), eq(studies.orgId, orgId))).limit(1);
  if (!st) throw new Error("VALIDASI: Studi tidak ditemukan di organisasi ini.");
  if (st.status === "APPROVED") throw new Error("VALIDASI: Studi sudah disetujui dan terkunci. Buat revisi baru untuk mengubah.");
  return st;
}

function coerce(col: Column, raw: unknown): unknown {
  if (col.type === "bool") return raw === true || raw === "true";
  const v = typeof raw === "string" ? raw.trim() : raw;
  if (col.type === "int" || col.type === "float") {
    if (v === "" || v == null) return null;
    const n = Number(String(v).replace(",", "."));
    if (!Number.isFinite(n)) throw new Error(`VALIDASI: ${col.label} harus berupa angka.`);
    if (col.type === "int" && !Number.isInteger(n)) throw new Error(`VALIDASI: ${col.label} harus bilangan bulat.`);
    if (col.min != null && n < col.min) throw new Error(`VALIDASI: ${col.label} minimal ${col.min}.`);
    if (col.max != null && n > col.max) throw new Error(`VALIDASI: ${col.label} maksimal ${col.max}.`);
    return n;
  }
  const s = String(v ?? "");
  if (s.length > 8000) throw new Error(`VALIDASI: ${col.label} terlalu panjang (maks. 8000 karakter).`);
  if (col.type === "select" && s !== "" && col.options && !col.options.includes(s)) throw new Error(`VALIDASI: Nilai ${col.label} tidak dikenal.`);
  return s;
}

export async function addRow(gridKey: GridKey, studyId: string, parentId?: string): Promise<Result> {
  try {
    const ctx = await requirePerm("edit");
    const grid = GRIDS[gridKey];
    const st = await editableStudy(ctx.orgId, studyId);
    if (st.module !== grid.module) throw new Error("VALIDASI: Grid tidak sesuai modul studi.");
    const table = GRID_TABLES[gridKey];
    const values: Record<string, unknown> = { orgId: ctx.orgId, studyId };
    if (grid.parent) {
      if (!parentId) throw new Error("VALIDASI: Induk baris tidak diisi.");
      const pt = PARENT_TABLES[grid.parent];
      const [p] = await db.select({ id: pt.id }).from(pt).where(and(eq(pt.id, parentId), eq(pt.studyId, studyId), eq(pt.orgId, ctx.orgId))).limit(1);
      if (!p) throw new Error("VALIDASI: Induk baris tidak ditemukan.");
      values[grid.parent] = parentId;
    }
    const scope = grid.parent ? eq(table[grid.parent], parentId) : eq(table.studyId, studyId);
    const [{ m }] = await db.select({ m: max(table.sort) }).from(table).where(and(eq(table.orgId, ctx.orgId), scope));
    values.sort = (Number(m) || 0) + 1;
    if (gridKey === "hazopNode") values.code = `N-${String(values.sort).padStart(2, "0")}`;
    if (gridKey === "fireArea") values.code = `FA-${String(values.sort).padStart(2, "0")}`;
    if (gridKey === "lopa" || gridKey === "coso") values.code = `${gridKey === "lopa" ? "LP" : "R"}-${String(values.sort).padStart(2, "0")}`;
    const [row] = (await db.insert(table).values(values).returning()) as Row[];
    await audit(ctx, gridKey, row.id, "create", { studyId });
    revalidatePath(`/m/${slugOf(st.module)}/${studyId}`);
    return { ok: true, row };
  } catch (e) { return fail(e); }
}

export async function updateCell(gridKey: GridKey, rowId: string, field: string, value: unknown): Promise<Result> {
  try {
    const ctx = await requirePerm("edit");
    const grid = GRIDS[gridKey];
    const col = grid.columns.find((c) => c.key === field);
    if (!col) throw new Error("VALIDASI: Kolom tidak dikenal.");
    const table = GRID_TABLES[gridKey];
    const [old] = (await db.select().from(table).where(and(eq(table.id, rowId), eq(table.orgId, ctx.orgId))).limit(1)) as Row[];
    if (!old) throw new Error("VALIDASI: Baris tidak ditemukan.");
    await editableStudy(ctx.orgId, old.studyId as string);
    const patch: Record<string, unknown> = { [field]: coerce(col, value) };
    if (gridKey === "hazopRow" && (field === "guideword" || field === "parameter")) {
      const gw = field === "guideword" ? (patch.guideword as string) : old.guideword;
      const pr = field === "parameter" ? (patch.parameter as string) : old.parameter;
      if (!old.deviation || old.deviation === composeDeviation(String(old.guideword), String(old.parameter))) patch.deviation = composeDeviation(String(gw), String(pr));
    }
    if (old[field] === patch[field] && Object.keys(patch).length === 1) return { ok: true, row: old };
    const [row] = (await db.update(table).set(patch).where(and(eq(table.id, rowId), eq(table.orgId, ctx.orgId))).returning()) as Row[];
    await audit(ctx, gridKey, rowId, "update", { field, from: old[field] ?? null, to: patch[field] ?? null });
    return { ok: true, row };
  } catch (e) { return fail(e); }
}

export async function deleteRow(gridKey: GridKey, rowId: string): Promise<Result> {
  try {
    const ctx = await requirePerm("edit");
    const table = GRID_TABLES[gridKey];
    const [old] = await db.select().from(table).where(and(eq(table.id, rowId), eq(table.orgId, ctx.orgId))).limit(1);
    if (!old) throw new Error("VALIDASI: Baris tidak ditemukan.");
    const st = await editableStudy(ctx.orgId, old.studyId);
    await db.delete(table).where(and(eq(table.id, rowId), eq(table.orgId, ctx.orgId)));
    await audit(ctx, gridKey, rowId, "delete", { snapshot: old });
    revalidatePath(`/m/${slugOf(st.module)}/${st.id}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function createActionFromRow(gridKey: GridKey, rowId: string): Promise<Result> {
  try {
    const ctx = await requirePerm("edit");
    const grid = GRIDS[gridKey];
    if (!grid.recommendationField) throw new Error("VALIDASI: Grid ini tidak memiliki kolom rekomendasi.");
    const table = GRID_TABLES[gridKey];
    const [row] = await db.select().from(table).where(and(eq(table.id, rowId), eq(table.orgId, ctx.orgId))).limit(1);
    if (!row) throw new Error("VALIDASI: Baris tidak ditemukan.");
    const text = String(row[grid.recommendationField] ?? "").trim();
    if (!text) throw new Error("VALIDASI: Isi kolom rekomendasi terlebih dahulu.");
    const sourceRef = `${gridKey}:${rowId}`;
    const [exists] = await db.select({ n: actions.number }).from(actions).where(and(eq(actions.orgId, ctx.orgId), eq(actions.sourceRef, sourceRef))).limit(1);
    if (exists) throw new Error(`VALIDASI: Aksi untuk baris ini sudah ada (A-${String(exists.n).padStart(4, "0")}).`);
    const [st] = await db.select().from(studies).where(and(eq(studies.id, row.studyId), eq(studies.orgId, ctx.orgId))).limit(1);
    const number = await db.transaction(async (tx) => {
      const n = await nextActionNumber(tx, ctx.orgId);
      await tx.insert(actions).values({ orgId: ctx.orgId, number: n, module: grid.module, studyId: row.studyId, sourceRef, sourceLabel: `${st?.code ?? ""} · ${rowLabel(grid, row)}`, description: text, priority: "Sedang" });
      return n;
    });
    await audit(ctx, "action", sourceRef, "create", { number });
    revalidatePath("/actions");
    return { ok: true, actionNumber: number };
  } catch (e) { return fail(e); }
}
