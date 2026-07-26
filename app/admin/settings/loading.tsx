import { Skeleton, SkeletonForm } from '@/components/ui'

/** Shared fallback for the settings index and any child section without its
 *  own loading file. Child sections are forms, so a form-shaped skeleton
 *  reads truer than a card grid during the common in-section navigation. */
export default function SettingsLoading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-xl">
      <div className="mb-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-3.5 w-56" />
      </div>
      <SkeletonForm fields={4} />
    </div>
  )
}
