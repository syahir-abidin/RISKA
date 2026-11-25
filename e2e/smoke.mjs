// Uji end-to-end ringan dengan Playwright (Chromium).
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3000";
const out = process.env.OUT ?? ".";
const log = (...a) => console.log("•", ...a);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${BASE}/dashboard`);
log("redirect ke", new URL(page.url()).pathname);
await page.fill("#email", "demo@riska.local");
await page.fill("#password", "riska-demo-2026");
await page.click("button:has-text('Masuk')");
await page.waitForURL("**/dashboard");
// beralih ke organisasi demo
const demoId = await page.$eval("#orgId", (s) => [...s.options].find((o) => o.text.includes("Demo"))?.value);
await page.selectOption("#orgId", demoId);
await page.waitForLoadState("networkidle");
await page.waitForSelector("text=DATA DEMO");
log("dashboard demo OK");
await page.screenshot({ path: `${out}/01-dashboard.png`, fullPage: true });

await page.click("aside >> text=HAZOP");
await page.waitForSelector("text=HZ-DEMO-01");
await page.click("text=HZ-DEMO-01");
await page.waitForSelector("text=Design intent:");
await page.screenshot({ path: `${out}/02-hazop.png`, fullPage: false });

// edit sel: ubah L baris pertama worksheet node N-03 menjadi 3
const rowsTable = page.locator("section:has-text('Boiler Drum') table").last();
const lInput = rowsTable.locator("input[aria-label='L']").first();
await lInput.fill("3");
await lInput.blur();
await page.waitForSelector("text=Tersimpan");
log("risk setelah edit:", await rowsTable.locator("tbody tr").first().locator(".chip").first().innerText());
// nilai tidak valid
const sInput = rowsTable.locator("input[aria-label='S']").first();
await sInput.fill("9"); await sInput.blur();
await page.waitForSelector("text=S maksimal 5");
log("validasi S>5 ditolak");
await sInput.fill("5"); await sInput.blur();
// tambah baris & guideword auto deviation
await rowsTable.locator("xpath=ancestor::section[1]").locator("button:has-text('+ Tambah baris')").click();
await page.waitForTimeout(800);
const last = rowsTable.locator("tbody tr").last();
await last.locator("select[aria-label='Parameter']").selectOption("Flow");
await page.waitForTimeout(500);
await last.locator("select[aria-label='Guideword']").selectOption("No / None");
await page.waitForTimeout(800);
await page.reload();
const dev = await page.locator("section:has-text('Boiler Drum') table").last().locator("tbody tr").last().locator("input[aria-label='Deviasi']").inputValue();
log("deviasi otomatis:", dev);
// buat aksi dari baris 3
const r3 = page.locator("section:has-text('Boiler Drum') table").last().locator("tbody tr").nth(2);
await r3.locator("button:has-text('→ Aksi')").click();
await page.waitForSelector("a.chip:has-text('A-0')");
log("aksi dibuat:", await r3.locator("a.chip").innerText());

// LOPA
await page.goto(`${BASE}/m/lopa`);
await page.click("text=LP-DEMO-01");
await page.waitForSelector("text=Hasil LOPA");
log("LOPA:", (await page.locator("tbody tr").first().locator("td").nth(-2).innerText()).replace(/\n/g, " | "));
await page.screenshot({ path: `${out}/03-lopa.png` });

// FRA template
await page.goto(`${BASE}/m/fra`);
await page.click("text=FRA-DEMO-01");
await page.click("button:has-text('Muat template area PLTU')");
await page.waitForSelector("text=fire area template ditambahkan");
log("FRA template:", await page.locator("[role=status]").first().innerText());
await page.screenshot({ path: `${out}/04-fra.png` });

for (const m of ["hiradc", "fmea", "coso"]) {
  await page.goto(`${BASE}/m/${m}`);
  await page.locator("td.font-mono a").first().click();
  await page.waitForSelector("table");
  await page.screenshot({ path: `${out}/05-${m}.png` });
  log(m, "rows:", await page.locator("tbody tr").count());
}

// Laporan & ekspor
await page.goto(`${BASE}/m/hazop`);
await page.click("text=HZ-DEMO-01");
await page.waitForURL(/\/m\/hazop\/[\w-]+/);
const studyUrl = page.url().split("?")[0];
const studyId = studyUrl.split("/").pop().split("?")[0];
const res = await page.request.get(`${BASE}/api/export/${studyId}`);
log("ekspor:", res.status(), res.headers()["content-type"], (await res.body()).length, "byte");
await page.goto(`${studyUrl}/report`);
await page.waitForSelector("text=Register rekomendasi");
await page.screenshot({ path: `${out}/06-report.png`, fullPage: true });

// Alur status: ajukan → setujui → terkunci
await page.goto(studyUrl);
await page.click("button:has-text('Ajukan review')");
await page.waitForSelector("button:has-text('Setujui')");
await page.click("button:has-text('Setujui')");
await page.waitForSelector("text=terkunci");
log("approved & terkunci; input tersisa:", await page.locator("table input[aria-label='S']").count());

// Rekomendasi: Closed tanpa bukti harus ditolak
await page.goto(`${BASE}/actions`);
const first = page.locator("form").filter({ has: page.locator("select[name=status]") }).first();
await first.locator("select[name=status]").selectOption("CLOSED");
await first.locator("button:has-text('Simpan')").click();
await page.waitForSelector("text=memerlukan bukti");
log("validasi Closed tanpa bukti OK");
await page.screenshot({ path: `${out}/07-actions.png` });

await page.goto(`${BASE}/risk-register`);
log("risk register baris:", await page.locator("tbody tr").count());
await page.goto(`${BASE}/settings`);
await page.screenshot({ path: `${out}/08-settings.png`, fullPage: true });

// Tampilan ponsel
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/dashboard`);
await page.screenshot({ path: `${out}/09-mobile.png`, fullPage: true });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
log("overflow horizontal ponsel (px):", overflow);

log("error konsol/halaman:", errors.length ? errors.slice(0, 5) : "tidak ada");
await browser.close();
