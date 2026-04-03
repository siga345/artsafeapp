import { z } from "zod";

// ─── Enums ─────────────────────────────────────────────────────────────────────

const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const goalFactorSchema = z.enum([
  "CREATIVITY",
  "PRODUCTION",
  "PROMOTION",
  "AUDIENCE",
  "BUSINESS",
  "OPERATIONS",
  "WELLBEING"
]);

const aiRecommendationTypeSchema = z.enum([
  "LEARN",
  "EVENT",
  "CREATOR",
  "REFERENCE_ARTIST",
  "TASK"
]);

const importanceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);

// ─── Core schemas ──────────────────────────────────────────────────────────────

export const generatedTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  category: goalFactorSchema,
  priority: taskPrioritySchema,
  rationale: z.string().min(1).max(600),
  relatedGoalId: z.string().optional()
});

export const taskRationaleSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  taskTitle: z.string(),
  rationale: z.string(),
  priority: taskPrioritySchema,
  createdAt: z.string()
});

export const recommendationSchema = z.object({
  id: z.string().optional(),
  type: aiRecommendationTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(600),
  relevance: z.number().min(0).max(1),
  payload: z.record(z.unknown()),
  rationale: z.string().min(1).max(600)
});

export const profileGapSchema = z.object({
  field: z.string().min(1),
  label: z.string().min(1),
  importance: importanceSchema,
  hint: z.string().min(1)
});

// ─── GET /api/ai/tasks/generated ──────────────────────────────────────────────

export const getGeneratedTasksResponseSchema = z.object({
  tasks: z.array(generatedTaskSchema)
});

export type GetGeneratedTasksResponse = z.infer<typeof getGeneratedTasksResponseSchema>;

// ─── GET /api/ai/recommendations ──────────────────────────────────────────────

export const getRecommendationsQuerySchema = z.object({
  type: aiRecommendationTypeSchema.optional()
});

export const getRecommendationsResponseSchema = z.object({
  recommendations: z.array(recommendationSchema)
});

export type GetRecommendationsQuery = z.infer<typeof getRecommendationsQuerySchema>;
export type GetRecommendationsResponse = z.infer<typeof getRecommendationsResponseSchema>;

// ─── GET /api/ai/rationale/[id] ───────────────────────────────────────────────

export const getTaskRationaleResponseSchema = z.object({
  rationale: taskRationaleSchema
});

export type GetTaskRationaleResponse = z.infer<typeof getTaskRationaleResponseSchema>;

// ─── GET /api/ai/profile-gaps ─────────────────────────────────────────────────

export const getProfileGapsResponseSchema = z.object({
  gaps: z.array(profileGapSchema)
});

export type GetProfileGapsResponse = z.infer<typeof getProfileGapsResponseSchema>;

// ─── POST /api/ai/recommendations/refresh ─────────────────────────────────────

export const refreshRecommendationsResponseSchema = z.object({
  tasksCount: z.number().int().min(0),
  recommendationsCount: z.number().int().min(0),
  profileGapsCount: z.number().int().min(0)
});

export type RefreshRecommendationsResponse = z.infer<typeof refreshRecommendationsResponseSchema>;
