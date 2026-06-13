'use client';

import * as React from 'react';
import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from '@/lib/domain/task';
import { MAX_PHOTO_URLS } from '@/lib/schemas/task';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';

export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  dueDate: string;
  photoUrls: string;
}

export const EMPTY_TASK_FORM: TaskFormValues = {
  title: '',
  description: '',
  status: 'Todo',
  priority: 'Medium',
  assignee: '',
  dueDate: '',
  photoUrls: '',
};

export function splitPhotoUrls(value: string): string[] {
  return value
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
}

export function TaskForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
  error,
  idPrefix = 'task',
}: {
  values: TaskFormValues;
  onChange: (next: TaskFormValues) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
  pending?: boolean;
  error?: string | null;
  idPrefix?: string;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      {error && (
        <p role="alert" className="rounded-lg border border-critical/30 bg-critical-wash px-3 py-2 text-sm text-critical">
          {error}
        </p>
      )}

      <Field label="Title" htmlFor={`${idPrefix}-title`}>
        <Input
          id={`${idPrefix}-title`}
          value={values.title}
          maxLength={255}
          required
          onChange={(event) => onChange({ ...values, title: event.target.value })}
        />
      </Field>

      <Field label="Description" htmlFor={`${idPrefix}-description`} hint="Optional.">
        <Textarea
          id={`${idPrefix}-description`}
          value={values.description}
          onChange={(event) => onChange({ ...values, description: event.target.value })}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" htmlFor={`${idPrefix}-status`}>
          <Select
            id={`${idPrefix}-status`}
            value={values.status}
            onChange={(event) => onChange({ ...values, status: event.target.value as TaskStatus })}
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Priority" htmlFor={`${idPrefix}-priority`}>
          <Select
            id={`${idPrefix}-priority`}
            value={values.priority}
            onChange={(event) =>
              onChange({ ...values, priority: event.target.value as TaskPriority })
            }
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Assignee" htmlFor={`${idPrefix}-assignee`} hint="Leave blank for unassigned.">
          <Input
            id={`${idPrefix}-assignee`}
            value={values.assignee}
            onChange={(event) => onChange({ ...values, assignee: event.target.value })}
          />
        </Field>

        <Field label="Due date" htmlFor={`${idPrefix}-due`}>
          <Input
            id={`${idPrefix}-due`}
            type="date"
            value={values.dueDate}
            onChange={(event) => onChange({ ...values, dueDate: event.target.value })}
          />
        </Field>
      </div>

      <Field
        label="Photo URLs"
        htmlFor={`${idPrefix}-photos`}
        hint={`Comma-separated http(s) links, up to ${MAX_PHOTO_URLS}.`}
      >
        <Input
          id={`${idPrefix}-photos`}
          value={values.photoUrls}
          placeholder="https://example.com/shot.png"
          onChange={(event) => onChange({ ...values, photoUrls: event.target.value })}
        />
      </Field>

      <div className="mt-1 flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
