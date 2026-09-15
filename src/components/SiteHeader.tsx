import { useLayoutEffect } from 'react';
import { Menu01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { NAV_LINKS } from '@/lib/nav';

interface SiteHeaderProps {
  currentPath?: string;
}

export default function SiteHeader({ currentPath = '/' }: SiteHeaderProps) {
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
      <div className="mx-auto flex h-16 w-full max-w-[81.25rem] items-center justify-between px-4">
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
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Site navigation
              </SheetDescription>
            </SheetHeader>
            <NavigationMenu
              orientation="vertical"
              className="max-w-none flex-none items-stretch justify-start px-4"
            >
              <NavigationMenuList className="w-full flex-col items-stretch gap-1">
                {NAV_LINKS.map((link) => (
                  <NavigationMenuItem key={link.href} className="w-full">
                    <NavigationMenuLink
                      href={link.href}
                      active={currentPath === link.href}
                      className="w-full px-3 py-2"
                    >
                      {link.label}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
            <SheetFooter>
              <p className="text-sm text-muted-foreground">
                © 2026{' '}
                <a
                  href="https://svenfinger.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  Sven Finger
                </a>
              </p>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
