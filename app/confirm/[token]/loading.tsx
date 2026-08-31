import { Skeleton } from '@/components/ui'
import { Navbar } from '@/components/public/Navbar'
import { getBusinessContactSettings } from '@/lib/supabase/business-settings'

/** Mirrors the confirmation page: left-aligned Navbar, progress row, intro
 *  greeting, the teal-wash order summary hero, and the confirm action.
 *  Shape must match `page.tsx` exactly so there's no layout jump when the
 *  real content mounts. */
export default async function ConfirmLoading() {
  const { businessPhone, businessInstagram } = await getBusinessContactSettings()

  return (
    <main className="flex-1" style={{ backgroundColor: 'var(--color-cream)' }}>
      <Navbar businessPhone={businessPhone} businessInstagram={businessInstagram} />

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-5">
        {/* Progress row */}
        <div className="mb-6 flex items-center gap-2">
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-3.5 w-3" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-3.5 w-3" />
          <Skeleton className="h-3.5 w-14" />
        </div>

        {/* Intro greeting */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-3.5 w-full mt-1" />
          <Skeleton className="h-3.5 w-5/6" />
        </div>

        {/* Order summary: teal-wash hero + detail rows (matches the real
            highlighted header block over `--color-teal-light`) */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div className="p-5" style={{ backgroundColor: 'var(--color-teal-light)' }}>
            <Skeleton className="h-3 w-32 mb-3" style={{ backgroundColor: 'rgba(0, 104, 96, 0.16)' }} />
            <Skeleton className="h-7 w-52" style={{ backgroundColor: 'rgba(0, 104, 96, 0.16)' }} />
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Skeleton className="h-6 w-20 rounded-full" style={{ backgroundColor: 'rgba(0, 104, 96, 0.16)' }} />
              <Skeleton className="h-6 w-16 rounded-full" style={{ backgroundColor: 'rgba(0, 104, 96, 0.16)' }} />
            </div>
          </div>
          <div className="p-5 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Delivery details card */}
        <div
          className="rounded-2xl border p-5 flex flex-col gap-3"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>

        {/* Confirm button */}
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </main>
  )
}
