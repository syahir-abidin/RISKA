"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { actions, actionStatusEnum } from "@/db/schema";
import { requirePerm, audit, ForbiddenError } from "@/lib/context";

const Upd = z.object({
  id: z.string(),
  owner: z.string().trim().max(200),
  dueDate: z.string().optional(),
  priority: z.enum(["Rendah", "Sedang", "Tinggi", "Kritis"]),
  status: z.enum(actionStatusEnum.enumValues),
  evidence: z.string().trim().max(4000),
  verifier: z.string().trim().max(200),
  justification: z.string().trim().max(4000),
  description: z.string().trim().min(3).max(4000),
});

export type TrackerState = { ok?: boolean; error?: string; at?: number };

export async function updateAction(_p: TrackerState, fd: FormData): Promise<TrackerState> {
  try {
    const ctx = await requirePerm("manageActions");
    const p = Upd.safeParse(Object.fromEntries(fd));
    if (!p.success) return { error: p.error.issues[0].message };
    const d = p.data;
    if (d.status === "CLOSED" && (!d.evidence || !d.verifier)) return { error: "Status Closed memerlukan bukti dan nama verifikator." };
    if (d.status === "REJECTED" && d.justification.length < 10) return { error: "Status Rejected memerlukan justifikasi teknis tertulis (min. 10 karakter)." };
    const [old] = await db.select().from(actions).where(and(eq(actions.id, d.id), eq(actions.orgId, ctx.orgId))).limit(1);
    if (!old) return { error: "Aksi tidak ditemukan." };
    const due = d.dueDate ? new Date(d.dueDate) : null;
    if (due && Number.isNaN(due.getTime())) return { error: "Tanggal tenggat tidak valid." };
    await db.update(actions).set({
      owner: d.owner, dueDate: due, priority: d.priority, status: d.status, evidence: d.evidence, verifier: d.verifier,
      justification: d.justification, description: d.description, updatedAt: new Date(),
      closedAt: d.status === "CLOSED" ? old.closedAt ?? new Date() : null,
    }).where(and(eq(actions.id, d.id), eq(actions.orgId, ctx.orgId)));
    await audit(ctx, "action", d.id, "update", { from: old.status, to: d.status });
    revalidatePath("/actions");
    return { ok: true, at: Date.now() };
  } catch (e) {
    return { error: e instanceof ForbiddenError ? e.message : "Gagal menyimpan aksi." };
  }
}
