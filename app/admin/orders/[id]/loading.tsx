import { Skeleton, SkeletonForm } from '@/components/ui'

export default function OrderDetailLoading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      {/* Back link + header */}
      <Skeleton className="mb-4 h-3.5 w-24" />
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      <SkeletonForm fields={6} />
    </div>
  )
}
