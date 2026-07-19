import { Skeleton, SkeletonKanban, SkeletonCards } from '@/components/ui'

export default function OrdersLoading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {/* Page header + filter pills */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>

      {/* Kanban on desktop, stacked cards on mobile */}
      <div className="hidden md:block">
        <SkeletonKanban columns={4} cardsPerColumn={3} />
      </div>
      <div className="md:hidden">
        <SkeletonCards count={5} />
      </div>
    </div>
  )
}
