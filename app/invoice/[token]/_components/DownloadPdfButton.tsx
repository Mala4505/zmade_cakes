'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Spinner, DownloadSimple } from '@phosphor-icons/react'
import type { ComponentProps } from 'react'
import type InvoicePdfDocument from '@/components/InvoicePdfDocument'

type Props = ComponentProps<typeof InvoicePdfDocument>

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '') || 'customer'
}

export function DownloadPdfButton(props: Props) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const [{ pdf }, { default: InvoicePdfDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/InvoicePdfDocument'),
      ])

      const blob = await pdf(<InvoicePdfDocument {...props} />).toBlob()
      const url = URL.createObjectURL(blob)
      const fileName = `zmade-invoice-${sanitizeFileName(props.inquiry.customer_name)}.pdf`

      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      toast.error('Could not generate PDF. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60"
      style={{
        backgroundColor: 'var(--color-teal)',
        color: '#fff',
      }}
    >
      {loading ? <Spinner size={14} className="animate-spin" /> : <DownloadSimple size={14} />}
      {loading ? 'Generating…' : 'Download PDF'}
    </button>
  )
}
