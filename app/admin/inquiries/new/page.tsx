import { getOptions } from '@/lib/actions/options'
import { PageHeader } from '@/components/admin/PageHeader'
import InquiryForm from '../_components/InquiryForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Inquiry' }

export default async function NewInquiryPage() {
  const [flavors, sizes, occasions, themes, decorations] = await Promise.all([
    getOptions('flavor_options'),
    getOptions('size_options'),
    getOptions('occasion_options'),
    getOptions('theme_options'),
    getOptions('decoration_style_options'),
  ])

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <PageHeader
        title="New Inquiry"
        subtitle="Fill in the customer's order details"
        backHref="/admin/inquiries"
        backLabel="Inquiries"
      />

      <InquiryForm
        options={{
          flavors: flavors.data ?? [],
          sizes: sizes.data ?? [],
          occasions: occasions.data ?? [],
          themes: themes.data ?? [],
          decorations: decorations.data ?? [],
        }}
      />
    </div>
  )
}
