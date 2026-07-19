import { Skeleton } from '@/components/ui'

/** Wizard-shaped loading state; the order layout already renders the
 *  ZMade header and footer around this. */
export default function OrderLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-2 w-10 rounded-full" />
        ))}
      </div>

      {/* Step title */}
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3.5 w-64" />
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Continue button */}
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  )
}
