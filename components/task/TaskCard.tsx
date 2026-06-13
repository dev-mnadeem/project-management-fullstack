'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Pencil, Trash2, User } from 'lucide-react';
import { api, queryKeys, ApiError } from '@/lib/api/client';
import { TASK_PRIORITY_META, type Task } from '@/lib/domain/task';
import { formatDate, isPast } from '@/lib/domain/dates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { TaskForm, splitPhotoUrls, type TaskFormValues } from './TaskForm';

function toFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    assignee: task.assignee ?? '',
    dueDate: task.dueDate ?? '',
    photoUrls: task.photoUrls.join(', '),
  };
}

function message(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

export function TaskCard({ task, today }: { task: Task; today: string }) {
  const queryClient = useQueryClient();
  const [isEditOpen, setEditOpen] = React.useState(false);
  const [isDeleteOpen, setDeleteOpen] = React.useState(false);
  const [form, setForm] = React.useState<TaskFormValues>(() => toFormValues(task));

  // Re-seed the edit form whenever the task changes underneath it, so reopening
  // the dialog after a refetch never shows stale values.
  React.useEffect(() => {
    if (!isEditOpen) setForm(toFormValues(task));
  }, [task, isEditOpen]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks(task.projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.riskBrief(task.projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const updateTask = useMutation({
    mutationFn: () =>
      api.updateTask(task.id, {
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        assignee: form.assignee,
        dueDate: form.dueDate || null,
        photoUrls: splitPhotoUrls(form.photoUrls),
      }),
    onSuccess: () => {
      setEditOpen(false);
      invalidate();
    },
  });

  const deleteTask = useMutation({
    mutationFn: () => api.deleteTask(task.id),
    onSuccess: () => {
      setDeleteOpen(false);
      invalidate();
    },
  });

  const priority = TASK_PRIORITY_META[task.priority];
  const overdue = task.status !== 'Done' && isPast(task.dueDate, today);

  return (
    <article className="flex flex-col rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold leading-snug text-ink">{task.title}</h4>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Edit ${task.title}`}
            onClick={() => setEditOpen(true)}
            className="px-2"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Delete ${task.title}`}
            onClick={() => setDeleteOpen(true)}
            className="px-2 hover:text-critical"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {task.description && (
        <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-ink-secondary">
          {task.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone={task.status === 'Done' ? 'good' : task.status === 'In Progress' ? 'accent' : 'neutral'}>
          {task.status}
        </Badge>
        <Badge tone={priority.tone} dot={task.priority === 'High'}>
          {priority.label}
        </Badge>
        {overdue && <Badge tone="critical">Overdue</Badge>}
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
        <div className="flex items-center gap-1.5">
          <User aria-hidden className="h-3.5 w-3.5" />
          <dt className="sr-only">Assignee</dt>
          <dd>{task.assignee ?? 'Unassigned'}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarClock aria-hidden className="h-3.5 w-3.5" />
          <dt className="sr-only">Due date</dt>
          <dd className={overdue ? 'font-medium text-critical' : undefined}>
            {formatDate(task.dueDate)}
          </dd>
        </div>
      </dl>

      {task.photoUrls.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {task.photoUrls.map((url) => (
            <li key={url}>
              {/* Attachment URLs are arbitrary remote hosts, so next/image's
                  optimiser (which needs an allowlist) does not apply here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                loading="lazy"
                className="h-14 w-14 rounded-md border border-line object-cover"
              />
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={isEditOpen} onClose={() => setEditOpen(false)} title="Edit task">
        <TaskForm
          idPrefix={`task-${task.id}`}
          values={form}
          onChange={setForm}
          onSubmit={() => updateTask.mutate()}
          onCancel={() => setEditOpen(false)}
          submitLabel="Save changes"
          pending={updateTask.isPending}
          error={updateTask.isError ? message(updateTask.error, 'Could not update the task.') : null}
        />
      </Modal>

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete task"
        description="This cannot be undone."
      >
        <p className="text-sm text-ink-secondary">
          Delete <span className="font-medium text-ink">{task.title}</span>?
        </p>
        {deleteTask.isError && (
          <p role="alert" className="mt-3 text-sm text-critical">
            {message(deleteTask.error, 'Could not delete the task.')}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleteTask.isPending}
            onClick={() => deleteTask.mutate()}
          >
            {deleteTask.isPending ? 'Deleting…' : 'Delete task'}
          </Button>
        </div>
      </Modal>
    </article>
  );
}
