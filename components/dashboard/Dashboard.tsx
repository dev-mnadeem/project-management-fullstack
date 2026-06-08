'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CircleDot, FolderKanban, Plus, ListChecks } from 'lucide-react';
import { api, queryKeys } from '@/lib/api/client';
import { todayIso } from '@/lib/domain/dates';
import { Button } from '@/components/ui/button';
import { buttonClassName } from '@/components/ui/button-styles';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatTile } from './StatTile';
import { PortfolioChart } from './PortfolioChart';
import { ProjectFilters, type FilterState } from './ProjectFilters';
import { ProjectCard } from '@/components/project/ProjectCard';

const SEARCH_DEBOUNCE_MS = 250;
const PAGE_SIZE = 24;

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function Dashboard() {
  const [filters, setFilters] = React.useState<FilterState>({ search: '', status: '' });
  const [offset, setOffset] = React.useState(0);
  const debouncedSearch = useDebounced(filters.search, SEARCH_DEBOUNCE_MS);
  const today = todayIso();

  // A new search or status starts from the first page again.
  const changeFilters = (next: FilterState) => {
    setFilters(next);
    setOffset(0);
  };

  const params = React.useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: offset || undefined,
      search: debouncedSearch.trim() || undefined,
      status: filters.status || undefined,
    }),
    [debouncedSearch, filters.status, offset],
  );

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects(params),
    queryFn: () => api.listProjects(params),
    placeholderData: (previous) => previous,
  });

  const analyticsQuery = useQuery({
    queryKey: queryKeys.analytics(),
    queryFn: api.analytics,
  });

  const projects = projectsQuery.data?.items ?? [];
  const matchingCount = projectsQuery.data?.total ?? projects.length;
  const analytics = analyticsQuery.data;
  const isFiltered = Boolean(params.search || params.status);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-ink-muted">Portfolio</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-ink">
            Project Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-ink-secondary">
            Every project, what is left in it, and what is already late.
          </p>
        </div>
        <Link href="/projects/create" className={buttonClassName({ className: 'shrink-0' })}>
          <Plus aria-hidden className="h-4 w-4" />
          New project
        </Link>
      </header>

      <section aria-label="Portfolio totals" className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {analyticsQuery.isPending || !analytics ? (
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-xl border border-line bg-surface px-4 py-4 sm:px-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-8 w-12" />
            </div>
          ))
        ) : (
          <>
            <StatTile
              label="Projects"
              value={analytics.projectCount}
              caption={`${analytics.projectsByStatus.find((row) => row.status === 'Active')?.count ?? 0} active`}
              icon={<FolderKanban className="h-4 w-4" />}
            />
            <StatTile
              label="Tasks"
              value={analytics.taskCount}
              caption={`${analytics.tasksByStatus.find((row) => row.status === 'Done')?.count ?? 0} done`}
              icon={<ListChecks className="h-4 w-4" />}
            />
            <StatTile
              label="Open tasks"
              value={analytics.openTaskCount}
              caption={`${analytics.tasksByPriority.find((row) => row.priority === 'High')?.count ?? 0} high priority overall`}
              icon={<CircleDot className="h-4 w-4" />}
            />
            <StatTile
              label="Overdue"
              value={analytics.overdueTaskCount}
              caption="Open tasks past their due date"
              tone={analytics.overdueTaskCount > 0 ? 'critical' : 'good'}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </>
        )}
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Task status by project</CardTitle>
          <CardDescription>
            Where the remaining work sits. Projects with no tasks are omitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          {projectsQuery.isPending ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <PortfolioChart projects={projects} />
          )}
        </CardContent>
      </Card>

      <section aria-label="Projects" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">Projects</h2>
        </div>

        <div className="mt-4">
          <ProjectFilters
            value={filters}
            onChange={changeFilters}
            resultCount={matchingCount}
            total={analytics?.projectCount ?? projectsQuery.data?.total ?? 0}
          />
        </div>

        <div className="mt-5">
          {projectsQuery.isPending ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <CardSkeleton key={index} />
              ))}
            </div>
          ) : projectsQuery.isError ? (
            <EmptyState
              title="Could not load projects"
              body={
                projectsQuery.error instanceof Error
                  ? projectsQuery.error.message
                  : 'The projects endpoint did not respond.'
              }
              action={
                <Button variant="secondary" onClick={() => projectsQuery.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : projects.length === 0 ? (
            <EmptyState
              title={isFiltered ? 'No projects match those filters' : 'No projects yet'}
              body={
                isFiltered
                  ? 'Clear the search or pick a different status to see the rest of the portfolio.'
                  : 'Create the first project and its tasks will start showing up in the chart above.'
              }
              action={
                isFiltered ? (
                  <Button
                    variant="secondary"
                    onClick={() => changeFilters({ search: '', status: '' })}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Link href="/projects/create" className={buttonClassName()}>
                    Create a project
                  </Link>
                )
              }
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} today={today} />
                ))}
              </div>
              {matchingCount > PAGE_SIZE && (
                <nav
                  aria-label="Project pages"
                  className="mt-6 flex flex-wrap items-center justify-between gap-3"
                >
                  <p className="tabular text-xs text-ink-muted">
                    Showing {offset + 1}–{offset + projects.length} of {matchingCount}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={offset + PAGE_SIZE >= matchingCount}
                      onClick={() => setOffset(offset + PAGE_SIZE)}
                    >
                      Next
                    </Button>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
