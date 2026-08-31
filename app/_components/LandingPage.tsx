'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { CaretRight, DownloadSimple } from '@phosphor-icons/react'
import { Navbar } from '@/components/public/Navbar'
import { Modal } from '@/components/ui/Modal'
import { BRAND_NAME } from '@/lib/brand'
import { EASE_OUT_QUART } from '@/lib/motion'

// public/ file has spaces in its name — encode so the browser doesn't have to
// guess. Used only for the quiet "download the PDF" link at the bottom of the
// list, not as the primary way of presenting flavors (a raw PDF embed reads as
// a form, not a menu — see FLAVORS below for the actual on-brand presentation).
const MENU_PDF_HREF = '/ZMade%20Cake%20Flavors.pdf'

interface Flavor {
  slug: string
  name: string
  description: string
  themeRestricted?: boolean
}

// Sourced from public/ZMade Cake Flavors.pdf — same copy, same photos (extracted
// and cropped from the PDF's own images), presented as a proper menu instead of
// an embedded document.
const FLAVORS: Flavor[] = [
  {
    slug: 'chocolate-ganache',
    name: 'Chocolate Ganache Cake',
    description: 'A moist chocolate cake layered with a silky, rich ganache. A dream dessert for true chocolate enthusiasts.',
  },
  {
    slug: 'red-velvet',
    name: 'Red Velvet Cake',
    description: 'Decadent red velvet with a rich cheesecake layer, tangy raspberry compote, and luscious cream cheese frosting.',
  },
  {
    slug: 'raffaello',
    name: 'Raffaello Cake',
    description: 'Light almond sponge layered with silky mascarpone coconut cream cheese frosting, topped with Raffaello balls.',
    themeRestricted: true,
  },
  {
    slug: 'ferrero-rocher',
    name: 'Ferrero Rocher Cake',
    description: 'Rich hazelnut chocolate layers, indulgent Nutella ganache, and a crown of Ferrero Rocher chocolates on top.',
  },
  {
    slug: 'chocolate-oreo-nutella',
    name: 'Chocolate Oreo Nutella Cake',
    description: 'Moist chocolate cake layered with ganache and Oreo Nutella buttercream, with a crunch of Oreos throughout.',
  },
  {
    slug: 'lemon-blueberry',
    name: 'Lemon Blueberry Cake',
    description: 'Fresh lemon cake with a luscious blueberry cheesecake layer, blueberry compote, and tangy lemon curd buttercream.',
  },
  {
    slug: 'coconut-mango-lime-mousse',
    name: 'Coconut Mango Lime Mousse',
    description: 'Perfect for non-sweet lovers: coconut cake, sugar-free mango cheesecake, and lemon curd, enveloped in coconut cream mousse.',
  },
  {
    slug: 'white-chocolate-raspberry-almond',
    name: 'White Chocolate Raspberry Almond Cake',
    description: 'Almond cake with mascarpone white chocolate frosting, raspberry mousse, and caramelised almond for a perfect crunch.',
  },
  {
    slug: 'chocolate-cherry',
    name: 'Chocolate Cherry Cake',
    description: 'Chocolate cake layered with cherry mousse and baked chocolate cheesecake, a sprinkle of Oreos, crowned with ganache.',
  },
  {
    slug: 'carrot',
    name: 'Carrot Cake',
    description: 'A carrot cake sponge with a vibrant assortment of nuts and fruits, topped with rich cream cheese frosting.',
  },
  {
    slug: 'vanilla-mango',
    name: 'Vanilla Mango Cake',
    description: 'Vanilla cake crowned with mango ganache, fresh mangoes, sweet mango compote, and chocolate streusel for crunch.',
  },
  {
    slug: 'vanilla-strawberry',
    name: 'Vanilla Strawberry Cake',
    description: 'Vanilla cake infused with fresh strawberries, covered in strawberry compote, topped with delicate vanilla streusel.',
  },
  {
    slug: 'saffron-milk',
    name: 'Saffron Milk Cake',
    description: 'Our distinctive saffron cake, topped with cream, comes in different sizes.',
    themeRestricted: true,
  },
  {
    slug: 'cheesecake',
    name: 'Cheesecake',
    description: 'A flawless cheesecake adorned with your favorite fresh berries. Also available in an Oreo flavor.',
    themeRestricted: true,
  },
  {
    slug: 'chocolate-strawberry-ganache',
    name: 'Chocolate Strawberry Ganache',
    description: 'A chocolate cake layered with fresh strawberries and strawberry compote, frosted with ganache.',
  },
  {
    slug: 'berry-yoghurt-mousse',
    name: 'Berry Yoghurt Mousse Cake',
    description: 'Delicate vanilla sponge layered with berry mousse, topped with yoghurt mousse.',
  },
]

interface LandingPageProps {
  businessInstagram?: string
}

// One flavor card: image, name, description — no buttons. The grid is meant
// to read like a menu (photo + what it is), not a wall of repeated "Order
// this cake" / "Customize" pairs. Tapping the card opens FlavorModal below,
// where those two actions live exactly once, for whichever flavor was tapped.
function FlavorCard({ flavor, onSelect }: { flavor: Flavor; onSelect: (flavor: Flavor) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(flavor)}
      className="flex flex-col rounded-xl border overflow-hidden text-left transition-all hover:-translate-y-0.5"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      <div className="relative w-full aspect-[4/3]">
        <Image
          src={`/flavors/${flavor.slug}.webp`}
          alt={flavor.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col gap-2 p-4 flex-1">
        <h3
          className="text-base font-semibold leading-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
        >
          {flavor.name}
          {flavor.themeRestricted && <span style={{ color: 'var(--color-ink-muted)' }}> *</span>}
        </h3>
        <p className="text-sm leading-snug flex-1" style={{ color: 'var(--color-ink-secondary)' }}>
          {flavor.description}
        </p>
        <span
          className="inline-flex items-center gap-1 text-xs font-semibold pt-1 mt-auto"
          style={{ color: 'var(--color-teal-deep)' }}
        >
          View &amp; order
          <CaretRight size={11} weight="bold" />
        </span>
      </div>
    </button>
  )
}

// The one place "Order this cake" and "Customize" actually live. Opened by
// tapping any FlavorCard above; the flavor being shown is whatever was
// tapped last, so content doesn't flash empty mid-close-animation.
function FlavorModal({ flavor, onClose }: { flavor: Flavor | null; onClose: () => void }) {
  const canCustomize = !flavor?.themeRestricted
  const orderHref = flavor ? `/inquire?flavor=${encodeURIComponent(flavor.name)}` : '#'

  return (
    <Modal open={flavor !== null} onClose={onClose} title={flavor?.name} size="sm">
      {flavor && (
        <div className="flex flex-col gap-4">
          <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden">
            <Image
              src={`/flavors/${flavor.slug}.webp`}
              alt={flavor.name}
              fill
              sizes="(min-width: 640px) 32rem, 90vw"
              className="object-cover"
            />
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-secondary)' }}>
            {flavor.description}
          </p>
          {flavor.themeRestricted && (
            <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
              Theme cakes aren&apos;t possible for this flavor.
            </p>
          )}
          <div className="flex gap-2 pt-1">
            {canCustomize && (
              <Link
                href={`${orderHref}&type=theme`}
                className="inline-flex items-center justify-center rounded-lg font-medium transition-all min-h-11 px-4 text-sm"
                style={{ backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-ink-secondary)' }}
              >
                Customize
              </Link>
            )}
            <Link
              href={orderHref}
              className="inline-flex items-center justify-center rounded-lg font-medium transition-all min-h-11 px-4 text-sm flex-1"
              style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
            >
              Order this cake
            </Link>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function LandingPage({ businessInstagram }: LandingPageProps) {
  const reduceMotion = useReducedMotion()
  const [selectedFlavor, setSelectedFlavor] = useState<Flavor | null>(null)

  return (
    <main className="flex-1" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Navbar businessInstagram={businessInstagram} />

      <div className="flex flex-col gap-10 pt-10 pb-16">
        {/* Hero — the one brand moment on this page, so it carries the logo
            mark; the Navbar above stays purely utilitarian. Text stays at the
            same narrow reading width as before on phones — a wide empty
            column reads as unfinished on desktop, so from `lg` up a real cake
            photo fills that space instead of empty cream background. */}
        <section className="max-w-4xl mx-auto w-full px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-center gap-8 lg:gap-16">
            <div className="max-w-lg flex flex-col gap-5">
              <Image
                src="/logo.svg"
                alt={BRAND_NAME}
                width={72}
                height={72}
                priority
                className="rounded-xl"
              />

              <div className="flex flex-col gap-3">
                <p
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--color-ink-muted)' }}
                >
                  Custom Cakes · Kuwait
                </p>
                <h1
                  className="text-4xl sm:text-5xl font-bold leading-[1.05]"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
                >
                  Cakes made by hand, for the moments that matter.
                </h1>
                <p
                  className="text-base leading-relaxed"
                  style={{ color: 'var(--color-ink-secondary)', maxWidth: '38ch' }}
                >
                  Every order starts with a conversation. Zainab designs and bakes each cake to
                  order from her home kitchen, from flavor to finish.
                </p>
              </div>

              <Link
                href="/inquire"
                className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all min-h-11 px-6 py-3 text-sm w-fit bg-[var(--color-teal)] text-[var(--color-cream)] hover:bg-[var(--color-teal-deep)]"
              >
                Ready to Inquire
              </Link>

              <p className="text-xs sm:text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                Designed around your occasion <span aria-hidden="true">·</span> Baked fresh, never
                frozen <span aria-hidden="true">·</span> Delivery across Kuwait
              </p>
            </div>

            <div
              className="hidden lg:block relative aspect-square rounded-2xl overflow-hidden"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <Image
                src="/flavors/chocolate-ganache.webp"
                alt="A ZMade chocolate ganache cake, hand-finished with fresh berries"
                fill
                sizes="40vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>

        {/* Menu — a proper flavor grid (real photos, cropped from the same PDF),
            not an embedded document and not a cropped-thumbnail list. Always
            visible now — no toggle to find or wonder about. Wider than the
            hero above so it can lay out as a real grid on tablet/desktop
            instead of stretching one narrow column. */}
        <section
          className="max-w-5xl mx-auto w-full px-4 flex flex-col gap-4 pt-8"
          style={{ borderTop: '1px dashed var(--color-border)' }}
        >
          <div className="flex flex-col gap-2">
            <h2
              className="text-xl sm:text-2xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}
            >
              The Menu
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-ink-secondary)' }}>
              Sixteen flavors, baked to order. Every cake comes in 6&quot; or 8&quot;.
            </p>
          </div>

          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.4, ease: EASE_OUT_QUART }}
            className="flex flex-col"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FLAVORS.map((flavor) => (
                <FlavorCard key={flavor.slug} flavor={flavor} onSelect={setSelectedFlavor} />
              ))}
            </div>

            <div
              className="flex flex-col gap-3 pt-5 mt-5"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <p className="text-xs" style={{ color: 'var(--color-ink-muted)' }}>
                * Theme cakes not possible for this flavor.
              </p>
              <a
                href={MENU_PDF_HREF}
                download
                className="inline-flex items-center gap-1.5 text-xs font-medium w-fit min-h-11"
                style={{ color: 'var(--color-ink-secondary)' }}
              >
                <DownloadSimple size={13} weight="bold" />
                Download the printable menu (PDF)
              </a>
            </div>
          </motion.div>
        </section>
      </div>

      <FlavorModal flavor={selectedFlavor} onClose={() => setSelectedFlavor(null)} />
    </main>
  )
}
