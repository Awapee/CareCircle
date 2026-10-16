import { Link } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { Container } from '@/components/ui/Container';

const groups = [
  {
    heading: 'Product',
    links: [
      { to: '/#features', label: 'Features' },
      { to: '/#how-it-works', label: 'How it works' },
      { to: '/get-started', label: 'Get started' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
    ],
  },
  {
    heading: 'Legal & safety',
    links: [
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/terms', label: 'Terms of Use' },
      { to: '/limitations', label: 'Limitations & appropriate use' },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-[0.9375rem] text-ink-muted">One circle. Shared care.</p>
          <p className="mt-4 max-w-xs text-sm text-ink-subtle">
            CareCircle is a coordination tool. It is not a medical, diagnostic or emergency service. In an emergency,
            contact your local emergency number.
          </p>
        </div>
        {groups.map((group) => (
          <nav key={group.heading} aria-label={group.heading}>
            <h2 className="text-sm font-semibold text-ink">{group.heading}</h2>
            <ul className="mt-3 space-y-1">
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="inline-block py-1 text-[0.9375rem] text-ink-muted hover:text-ink hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col gap-1 py-5 text-sm text-ink-subtle sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} CareCircle — student project prototype.</p>
          <p>Demo content uses fictional people and data.</p>
        </Container>
      </div>
    </footer>
  );
}
