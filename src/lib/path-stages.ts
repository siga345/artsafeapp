export type CanonicalPathStageLabel = {
  name: string;
  description: string;
  iconKey: string;
};

export const canonicalPathStageByOrder: Record<number, CanonicalPathStageLabel> = {
  1: { name: "Искра", description: "Творческий порыв", iconKey: "spark" },
  2: { name: "Формирование", description: "Становление бренда", iconKey: "mic" },
  3: { name: "Выход в свет", description: "Первые успехи", iconKey: "knobs" },
  4: { name: "Прорыв", description: "Закрепление влияния", iconKey: "record" },
  5: { name: "Признание", description: "Стабильная аудитория", iconKey: "sliders" },
  6: { name: "Широкая известность", description: "Медийный масштаб", iconKey: "wave" },
  7: { name: "Наследие", description: "Культурное влияние", iconKey: "rocket" }
};

const legacyToCanonicalName: Record<string, string> = {
  "Идея": "Искра",
  "Демо": "Формирование",
  "Продакшн": "Выход в свет",
  "Запись": "Прорыв",
  "Сведение": "Признание",
  "Мастеринг": "Широкая известность",
  "Релиз": "Наследие"
};

export const phase1PathStageOrders = [1, 2, 3, 4, 5, 6] as const;

export type Phase1PathStageOrder = (typeof phase1PathStageOrders)[number];

export function getCanonicalPathStageLabel(order?: number | null): CanonicalPathStageLabel | undefined {
  if (!order) return undefined;
  return canonicalPathStageByOrder[order];
}

export function getCanonicalPathStageName(input: { order?: number | null; name?: string | null }): string | undefined {
  const byOrder = getCanonicalPathStageLabel(input.order)?.name;
  if (byOrder) return byOrder;
  const rawName = input.name?.trim();
  if (!rawName) return undefined;
  return legacyToCanonicalName[rawName] ?? rawName;
}

export function canonicalizePathStage<T extends { order: number; name: string; description: string; iconKey: string }>(
  stage: T
): T {
  const canonical = getCanonicalPathStageLabel(stage.order);
  if (!canonical) return stage;
  return {
    ...stage,
    name: canonical.name,
    description: canonical.description,
    iconKey: canonical.iconKey
  };
}

export function isPhase1PathStageOrder(order?: number | null): order is Phase1PathStageOrder {
  return typeof order === "number" && phase1PathStageOrders.includes(order as Phase1PathStageOrder);
}

export function getPhase1PathStageLabel(order?: number | null): CanonicalPathStageLabel | undefined {
  if (!isPhase1PathStageOrder(order)) return undefined;
  return canonicalPathStageByOrder[order];
}

export function getLatestPhase1PathStageLabel(): CanonicalPathStageLabel | undefined {
  const fallbackOrder = phase1PathStageOrders[phase1PathStageOrders.length - 1];
  return canonicalPathStageByOrder[fallbackOrder];
}

export function getPhase1PathStageName(input: { order?: number | null; name?: string | null }): string | undefined {
  const byOrder = getPhase1PathStageLabel(input.order)?.name;
  if (byOrder) return byOrder;

  const rawName = input.name?.trim();
  if (!rawName) return undefined;
  if (rawName === "Релиз" || rawName === "Наследие") return undefined;
  if (Object.values(canonicalPathStageByOrder).some((stage) => stage.name === rawName)) {
    return rawName;
  }
  const canonical = legacyToCanonicalName[rawName];
  if (!canonical || canonical === "Наследие") return undefined;
  return canonical;
}
