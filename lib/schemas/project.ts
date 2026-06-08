import { z } from 'zod';
import { PROJECT_STATUSES } from '../domain/project';
import { flexibleIsoDate, optionalText, paginationQuery } from './common';

export const MAX_TITLE_LENGTH = 255;

export const createProjectSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(MAX_TITLE_LENGTH),
  description: optionalText,
  status: z.enum(PROJECT_STATUSES),
  deadline: flexibleIsoDate.nullable().optional(),
});

export const updateProjectSchema = createProjectSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Provide at least one field to update' },
);

export const projectListQuerySchema = paginationQuery.extend({
  status: z.enum(PROJECT_STATUSES).optional(),
  /** Case-insensitive substring match over title and description. */
  search: z.string().trim().max(MAX_TITLE_LENGTH).optional(),
});

export type CreateProjectBody = z.infer<typeof createProjectSchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
