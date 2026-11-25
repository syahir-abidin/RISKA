import { riskScore, zoneOf, ZONE_LABEL, type RiskConfig, type Zone } from "@/lib/risk";
import clsx from "clsx";

export const ZONE_CLS: Record<Zone, string> = {
  LOW: "bg-risk-lowbg text-risk-low",
  MEDIUM: "bg-risk-medbg text-risk-med",
  HIGH: "bg-risk-highbg text-risk-high",
  EXTREME: "bg-risk-extbg text-risk-ext",
};

export function RiskBadge({ s, l, cfg, compact }: { s?: number | null; l?: number | null; cfg: RiskConfig; compact?: boolean }) {
  const score = riskScore(s ?? null, l ?? null);
  const z = zoneOf(score, cfg);
  if (!z || score == null) return <span className="text-slate-400">–</span>;
  return <span className={clsx("chip num", ZONE_CLS[z])}>{score}{compact ? "" : ` ${ZONE_LABEL[z]}`}</span>;
}

export function ZoneBadge({ zone }: { zone: Zone | null }) {
  if (!zone) return <span className="text-slate-400">–</span>;
  return <span className={clsx("chip", ZONE_CLS[zone])}>{ZONE_LABEL[zone]}</span>;
}

/** Heatmap 5×5: counts[s][l] = jumlah risiko. Likelihood vertikal (L5 di atas), severity horizontal. */
export function Heatmap({ counts, cfg, title = "Peta risiko" }: { counts: Record<string, number>; cfg: RiskConfig; title?: string }) {
  const L = [5, 4, 3, 2, 1], S = [1, 2, 3, 4, 5];
  return (
    <figure className="m-0">
      <figcaption className="sr-only">{title}</figcaption>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: "28px repeat(5, minmax(0,1fr))" }}>
        {L.map((l) => [
          <div key={`l${l}`} className="flex items-center justify-center font-mono text-[11px] text-slate-500">L{l}</div>,
          ...S.map((s) => {
            const z = zoneOf(s * l, cfg)!;
            const n = counts[`${s}-${l}`] ?? 0;
            return (
              <div key={`${s}-${l}`} title={`S${s} × L${l} = ${s * l}: ${n} risiko`} className={clsx("flex aspect-[1.6/1] items-center justify-center rounded-sm text-sm font-semibold num", ZONE_CLS[z], n === 0 && "opacity-40")}>
                {n || ""}
              </div>
            );
          }),
        ])}
        <div />
        {S.map((s) => <div key={`s${s}`} className="text-center font-mono text-[11px] text-slate-500">S{s}</div>)}
      </div>
    </figure>
  );
}
