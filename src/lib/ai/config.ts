export type AiRuntimeConfig = {
  enabled: boolean;
  provider: string;
  timeoutMs: number;
  navigationModel: string;
  supportModel: string;
  openaiApiKey: string;
  chatModel: string;
  personalizationModel: string;
  planningModel: string;
  chatMaxTokens: number;
  chatTemperature: number;
  personalizationRefreshIntervalHours: number;
};

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePositiveFloat(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getAiRuntimeConfig(): AiRuntimeConfig {
  return {
    enabled: process.env.AI_ASSIST_ENABLED === "true",
    provider: (process.env.AI_PROVIDER ?? "mock").toLowerCase(),
    timeoutMs: parsePositiveInt(process.env.AI_REQUEST_TIMEOUT_MS, 8000),
    navigationModel: process.env.AI_MODEL_NAVIGATION ?? "mock-navigation-v1",
    supportModel: process.env.AI_MODEL_SUPPORT ?? "mock-support-v1",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    chatModel: process.env.AI_MODEL_CHAT ?? "gpt-4o-mini",
    personalizationModel: process.env.AI_MODEL_PERSONALIZATION ?? "gpt-4o-mini",
    planningModel: process.env.AI_MODEL_PLANNING ?? "gpt-4o",
    chatMaxTokens: parsePositiveInt(process.env.AI_CHAT_MAX_TOKENS, 2048),
    chatTemperature: parsePositiveFloat(process.env.AI_CHAT_TEMPERATURE, 0.7),
    personalizationRefreshIntervalHours: parsePositiveInt(
      process.env.AI_PERSONALIZATION_REFRESH_INTERVAL_HOURS,
      24
    ),
  };
}

