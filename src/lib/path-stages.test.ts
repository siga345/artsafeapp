import { describe, expect, it } from "vitest";

import {
  canonicalPathStageByOrder,
  getLatestPhase1PathStageLabel,
  getPhase1PathStageLabel,
  getPhase1PathStageName,
  isPhase1PathStageOrder
} from "@/lib/path-stages";

describe("path stages", () => {
  it("keeps the seventh canonical stage in code but hides it from phase-1 stage labels", () => {
    expect(canonicalPathStageByOrder[7].name).toBe("Наследие");
    expect(isPhase1PathStageOrder(7)).toBe(false);
    expect(getPhase1PathStageLabel(7)).toBeUndefined();
    expect(getPhase1PathStageName({ order: 7, name: "Наследие" })).toBeUndefined();
  });

  it("falls back to the latest active phase-1 stage for overview copy", () => {
    expect(getLatestPhase1PathStageLabel()?.name).toBe("Широкая известность");
  });

  it("exposes the six active phase-1 stages", () => {
    expect(getPhase1PathStageLabel(6)?.name).toBe("Широкая известность");
    expect(getPhase1PathStageName({ order: 2, name: "Демо" })).toBe("Формирование");
  });
});
