import { Skeleton, SkeletonCards } from '@/components/ui'

export default function OptionsLoading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-3.5 w-64" />
      </div>

      {/* Add-option row */}
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>

      {/* Option rows */}
      <SkeletonCards count={4} />
    </div>
  )
}
