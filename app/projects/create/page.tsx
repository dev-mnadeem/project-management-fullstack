'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api, queryKeys, ApiError } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProjectForm, EMPTY_PROJECT_FORM, type ProjectFormValues } from '@/components/project/ProjectForm';

export default function CreateProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState<ProjectFormValues>(EMPTY_PROJECT_FORM);

  const createProject = useMutation({
    mutationFn: () =>
      api.createProject({
        title: form.title,
        description: form.description,
        status: form.status,
        deadline: form.deadline || null,
      }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
      router.push(`/projects/${project.id}`);
    },
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dashboard
      </Link>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-xl">New project</CardTitle>
          <CardDescription>
            Give it a title and a deadline. Tasks, progress and the risk brief follow once it exists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm
            idPrefix="create-project"
            values={form}
            onChange={setForm}
            onSubmit={() => createProject.mutate()}
            onCancel={() => router.push('/')}
            submitLabel="Create project"
            pending={createProject.isPending}
            error={
              createProject.isError
                ? createProject.error instanceof ApiError || createProject.error instanceof Error
                  ? createProject.error.message
                  : 'Could not create the project.'
                : null
            }
          />
        </CardContent>
      </Card>
    </main>
  );
}
