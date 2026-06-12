import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Cloud } from 'lucide-react'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { title: 'Super Images — Cloudflare Images demo' },
      {
        name: 'description',
        content:
          'Drag, drop, and ship product images with Cloudflare Images, D1, and TanStack Start.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'preconnect',
        href: 'https://imagedelivery.net',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-[#fafafa] text-zinc-900">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-[#fafafa]/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-zinc-900"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-brand-500 text-white">
                <Cloud className="h-3.5 w-3.5" />
              </span>
              Super Images
            </Link>
            <nav className="flex items-center gap-7 text-sm">
              <NavLink to="/">Upload</NavLink>
              <NavLink to="/products">Products</NavLink>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mx-auto mt-24 max-w-7xl border-t border-zinc-200 px-6 py-8 font-mono text-xs text-zinc-500">
          Cloudflare Images · TanStack Start · D1
        </footer>

        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

function NavLink({
  to,
  children,
}: {
  to: '/' | '/products'
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === '/' }}
      className="relative py-1 text-zinc-500 transition hover:text-zinc-900 [&.active]:font-medium [&.active]:text-zinc-900 [&.active]:after:absolute [&.active]:after:inset-x-0 [&.active]:after:-bottom-px [&.active]:after:h-0.5 [&.active]:after:bg-brand-500"
    >
      {children}
    </Link>
  )
}
