import { Skeleton, SkeletonCards } from '@/components/ui'

export default function ProductsLoading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl mx-auto">
      {/* Page header + add action */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Flavor list */}
      <SkeletonCards count={5} />
    </div>
  )
}
