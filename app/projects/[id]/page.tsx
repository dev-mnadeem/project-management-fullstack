import { notFound } from 'next/navigation';
import { ProjectDetail } from '@/components/project/ProjectDetail';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = Number(id);
  // A non-numeric path segment is a 404, not a request the API should see.
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();
  return <ProjectDetail projectId={projectId} />;
}
