"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, LockKeyhole, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InlineActionMessage } from "@/components/ui/inline-action-message";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiFetchJson, readApiErrorMessage } from "@/lib/client-fetch";

type JourneyGroupId = "meaning_core" | "music" | "visual";

type JourneyResponse = {
  nickname: string;
  artistWorld: {
    mission: string | null;
    identityStatement: string | null;
    philosophy: string | null;
    coreThemes: string[];
    favoriteArtists: string[];
    currentFocusTitle: string | null;
    differentiator: string | null;
    playlistUrl: string | null;
    visualDirection: string | null;
    aestheticKeywords: string[];
    fashionSignals: string[];
    visualBoards: Array<{
      slug: string;
      sourceUrl?: string | null;
    }>;
  };
  artistWorldJourney: {
    currentGroupId: JourneyGroupId;
    completedCount: number;
    totalCount: number;
    state: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";
    groups: Array<{
      id: JourneyGroupId;
      title: string;
      description: string;
      state: "LOCKED" | "AVAILABLE" | "COMPLETE";
      completion: number;
      prompts: string[];
      recommendations: string[];
    }>;
  };
};

type JourneyForms = {
  meaning_core: {
    mission: string;
    identityStatement: string;
    philosophy: string;
    coreThemes: string;
  };
  music: {
    favoriteArtists: string;
    currentFocusTitle: string;
    differentiator: string;
    playlistUrl: string;
  };
  visual: {
    visualDirection: string;
    aestheticKeywords: string;
    fashionSignals: string;
    aestheticsBoardUrl: string;
    fashionBoardUrl: string;
  };
};

function buildForms(data: JourneyResponse): JourneyForms {
  return {
    meaning_core: {
      mission: data.artistWorld.mission ?? "",
      identityStatement: data.artistWorld.identityStatement ?? "",
      philosophy: data.artistWorld.philosophy ?? "",
      coreThemes: data.artistWorld.coreThemes.join(", ")
    },
    music: {
      favoriteArtists: data.artistWorld.favoriteArtists.join(", "),
      currentFocusTitle: data.artistWorld.currentFocusTitle ?? "",
      differentiator: data.artistWorld.differentiator ?? "",
      playlistUrl: data.artistWorld.playlistUrl ?? ""
    },
    visual: {
      visualDirection: data.artistWorld.visualDirection ?? "",
      aestheticKeywords: data.artistWorld.aestheticKeywords.join(", "),
      fashionSignals: data.artistWorld.fashionSignals.join(", "),
      aestheticsBoardUrl: data.artistWorld.visualBoards.find((board) => board.slug === "aesthetics")?.sourceUrl ?? "",
      fashionBoardUrl: data.artistWorld.visualBoards.find((board) => board.slug === "fashion")?.sourceUrl ?? ""
    }
  };
}

function splitList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ArtistWorldJourney() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [forms, setForms] = useState<JourneyForms | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<JourneyGroupId>("meaning_core");
  const [saveError, setSaveError] = useState("");
  const [savingGroupId, setSavingGroupId] = useState<JourneyGroupId | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["artist-world-journey"],
    queryFn: () => apiFetchJson<JourneyResponse>("/api/id/journey"),
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (!data) return;
    setForms(buildForms(data));
    setActiveGroupId(data.artistWorldJourney.currentGroupId);
  }, [data]);

  const activeGroup = useMemo(
    () => data?.artistWorldJourney.groups.find((group) => group.id === activeGroupId) ?? null,
    [activeGroupId, data]
  );

  if (isLoading || !data || !forms) {
    return (
      <Card className="flex items-center gap-3 rounded-[28px] border-brand-border p-6">
        <Loader2 className="h-5 w-5 animate-spin text-brand-muted" />
        <p className="text-sm text-brand-muted">Собираю последовательный flow Мира артиста...</p>
      </Card>
    );
  }

  async function saveGroup(groupId: JourneyGroupId) {
    if (!forms) return;
    setSavingGroupId(groupId);
    setSaveError("");

    try {
      const payload =
        groupId === "meaning_core"
          ? {
              mission: forms.meaning_core.mission.trim(),
              identityStatement: forms.meaning_core.identityStatement.trim(),
              philosophy: forms.meaning_core.philosophy.trim(),
              coreThemes: splitList(forms.meaning_core.coreThemes)
            }
          : groupId === "music"
            ? {
                favoriteArtists: splitList(forms.music.favoriteArtists),
                currentFocusTitle: forms.music.currentFocusTitle.trim(),
                differentiator: forms.music.differentiator.trim(),
                playlistUrl: forms.music.playlistUrl.trim() || null
              }
            : {
                visualDirection: forms.visual.visualDirection.trim(),
                aestheticKeywords: splitList(forms.visual.aestheticKeywords),
                fashionSignals: splitList(forms.visual.fashionSignals),
                aestheticsBoardUrl: forms.visual.aestheticsBoardUrl.trim() || null,
                fashionBoardUrl: forms.visual.fashionBoardUrl.trim() || null
              };

      const response = await apiFetch("/api/id/journey", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group: groupId, payload })
      });

      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, "Не удалось сохранить группу."));
      }

      const nextData = (await response.json()) as JourneyResponse;
      queryClient.setQueryData(["artist-world-journey"], nextData);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["id-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["home-overview", "execution-center-lite"] })
      ]);
      toast.success("Группа сохранена.");

      const nextGroup = nextData.artistWorldJourney.groups.find((group) => group.state === "AVAILABLE" && group.id !== groupId);
      if (nextGroup) {
        setActiveGroupId(nextGroup.id);
      } else {
        setActiveGroupId(nextData.artistWorldJourney.currentGroupId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось сохранить группу.";
      setSaveError(message);
      toast.error(message);
    } finally {
      setSavingGroupId(null);
    }
  }

  return (
    <div className="space-y-5 pb-10" data-guide-id="guide-id-journey">
      <section className="overflow-hidden rounded-[34px] border border-brand-border bg-[radial-gradient(circle_at_top_left,rgba(217,249,157,0.4),transparent_28%),linear-gradient(135deg,#f7fbf1,#ecf4e2_48%,#e6eee0)] p-5 shadow-[0_20px_60px_rgba(61,84,46,0.12)] md:p-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d6e5bf] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#51654d]">
          <Sparkles className="h-3.5 w-3.5" />
          Мир артиста
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-ink md:text-5xl">Собираем тебя последовательно</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted md:text-base">
          Не куча блоков сразу. Сначала смысловое ядро, потом музыка, затем визуал. Так новый пользователь видит
          структуру, а не перегруз.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#9bc96c,#2f4f35)]"
              style={{ width: `${(data.artistWorldJourney.completedCount / data.artistWorldJourney.totalCount) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-brand-ink">
            {data.artistWorldJourney.completedCount}/{data.artistWorldJourney.totalCount}
          </span>
        </div>
      </section>

      {saveError ? <InlineActionMessage message={saveError} /> : null}

      <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <Card className="rounded-[28px] border-brand-border bg-white/90 p-5">
          <h2 className="text-lg font-semibold tracking-tight text-brand-ink">Этапы</h2>
          <div className="mt-4 space-y-3">
            {data.artistWorldJourney.groups.map((group) => (
              <button
                key={group.id}
                type="button"
                className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                  group.id === activeGroupId
                    ? "border-[#b7d58b] bg-[#f4faec]"
                    : "border-brand-border bg-white hover:bg-[#f8fbf4]"
                } ${group.state === "LOCKED" ? "opacity-60" : ""}`}
                onClick={() => {
                  if (group.state !== "LOCKED") {
                    setActiveGroupId(group.id);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-brand-ink">{group.title}</p>
                    <p className="mt-1 text-sm leading-6 text-brand-muted">{group.description}</p>
                  </div>
                  <div className="shrink-0 rounded-full border border-brand-border bg-white px-3 py-1 text-xs text-brand-muted">
                    {group.state === "COMPLETE" ? "Готово" : group.state === "LOCKED" ? "Закрыто" : "Сейчас"}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#edf3e3]">
                    <div className="h-full rounded-full bg-[#8fbf57]" style={{ width: `${group.completion}%` }} />
                  </div>
                  <span className="text-xs font-medium text-brand-muted">{group.completion}%</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="rounded-[28px] border-brand-border bg-white/92 p-5">
          {activeGroup ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">Активная группа</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-brand-ink">{activeGroup.title}</h2>
                </div>
                {activeGroup.state === "LOCKED" ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-3 py-1 text-xs text-brand-muted">
                    <LockKeyhole className="h-3.5 w-3.5" />
                    Сначала заверши предыдущую группу
                  </div>
                ) : null}
              </div>

              <div className="mt-5 space-y-5">
                {activeGroup.id === "meaning_core" ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-brand-ink">Миссия</label>
                      <Textarea value={forms.meaning_core.mission} onChange={(event) => setForms((current) => current ? { ...current, meaning_core: { ...current.meaning_core, mission: event.target.value } } : current)} className="min-h-[110px] bg-white" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-brand-ink">Identity statement</label>
                      <Textarea value={forms.meaning_core.identityStatement} onChange={(event) => setForms((current) => current ? { ...current, meaning_core: { ...current.meaning_core, identityStatement: event.target.value } } : current)} className="min-h-[110px] bg-white" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-brand-ink">Философия</label>
                      <Textarea value={forms.meaning_core.philosophy} onChange={(event) => setForms((current) => current ? { ...current, meaning_core: { ...current.meaning_core, philosophy: event.target.value } } : current)} className="min-h-[130px] bg-white" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-brand-ink">Темы ядра</label>
                      <Textarea value={forms.meaning_core.coreThemes} onChange={(event) => setForms((current) => current ? { ...current, meaning_core: { ...current.meaning_core, coreThemes: event.target.value } } : current)} className="min-h-[96px] bg-white" />
                    </div>
                  </>
                ) : null}

                {activeGroup.id === "music" ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-brand-ink">Референсы</label>
                      <Textarea value={forms.music.favoriteArtists} onChange={(event) => setForms((current) => current ? { ...current, music: { ...current.music, favoriteArtists: event.target.value } } : current)} className="min-h-[100px] bg-white" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-brand-ink">Текущий музыкальный фокус</label>
                      <Input value={forms.music.currentFocusTitle} onChange={(event) => setForms((current) => current ? { ...current, music: { ...current.music, currentFocusTitle: event.target.value } } : current)} className="bg-white" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-brand-ink">Что делает звук твоим?</label>
                      <Textarea value={forms.music.differentiator} onChange={(event) => setForms((current) => current ? { ...current, music: { ...current.music, differentiator: event.target.value } } : current)} className="min-h-[110px] bg-white" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-brand-ink">Плейлист направления</label>
                      <Input value={forms.music.playlistUrl} onChange={(event) => setForms((current) => current ? { ...current, music: { ...current.music, playlistUrl: event.target.value } } : current)} className="bg-white" placeholder="Spotify / Apple / YouTube" />
                    </div>
                  </>
                ) : null}

                {activeGroup.id === "visual" ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-brand-ink">Визуальное направление</label>
                      <Textarea value={forms.visual.visualDirection} onChange={(event) => setForms((current) => current ? { ...current, visual: { ...current.visual, visualDirection: event.target.value } } : current)} className="min-h-[110px] bg-white" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-brand-ink">Эстетические ключи</label>
                      <Textarea value={forms.visual.aestheticKeywords} onChange={(event) => setForms((current) => current ? { ...current, visual: { ...current.visual, aestheticKeywords: event.target.value } } : current)} className="min-h-[90px] bg-white" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-brand-ink">Fashion-сигналы</label>
                      <Textarea value={forms.visual.fashionSignals} onChange={(event) => setForms((current) => current ? { ...current, visual: { ...current.visual, fashionSignals: event.target.value } } : current)} className="min-h-[90px] bg-white" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-brand-ink">Moodboard эстетики</label>
                        <Input value={forms.visual.aestheticsBoardUrl} onChange={(event) => setForms((current) => current ? { ...current, visual: { ...current.visual, aestheticsBoardUrl: event.target.value } } : current)} className="bg-white" placeholder="Pinterest / Figma / Notion" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-brand-ink">Moodboard фэшна</label>
                        <Input value={forms.visual.fashionBoardUrl} onChange={(event) => setForms((current) => current ? { ...current, visual: { ...current.visual, fashionBoardUrl: event.target.value } } : current)} className="bg-white" placeholder="Pinterest / Figma / Notion" />
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="mt-6 grid gap-4 rounded-[24px] border border-[#dde9ca] bg-[#f8fbf4] p-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">Промпты для размышления</p>
                  <div className="mt-3 space-y-2">
                    {activeGroup.prompts.map((prompt) => (
                      <p key={prompt} className="text-sm leading-6 text-brand-ink">{prompt}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">Рекомендации</p>
                  <div className="mt-3 space-y-2">
                    {activeGroup.recommendations.map((recommendation) => (
                      <p key={recommendation} className="text-sm leading-6 text-brand-muted">{recommendation}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={() => void saveGroup(activeGroup.id)}
                  disabled={activeGroup.state === "LOCKED" || savingGroupId === activeGroup.id}
                >
                  {savingGroupId === activeGroup.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  {activeGroup.state === "COMPLETE" ? "Обновить группу" : "Сохранить и идти дальше"}
                </Button>
              </div>
            </>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
