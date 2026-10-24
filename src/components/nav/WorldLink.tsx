import { useEffect, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { buttonStyles, type ButtonSize, type ButtonVariant } from '@/components/ui/button-styles';
import { LoadingState } from '@/components/ui/States';
import { goToWorld, MEMORY_ROUTER, worldHref, type World } from '@/app/worlds';

type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

/** A link into the other world (website ↔ demo). It always loads that world fresh. */
export function WorldLink({
  world,
  to = '/',
  onClick,
  children,
  ...rest
}: AnchorProps & { world: World; to?: string }) {
  return (
    <a
      href={worldHref(world, to)}
      onClick={(e) => {
        onClick?.(e);
        if (MEMORY_ROUTER && !e.defaultPrevented) {
          e.preventDefault();
          goToWorld(world, to);
        }
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export function WorldButtonLink({
  world,
  to,
  variant,
  size,
  fullWidth,
  icon,
  className,
  children,
  ...rest
}: AnchorProps & {
  world: World;
  to?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
}) {
  return (
    <WorldLink world={world} to={to} className={buttonStyles({ variant, size, fullWidth, className })} {...rest}>
      {icon}
      {children}
    </WorldLink>
  );
}

/** Route element for a path that belongs to the other world: hands the visitor over to it. */
export function LeaveForWorld({ world, stripPrefix = '' }: { world: World; stripPrefix?: string }) {
  const location = useLocation();
  const rest = location.pathname.startsWith(stripPrefix)
    ? location.pathname.slice(stripPrefix.length) || '/'
    : location.pathname;
  const target = rest + location.search + location.hash;
  useEffect(() => {
    goToWorld(world, target);
  }, [world, target]);
  return <LoadingState className="min-h-[50dvh]" />;
}
