import "server-only";
import * as t from "@/db/schema";
import type { GridKey } from "./grids";

// Tabel Drizzle per grid. Diketik longgar karena dipakai secara generik; kolom divalidasi lewat registri GRIDS.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any;
export const GRID_TABLES: Record<GridKey, AnyTable> = {
  hazopNode: t.hazopNodes,
  hazopRow: t.hazopRows,
  lopa: t.lopaScenarios,
  fireArea: t.fireAreas,
  fireScenario: t.fireScenarios,
  compliance: t.complianceItems,
  hiradc: t.hiradcRows,
  fmea: t.fmeaRows,
  coso: t.cosoRisks,
};
export const PARENT_TABLES = { nodeId: t.hazopNodes, areaId: t.fireAreas } as const;
