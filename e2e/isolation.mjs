// Uji isolasi tenant: pengguna B tidak dapat membuka studi atau ekspor milik organisasi A.
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
async function login(email, password) {
  const ctx = await browser.newContext(); const p = await ctx.newPage();
  await p.goto(`${BASE}/login`); await p.fill("#email", email); await p.fill("#password", password);
  await p.click("button:has-text('Masuk')"); await p.waitForURL("**/dashboard"); return p;
}
// A = akun demo; ambil satu id studi
const a = await login("demo@riska.local", "riska-demo-2026");
const demoId = await a.$eval("#orgId", (s) => [...s.options].find((o) => o.text.includes("Demo"))?.value);
await a.selectOption("#orgId", demoId); await a.waitForSelector("text=DATA DEMO");
await a.goto(`${BASE}/m/hazop`); await a.click("text=HZ-DEMO-01"); await a.waitForURL(/\/m\/hazop\/[\w-]+/);
const studyUrl = a.url().split("?")[0]; const studyId = studyUrl.split("/").pop();
// B = pengguna baru tanpa demo
const reg = await (await browser.newContext()).newPage();
await reg.goto(`${BASE}/register`);
await reg.fill("#name", "Pengguna B"); await reg.fill("#email", `b${Date.now()}@riska.local`); await reg.fill("#password", "rahasia-b-123");
await reg.fill("#orgName", "PT Lain"); await reg.uncheck("input[name=demo]");
const emailB = await reg.inputValue("#email");
await reg.click("button:has-text('Buat akun')"); await reg.waitForURL("**/login**");
const b = await login(emailB, "rahasia-b-123");
const r1 = await b.goto(studyUrl); console.log("B buka studi A →", r1.status(), (await b.locator("h1").first().innerText()));
const r2 = await b.request.get(`${BASE}/api/export/${studyId}`); console.log("B ekspor studi A →", r2.status());
const r3 = await b.goto(`${BASE}/risk-register`); console.log("B risk register baris:", await b.locator("tbody tr").count(), "(harus 0 / kosong)");
const ra = await a.request.get(`${BASE}/api/export/${studyId}`); console.log("A ekspor studi sendiri →", ra.status());
await browser.close();
