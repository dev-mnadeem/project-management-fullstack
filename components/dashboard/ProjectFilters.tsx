'use client';

import { Search } from 'lucide-react';
import { PROJECT_STATUSES, type ProjectStatus } from '@/lib/domain/project';
import { Input, Select } from '@/components/ui/field';

export interface FilterState {
  search: string;
  status: ProjectStatus | '';
}

/** Filters sit in one row above the charts and cards, and drive the server
 *  query rather than filtering an already-downloaded list. */
export function ProjectFilters({
  value,
  onChange,
  resultCount,
  total,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  resultCount: number;
  total: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        />
        <label htmlFor="project-search" className="sr-only">
          Search projects
        </label>
        <Input
          id="project-search"
          type="search"
          placeholder="Search projects…"
          className="pl-9"
          value={value.search}
          onChange={(event) => onChange({ ...value, search: event.target.value })}
        />
      </div>

      <div className="w-[160px]">
        <label htmlFor="project-status" className="sr-only">
          Filter by status
        </label>
        <Select
          id="project-status"
          value={value.status}
          onChange={(event) =>
            onChange({ ...value, status: event.target.value as ProjectStatus | '' })
          }
        >
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </div>

      <p className="tabular ml-auto text-xs text-ink-muted">
        {resultCount === total ? `${total} projects` : `${resultCount} of ${total} projects`}
      </p>
    </div>
  );
}
