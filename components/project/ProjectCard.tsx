import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { PROJECT_STATUS_META } from '@/lib/domain/project';
import { formatDate } from '@/lib/domain/dates';
import type { ProjectSummary } from '@/lib/services/projectService';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';

export function ProjectCard({
  project,
  today,
}: {
  project: ProjectSummary;
  today: string;
}) {
  const meta = PROJECT_STATUS_META[project.status];
  const overdue =
    project.deadline !== null && project.deadline < today && project.status !== 'Completed';
  const percent = Math.round(project.progress * 100);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col rounded-xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">
          {project.title}
        </h3>
        <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted transition-colors group-hover:text-accent" />
      </div>

      <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-[13px] leading-relaxed text-ink-secondary">
        {project.description ?? 'No description.'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <Badge tone={overdue ? 'critical' : 'neutral'} dot={overdue}>
          {overdue ? 'Overdue ' : 'Due '}
          {formatDate(project.deadline)}
        </Badge>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs text-ink-muted">
            {project.taskCounts.Done}/{project.totalTasks} tasks done
          </span>
          <span className="tabular text-xs font-medium text-ink-secondary">{percent}%</span>
        </div>
        <ProgressBar counts={project.taskCounts} />
      </div>
    </Link>
  );
}
