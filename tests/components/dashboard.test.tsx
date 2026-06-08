// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QueryProvider from '@/components/QueryProvider';
import { Dashboard } from '@/components/dashboard/Dashboard';
import type { ProjectSummary } from '@/lib/services/projectService';

// Chart.js needs a real canvas; the chart has nothing to do with paging.
vi.mock('@/components/dashboard/PortfolioChart', () => ({ PortfolioChart: () => null }));

const TOTAL = 30;

function project(id: number): ProjectSummary {
  return {
    id,
    title: `Project ${id}`,
    description: null,
    status: 'Active',
    deadline: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    taskCounts: { Todo: 0, 'In Progress': 0, Done: 0 },
    totalTasks: 0,
    progress: 0,
  };
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
}

function stubApi() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/analytics') {
      return json({
        projectCount: TOTAL,
        taskCount: 0,
        openTaskCount: 0,
        overdueTaskCount: 0,
        projectsByStatus: [{ status: 'Active', count: TOTAL }],
        tasksByStatus: [],
        tasksByPriority: [],
      });
    }
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const ids = Array.from({ length: TOTAL }, (_, index) => index + 1).slice(offset, offset + limit);
    return json({ items: ids.map(project), total: TOTAL, limit, offset });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Dashboard', () => {
  it('renders "New project" as a link, not a button nested in a link', async () => {
    stubApi();
    render(<Dashboard />, { wrapper: QueryProvider });
    const link = screen.getByRole('link', { name: /New project/ });
    expect(link).toHaveAttribute('href', '/projects/create');
    expect(within(link).queryByRole('button')).toBeNull();
  });

  it('pages through a portfolio larger than one page', async () => {
    const fetchMock = stubApi();
    render(<Dashboard />, { wrapper: QueryProvider });

    expect(await screen.findByText('Showing 1–24 of 30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Showing 25–30 of 30')).toBeInTheDocument();
    expect(screen.getByText('Project 30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('offset=24'))).toBe(true),
    );
  });
});
