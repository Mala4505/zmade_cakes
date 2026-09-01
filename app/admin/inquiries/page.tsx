import { redirect } from 'next/navigation'

// The real "Inquiries" list has been merged into /admin/orders (Phase 4 — one
// combined Orders section with a table + board view). This route stays as a
// redirect so old bookmarks/PWA shortcuts/shared links keep working.
export default function InquiriesPage() {
  redirect('/admin/orders')
}
