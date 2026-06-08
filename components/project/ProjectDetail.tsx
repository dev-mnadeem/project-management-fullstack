'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, ListPlus, Pencil, Trash2 } from 'lucide-react';
import { api, queryKeys, ApiError } from '@/lib/api/client';
import { PROJECT_STATUS_META } from '@/lib/domain/project';
import { TASK_STATUSES, type TaskStatus } from '@/lib/domain/task';
import { formatDate, isPast, todayIso } from '@/lib/domain/dates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { ProgressBar } from '@/components/ui/progress-bar';
import { CardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { ProjectForm, type ProjectFormValues } from './ProjectForm';
import { RiskBriefPanel } from './RiskBriefPanel';
import { TaskCard } from '@/components/task/TaskCard';
import { TaskForm, EMPTY_TASK_FORM, splitPhotoUrls, type TaskFormValues } from '@/components/task/TaskForm';

const TASK_PAGE_SIZE = 100;

function message(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

export function ProjectDetail({ projectId }: { projectId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const today = todayIso();

  const [isEditOpen, setEditOpen] = React.useState(false);
  const [isDeleteOpen, setDeleteOpen] = React.useState(false);
  const [isTaskOpen, setTaskOpen] = React.useState(false);
  const [projectForm, setProjectForm] = React.useState<ProjectFormValues | null>(null);
  const [taskForm, setTaskForm] = React.useState<TaskFormValues>(EMPTY_TASK_FORM);

  const projectQuery = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => api.getProject(projectId),
  });

  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks(projectId),
    queryFn: () => api.listTasks({ projectId, limit: TASK_PAGE_SIZE }),
  });

  const project = projectQuery.data;

  React.useEffect(() => {
    if (project && !isEditOpen) {
      setProjectForm({
        title: project.title,
        description: project.description ?? '',
        status: project.status,
        deadline: project.deadline ?? '',
      });
    }
  }, [project, isEditOpen]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.riskBrief(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const updateProject = useMutation({
    mutationFn: () => {
      if (!projectForm) throw new Error('Nothing to save');
      return api.updateProject(projectId, {
        title: projectForm.title,
        description: projectForm.description,
        status: projectForm.status,
        deadline: projectForm.deadline || null,
      });
    },
    onSuccess: () => {
      setEditOpen(false);
      invalidateAll();
    },
  });

  const deleteProject = useMutation({
    mutationFn: () => api.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
      router.push('/');
    },
  });

  const createTask = useMutation({
    mutationFn: () =>
      api.createTask({
        projectId,
        title: taskForm.title,
        description: taskForm.description,
        status: taskForm.status,
        priority: taskForm.priority,
        assignee: taskForm.assignee,
        dueDate: taskForm.dueDate || null,
        photoUrls: splitPhotoUrls(taskForm.photoUrls),
      }),
    onSuccess: () => {
      setTaskOpen(false);
      setTaskForm(EMPTY_TASK_FORM);
      invalidateAll();
    },
  });

  if (projectQuery.isPending) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-6 h-9 w-2/3" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </main>
    );
  }

  if (projectQuery.isError || !project) {
    const notFound = projectQuery.error instanceof ApiError && projectQuery.error.status === 404;
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-20">
        <EmptyState
          title={notFound ? 'Project not found' : 'Could not load this project'}
          body={
            notFound
              ? 'It may have been deleted. Head back to the dashboard to see what is left.'
              : message(projectQuery.error, 'The project endpoint did not respond.')
          }
          action={
            <Link href="/">
              <Button variant="secondary">Back to dashboard</Button>
            </Link>
          }
        />
      </main>
    );
  }

  const tasks = tasksQuery.data?.items ?? [];
  const counts = TASK_STATUSES.reduce(
    (acc, status) => ({ ...acc, [status]: tasks.filter((task) => task.status === status).length }),
    {} as Record<TaskStatus, number>,
  );
  const statusMeta = PROJECT_STATUS_META[project.status];
  const overdue = project.status !== 'Completed' && isPast(project.deadline, today);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dashboard
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink">{project.title}</h1>
          {project.description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary">
              {project.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            <Badge tone={overdue ? 'critical' : 'neutral'} dot={overdue}>
              <CalendarDays aria-hidden className="h-3 w-3" />
              {overdue ? 'Deadline passed ' : 'Deadline '}
              {formatDate(project.deadline)}
            </Badge>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="secondary" onClick={() => setDeleteOpen(true)} className="hover:text-critical">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="tabular text-3xl font-semibold tracking-[-0.02em] text-ink">
              {tasks.length === 0 ? '—' : `${Math.round((counts.Done / tasks.length) * 100)}%`}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {counts.Done} of {tasks.length} tasks complete
            </p>
            <ProgressBar counts={counts} className="mt-4" />
            <dl className="mt-4 grid grid-cols-3 gap-3">
              {TASK_STATUSES.map((status) => (
                <div key={status} className="rounded-lg border border-line bg-sunken px-3 py-2">
                  <dt className="text-xs text-ink-muted">{status}</dt>
                  <dd className="tabular mt-0.5 text-lg font-semibold text-ink">{counts[status]}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <RiskBriefPanel projectId={projectId} />
      </div>

      <section aria-label="Tasks" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
            Tasks{' '}
            <span className="tabular ml-1 text-sm font-normal text-ink-muted">{tasks.length}</span>
          </h2>
          <Button onClick={() => setTaskOpen(true)}>
            <ListPlus className="h-4 w-4" />
            Add task
          </Button>
        </div>

        <div className="mt-4">
          {tasksQuery.isPending ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <CardSkeleton key={index} />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              title="No tasks in this project"
              body="Add the first task to start tracking progress and delivery risk."
              action={<Button onClick={() => setTaskOpen(true)}>Add a task</Button>}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} today={today} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Modal isOpen={isEditOpen} onClose={() => setEditOpen(false)} title="Edit project">
        {projectForm && (
          <ProjectForm
            idPrefix="edit-project"
            values={projectForm}
            onChange={setProjectForm}
            onSubmit={() => updateProject.mutate()}
            onCancel={() => setEditOpen(false)}
            submitLabel="Save changes"
            pending={updateProject.isPending}
            error={
              updateProject.isError ? message(updateProject.error, 'Could not update the project.') : null
            }
          />
        )}
      </Modal>

      <Modal
        isOpen={isTaskOpen}
        onClose={() => setTaskOpen(false)}
        title="Add task"
        description={`New task in ${project.title}`}
      >
        <TaskForm
          idPrefix="new-task"
          values={taskForm}
          onChange={setTaskForm}
          onSubmit={() => createTask.mutate()}
          onCancel={() => setTaskOpen(false)}
          submitLabel="Create task"
          pending={createTask.isPending}
          error={createTask.isError ? message(createTask.error, 'Could not create the task.') : null}
        />
      </Modal>

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete project"
        description="Its tasks are deleted with it. This cannot be undone."
      >
        <p className="text-sm text-ink-secondary">
          Delete <span className="font-medium text-ink">{project.title}</span> and its{' '}
          {tasks.length} task{tasks.length === 1 ? '' : 's'}?
        </p>
        {deleteProject.isError && (
          <p role="alert" className="mt-3 text-sm text-critical">
            {message(deleteProject.error, 'Could not delete the project.')}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleteProject.isPending}
            onClick={() => deleteProject.mutate()}
          >
            {deleteProject.isPending ? 'Deleting…' : 'Delete project'}
          </Button>
        </div>
      </Modal>
    </main>
  );
}
