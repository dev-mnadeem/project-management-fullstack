// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ProjectCard } from '@/components/project/ProjectCard';
import type { ProjectSummary } from '@/lib/services/projectService';

describe('Button', () => {
  it('defaults to type="button" so a Cancel inside a form does not submit it', () => {
    render(<Button>Cancel</Button>);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute('type', 'button');
  });

  it('still honours an explicit submit type', () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
  });

  it('a Cancel button inside a form does not fire submit', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button>Cancel</Button>
        <Button type="submit">Save</Button>
      </form>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick while disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Badge', () => {
  it('always renders its label, so colour is never the only channel', () => {
    render(<Badge tone="critical">Overdue</Badge>);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('shows the title, the explanation and the action', () => {
    render(
      <EmptyState title="No projects yet" body="Create the first one." action={<Button>Create</Button>} />,
    );
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Create the first one.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });
});

describe('ProgressBar', () => {
  it('describes the breakdown for a screen reader', () => {
    render(<ProgressBar counts={{ Todo: 2, 'In Progress': 1, Done: 5 }} />);
    expect(screen.getByRole('img')).toHaveAccessibleName('Task breakdown: 2 Todo, 1 In Progress, 5 Done');
  });

  it('renders no segments when there are no tasks', () => {
    const { container } = render(<ProgressBar counts={{ Todo: 0, 'In Progress': 0, Done: 0 }} />);
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });
});

function summary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: 1,
    title: 'Customer Portal Redesign',
    description: 'Rebuild the portal.',
    status: 'Active',
    deadline: '2026-08-01',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    taskCounts: { Todo: 1, 'In Progress': 1, Done: 2 },
    totalTasks: 4,
    progress: 0.5,
    ...overrides,
  };
}

describe('ProjectCard', () => {
  it('links to the project and shows its progress', () => {
    render(<ProjectCard project={summary()} today="2026-06-01" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/projects/1');
    expect(screen.getByText('2/4 tasks done')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('formats the deadline deterministically rather than as "Invalid Date"', () => {
    render(<ProjectCard project={summary({ deadline: null })} today="2026-06-01" />);
    expect(screen.getByText(/Due —/)).toBeInTheDocument();
  });

  it('marks a passed deadline as overdue', () => {
    render(<ProjectCard project={summary({ deadline: '2026-01-01' })} today="2026-06-01" />);
    expect(screen.getByText(/Overdue/)).toBeInTheDocument();
  });

  it('does not mark a completed project overdue even after its deadline', () => {
    render(
      <ProjectCard project={summary({ deadline: '2026-01-01', status: 'Completed' })} today="2026-06-01" />,
    );
    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('falls back to placeholder copy when there is no description', () => {
    render(<ProjectCard project={summary({ description: null })} today="2026-06-01" />);
    expect(screen.getByText('No description.')).toBeInTheDocument();
  });
});
