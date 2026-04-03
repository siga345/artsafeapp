"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  Eye,
  Home,
  Loader2,
  Music2,
  Search,
  Sparkles,
  UserCircle2,
  UsersRound
} from "lucide-react";

import { InlineActionMessage } from "@/components/ui/inline-action-message";
import { apiFetch, apiFetchJson, readApiErrorMessage } from "@/lib/client-fetch";
import type { EntryFlowState } from "@/lib/entry-flow";

type TeamPreference = "solo" | "team" | "both" | "";

type SurveyFormState = {
  name: string;
  age: string;
  nickname: string;
  city: string;
  favoriteArtist1: string;
  favoriteArtist2: string;
  favoriteArtist3: string;
  lifeValues: string;
  musicAspirations: string;
  teamPreference: TeamPreference;
};

const QUESTION_COUNT = 8;

const teamOptions: Array<{
  value: Exclude<TeamPreference, "">;
  title: string;
  description: string;
}> = [
  {
    value: "solo",
    title: "Одиночка",
    description: "Предпочитаю работать самостоятельно"
  },
  {
    value: "team",
    title: "Командный игрок",
    description: "Люблю работать в команде"
  },
  {
    value: "both",
    title: "И то и другое",
    description: "Готов работать и сам, и в команде"
  }
];

function buildFormState(data: EntryFlowState | null): SurveyFormState {
  return {
    name: data?.surveyDraft?.name ?? "",
    age: data?.surveyDraft?.age ? String(data.surveyDraft.age) : "",
    nickname: data?.surveyDraft?.nickname ?? "",
    city: data?.surveyDraft?.city ?? "",
    favoriteArtist1: data?.surveyDraft?.favoriteArtists?.[0] ?? "",
    favoriteArtist2: data?.surveyDraft?.favoriteArtists?.[1] ?? "",
    favoriteArtist3: data?.surveyDraft?.favoriteArtists?.[2] ?? "",
    lifeValues: data?.surveyDraft?.lifeValues ?? "",
    musicAspirations: data?.surveyDraft?.musicAspirations ?? "",
    teamPreference: data?.surveyDraft?.teamPreference ?? ""
  };
}

function resolveStartStep(data: EntryFlowState | null) {
  const savedStep = data?.surveyDraft?.currentStep;
  if (typeof savedStep === "number" && savedStep >= 0 && savedStep < QUESTION_COUNT) {
    return savedStep;
  }

  const form = buildFormState(data);
  if (!form.name.trim()) return 0;
  if (!form.age.trim()) return 1;
  if (!form.nickname.trim()) return 2;
  if (!form.city.trim()) return 3;
  if (!form.favoriteArtist1.trim() || !form.favoriteArtist2.trim() || !form.favoriteArtist3.trim()) return 4;
  if (!form.lifeValues.trim()) return 5;
  if (!form.musicAspirations.trim()) return 6;
  if (!form.teamPreference) return 7;
  return 0;
}

function hasDraft(data: EntryFlowState | null) {
  const draft = data?.surveyDraft;
  if (!draft) return false;

  return Boolean(
    draft.name ||
      draft.age ||
      draft.nickname ||
      draft.city ||
      draft.favoriteArtists?.length ||
      draft.lifeValues ||
      draft.musicAspirations ||
      draft.teamPreference
  );
}

function isStepValid(step: number, form: SurveyFormState) {
  switch (step) {
    case 0:
      return form.name.trim().length > 0;
    case 1: {
      const age = Number.parseInt(form.age, 10);
      return !Number.isNaN(age) && age >= 10 && age <= 100;
    }
    case 2:
      return form.nickname.trim().length > 0;
    case 3:
      return form.city.trim().length > 0;
    case 4:
      return (
        form.favoriteArtist1.trim().length > 0 &&
        form.favoriteArtist2.trim().length > 0 &&
        form.favoriteArtist3.trim().length > 0
      );
    case 5:
      return form.lifeValues.trim().length > 0;
    case 6:
      return form.musicAspirations.trim().length > 0;
    case 7:
      return form.teamPreference.length > 0;
    default:
      return false;
  }
}

function buildDraftPayload(form: SurveyFormState, currentStep: number) {
  const age = Number.parseInt(form.age, 10);

  return {
    name: form.name.trim() || undefined,
    age: !Number.isNaN(age) ? age : undefined,
    nickname: form.nickname.trim() || undefined,
    city: form.city.trim() || undefined,
    favoriteArtists: [form.favoriteArtist1.trim(), form.favoriteArtist2.trim(), form.favoriteArtist3.trim()].filter(Boolean),
    lifeValues: form.lifeValues.trim() || undefined,
    musicAspirations: form.musicAspirations.trim() || undefined,
    teamPreference: form.teamPreference || undefined,
    currentStep
  };
}

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex gap-1.5 md:gap-2.5">
      {Array.from({ length: QUESTION_COUNT }).map((_, index) => (
        <span
          key={index}
          className={`h-1.5 flex-1 rounded-full md:h-2 ${
            index <= currentStep ? "bg-[#5d7a54]" : "bg-[#cfd7c7]"
          }`}
        />
      ))}
    </div>
  );
}

function WelcomeChrome() {
  return (
    <>
      <header className="flex items-center justify-between border-b border-[#dfe3c8] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-xl border border-[#dcdcbc] bg-white">
            <Image
              src="/images/artsafeplace-logo.jpeg"
              alt="ART SAFE PLACE"
              width={40}
              height={40}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-brand-ink">ART SAFE PLACE</p>
            <p className="text-[11px] text-brand-muted">Место, где искусство сохраняет нас людьми</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-[#d7dcc6] bg-white/80 text-brand-ink">
            <Bell className="h-4 w-4" />
          </button>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-[#d7dcc6] bg-white/80 text-brand-ink">
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="fixed inset-x-0 bottom-0 z-10 pb-4">
        <div className="mx-auto flex w-[calc(100%-48px)] max-w-[430px] items-center justify-between rounded-[22px] border border-[#d9ddc7] bg-[rgba(255,255,255,0.86)] px-5 py-3 shadow-[0_16px_32px_rgba(61,84,46,0.12)] backdrop-blur-md">
          {[Home, Search, Music2, BookOpen, UsersRound, UserCircle2].map((Icon, index) => (
            <div
              key={index}
              className={`grid h-10 w-10 place-items-center rounded-2xl ${
                index === 5 ? "bg-[#243329] text-white" : "text-[#8c9687]"
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-3 right-4 h-14 w-14 overflow-hidden rounded-full border border-[#d8dec9] bg-white shadow-[0_12px_26px_rgba(61,84,46,0.16)]">
          <Image
            src="/images/background-removed-toolpix%201.png"
            alt="PATH"
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<SurveyFormState>(buildFormState(null));
  const draftTimerRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);
  const lastDraftPayloadRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      try {
        const data = await apiFetchJson<EntryFlowState>("/api/onboarding");
        if (cancelled) return;

        if (data.isLegacyUser || data.surveyStatus === "COMPLETED") {
          router.replace("/today");
          return;
        }

        setForm(buildFormState(data));
        setStep(resolveStartStep(data));
        setStarted(hasDraft(data));
        hydratedRef.current = true;
      } catch (error) {
        if (!cancelled) {
          setFormError(error instanceof Error ? error.message : "Не удалось открыть анкету.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadState();

    return () => {
      cancelled = true;
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
      }
    };
  }, [router]);

  const draftPayload = useMemo(() => JSON.stringify(buildDraftPayload(form, step)), [form, step]);

  useEffect(() => {
    if (!hydratedRef.current || !started || loading || submitting) return;
    if (draftPayload === lastDraftPayloadRef.current) return;

    if (draftTimerRef.current) {
      window.clearTimeout(draftTimerRef.current);
    }

    draftTimerRef.current = window.setTimeout(() => {
      void apiFetch("/api/onboarding/survey", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: draftPayload
      }).then(() => {
        lastDraftPayloadRef.current = draftPayload;
      }).catch(() => {
        // draft persistence is best-effort
      });
    }, 350);
  }, [draftPayload, loading, started, submitting]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f6de]">
        <div className="mx-auto max-w-[560px]">
          <WelcomeChrome />
          <div className="flex min-h-[calc(100vh-88px)] items-center justify-center px-6 pb-36">
            <div className="flex items-center gap-3 rounded-[28px] border border-[#d8dec9] bg-white/80 px-6 py-5">
              <Loader2 className="h-5 w-5 animate-spin text-brand-muted" />
              <p className="text-sm text-brand-muted">Подготавливаю визуальную анкету...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function handleFinish() {
    setSubmitting(true);
    setFormError("");

    try {
      const response = await apiFetch("/api/onboarding/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          age: Number.parseInt(form.age, 10),
          nickname: form.nickname.trim(),
          city: form.city.trim(),
          favoriteArtists: [
            form.favoriteArtist1.trim(),
            form.favoriteArtist2.trim(),
            form.favoriteArtist3.trim()
          ],
          lifeValues: form.lifeValues.trim(),
          musicAspirations: form.musicAspirations.trim(),
          teamPreference: form.teamPreference
        })
      });

      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, "Не удалось сохранить анкету."));
      }

      router.replace("/today");
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Не удалось сохранить анкету.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderQuestion() {
    switch (step) {
      case 0:
        return (
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Имя"
            className="h-16 w-full rounded-[20px] border-2 border-[#2c3026] bg-white px-6 text-center text-2xl tracking-tight text-brand-ink outline-none placeholder:text-[#b4b5ad]"
            autoFocus
          />
        );
      case 1:
        return (
          <input
            type="number"
            min={10}
            max={100}
            value={form.age}
            onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
            placeholder="Возраст"
            className="h-16 w-full rounded-[20px] border-2 border-[#2c3026] bg-white px-6 text-center text-2xl tracking-tight text-brand-ink outline-none placeholder:text-[#b4b5ad]"
            autoFocus
          />
        );
      case 2:
        return (
          <input
            value={form.nickname}
            onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))}
            placeholder="Псевдоним"
            className="h-16 w-full rounded-[20px] border-2 border-[#2c3026] bg-white px-6 text-center text-2xl tracking-tight text-brand-ink outline-none placeholder:text-[#b4b5ad]"
            autoFocus
          />
        );
      case 3:
        return (
          <input
            value={form.city}
            onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            placeholder="Город"
            className="h-16 w-full rounded-[20px] border-2 border-[#2c3026] bg-white px-6 text-center text-2xl tracking-tight text-brand-ink outline-none placeholder:text-[#b4b5ad]"
            autoFocus
          />
        );
      case 4:
        return (
          <div className="space-y-3">
            {(["favoriteArtist1", "favoriteArtist2", "favoriteArtist3"] as const).map((key, index) => (
              <input
                key={key}
                value={form[key]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                placeholder={`Артист ${index + 1}`}
                className="h-16 w-full rounded-[20px] border-2 border-[#2c3026] bg-white px-6 text-xl tracking-tight text-brand-ink outline-none placeholder:text-[#b4b5ad]"
                autoFocus={index === 0}
              />
            ))}
          </div>
        );
      case 5:
        return (
          <textarea
            value={form.lifeValues}
            onChange={(event) => setForm((current) => ({ ...current, lifeValues: event.target.value }))}
            placeholder="Напиши свободно..."
            className="min-h-[150px] w-full rounded-[20px] border-2 border-[#2c3026] bg-white px-5 py-4 text-xl tracking-tight text-brand-ink outline-none placeholder:text-[#b4b5ad]"
            autoFocus
          />
        );
      case 6:
        return (
          <textarea
            value={form.musicAspirations}
            onChange={(event) => setForm((current) => ({ ...current, musicAspirations: event.target.value }))}
            placeholder="Твоя цель в музыке..."
            className="min-h-[150px] w-full rounded-[20px] border-2 border-[#2c3026] bg-white px-5 py-4 text-xl tracking-tight text-brand-ink outline-none placeholder:text-[#b4b5ad]"
            autoFocus
          />
        );
      case 7:
        return (
          <div className="space-y-4">
            {teamOptions.map((option) => {
              const active = form.teamPreference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, teamPreference: option.value }))}
                  className={`w-full rounded-[22px] border bg-white px-6 py-5 text-left transition ${
                    active ? "border-[#2c3026] shadow-[0_0_0_1px_rgba(44,48,38,0.08)]" : "border-[#d8ddcc]"
                  }`}
                >
                  <p className="text-2xl tracking-tight text-brand-ink">{option.title}</p>
                  <p className="mt-1 text-base text-brand-muted">{option.description}</p>
                </button>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  }

  const stepTitles = [
    "Как тебя зовут?",
    "Сколько тебе лет?",
    "Твой сценический псевдоним?",
    "В каком городе ты живёшь?",
    "Три твоих любимых артиста?",
    "Что для тебя самое ценное в жизни прямо сейчас, и к чему ты стремишься как человек?",
    "К чему ты стремишься в музыке?",
    "Ты одиночка или любишь работать в команде?"
  ] as const;

  const isCurrentValid = isStepValid(step, form);

  return (
    <div className="min-h-screen bg-[#f6f6de] text-brand-ink">
      <div className="mx-auto flex min-h-screen max-w-[560px] flex-col bg-[linear-gradient(180deg,#f6f6de_0%,#f7f7df_100%)] shadow-[0_0_0_1px_rgba(93,122,84,0.04)]">
        <WelcomeChrome />

        <main className="flex-1 px-7 pb-36 pt-6 md:px-8">
          {formError ? <InlineActionMessage message={formError} /> : null}

          {!started ? (
            <div className="flex min-h-[calc(100vh-220px)] flex-col items-center justify-center text-center">
              <div className="grid h-20 w-20 place-items-center rounded-[24px] border border-[#d8dec9] bg-white/60 shadow-[0_16px_36px_rgba(61,84,46,0.08)]">
                <Sparkles className="h-9 w-9 text-[#4d6648]" />
              </div>
              <h1 className="mt-7 text-5xl font-semibold tracking-tight text-brand-ink">Мир артиста</h1>
              <p className="mt-4 max-w-md text-xl leading-9 text-brand-muted">
                Здесь ты сформируешь свою идентичность: текст, визуал, референсы. Начни с нескольких вопросов о себе.
              </p>
              <button
                type="button"
                className="mt-8 inline-flex items-center gap-3 rounded-[18px] bg-[#243329] px-8 py-4 text-lg font-medium text-white shadow-[0_16px_28px_rgba(36,51,41,0.2)]"
                onClick={() => {
                  setStarted(true);
                  void apiFetch("/api/onboarding/survey", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(buildDraftPayload(form, step))
                  }).catch(() => {});
                }}
              >
                <Sparkles className="h-5 w-5" />
                Создать свой мир
              </button>
            </div>
          ) : (
            <div className="flex min-h-[calc(100vh-220px)] flex-col">
              <div className="pt-24">
                <ProgressBar currentStep={step} />
                <p className="mt-8 text-sm uppercase tracking-[0.16em] text-brand-muted">
                  Шаг {step + 1} из {QUESTION_COUNT}
                </p>
                <h1 className="mt-3 text-[2.25rem] font-semibold tracking-tight text-brand-ink">
                  {stepTitles[step]}
                </h1>

                <div className="mt-8">{renderQuestion()}</div>
              </div>

              <div className="mt-auto flex items-center justify-between pb-8 pt-10">
                <button
                  type="button"
                  className="px-4 py-2 text-xl text-[#314033] disabled:opacity-40"
                  onClick={() => {
                    if (step === 0) {
                      setStarted(false);
                      return;
                    }
                    setStep((current) => Math.max(0, current - 1));
                  }}
                  disabled={submitting}
                >
                  Назад
                </button>

                <button
                  type="button"
                  className={`inline-flex min-w-[152px] items-center justify-center rounded-[18px] px-7 py-3 text-xl font-medium transition ${
                    isCurrentValid && !submitting
                      ? "bg-[#243329] text-white shadow-[0_14px_26px_rgba(36,51,41,0.24)] hover:bg-[#1f2c23]"
                      : "bg-[#bcc2ae] text-white/90"
                  }`}
                  disabled={!isCurrentValid || submitting}
                  onClick={() => {
                    if (step === QUESTION_COUNT - 1) {
                      void handleFinish();
                      return;
                    }
                    setStep((current) => Math.min(QUESTION_COUNT - 1, current + 1));
                  }}
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : step === QUESTION_COUNT - 1 ? "Создать мир" : "Далее"}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
