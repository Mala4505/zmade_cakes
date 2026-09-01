import { redirect } from 'next/navigation'

// The create-order entry point moved to /admin/orders/new (Phase 4 merge).
// This route stays as a redirect so old bookmarks/PWA shortcuts/shared links
// keep working.
export default function NewInquiryPage() {
  redirect('/admin/orders/new')
}
