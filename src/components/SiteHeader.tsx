import { useLayoutEffect, useRef } from 'react';
import { Menu01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { LEGAL_LINKS, NAV_LINKS, isCurrentPath } from '@/lib/nav';

interface SiteHeaderProps {
  currentPath?: string;
}

const copyrightLinkClass =
  'underline-offset-4 hover:text-foreground hover:underline';

export default function SiteHeader({ currentPath = '/' }: SiteHeaderProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const gutter = Math.max(0, window.innerWidth - root.clientWidth);
    root.style.setProperty('--scrollbar-gutter-size', `${gutter}px`);
  }, []);

  return (
    <header
      data-slot="site-header"
      className="fixed inset-x-0 top-0 z-40 bg-background/70 backdrop-blur-xl supports-backdrop-filter:bg-background/55"
    >
      <div className="mx-auto flex h-16 w-full max-w-325 items-center justify-between px-4">
        <a className="block leading-none" href="/">
          <img
            className="block h-8 w-auto dark:hidden"
            src="/logo.png"
            alt="OpenSkies"
            width="196"
            height="32"
            decoding="async"
          />
          <img
            className="hidden h-8 w-auto dark:block"
            src="/logo-dark.png"
            alt="OpenSkies"
            width="196"
            height="32"
            decoding="async"
          />
        </a>

        <Sheet>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" aria-label="Open menu" />}
          >
            <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
          </SheetTrigger>
          <SheetContent
            ref={menuRef}
            side="right"
            className="w-72"
            initialFocus={() => menuRef.current}
          >
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Site navigation
              </SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4" aria-label="Site">
              {NAV_LINKS.map((link) => {
                const current = isCurrentPath(currentPath, link.href);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'rounded-2xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-1',
                      current && 'bg-muted',
                    )}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>
            <SheetFooter>
              <p className="text-sm text-muted-foreground">
                © 2026{' '}
                <a
                  href="https://svenfinger.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={copyrightLinkClass}
                >
                  Sven Finger
                </a>
                {LEGAL_LINKS.map((link) => (
                  <span key={link.href}>
                    {' · '}
                    <a
                      href={link.href}
                      aria-current={
                        isCurrentPath(currentPath, link.href) ? 'page' : undefined
                      }
                      className={copyrightLinkClass}
                    >
                      {link.label}
                    </a>
                  </span>
                ))}
              </p>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
