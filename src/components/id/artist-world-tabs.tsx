"use client";

import { BookOpenText, FolderKanban, Image, LayoutGrid, Shapes, Type } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ArtistWorldTab = "overview" | "text" | "visual" | "references" | "projects" | "preview";

const tabs: Array<{ value: ArtistWorldTab; label: string; icon: typeof Type }> = [
  { value: "overview", label: "Обзор", icon: LayoutGrid },
  { value: "text", label: "Основа", icon: Type },
  { value: "visual", label: "Визуал", icon: Image },
  { value: "references", label: "Референсы", icon: BookOpenText },
  { value: "projects", label: "Проекты", icon: FolderKanban },
  { value: "preview", label: "Сборка", icon: Shapes }
];

export function ArtistWorldTabs(props: { activeTab: ArtistWorldTab; onTabChange: (tab: ArtistWorldTab) => void }) {
  return (
    <div className="w-full max-w-full overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
      <div className="inline-flex min-w-max flex-nowrap items-center gap-1 rounded-2xl border border-brand-border bg-white p-1 shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.value}
              type="button"
              variant={props.activeTab === tab.value ? "primary" : "ghost"}
              className="shrink-0 whitespace-nowrap rounded-xl px-3 sm:px-4"
              onClick={() => props.onTabChange(tab.value)}
            >
              <Icon className="mr-1.5 h-4 w-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
