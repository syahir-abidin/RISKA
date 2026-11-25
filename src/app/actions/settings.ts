"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { organizations, sites, memberships, invitations, users, roleEnum } from "@/db/schema";
import { requirePerm, audit } from "@/lib/context";
import { withDefaults, type RiskConfig } from "@/lib/risk";

const back = (tab: string, k: "m" | "e", msg: string) => redirect(`/settings?tab=${tab}&${k}=${encodeURIComponent(msg)}`);

export async function saveRiskConfig(fd: FormData) {
  const ctx = await requirePerm("manageOrg");
  const num = (k: string) => Number(String(fd.get(k) ?? "").replace(",", "."));
  const low = num("t_low"), med = num("t_medium"), high = num("t_high");
  if (![low, med, high].every(Number.isInteger) || !(low >= 1 && low < med && med < high && high < 25)) back("matrix", "e", "Ambang harus bilangan bulat naik: 1 ≤ Low < Medium < High < 25.");
  const cfg: RiskConfig = withDefaults(ctx.cfg);
  cfg.thresholds = { low, medium: med, high };
  for (const z of ["LOW", "MEDIUM", "HIGH", "EXTREME"] as const) cfg.zoneActions[z] = String(fd.get(`za_${z}`) ?? "").slice(0, 600);
  cfg.severity = cfg.severity.map((s) => ({ ...s, label: String(fd.get(`s${s.level}_label`) ?? s.label).slice(0, 60), people: String(fd.get(`s${s.level}_people`) ?? "").slice(0, 200), asset: String(fd.get(`s${s.level}_asset`) ?? "").slice(0, 200), production: String(fd.get(`s${s.level}_production`) ?? "").slice(0, 200), environment: String(fd.get(`s${s.level}_environment`) ?? "").slice(0, 200), reputation: String(fd.get(`s${s.level}_reputation`) ?? "").slice(0, 200) }));
  cfg.likelihood = cfg.likelihood.map((l) => ({ ...l, label: String(fd.get(`l${l.level}_label`) ?? l.label).slice(0, 80), frequency: String(fd.get(`l${l.level}_frequency`) ?? "").slice(0, 80) }));
  for (let i = 1; i <= 5; i++) {
    const v = num(`tmel_${i}`);
    if (!(v > 0 && v < 1)) back("matrix", "e", `TMEL S${i} harus antara 0 dan 1 (mis. 1E-4).`);
    cfg.tmel[String(i)] = v;
  }
  for (const c of ["Strategic", "Operations", "Reporting", "Compliance"]) {
    const v = num(`app_${c}`);
    if (!(Number.isInteger(v) && v >= 1 && v <= 25)) back("matrix", "e", `Appetite ${c} harus 1–25.`);
    cfg.appetite[c] = v;
  }
  await db.update(organizations).set({ riskConfig: cfg }).where(eq(organizations.id, ctx.orgId));
  await audit(ctx, "organization", ctx.orgId, "risk-config");
  revalidatePath("/", "layout");
  back("matrix", "m", "Matriks risiko disimpan.");
}

export async function renameOrg(fd: FormData) {
  const ctx = await requirePerm("manageOrg");
  const name = String(fd.get("name") ?? "").trim().slice(0, 120);
  if (name.length < 2) back("org", "e", "Nama organisasi minimal 2 karakter.");
  await db.update(organizations).set({ name }).where(eq(organizations.id, ctx.orgId));
  await audit(ctx, "organization", ctx.orgId, "rename", { name });
  revalidatePath("/", "layout");
  back("org", "m", "Nama organisasi disimpan.");
}

export async function addSite(fd: FormData) {
  const ctx = await requirePerm("manageOrg");
  const name = String(fd.get("name") ?? "").trim().slice(0, 120);
  if (name.length < 2) back("sites", "e", "Nama site minimal 2 karakter.");
  await db.insert(sites).values({ orgId: ctx.orgId, name, location: String(fd.get("location") ?? "").trim().slice(0, 200) });
  back("sites", "m", "Site ditambahkan.");
}

export async function deleteSite(fd: FormData) {
  const ctx = await requirePerm("manageOrg");
  await db.delete(sites).where(and(eq(sites.id, String(fd.get("id"))), eq(sites.orgId, ctx.orgId)));
  back("sites", "m", "Site dihapus. Studi terkait tetap ada tanpa site.");
}

const Invite = z.object({ email: z.string().trim().toLowerCase().email("Email tidak valid"), role: z.enum(roleEnum.enumValues) });

export async function inviteMember(fd: FormData) {
  const ctx = await requirePerm("manageOrg");
  const p = Invite.safeParse(Object.fromEntries(fd));
  if (!p.success) back("members", "e", p.error.issues[0].message);
  const { email, role } = p.data!;
  if (role === "OWNER" && ctx.role !== "OWNER") back("members", "e", "Hanya Owner yang dapat menambah Owner.");
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (u) {
    await db.insert(memberships).values({ userId: u.id, orgId: ctx.orgId, role }).onConflictDoUpdate({ target: [memberships.userId, memberships.orgId], set: { role } });
    await audit(ctx, "membership", u.id, "add", { email, role });
    back("members", "m", `${email} ditambahkan sebagai ${role}.`);
  }
  await db.insert(invitations).values({ orgId: ctx.orgId, email, role }).onConflictDoUpdate({ target: [invitations.orgId, invitations.email], set: { role } });
  await audit(ctx, "invitation", email, "create", { role });
  back("members", "m", `Undangan tercatat. ${email} otomatis bergabung saat mendaftar dengan email tersebut.`);
}

export async function changeRole(fd: FormData) {
  const ctx = await requirePerm("manageOrg");
  const id = String(fd.get("id"));
  const role = z.enum(roleEnum.enumValues).parse(fd.get("role"));
  const [m] = await db.select().from(memberships).where(and(eq(memberships.id, id), eq(memberships.orgId, ctx.orgId))).limit(1);
  if (!m) back("members", "e", "Anggota tidak ditemukan.");
  if ((m!.role === "OWNER" || role === "OWNER") && ctx.role !== "OWNER") back("members", "e", "Hanya Owner yang dapat mengubah peran Owner.");
  if (m!.role === "OWNER" && role !== "OWNER") {
    const [{ c }] = await db.select({ c: count() }).from(memberships).where(and(eq(memberships.orgId, ctx.orgId), eq(memberships.role, "OWNER")));
    if (c <= 1) back("members", "e", "Organisasi harus memiliki minimal satu Owner.");
  }
  await db.update(memberships).set({ role }).where(eq(memberships.id, id));
  await audit(ctx, "membership", m!.userId, "role", { from: m!.role, to: role });
  back("members", "m", "Peran diperbarui.");
}

export async function removeMember(fd: FormData) {
  const ctx = await requirePerm("manageOrg");
  const id = String(fd.get("id"));
  const [m] = await db.select().from(memberships).where(and(eq(memberships.id, id), eq(memberships.orgId, ctx.orgId))).limit(1);
  if (!m) back("members", "e", "Anggota tidak ditemukan.");
  if (m!.role === "OWNER") {
    const [{ c }] = await db.select({ c: count() }).from(memberships).where(and(eq(memberships.orgId, ctx.orgId), eq(memberships.role, "OWNER")));
    if (c <= 1 || ctx.role !== "OWNER") back("members", "e", "Owner terakhir tidak dapat dihapus, dan hanya Owner yang dapat menghapus Owner.");
  }
  await db.delete(memberships).where(eq(memberships.id, id));
  await audit(ctx, "membership", m!.userId, "remove");
  back("members", "m", "Anggota dihapus dari organisasi.");
}

export async function cancelInvitation(fd: FormData) {
  const ctx = await requirePerm("manageOrg");
  await db.delete(invitations).where(and(eq(invitations.id, String(fd.get("id"))), eq(invitations.orgId, ctx.orgId)));
  back("members", "m", "Undangan dibatalkan.");
}
