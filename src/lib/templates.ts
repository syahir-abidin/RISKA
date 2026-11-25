// Template area kebakaran tipikal PLTU dan butir kepatuhan awal (NFPA 850 & regulasi nasional).
// Butir kepatuhan adalah titik awal penilaian; status default "Belum dinilai" dan wajib diverifikasi tim.

export interface FireAreaTemplate {
  code: string;
  name: string;
  fuelLoad: string;
  criticalAssets: string;
  scenario: string;
  compliance: { requirement: string; reference: string }[];
}

const COMMON = [
  { requirement: "Batas fire area (barrier, rating, penetrasi) terdokumentasi dan diverifikasi walkdown", reference: "NFPA 850 Bab 6" },
  { requirement: "Keputusan proteksi area tercatat dalam FPDBD beserta alasan", reference: "NFPA 850 Bab 4 (FPDBD)" },
  { requirement: "APAR sesuai jenis bahaya, jarak, dan pemeriksaan berkala", reference: "Permenakertrans 04/1980; NFPA 10" },
];

export const PLTU_FIRE_AREAS: FireAreaTemplate[] = [
  { code: "FA-CY", name: "Coal yard & stockpile", fuelLoad: "Batubara (self-heating)", criticalAssets: "Stacker/reclaimer", scenario: "Hot spot swabakar pada stockpile berumur lama menjalar ke reclaim conveyor",
    compliance: [{ requirement: "Pemantauan suhu/hot spot stockpile, rotasi stok, kompaksi", reference: "NFPA 850 (bahan bakar padat); FM DS 8-10" }, { requirement: "Cakupan hidran/monitor untuk seluruh stockpile", reference: "NFPA 850 Bab 7; NFPA 24" }] },
  { code: "FA-CV", name: "Conveyor & transfer tower", fuelLoad: "Belt karet, debu batubara", criticalAssets: "Conveyor utama, transfer tower", scenario: "Idler macet memanaskan belt, belt terbakar dan menjalar sepanjang galeri tertutup",
    compliance: [{ requirement: "Pengendalian debu dari penanganan bahan bakar dan Dust Hazard Analysis", reference: "NFPA 850-2026 9.5.3.1; NFPA 660" }, { requirement: "Interlock stop conveyor hulu/hilir saat deteksi atau aktuasi supresi; stop manual dari CCR", reference: "NFPA 850 (conveyor) — tetapkan di FPDBD" }, { requirement: "Sprinkler/water spray galeri tertutup dan deteksi panas linear", reference: "NFPA 850; NFPA 13/15" }] },
  { code: "FA-BK", name: "Coal bunker / silo", fuelLoad: "Batubara tertahan", criticalAssets: "Bunker, feeder", scenario: "Smoldering batubara saat outage panjang, ledakan saat bunker dikosongkan",
    compliance: [{ requirement: "Pemantauan CO dan sistem inerting bunker", reference: "NFPA 850; NFPA 85" }, { requirement: "Prosedur pengosongan bunker sebelum outage panjang", reference: "NFPA 850 Bab 5" }] },
  { code: "FA-ML", name: "Pulverizer / mill & PF piping", fuelLoad: "Debu batubara halus", criticalAssets: "Mill, PA fan", scenario: "Mill fire saat start-up/shutdown, ledakan mill",
    compliance: [{ requirement: "Inerting, deteksi CO/suhu outlet, interlock BMS", reference: "NFPA 85; NFPA 850" }] },
  { code: "FA-BF", name: "Boiler front & burner", fuelLoad: "HSD ignitor, PF", criticalAssets: "Burner, BMS", scenario: "Kebocoran HSD di burner front tersulut permukaan panas",
    compliance: [{ requirement: "BMS dan logika purge/MFT sesuai NFPA 85; bypass melalui MOC", reference: "NFPA 85" }, { requirement: "Water spray/deteksi area burner front", reference: "NFPA 850; NFPA 15" }] },
  { code: "FA-LO", name: "Turbine lube oil & under-deck", fuelLoad: "Minyak pelumas 30–60 m³", criticalAssets: "Turbin uap, generator", scenario: "Semburan oli dari flange ke permukaan panas, genangan di bawah operating floor",
    compliance: [{ requirement: "Sprinkler/foam-water di bawah operating floor yang terpapar oli", reference: "NFPA 850-2026 10.2.1.2.2" }, { requirement: "Proteksi bearing (closed/open-head spray atau water mist) ≥ 0,25 gpm/ft²", reference: "NFPA 850-2026 10.2.3.1.1" }, { requirement: "Vapor extractor reservoir pelumas ke lokasi aman", reference: "NFPA 850-2026 10.2.1.3.4" }, { requirement: "Prosedur emergency shutdown STG spesifik unit dan latihan periodik", reference: "NFPA 850-2026 5.4.6.1" }] },
  { code: "FA-H2", name: "Generator H₂ & seal oil", fuelLoad: "Hidrogen, seal oil", criticalAssets: "Generator", scenario: "Kebocoran H₂ di seal/bushing, akumulasi dan ledakan",
    compliance: [{ requirement: "Automatic shutoff valve di sumber H₂", reference: "NFPA 850-2026 10.2.5.1.1" }, { requirement: "Pompa seal oil redundan dengan suplai daya terpisah", reference: "NFPA 850-2026 10.2.5.2.1" }, { requirement: "Dump valve H₂ dapat dioperasikan dari CCR", reference: "NFPA 850-2026 10.2.5.6" }, { requirement: "Deteksi gas beralarm di lokasi yang selalu dijaga", reference: "NFPA 850-2026 9.1.2.2" }] },
  { code: "FA-TR", name: "Trafo GSU / UAT / SST", fuelLoad: "Minyak trafo", criticalAssets: "Trafo GSU", scenario: "Kegagalan internal → tangki/bushing pecah → pool fire menjalar ke trafo sebelah",
    compliance: [{ requirement: "Jarak pemisah atau firewall sesuai volume oli", reference: "NFPA 850 (transformer)" }, { requirement: "Deluge water spray dan pengujiannya", reference: "NFPA 15; NFPA 25" }, { requirement: "Containment oli + air pemadam", reference: "NFPA 850 Bab 6" }] },
  { code: "FA-CS", name: "Cable spreading room & cable tunnel", fuelLoad: "Isolasi kabel", criticalAssets: "Kabel kontrol kedua unit", scenario: "Kebakaran kabel menjalar sepanjang tray, kehilangan kontrol",
    compliance: [{ requirement: "Metode fireproofing kabel kritis ditetapkan FPDBD", reference: "NFPA 850-2026 9.7.6.2.1" }, { requirement: "Deteksi dini dan supresi; seal penetrasi", reference: "NFPA 850; NFPA 72" }] },
  { code: "FA-CR", name: "CCR, DCS & relay room", fuelLoad: "Peralatan elektronik", criticalAssets: "DCS, proteksi", scenario: "Kebakaran panel, asap memaksa evakuasi CCR",
    compliance: [{ requirement: "Deteksi asap aspirating dan clean agent", reference: "NFPA 850; NFPA 2001" }, { requirement: "Kemampuan safe shutdown dari lokasi alternatif", reference: "NFPA 850" }] },
  { code: "FA-BT", name: "Battery room & UPS", fuelLoad: "Elektrolit, hidrogen", criticalAssets: "DC system", scenario: "Akumulasi H₂ saat ventilasi gagal",
    compliance: [{ requirement: "Ventilasi beralarm dan deteksi H₂", reference: "NFPA 850" }] },
  { code: "FA-FO", name: "HSD tank & unloading", fuelLoad: "HSD/B40", criticalAssets: "Tangki HSD", scenario: "Overfill/kebocoran → bund fire; kebakaran saat unloading",
    compliance: [{ requirement: "Proteksi overfill independen, bund ≥110%, foam & cooling", reference: "NFPA 30; NFPA 11; Permenaker 37/2016" }] },
  { code: "FA-CT", name: "Cooling tower", fuelLoad: "Struktur FRP/kayu (bila ada)", criticalAssets: "Cooling tower", scenario: "Kebakaran saat outage dan hot work",
    compliance: [{ requirement: "Proteksi cooling tower mudah terbakar", reference: "NFPA 850; NFPA 214" }] },
  { code: "FA-WH", name: "Gudang & workshop", fuelLoad: "Material umum, oli, gas las", criticalAssets: "Suku cadang kritis", scenario: "Kebakaran gudang",
    compliance: [{ requirement: "Sprinkler, hidran, sarana jalan keluar bangunan", reference: "Permen PU 26/PRT/M/2008; SNI 03-3989-2000" }] },
];

export function complianceFor(t: FireAreaTemplate) {
  return [...t.compliance, ...COMMON];
}

export const STUDY_PREFIX: Record<string, string> = { HAZOP: "HZ", LOPA: "LP", FRA: "FRA", HIRADC: "HRD", FMEA: "FM", COSO: "ERM" };
