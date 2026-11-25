// Membuat akun demo + organisasi Demo PLTU. Jalankan: npm run db:seed
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { createDemoOrg, createOrganization } from "../src/lib/orgs";

async function main() {
  const email = process.env.SEED_EMAIL ?? "demo@riska.local";
  const password = process.env.SEED_PASSWORD ?? "riska-demo-2026";
  let [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u) [u] = await db.insert(users).values({ email, name: "Pengguna Demo", passwordHash: await bcrypt.hash(password, 11) }).returning();
  await createOrganization("Organisasi Saya", u.id);
  await createDemoOrg(u.id);
  console.log(`Seed selesai. Masuk dengan ${email} / ${password}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
