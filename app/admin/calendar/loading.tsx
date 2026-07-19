import { SkeletonCalendar } from '@/components/ui'

export default function CalendarLoading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <SkeletonCalendar />
    </div>
  )
}
