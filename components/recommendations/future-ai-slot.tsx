"use client";

import type { RecommendationCard } from "@/contracts/recommendations";

type Props = {
  slot: RecommendationCard["futureAiSlot"];
};

export function FutureAiSlot({ slot }: Props) {
  if (!slot) return null;

  return (
    <div className="border-t border-dashed border-brand-border/70 pt-3 text-xs leading-5 text-brand-muted">
      <p className="font-medium text-brand-muted/90">{slot.title}</p>
      <p className="mt-1">{slot.description}</p>
    </div>
  );
}
