'use client'

import { Printer } from '@phosphor-icons/react'

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-all active:scale-[0.97]"
      style={{
        borderColor: 'var(--color-teal)',
        backgroundColor: 'transparent',
        color: 'var(--color-teal)',
      }}
    >
      <Printer size={14} />
      Print Invoice
    </button>
  )
}
