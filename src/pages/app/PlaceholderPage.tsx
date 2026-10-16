import { Construction } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { usePageTitle } from '@/lib/usePageTitle';

/**
 * Honest placeholder for an app page that hasn't been built yet. It deliberately contains
 * no buttons or controls, so nothing appears to work when it doesn't.
 */
export function PlaceholderPage({
  title,
  description,
  milestone,
  planned,
}: {
  title: string;
  description: string;
  milestone: string;
  planned: string[];
}) {
  usePageTitle(title);
  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        description={description}
        actions={<Badge tone="accent">Planned · {milestone}</Badge>}
      />
      <EmptyState
        icon={<Construction className="size-6" />}
        title="This page is being built"
        description={
          <>
            <p>It will include:</p>
            <ul className="mt-3 space-y-1 text-left">
              {planned.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="text-brand-600">
                    •
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </>
        }
      />
    </div>
  );
}
