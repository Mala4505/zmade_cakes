'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-sm font-medium px-4 py-2 rounded-lg"
      style={{
        backgroundColor: 'var(--color-teal)',
        color: '#fff',
      }}
    >
      Print Invoice
    </button>
  )
}
