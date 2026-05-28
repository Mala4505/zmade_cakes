import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { getSettings } from '@/lib/actions/settings'
import WhatsAppTemplatesForm from './_components/WhatsAppTemplatesForm'
import { DEFAULT_WHATSAPP_TEMPLATES } from '@/lib/supabase/types'

export const metadata: Metadata = { title: 'WhatsApp Templates' }

export default async function WhatsAppTemplatesPage() {
  const result = await getSettings(['whatsapp_templates'])
  const saved = result.data?.whatsapp_templates as Record<string, string> | undefined
  const templates = {
    ...DEFAULT_WHATSAPP_TEMPLATES,
    ...(saved ?? {}),
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl">
      <PageHeader title="WhatsApp Templates" subtitle="Customise the messages sent to customers" />
      <div className="mt-6">
        <WhatsAppTemplatesForm initialTemplates={templates} />
      </div>
    </div>
  )
}
