'use client';

import * as React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { TASK_STATUSES, type TaskStatus } from '@/lib/domain/task';
import { TASK_STATUS_VARIABLE, cssVar } from '@/lib/ui/palette';
import type { ProjectSummary } from '@/lib/services/projectService';
import { EmptyState } from '@/components/ui/empty-state';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const ROW_HEIGHT_PX = 46;
const MIN_HEIGHT_PX = 180;
const SEGMENT_GAP_PX = 2;
const MAX_LABEL_CHARS = 28;

/** Stack order runs Done -> In Progress -> Todo so the bar fills from the left
 *  as work completes, matching the mini bars on the project cards. */
const STACK_ORDER: TaskStatus[] = ['Done', 'In Progress', 'Todo'];

function truncate(value: string): string {
  return value.length <= MAX_LABEL_CHARS ? value : `${value.slice(0, MAX_LABEL_CHARS - 1)}…`;
}

interface ChartPalette {
  surface: string;
  ink: string;
  muted: string;
  line: string;
  series: Record<TaskStatus, string>;
}

function readPalette(): ChartPalette {
  return {
    surface: cssVar('--surface'),
    ink: cssVar('--ink-secondary'),
    muted: cssVar('--ink-muted'),
    line: cssVar('--line'),
    series: {
      Todo: cssVar(TASK_STATUS_VARIABLE.Todo),
      'In Progress': cssVar(TASK_STATUS_VARIABLE['In Progress']),
      Done: cssVar(TASK_STATUS_VARIABLE.Done),
    },
  };
}

/**
 * Task status by project, as a horizontal stacked bar. One bar per project, one
 * ordinal blue step per status. Horizontal because project names are long and a
 * vertical axis would either clip them or tilt them.
 */
export function PortfolioChart({ projects }: { projects: ProjectSummary[] }) {
  // The palette lives in state so the chart re-reads the custom properties once
  // the document exists, and again if the OS colour scheme flips.
  const [palette, setPalette] = React.useState<ChartPalette>(readPalette);

  React.useEffect(() => {
    setPalette(readPalette());
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setPalette(readPalette());
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const withTasks = React.useMemo(
    () => projects.filter((project) => project.totalTasks > 0),
    [projects],
  );

  const { data, options, height } = React.useMemo(() => {
    const chartOptions: ChartOptions<'bar'> = {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 4, right: 8 } },
      plugins: {
        legend: {
          position: 'top',
          align: 'start',
          labels: {
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: 'circle',
            color: palette.ink,
            padding: 16,
            font: { size: 12 },
          },
        },
        tooltip: {
          backgroundColor: palette.ink,
          padding: 10,
          cornerRadius: 6,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          callbacks: {
            title: (items) => withTasks[items[0].dataIndex]?.title ?? '',
            label: (item) => ` ${item.dataset.label}: ${item.parsed.x}`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          beginAtZero: true,
          border: { display: false },
          grid: { color: palette.line },
          ticks: { color: palette.muted, precision: 0, font: { size: 11 } },
          title: { display: true, text: 'Tasks', color: palette.muted, font: { size: 11 } },
        },
        y: {
          stacked: true,
          border: { display: false },
          grid: { display: false },
          ticks: { color: palette.ink, font: { size: 12 }, crossAlign: 'far' },
        },
      },
    };

    return {
      height: Math.max(MIN_HEIGHT_PX, withTasks.length * ROW_HEIGHT_PX + 48),
      options: chartOptions,
      data: {
        labels: withTasks.map((project) => truncate(project.title)),
        datasets: STACK_ORDER.map((status) => ({
          label: status,
          data: withTasks.map((project) => project.taskCounts[status]),
          backgroundColor: palette.series[status],
          // A 2px border in the surface colour is the gap between stacked
          // segments, so adjacent blues never bleed into one another.
          borderColor: palette.surface,
          borderWidth: SEGMENT_GAP_PX,
          borderRadius: 4,
          borderSkipped: false as const,
          barThickness: 18,
        })),
      },
    };
  }, [withTasks, palette]);

  if (withTasks.length === 0) {
    return (
      <EmptyState
        title="Nothing to chart yet"
        body="Add tasks to a project and its breakdown will appear here."
      />
    );
  }

  return (
    <figure className="m-0">
      <figcaption className="sr-only">
        Task status by project. Statuses: {TASK_STATUSES.join(', ')}.
      </figcaption>
      <div style={{ height }}>
        <Bar data={data} options={options} />
      </div>
    </figure>
  );
}
