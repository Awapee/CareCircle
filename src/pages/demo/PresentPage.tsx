import { ArrowLeft, BellRing, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { SkipLink } from '@/components/layout/SkipLink';
import { notificationsFor, type NoteAction, type StoryNotification } from '@/features/present/notifications';
import { Avatar, CallOverlay, MessageDialog, NotificationBell, PopupStack } from '@/features/present/parts';
import { DadView, MeView, MumView, RamView } from '@/features/present/views';
import {
  ORDER,
  PEOPLE,
  clock,
  loadStory,
  saveStory,
  storyReducer,
  type PersonId,
  type StoryAction,
} from '@/features/present/story';
import { cn } from '@/lib/cn';
import { usePageTitle } from '@/lib/usePageTitle';

/**
 * Presentation mode for the pitch video (temporary): one story in Mum's circle, with a tab for
 * each person. Every tab shares the same state, so a tick in Mum's tab shows up for everyone.
 * Pop-up notifications appear a moment after a tab opens.
 */
export function PresentPage() {
  usePageTitle('Presentation');
  const [story, rawDispatch] = useReducer(storyReducer, undefined, loadStory);
  const [viewer, setViewer] = useState<PersonId>('mum');
  const [calling, setCalling] = useState<PersonId | null>(null);
  const [messaging, setMessaging] = useState<PersonId | null>(null);
  const [popups, setPopups] = useState<string[]>([]);
  const [replay, setReplay] = useState(0);
  const storyRef = useRef(story);
  /** Pop-ups already shown on this tab, so each appears once. */
  const shownRef = useRef(new Set<string>());

  useEffect(() => {
    storyRef.current = story;
    saveStory(story);
  }, [story]);

  const dispatch = useCallback((a: StoryAction) => rawDispatch(a), []);

  // Show this person's notifications as pop-ups shortly after their tab opens.
  useEffect(() => {
    const keys = notificationsFor(viewer, storyRef.current)
      .slice(0, 2)
      .map((n) => n.key);
    shownRef.current = new Set(keys);
    const timers = [
      window.setTimeout(() => setPopups([]), 0),
      ...keys.map((k, i) => window.setTimeout(() => setPopups((p) => [...p, k]), 1600 + i * 1500)),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [viewer, replay]);

  const notes = notificationsFor(viewer, story);
  const visible = popups.map((k) => notes.find((n) => n.key === k)).filter((n): n is StoryNotification => !!n);

  const startCall = (to: PersonId) => {
    setPopups([]);
    setCalling(to);
  };
  const openMessage = useCallback((to: PersonId) => setMessaging(to), []);
  const closeMessage = useCallback(() => setMessaging(null), []);

  /** After a pop-up goes away, bring in the next one this person hasn't seen yet. */
  const showNext = () =>
    window.setTimeout(() => {
      const next = notificationsFor(viewer, storyRef.current).find((x) => !shownRef.current.has(x.key));
      if (!next) return;
      shownRef.current.add(next.key);
      setPopups((p) => [...p, next.key]);
    }, 1200);

  const close = (n: StoryNotification) => {
    setPopups((p) => p.filter((k) => k !== n.key));
    showNext();
  };
  const act = (n: StoryNotification, a: NoteAction) => {
    setPopups((p) => p.filter((k) => k !== n.key));
    if (n.messageId) dispatch({ type: 'read', messageId: n.messageId });
    switch (a.kind) {
      case 'record':
        dispatch({ type: 'record', taskId: a.taskId, status: a.status, by: viewer });
        break;
      case 'seen':
        dispatch({ type: 'seen', updateId: a.updateId, who: viewer });
        break;
      case 'remind':
        dispatch({ type: 'remind', by: viewer });
        break;
      case 'reply':
        dispatch({ type: 'message', from: viewer, to: a.to, text: a.text });
        break;
      case 'water':
        dispatch({ type: 'water' });
        break;
      case 'mood':
        dispatch({ type: 'mood', value: a.value });
        break;
      case 'respond':
        dispatch({ type: 'respond', who: viewer });
        break;
      case 'willBuy':
        dispatch({ type: 'willBuy', medId: a.medId, who: viewer });
        break;
      case 'bought':
        dispatch({ type: 'bought', medId: a.medId, who: viewer });
        break;
      case 'buyReminder':
        dispatch({ type: 'buyReminder', medId: a.medId, from: viewer, to: a.to });
        break;
      case 'dismiss':
        dispatch({ type: 'dismiss', who: viewer, key: n.key });
        break;
      case 'call':
        startCall(a.to);
        return;
    }
    showNext();
  };

  // Opening a person's messages marks them as read.
  const readAll = () => {
    for (const m of story.messages) if (m.to === viewer && !m.read) dispatch({ type: 'read', messageId: m.id });
  };

  const person = PEOPLE[viewer];
  const View = { mum: MumView, me: MeView, ram: RamView, dad: DadView }[viewer];
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="min-h-dvh bg-surface">
      <style>{`@keyframes cc-pop { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: none; } }`}</style>
      <SkipLink />

      {/* Presenter bar: switch between people without signing in and out. */}
      <div className="bg-ink text-canvas">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Link
            to="/"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg text-sm text-canvas/80 hover:text-canvas"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Exit
          </Link>
          <div
            role="tablist"
            aria-label="Whose view"
            className="order-last flex w-full gap-1 overflow-x-auto pb-1 md:order-none md:w-auto md:flex-1 md:pb-0"
          >
            {ORDER.map((id) => {
              const p = PEOPLE[id];
              const active = id === viewer;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setViewer(id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-left',
                    active ? 'bg-canvas text-ink' : 'text-canvas/80 hover:bg-canvas/10',
                  )}
                >
                  <Avatar person={id} className="size-7 text-xs" />
                  <span>
                    <span className="block text-sm font-semibold leading-tight">{p.name}</span>
                    <span className={cn('block text-xs leading-tight', active ? 'text-ink-muted' : 'text-canvas/60')}>
                      {p.relation}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-1 text-sm">
            <button
              type="button"
              onClick={() => setReplay((r) => r + 1)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-canvas/80 hover:text-canvas"
            >
              <BellRing className="size-4" aria-hidden="true" />
              Replay pop-ups
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'reset' });
                setReplay((r) => r + 1);
              }}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-canvas/80 hover:text-canvas"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* App bar, as if signed in as this person. */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-4">
            <Logo />
            <span className="hidden truncate rounded-lg bg-surface px-3 py-1 text-sm font-medium sm:inline">
              Mum’s circle
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-ink-muted md:inline">
              {today} · {clock(story.minute)}
            </span>
            <NotificationBell notes={notes} onAction={act} />
            <div className="flex items-center gap-2">
              <Avatar person={viewer} />
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-semibold">{person.name}</p>
                <p className="text-xs text-ink-muted">Signed in · {person.role}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8 outline-none sm:py-10">
        <View key={viewer} story={story} dispatch={dispatch} onCall={startCall} onMessage={openMessage} />
      </main>

      <PopupStack notes={visible} onAction={act} onClose={close} />
      <CallOverlay
        to={calling}
        viewer={viewer}
        onEnd={(seconds) => {
          if (calling) dispatch({ type: 'called', by: viewer, to: calling, seconds });
          setCalling(null);
        }}
      />
      <MessageDialog
        to={messaging}
        viewer={viewer}
        onClose={closeMessage}
        onSend={(to, text) => {
          readAll();
          dispatch({ type: 'message', from: viewer, to, text });
          setMessaging(null);
        }}
      />
    </div>
  );
}
