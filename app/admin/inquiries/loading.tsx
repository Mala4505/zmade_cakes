import { Skeleton, SkeletonTable, SkeletonCards } from '@/components/ui'

export default function InquiriesLoading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Skeleton className="h-9 flex-1 min-w-[180px] rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Table on desktop, cards on mobile */}
      <div className="hidden md:block">
        <SkeletonTable rows={8} cols={6} />
      </div>
      <div className="md:hidden">
        <SkeletonCards count={6} />
      </div>
    </div>
  )
}
