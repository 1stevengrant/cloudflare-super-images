import { Link, createFileRoute } from '@tanstack/react-router'
import { ImagePlus, Scissors } from 'lucide-react'
import { listProducts } from '#/lib/server'
import { buildVariantUrl } from '#/lib/images'
import { ImageInspector } from '#/lib/ImageInspector'

export const Route = createFileRoute('/products/')({
  loader: () => listProducts(),
  component: ProductsPage,
})

function ProductsPage() {
  const { products, accountHash } = Route.useLoaderData()

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Catalog
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            Products
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            {products.length} item{products.length === 1 ? '' : 's'} · resized
            on the fly by Cloudflare.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          <ImagePlus className="h-4 w-4" />
          Upload another
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => {
            // Deliver the catalog through the `thumbnail` named variant so the
            // grid keeps rendering even when Flexible variants are turned off.
            const thumbUrl = buildVariantUrl(accountHash, p.imageId, 'thumbnail')

            return (
              <li key={p.id}>
                <Link
                  to="/products/$id"
                  params={{ id: p.id }}
                  className="group block"
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 transition group-hover:border-zinc-300">
                    <ImageInspector
                      src={thumbUrl}
                      alt={p.caption}
                      hint={p.removeBg ? 'Removing background' : 'Resizing'}
                      badgePosition="br"
                      className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.03]"
                    />
                    {p.removeBg && (
                      <span className="absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded bg-white/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-zinc-600 ring-1 ring-zinc-200 backdrop-blur">
                        <Scissors className="h-3 w-3 text-brand-500" />
                        bg removed
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-medium text-zinc-900">
                      {p.caption}
                    </p>
                    <p className="font-mono text-sm font-medium tabular-nums text-zinc-900">
                      ${(p.priceCents / 100).toFixed(2)}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mt-12 flex flex-col items-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/40 px-8 py-20 text-center">
      <ImagePlus className="h-8 w-8 text-zinc-400" strokeWidth={1.5} />
      <h2 className="mt-4 text-lg font-semibold text-zinc-900">
        No products yet
      </h2>
      <p className="mt-1 max-w-xs text-sm text-zinc-500">
        Upload your first image and it'll appear here, resized at the edge.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
      >
        Go upload
      </Link>
    </div>
  )
}
