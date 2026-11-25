"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ORG_COOKIE, membershipOf } from "@/lib/context";
import { createOrganization, createDemoOrg } from "@/lib/orgs";

async function uid() {
  const s = await getServerSession(authOptions);
  const id = (s?.user as { id?: string } | undefined)?.id;
  if (!id) redirect("/login");
  return id;
}

function setOrg(orgId: string) {
  cookies().set(ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function switchOrg(fd: FormData) {
  const userId = await uid();
  const orgId = String(fd.get("orgId") ?? "");
  if (await membershipOf(userId, orgId)) setOrg(orgId);
  redirect("/dashboard");
}

export async function newOrganization(fd: FormData) {
  const userId = await uid();
  const name = String(fd.get("name") ?? "").trim().slice(0, 120);
  if (name.length < 2) redirect("/onboarding?e=nama");
  setOrg(await createOrganization(name, userId));
  redirect("/settings");
}

export async function addDemoOrganization() {
  const userId = await uid();
  setOrg(await createDemoOrg(userId));
  redirect("/dashboard");
}

