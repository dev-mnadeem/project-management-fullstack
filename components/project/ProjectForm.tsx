'use client';

import * as React from 'react';
import { PROJECT_STATUSES, type ProjectStatus } from '@/lib/domain/project';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';

export interface ProjectFormValues {
  title: string;
  description: string;
  status: ProjectStatus;
  deadline: string;
}

export const EMPTY_PROJECT_FORM: ProjectFormValues = {
  title: '',
  description: '',
  status: 'Active',
  deadline: '',
};

/** One form, used by both Create and Edit. The two screens previously carried
 *  near-identical copies of these four fields. */
export function ProjectForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
  error,
  idPrefix = 'project',
}: {
  values: ProjectFormValues;
  onChange: (next: ProjectFormValues) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
  pending?: boolean;
  error?: string | null;
  idPrefix?: string;
}) {
  return (
    <form
      noValidate={false}
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
            onChange={(event) =>
              onChange({ ...values, status: event.target.value as ProjectStatus })
            }
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Deadline" htmlFor={`${idPrefix}-deadline`}>
          <Input
            id={`${idPrefix}-deadline`}
            type="date"
            value={values.deadline}
            onChange={(event) => onChange({ ...values, deadline: event.target.value })}
          />
        </Field>
      </div>

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
