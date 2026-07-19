import { Skeleton, SkeletonCards } from '@/components/ui'

export default function CustomersLoading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl mx-auto">
      {/* Page header */}
      <Skeleton className="mb-6 h-6 w-32" />

      {/* Search input */}
      <Skeleton className="mb-4 h-9 w-full md:w-72 rounded-lg" />

      {/* Customer list */}
      <SkeletonCards count={6} />
    </div>
  )
}
