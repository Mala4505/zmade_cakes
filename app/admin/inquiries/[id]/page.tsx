import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

// The Inquiries and Orders detail pages merged into one (Phase 4) — an inquiry's id
// works at every lifecycle stage, so old bookmarks and shared links just move over.
export default async function InquiryDetailRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/admin/orders/${id}`)
}
