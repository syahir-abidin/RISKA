import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, organizations, users, auditLogs, type Role } from "@/db/schema";
import { authOptions } from "./auth";
import { withDefaults, type RiskConfig } from "./risk";
import { can, type Permission } from "./permissions";

export const ORG_COOKIE = "riska_org";

export interface Ctx {
  userId: string;
  userName: string;
  email: string;
  orgId: string;
  orgName: string;
  isDemo: boolean;
  role: Role;
  cfg: RiskConfig;
  orgs: { id: string; name: string; role: Role }[];
}

/** Konteks tenant aktif. Redirect ke /login bila belum masuk, ke /onboarding bila belum punya organisasi. */
export const getCtx = cache(async (): Promise<Ctx> => {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) redirect("/login");
  const rows = await db
    .select({ id: organizations.id, name: organizations.name, role: memberships.role, isDemo: organizations.isDemo, riskConfig: organizations.riskConfig })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.orgId, organizations.id))
    .where(eq(memberships.userId, userId))
    .orderBy(organizations.createdAt);
  if (rows.length === 0) redirect("/onboarding");
  const wanted = cookies().get(ORG_COOKIE)?.value;
  const active = rows.find((r) => r.id === wanted) ?? rows[0];
  return {
    userId, userName: u.name, email: u.email,
    orgId: active.id, orgName: active.name, isDemo: active.isDemo, role: active.role,
    cfg: withDefaults(active.riskConfig),
    orgs: rows.map((r) => ({ id: r.id, name: r.name, role: r.role })),
  };
});

export class ForbiddenError extends Error {}

export async function requirePerm(p: Permission): Promise<Ctx> {
  const ctx = await getCtx();
  if (!can(ctx.role, p)) throw new ForbiddenError(`Peran ${ctx.role} tidak memiliki izin untuk tindakan ini.`);
  return ctx;
}

export async function audit(ctx: Ctx, entity: string, entityId: string, action: string, diff?: unknown) {
  await db.insert(auditLogs).values({ orgId: ctx.orgId, userId: ctx.userId, userName: ctx.userName, entity, entityId, action, diff: diff ?? null });
}

export async function membershipOf(userId: string, orgId: string) {
  const [m] = await db.select().from(memberships).where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId))).limit(1);
  return m ?? null;
}
