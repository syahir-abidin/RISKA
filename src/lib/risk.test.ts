import { describe, it, expect } from "vitest";
import { riskScore, zoneOf, lopaCalc, silFromRrf, parseFactors, rpn, actionPriority, cosoAppetite, withDefaults, DEFAULT_RISK_CONFIG } from "./risk";

describe("matriks risiko 5x5", () => {
  it("menghitung skor dan zona default", () => {
    expect(riskScore(5, 2)).toBe(10);
    expect(zoneOf(4)).toBe("LOW");
    expect(zoneOf(5)).toBe("MEDIUM");
    expect(zoneOf(9)).toBe("MEDIUM");
    expect(zoneOf(10)).toBe("HIGH");
    expect(zoneOf(15)).toBe("EXTREME");
  });
  it("mengabaikan nilai di luar 1–5", () => {
    expect(riskScore(6, 2)).toBeNull();
    expect(riskScore(null, 2)).toBeNull();
    expect(zoneOf(null)).toBeNull();
  });
  it("memakai ambang yang diatur organisasi", () => {
    const cfg = withDefaults({ thresholds: { low: 3, medium: 8, high: 12 } });
    expect(zoneOf(4, cfg)).toBe("MEDIUM");
    expect(zoneOf(13, cfg)).toBe("EXTREME");
  });
});

describe("LOPA", () => {
  it("parse IPL dan menolak baris tidak valid", () => {
    const r = parseFactors("Alarm + operator | 0.1\nPSV | 0,01\nsalah | 2\ntanpa angka");
    expect(r.factors.map((f) => f.value)).toEqual([0.1, 0.01]);
    expect(r.invalid).toHaveLength(2);
  });
  it("contoh drum low level: RRF 100 → SIL 1 (PFD ≤ 1E-2, batas atas pita SIL 1 IEC 61508)", () => {
    const r = lopaCalc({ ief: 0.1, ipls: "Alarm + respon operator | 0.1", modifiers: "Kehadiran personel | 0.1", severity: 5 }, DEFAULT_RISK_CONFIG);
    expect(r.mitigated).toBeCloseTo(1e-3);
    expect(r.tmel).toBe(1e-5);
    expect(r.rrf).toBeCloseTo(100);
    expect(r.sil).toBe("SIL 1");
  });
  it("pita SIL", () => {
    expect(silFromRrf(0.5)).toMatch(/Memadai/);
    expect(silFromRrf(500)).toBe("SIL 2");
    expect(silFromRrf(5000)).toBe("SIL 3");
    expect(silFromRrf(50000)).toMatch(/desain ulang/);
  });
  it("TMEL override mengalahkan tabel", () => {
    expect(lopaCalc({ ief: 1, severity: 5, tmelOverride: 1e-3 }).tmel).toBe(1e-3);
  });
});

describe("FMEA & COSO", () => {
  it("RPN dan action priority", () => {
    expect(rpn(8, 5, 4)).toBe(160);
    expect(rpn(11, 5, 4)).toBeNull();
    expect(actionPriority(9, 4, 2)).toBe("H");
    expect(actionPriority(7, 3, 2)).toBe("M");
    expect(actionPriority(3, 2, 2)).toBe("L");
  });
  it("appetite COSO per kategori", () => {
    expect(cosoAppetite(12, "Operations")).toBe("Di atas appetite");
    expect(cosoAppetite(4, "Compliance")).toBe("Dalam appetite");
  });
});
