import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';

const links = [
  { to: '/#features', label: 'Features' },
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/about', label: 'About' },
  { to: '/limitations', label: 'Appropriate use' },
];

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/85">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link to="/" className="rounded-lg" aria-label="CareCircle home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className="rounded-lg px-3 py-2 text-[0.9375rem] font-medium text-ink-muted hover:bg-surface hover:text-ink"
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink to="/get-started" size="sm" className="hidden sm:inline-flex">
            Get Started
          </ButtonLink>
          <Sheet
            open={menuOpen}
            onOpenChange={setMenuOpen}
            title="Menu"
            trigger={
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-xl text-ink hover:bg-surface md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-6" aria-hidden="true" />
              </button>
            }
          >
            <nav aria-label="Main">
              <ul className="flex flex-col gap-1">
                {links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      onClick={() => setMenuOpen(false)}
                      className={cn('flex min-h-12 items-center rounded-xl px-3 font-medium text-ink hover:bg-surface')}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <ButtonLink to="/get-started" fullWidth className="mt-4" onClick={() => setMenuOpen(false)}>
                Get Started
              </ButtonLink>
            </nav>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}
