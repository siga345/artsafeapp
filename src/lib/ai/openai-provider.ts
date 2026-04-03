import OpenAI from "openai";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import type {
  NavigationProviderDraft,
  NavigationProviderInput,
  StructuredAiProvider,
  SupportProviderDraft,
  SupportProviderInput,
} from "@/lib/ai/provider";

export interface OpenAiStructuredProvider extends StructuredAiProvider {
  generateStructured<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<T>;

  generateStream(params: {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterable<string>;
}

export class OpenAiProvider implements OpenAiStructuredProvider {
  readonly providerName = "openai";
  readonly navigationModel: string;
  readonly supportModel: string;

  private readonly client: OpenAI;
  private readonly config: ReturnType<typeof getAiRuntimeConfig>;

  constructor() {
    this.config = getAiRuntimeConfig();
    this.client = new OpenAI({ apiKey: this.config.openaiApiKey });
    this.navigationModel = this.config.personalizationModel;
    this.supportModel = this.config.chatModel;
  }

  async generateStructured<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<T> {
    const response = await this.client.chat.completions.create({
      model: params.model ?? this.config.personalizationModel,
      max_tokens: params.maxTokens ?? this.config.chatMaxTokens,
      temperature: params.temperature ?? this.config.chatTemperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }

    return JSON.parse(content) as T;
  }

  async *generateStream(params: {
    systemPrompt: string;
    userPrompt: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: params.model ?? this.config.chatModel,
      max_tokens: params.maxTokens ?? this.config.chatMaxTokens,
      temperature: params.temperature ?? this.config.chatTemperature,
      stream: true,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async suggestNavigation(input: NavigationProviderInput): Promise<NavigationProviderDraft> {
    const systemPrompt = `Ты — ИИ-менеджер для музыкальных артистов. Отвечай на русском языке в формате JSON.`;
    const userPrompt = `
Подбери специалистов под задачу артиста.
Цель: ${input.objective}
Этап пути: ${input.pathContext.pathStageName}
Город: ${input.city ?? "не указан"}
Предпочитает удалённо: ${input.preferRemote}
Топ-N: ${input.topK}

Кандидаты:
${JSON.stringify(input.candidates, null, 2)}

Верни JSON:
{
  "summary": "...",
  "nextActions": [{ "title": "...", "description": "...", "etaMinutes": 10 }],
  "rationalesBySpecialistId": { "<specialistUserId>": "..." }
}
`.trim();

    return this.generateStructured<NavigationProviderDraft>({
      systemPrompt,
      userPrompt,
      model: this.config.personalizationModel,
    });
  }

  async respondSupport(input: SupportProviderInput): Promise<SupportProviderDraft> {
    const systemPrompt = `Ты — поддерживающий ИИ-менеджер для музыкальных артистов. Отвечай на русском, обращайся на "ты". Формат JSON.`;
    const userPrompt = `
Настроение артиста: ${input.mood}
Заметка: ${input.note ?? "нет"}
Этап пути: ${input.pathContext ? input.pathContext.pathStageName : "не указан"}
Активность последних дней: ${input.recentActivityDays ?? "неизвестно"}
Уровень эскалации: ${input.escalationLevel}

Верни JSON:
{
  "tone": "CALM" | "ENERGIZING" | "GROUNDING",
  "responseText": "...",
  "suggestedSteps": ["..."]
}
`.trim();

    return this.generateStructured<SupportProviderDraft>({
      systemPrompt,
      userPrompt,
      model: this.config.chatModel,
    });
  }
}

let cachedOpenAiProvider: OpenAiProvider | null = null;

export function getOpenAiProvider(): OpenAiProvider {
  if (!cachedOpenAiProvider) {
    cachedOpenAiProvider = new OpenAiProvider();
  }
  return cachedOpenAiProvider;
}
