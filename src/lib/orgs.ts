// Pembuatan organisasi (tenant) dan data demo. Tanpa "server-only" agar dapat dipakai skrip seed.
import { db } from "@/db";
import {
  organizations, memberships, sites, studies, hazopNodes, hazopRows, lopaScenarios, fireAreas, fireScenarios,
  complianceItems, hiradcRows, fmeaRows, cosoRisks, actions, invitations,
} from "@/db/schema";
import { DEFAULT_RISK_CONFIG } from "./risk";
import { PLTU_FIRE_AREAS, complianceFor } from "./templates";
import { and, eq, sql } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function createOrganization(name: string, ownerUserId: string, opts: { isDemo?: boolean; tx?: Tx } = {}) {
  const run = async (tx: Tx) => {
    const [org] = await tx.insert(organizations).values({ name, isDemo: !!opts.isDemo, riskConfig: DEFAULT_RISK_CONFIG }).returning();
    await tx.insert(memberships).values({ userId: ownerUserId, orgId: org.id, role: "OWNER" });
    return org.id;
  };
  return opts.tx ? run(opts.tx) : db.transaction(run);
}

/** Terima undangan yang tertunda untuk email ini. */
export async function acceptInvitations(userId: string, email: string) {
  const pending = await db.select().from(invitations).where(eq(invitations.email, email.toLowerCase()));
  for (const inv of pending) {
    await db.insert(memberships).values({ userId, orgId: inv.orgId, role: inv.role }).onConflictDoNothing();
    await db.delete(invitations).where(and(eq(invitations.id, inv.id)));
  }
  return pending.length;
}

export async function nextActionNumber(tx: Tx | typeof db, orgId: string): Promise<number> {
  const [r] = await tx.update(organizations).set({ actionSeq: sql`${organizations.actionSeq} + 1` }).where(eq(organizations.id, orgId)).returning({ n: organizations.actionSeq });
  return r.n;
}

/** Organisasi "Demo PLTU" dengan contoh data di semua modul. Semua data ditandai DEMO. */
export async function createDemoOrg(ownerUserId: string) {
  return db.transaction(async (tx) => {
    const orgId = await createOrganization("Demo PLTU (data contoh)", ownerUserId, { isDemo: true, tx });
    const [site] = await tx.insert(sites).values({ orgId, name: "Unit 1", location: "Data contoh" }).returning();
    const mk = async (module: "HAZOP" | "LOPA" | "FRA" | "HIRADC" | "FMEA" | "COSO", code: string, title: string, scope: string) => {
      const [st] = await tx.insert(studies).values({
        orgId, siteId: site.id, module, code, title, scope,
        references: "DEMO-PID-001 Rev. A (contoh)", team: "Fasilitator — contoh\nProcess engineer — contoh\nOperator senior — contoh\nC&I engineer — contoh",
        assumptions: "[DEMO] Data dibuat untuk demonstrasi, bukan data plant nyata.", createdById: ownerUserId,
      }).returning();
      return st.id;
    };

    // HAZOP
    const hz = await mk("HAZOP", "HZ-DEMO-01", "[DEMO] HAZOP Boiler Drum Unit 1", "Sistem boiler drum, feedwater control, dan safety valve drum.");
    const [node] = await tx.insert(hazopNodes).values({ orgId, studyId: hz, code: "N-03", name: "Boiler Drum", boundary: "Dari outlet economizer sampai outlet drum ke superheater", designIntent: "Menjaga level drum pada NWL ±50 mm untuk pemisahan uap-air dan sirkulasi alami, tekanan operasi ±170 barg", mode: "Normal", drawings: "DEMO-PID-001 Rev. A" }).returning();
    await tx.insert(hazopRows).values([
      { orgId, studyId: hz, nodeId: node.id, sort: 1, parameter: "Level", guideword: "Less", deviation: "Less Level", cause: "Feedwater control valve gagal menutup; BFP trip tanpa standby start", consequence: "Level di bawah downcomer → starvation → overheat tube waterwall → tube rupture, potensi cedera fatal, outage 2–4 minggu", safeguards: "Alarm low level DCS (preventif)\nAuto-start standby BFP (preventif)\nTrip MFT low-low level 2oo3 (preventif)", iplCandidate: true, s: 5, l: 2, recommendation: "Verifikasi independensi transmitter trip dari transmitter kontrol; teruskan ke LOPA untuk verifikasi SIL MFT low-low level", discipline: "C&I" },
      { orgId, studyId: hz, nodeId: node.id, sort: 2, parameter: "Level", guideword: "More", deviation: "More Level", cause: "FCV gagal terbuka; kesalahan kompensasi level saat start-up", consequence: "Carry-over air ke superheater dan turbin → water induction, kerusakan blade", safeguards: "Alarm high level (preventif)\nEmergency drain valve auto (preventif)\nTrip turbin high-high level (preventif)", iplCandidate: true, s: 5, l: 2, recommendation: "Uji fungsi emergency drain valve setiap overhaul dan masukkan ke PM", discipline: "Mekanikal" },
      { orgId, studyId: hz, nodeId: node.id, sort: 3, parameter: "Pressure", guideword: "More", deviation: "More Pressure", cause: "Load rejection dengan HP bypass gagal membuka", consequence: "Overpressure drum dan superheater", safeguards: "Drum safety valve (mitigatif)\nPCV/ERV (preventif)", iplCandidate: true, s: 5, l: 1, recommendation: "Pastikan sertifikat uji safety valve masih berlaku (Permenaker 37/2016)", discipline: "Mekanikal" },
    ]);

    // LOPA
    const lp = await mk("LOPA", "LP-DEMO-01", "[DEMO] LOPA Boiler Drum", "Skenario kandidat LOPA dari HZ-DEMO-01.");
    await tx.insert(lopaScenarios).values({ orgId, studyId: lp, sort: 1, code: "LP-01", hazopRef: "HZ-DEMO-01 / N-03 / Less Level", description: "Drum low level → tube rupture, potensi fatality", severity: 5, initiatingEvent: "Kegagalan loop kontrol feedwater (BPCS)", ief: 0.1, ipls: "Alarm low level + respon operator | 0.1", modifiers: "Kehadiran personel di zona dampak | 0.1", notes: "[DEMO] Nilai generik CCPS" });

    // FRA
    const fra = await mk("FRA", "FRA-DEMO-01", "[DEMO] Fire Risk Assessment Turbine & Trafo", "Area turbine lube oil dan trafo GSU Unit 1.");
    for (const [i, code] of ["FA-LO", "FA-TR"].entries()) {
      const t = PLTU_FIRE_AREAS.find((a) => a.code === code)!;
      const [area] = await tx.insert(fireAreas).values({ orgId, studyId: fra, sort: i + 1, code: t.code, name: t.name, fuelLoad: t.fuelLoad, criticalAssets: t.criticalAssets, location: "Unit 1 (contoh)" }).returning();
      await tx.insert(fireScenarios).values({ orgId, studyId: fra, areaId: area.id, sort: 1, title: "Design basis fire", sequence: t.scenario, detection: "Deteksi panas (contoh)", suppression: code === "FA-TR" ? "Deluge water spray (contoh)" : "Sprinkler bawah deck (contoh)", consequence: "Kerusakan peralatan utama dan outage panjang", s0: 5, l0: 3, s1: 4, l1: 2, recommendation: code === "FA-LO" ? "Susun prosedur emergency shutdown STG dan latih operator" : "Uji trip deluge trafo tahunan dan dokumentasikan" });
      await tx.insert(complianceItems).values(complianceFor(t).map((c, j) => ({ orgId, studyId: fra, areaId: area.id, sort: j + 1, requirement: c.requirement, reference: c.reference })));
    }

    // HIRADC
    const hr = await mk("HIRADC", "HRD-DEMO-01", "[DEMO] HIRADC Maintenance Boiler", "Aktivitas pemeliharaan area boiler.");
    const H = [
      ["Boiler", "Bekerja di ketinggian pada platform boiler", "Non-rutin", "Jatuh dari ketinggian", "Cedera berat/fatal", "Full body harness, scaffold tag", 5, 3, "Rekayasa", "Lifeline permanen pada platform", 5, 1, "Maintenance", "Permenaker 9/2016"],
      ["Boiler", "Pembersihan debu batubara pada H-beam", "Rutin", "Debu batubara mudah terbakar", "Kebakaran/ledakan sekunder", "Housekeeping terjadwal", 4, 3, "Administratif", "Inspeksi akumulasi debu terdokumentasi", 4, 2, "Operasi", "NFPA 660; UU 1/1970"],
      ["Turbine hall", "Hot work dekat sistem pelumas", "Non-rutin", "Percikan api dekat oli", "Kebakaran", "PTW hot work", 5, 2, "Administratif", "Fire watch 30 menit pasca pekerjaan", 5, 1, "HSE", "Kepmenaker 186/1999"],
      ["Switchyard", "Switching 150 kV", "Rutin", "Arc flash", "Luka bakar", "SOP switching, APD arc", 4, 2, "APD", "Arc-rated PPE sesuai kajian arc flash", 4, 1, "Elektrikal", "Permenaker 12/2015"],
      ["Water treatment", "Unloading HCl", "Rutin", "Paparan bahan kimia korosif", "Luka bakar kimia", "APD kimia, eyewash", 3, 3, "Rekayasa", "Coupling khusus unloading", 3, 1, "Kimia", "Permenaker 5/2018"],
    ] as const;
    await tx.insert(hiradcRows).values(H.map((r, i) => ({ orgId, studyId: hr, sort: i + 1, area: r[0], activity: r[1], routine: r[2], hazard: r[3], risk: r[4], existingControls: r[5], s0: r[6], l0: r[7], hierarchy: r[8], additionalControls: r[9], s1: r[10], l1: r[11], pic: r[12], legalRef: r[13] })));

    // FMEA
    const fm = await mk("FMEA", "FM-DEMO-01", "[DEMO] FMEA Boiler Feed Pump", "BFP A Unit 1.");
    await tx.insert(fmeaRows).values([
      { orgId, studyId: fm, sort: 1, item: "BFP A", function: "Menyuplai feedwater ke drum", failureMode: "Kerusakan mechanical seal", effect: "Kebocoran air panas, derating unit", cause: "Pendinginan seal tidak memadai", prevention: "PM seal cooler", detectionCtl: "Inspeksi visual harian", sev: 7, occ: 5, det: 5, action: "Pasang monitor suhu seal ke DCS", pic: "Maintenance", sev2: 7, occ2: 3, det2: 3 },
      { orgId, studyId: fm, sort: 2, item: "BFP A", function: "Menyuplai feedwater ke drum", failureMode: "Kavitasi", effect: "Kerusakan impeller, trip pompa", cause: "Level deaerator rendah / NPSH kurang", prevention: "Kontrol level deaerator", detectionCtl: "Alarm low level deaerator", sev: 8, occ: 3, det: 4, action: "Verifikasi setpoint minimum flow recirculation", pic: "C&I" },
      { orgId, studyId: fm, sort: 3, item: "BFP A", function: "Menyuplai feedwater ke drum", failureMode: "Bearing overheat", effect: "Trip pompa", cause: "Kegagalan sistem pelumas", prevention: "Analisa oli berkala", detectionCtl: "Monitor vibrasi & suhu bearing", sev: 6, occ: 4, det: 3, action: "", pic: "" },
    ]);

    // COSO
    const er = await mk("COSO", "ERM-DEMO-01", "[DEMO] Register Risiko Perusahaan 2027", "Risiko korporat pembangkit.");
    await tx.insert(cosoRisks).values([
      { orgId, studyId: er, sort: 1, code: "R-01", objective: "Ketersediaan pembangkit ≥ 85%", category: "Operations", component: "Performance", description: "Forced outage akibat kebakaran turbine-generator", owner: "Plant Manager", i0: 5, l0: 3, response: "Reduce", responsePlan: "Gap closure NFPA 850-2026 area turbine-generator", i1: 4, l1: 2, kri: "EAF (%)", kriValue: 86, kriThreshold: 85, trend: "Stabil" },
      { orgId, studyId: er, sort: 2, code: "R-02", objective: "Kepatuhan regulasi K2/K3", category: "Compliance", component: "Governance & Culture", description: "Temuan audit SMK2 tidak tertutup tepat waktu", owner: "PJK2", i0: 3, l0: 3, response: "Reduce", responsePlan: "Action tracker terpadu dengan verifikasi", i1: 3, l1: 2, kri: "Temuan terbuka > 90 hari", kriValue: 4, kriThreshold: 2, trend: "Naik" },
      { orgId, studyId: er, sort: 3, code: "R-03", objective: "Pasokan batubara sesuai spesifikasi", category: "Strategic", component: "Strategy & Objective-Setting", description: "Kualitas batubara menyimpang dari desain boiler", owner: "Fuel Manager", i0: 4, l0: 3, response: "Share", responsePlan: "Klausul spesifikasi & penalti di kontrak pasokan", i1: 3, l1: 3, kri: "Kalori rata-rata (kcal/kg)", kriValue: 4100, kriThreshold: 4000, trend: "Turun" },
      { orgId, studyId: er, sort: 4, code: "R-04", objective: "Laporan lingkungan akurat", category: "Reporting", component: "Information, Communication & Reporting", description: "Data CEMS tidak valid untuk pelaporan", owner: "E&S Manager", i0: 3, l0: 2, response: "Reduce", responsePlan: "Kalibrasi CEMS & validasi data bulanan", i1: 3, l1: 1, kri: "Ketersediaan data CEMS (%)", kriValue: 93, kriThreshold: 95, trend: "Stabil" },
    ]);

    // Aksi contoh
    const n1 = await nextActionNumber(tx, orgId);
    const n2 = await nextActionNumber(tx, orgId);
    await tx.insert(actions).values([
      { orgId, number: n1, module: "HAZOP", studyId: hz, sourceLabel: "N-03 — Less Level", description: "Verifikasi independensi transmitter trip drum level dari transmitter kontrol", owner: "C&I Engineer", priority: "Tinggi", dueDate: new Date(Date.now() - 7 * 864e5), status: "IN_PROGRESS" },
      { orgId, number: n2, module: "FRA", studyId: fra, sourceLabel: "FA-LO — Design basis fire", description: "Susun prosedur emergency shutdown STG dan latih operator", owner: "Operation Manager", priority: "Tinggi", dueDate: new Date(Date.now() + 60 * 864e5), status: "OPEN" },
    ]);
    return orgId;
  });
}
