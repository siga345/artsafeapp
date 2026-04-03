import type { AiRecommendationType, TaskPriority, GoalFactor, CheckInMood } from "@prisma/client";

// ─── Artist Context ────────────────────────────────────────────────────────────

export type ArtistContextPathStage = {
  id: number;
  order: number;
  name: string;
  description: string;
};

export type ArtistContextGoalTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: TaskPriority;
  pillarFactor: GoalFactor;
};

export type ArtistContextGoal = {
  id: string;
  title: string;
  type: string;
  status: string;
  isPrimary: boolean;
  targetDate: string | null;
  whyNow: string | null;
  tasks: ArtistContextGoalTask[];
};

export type ArtistContextTrack = {
  id: string;
  title: string;
  workbenchState: string;
  hasDemo: boolean;
  updatedAt: string;
};

export type ArtistContextCheckIn = {
  date: string;
  mood: CheckInMood;
  note: string | null;
};

export type ArtistContextLearnProgress = {
  materialKey: string;
  status: string;
};

export type ArtistContextEvent = {
  id: string;
  title: string;
  startsAt: string;
  isOnline: boolean;
  city: string | null;
};

export type ArtistContext = {
  userId: string;
  nickname: string;
  pathStage: ArtistContextPathStage | null;

  // Identity
  identityStatement: string | null;
  mission: string | null;
  aestheticKeywords: string[];
  coreThemes: string[];
  audienceCore: string | null;
  artistCity: string | null;
  favoriteArtists: string[];

  // Goals
  goals: ArtistContextGoal[];

  // Tracks
  tracks: ArtistContextTrack[];
  totalTracksCount: number;

  // Activity
  recentCheckIns: ArtistContextCheckIn[];
  learnProgress: ArtistContextLearnProgress[];

  // Events
  upcomingEvents: ArtistContextEvent[];
};

// ─── Personalization Engine Output ────────────────────────────────────────────

export type GeneratedTask = {
  title: string;
  description: string;
  category: GoalFactor;
  priority: TaskPriority;
  rationale: string;
  relatedGoalId?: string;
};

export type Recommendation = {
  type: AiRecommendationType;
  title: string;
  description: string;
  relevance: number; // 0–1
  payload: Record<string, unknown>;
  rationale: string;
};

export type ProfileGap = {
  field: string;
  label: string;
  importance: "HIGH" | "MEDIUM" | "LOW";
  hint: string;
};
