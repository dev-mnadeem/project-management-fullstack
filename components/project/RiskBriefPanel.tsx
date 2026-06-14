'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, ShieldCheck, TriangleAlert } from 'lucide-react';
import { api, queryKeys } from '@/lib/api/client';
import type { RiskLevel } from '@/lib/ai/types';
import { Badge, type Tone } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const LEVEL_META: Record<RiskLevel, { label: string; tone: Tone; icon: typeof Activity }> = {
  'on-track': { label: 'On track', tone: 'good', icon: ShieldCheck },
  'at-risk': { label: 'At risk', tone: 'warning', icon: Activity },
  critical: { label: 'Critical', tone: 'critical', icon: TriangleAlert },
};

const SOURCE_LABEL: Record<string, string> = {
  'local-heuristic': 'Local model',
  anthropic: 'Claude',
};

/**
 * The delivery-risk brief. The score is arithmetic over measured signals and is
 * identical whichever provider wrote the prose - the footer says which one did.
 */
export function RiskBriefPanel({ projectId }: { projectId: number }) {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.riskBrief(projectId),
    queryFn: () => api.riskBrief(projectId),
  });

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delivery risk</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delivery risk</CardTitle>
        </CardHeader>
        <CardContent className="pt-1 text-sm text-ink-secondary">
          The risk brief could not be generated for this project.
        </CardContent>
      </Card>
    );
  }

  const meta = LEVEL_META[data.level];
  const Icon = meta.icon;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Icon aria-hidden className="h-4 w-4 text-ink-muted" />
          Delivery risk
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <span className="tabular text-xs text-ink-muted">{data.score}/100</span>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        <p className="text-sm font-medium leading-snug text-ink">{data.headline}</p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {data.findings.map((finding) => (
            <li key={finding} className="flex gap-2 text-[13px] leading-relaxed text-ink-secondary">
              <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
              {finding}
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-lg border border-line bg-sunken px-3 py-2 text-[13px] leading-relaxed text-ink">
          <span className="font-medium">Next: </span>
          {data.recommendation}
        </p>
        <p className="mt-3 text-xs text-ink-muted">
          Score computed locally from task data. Narrative by{' '}
          {SOURCE_LABEL[data.source] ?? data.source}.
        </p>
      </CardContent>
    </Card>
  );
}
