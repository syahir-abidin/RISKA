"use server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createOrganization, createDemoOrg, acceptInvitations } from "@/lib/orgs";

const Reg = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(200),
  orgName: z.string().trim().max(120).optional().default(""),
  demo: z.boolean(),
});

export type RegState = { error?: string; ok?: boolean; email?: string };

export async function registerUser(_prev: RegState, fd: FormData): Promise<RegState> {
  const parsed = Reg.safeParse({
    name: fd.get("name"), email: fd.get("email"), password: fd.get("password"),
    orgName: fd.get("orgName") ?? "", demo: fd.get("demo") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password, orgName, demo } = parsed.data;
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (exists) return { error: "Email sudah terdaftar. Silakan masuk." };
  const [u] = await db.insert(users).values({ name, email, passwordHash: await bcrypt.hash(password, 11) }).returning();
  const invited = await acceptInvitations(u.id, email);
  if (orgName) await createOrganization(orgName, u.id);
  if (demo) await createDemoOrg(u.id);
  if (!orgName && !demo && invited === 0) await createOrganization(`Organisasi ${name}`, u.id);
  return { ok: true, email };
}
