import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from '../domain/task';
import { flexibleIsoDate, optionalText, paginationQuery } from './common';
import { MAX_TITLE_LENGTH } from './project';

export const MAX_PHOTO_URLS = 8;

/** Only http(s) URLs are accepted - a `javascript:` or `data:` URL reaching an
 *  <img src> is how a stored-XSS bug starts. */
export const photoUrl = z
  .string()
  .trim()
  .url('Each photo must be a URL')
  .refine((value) => /^https?:\/\//i.test(value), 'Photo URLs must be http or https');

export const createTaskSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1, 'Title is required').max(MAX_TITLE_LENGTH),
  description: optionalText,
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  assignee: optionalText,
  dueDate: flexibleIsoDate.nullable().optional(),
  photoUrls: z.array(photoUrl).max(MAX_PHOTO_URLS).optional(),
});

export const updateTaskSchema = createTaskSchema
  .omit({ projectId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const taskListQuerySchema = paginationQuery.extend({
  projectId: z.coerce.number().int().positive().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
});

export type CreateTaskBody = z.infer<typeof createTaskSchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
