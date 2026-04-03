"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

import { usePathOverlay } from "@/components/home/path-overlay";
import { useEntryGuide } from "@/components/onboarding/entry-guide-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { InlineActionMessage } from "@/components/ui/inline-action-message";
import { Textarea } from "@/components/ui/textarea";
import { apiFetchJson } from "@/lib/client-fetch";

type HomeOverview = {
  stage: {
    order: number;
    name: string;
    description: string;
  };
  phase1Stage: {
    order: number;
    name: string;
    description: string;
  } | null;
  rhythm: {
    score: number;
    message: string;
  };
  commandCenter: {
    recommendedStart: {
      task: {
        title: string;
      };
      selectionReason: {
        reasonBody: string;
      };
    } | null;
    featuredProject: {
      title: string;
      gapSummary: {
        message: string;
      };
    } | null;
  } | null;
  priorityTask: {
    title: string;
    body: string;
    ctaLabel: string;
    href: "/id";
    groupTitle: string;
  } | null;
};

type IdProfile = {
  nickname: string;
  avatarUrl: string | null;
  artistWorld: {
    identityStatement: string | null;
    mission: string | null;
    visualBoards: Array<{
      id: string;
      slug: string;
      name: string;
      sourceUrl?: string | null;
    }>;
  };
};

function fetcher<T>(url: string): Promise<T> {
  return apiFetchJson<T>(url);
}

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "A";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function ExecutionCenterPage() {
  const { openPathOverlay } = usePathOverlay();
  const { restartGuide, restarting } = useEntryGuide();

  const { data, isLoading, error } = useQuery({
    queryKey: ["home-overview", "execution-center-lite"],
    queryFn: () => fetcher<HomeOverview>("/api/home/overview")
  });

  const { data: idProfile } = useQuery({
    queryKey: ["id-profile", "artist-world-lite"],
    queryFn: () => fetcher<IdProfile>("/api/id")
  });

  if (isLoading) {
    return (
      <Card className="flex items-center gap-3 p-6">
        <Loader2 className="h-5 w-5 animate-spin text-brand-muted" />
        <p className="text-sm text-brand-muted">Собираю лёгкий экран пути...</p>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="space-y-3 p-6">
        <CardTitle>Путь артиста недоступен</CardTitle>
        <CardDescription>Не удалось получить данные для главного экрана.</CardDescription>
        {error ? <InlineActionMessage variant="error" message="Не удалось загрузить home overview." /> : null}
      </Card>
    );
  }

  const artistName = idProfile?.nickname?.trim() || "Артист";
  const avatarUrl = idProfile?.avatarUrl ?? null;
  const heroImageStyle = avatarUrl
    ? { backgroundImage: `linear-gradient(180deg, rgba(11, 18, 16, 0.08), rgba(11, 18, 16, 0.72)), url(${avatarUrl})` }
    : { backgroundImage: "linear-gradient(160deg, rgba(11, 18, 16, 0.12), rgba(11, 18, 16, 0.84)), radial-gradient(circle at top, rgba(95,235,190,0.24), transparent 40%), linear-gradient(135deg, #203b34, #102629)" };

  return (
    <div className="space-y-6 pb-8">
      <section className="grid gap-4">
        <Card className="relative min-h-[340px] overflow-hidden border-brand-border text-white shadow-[0_24px_70px_rgba(16,38,41,0.22)]">
          <div className="absolute inset-0 bg-center bg-cover" style={heroImageStyle} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,14,14,0.08)_0%,rgba(9,14,14,0.5)_55%,rgba(9,14,14,0.9)_100%)]" />
          <div className="relative flex min-h-[340px] flex-col items-center justify-end p-5 text-center md:p-6">
            <CardTitle className="truncate text-3xl text-white md:text-4xl">{artistName}</CardTitle>
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                className="rounded-full border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                onClick={openPathOverlay}
              >
                Этап пути
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <Card className="border-brand-border bg-white/92 p-5 md:p-6" data-guide-id="guide-today-priority">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-brand-ink">Задачи</h2>
            <Button type="button" variant="secondary" className="rounded-xl" onClick={() => void restartGuide()} disabled={restarting}>
              {restarting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Пройти гайд ещё раз
            </Button>
          </div>

          {data.priorityTask ? (
            <div className="mt-5 rounded-[28px] border border-[#dce7c8] bg-[linear-gradient(135deg,#f8fcf3,#edf5e2)] p-5 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e7c2] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#51654d]">
                <Sparkles className="h-3.5 w-3.5" />
                Приоритет сейчас
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-brand-ink">{data.priorityTask.title}</h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-brand-muted">{data.priorityTask.body}</p>
              <p className="mt-3 text-sm font-medium text-brand-ink">Следующая группа: {data.priorityTask.groupTitle}</p>

              <div className="mt-5">
                <Link href={data.priorityTask.href}>
                  <Button className="rounded-xl">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    {data.priorityTask.ctaLabel}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-brand-border bg-[#fbfcf8] p-6 text-sm leading-6 text-brand-muted">
              Здесь пока нет задач. После диалога с ИИ они появятся как короткие и понятные шаги.
            </div>
          )}
        </Card>

        <Card className="border-brand-border bg-white/92 p-5 md:p-6">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-ink">Чат</h2>

          <div className="mt-5 space-y-3">
            <Textarea readOnly value="Напиши сообщение ассистенту..." className="min-h-[88px] resize-none bg-[#fafcf7]" />
          </div>
        </Card>
      </section>
    </div>
  );
}
