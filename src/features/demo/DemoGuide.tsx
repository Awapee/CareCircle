import { ArrowLeft, ArrowRight, ChevronDown, Compass, UserPlus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useApi } from '@/api/ApiProvider';
import { isDemo } from '@/api/createApi';
import { useCircle } from '@/app/session';
import { WorldButtonLink } from '@/components/nav/WorldLink';
import { Button } from '@/components/ui/Button';
import type { Role } from '@/domain/types';
import { cn } from '@/lib/cn';
import { guideStore, useGuide } from './guideStore';
import { GUIDE_STEPS, type GuideNames } from './steps';

/** The visitor's own account in the sample circle (always the admin who set it up). */
const YOU = 'demo-priya';

/**
 * The guided walkthrough: a small card that steps through each part of the working app.
 * Every page stays fully usable while it's open, and it can be folded away at any time.
 */
export function DemoGuide() {
  const api = useApi();
  const { members, userId, circle, careProfile } = useCircle();
  const { step: rawStep, open } = useGuide();
  const navigate = useNavigate();
  const location = useLocation();
  if (!isDemo(api)) return null;

  const step = Math.min(Math.max(rawStep, 0), GUIDE_STEPS.length - 1);
  const current = GUIDE_STEPS[step]!;
  const last = step === GUIDE_STEPS.length - 1;
  const names: GuideNames = {
    recipient: members.find((m) => m.role === 'care_recipient')?.displayName ?? careProfile.preferredName ?? 'them',
    circle: circle.name,
    you: members.find((m) => m.userId === YOU)?.displayName ?? 'you',
    viewer: members.find((m) => m.role === 'read_only')?.displayName ?? 'a neighbour',
  };

  const personFor = (role: Role | undefined): string | undefined => {
    if (!role || role === 'admin') return members.some((m) => m.userId === YOU) ? YOU : undefined;
    return members.find((m) => m.role === role)?.userId;
  };

  const go = (index: number) => {
    const target = GUIDE_STEPS[index]!;
    guideStore.set({ step: index, open: true });
    navigate(target.route);
    const person = personFor(target.viewAs);
    if (person && person !== userId) void api.switchPersona(person);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => guideStore.set({ open: true })}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-700 px-4 text-sm font-semibold text-white shadow-lg hover:bg-brand-800 lg:bottom-6 lg:right-6"
      >
        <Compass className="size-4" aria-hidden="true" />
        Guide · step {step + 1} of {GUIDE_STEPS.length}
      </button>
    );
  }

  return (
    <section
      aria-labelledby="guide-title"
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-line bg-canvas p-4 shadow-xl sm:left-auto sm:right-4 sm:w-[24rem] lg:bottom-6 lg:right-6 lg:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
          How it works · {step + 1} of {GUIDE_STEPS.length}
        </p>
        <button
          type="button"
          onClick={() => guideStore.set({ open: false })}
          className="-mr-2 inline-flex size-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink"
          aria-label="Fold the guide away"
        >
          <ChevronDown className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {GUIDE_STEPS.map((_, i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full', i <= step ? 'bg-brand-600' : 'bg-line')} />
        ))}
      </div>

      <h2 id="guide-title" className="mt-3 text-lg font-semibold">
        {current.title(names)}
      </h2>
      <p className="mt-1 text-[0.9375rem] text-ink-muted">{current.body(names)}</p>
      {current.tryIt && (
        <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
          <strong className="font-semibold">Try it:</strong> {current.tryIt(names)}
        </p>
      )}
      {location.pathname !== current.route && !last && (
        <button
          type="button"
          onClick={() => go(step)}
          className="mt-2 text-sm font-semibold text-brand-700 underline underline-offset-2"
        >
          Show me this page
        </button>
      )}

      {last ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <WorldButtonLink world="main" to="/sign-up" icon={<UserPlus className="size-4" aria-hidden="true" />}>
            Create an account
          </WorldButtonLink>
          <Button variant="secondary" onClick={() => guideStore.set({ open: false })}>
            Keep exploring
          </Button>
          <Button variant="ghost" onClick={() => go(0)}>
            Restart tour
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={step === 0}
            onClick={() => go(step - 1)}
            icon={<ArrowLeft className="size-4" aria-hidden="true" />}
          >
            Back
          </Button>
          <Button onClick={() => go(step + 1)} icon={<ArrowRight className="order-last size-4" aria-hidden="true" />}>
            Next step
          </Button>
        </div>
      )}
    </section>
  );
}
