import { z } from "zod";

export const UpdateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  date: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  isRecurring: z.boolean().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  recurringDay: z.string().optional(),
});

export const CreateTaskSchema = UpdateTaskSchema.extend({
  title: z.string().min(1),
  date: z.string(),
});

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
