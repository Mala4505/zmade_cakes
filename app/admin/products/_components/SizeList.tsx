'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createOption, updateOption, deleteOption } from '@/lib/actions/options'
import type { OptionRow } from '@/lib/supabase/types'

interface Props {
  sizes: OptionRow[]
  onChanged: (sizes: OptionRow[]) => void
}

export function SizeList({ sizes, onChanged }: Props) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [isAddPending, startAddTransition] = useTransition()

  const handleAdd = () => {
    if (!newName.trim()) { setAdding(false); return }
    startAddTransition(async () => {
      const result = await createOption('size_options', {
        name: newName.trim(),
        sort_order: sizes.length,
        is_active: true,
      })
      if (result.error) {
        toast.error('Failed to add size', { description: result.error })
      } else if (result.data) {
        onChanged([...sizes, result.data])
        toast.success('Size added')
      }
      setNewName('')
      setAdding(false)
    })
  }

  return (
    <div className="px-6 py-6" style={{ maxWidth: 480 }}>
      <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>
        Sizes
      </h2>

      <div className="flex flex-col gap-1 mb-4">
        {sizes.map((size) => (
          <SizeRow key={size.id} size={size} onChanged={(updated) => {
            if (!updated) {
              onChanged(sizes.filter((s) => s.id !== size.id))
            } else {
              onChanged(sizes.map((s) => (s.id === size.id ? updated : s)))
            }
          }} />
        ))}

        {sizes.length === 0 && !adding && (
          <p className="text-xs py-2" style={{ color: 'var(--color-ink-muted)' }}>
            No sizes yet. Add one below.
          </p>
        )}
      </div>

      {adding ? (
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2"
          style={{ borderColor: 'var(--color-teal)' }}
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setAdding(false); setNewName('') }
            }}
            placeholder="Size name…"
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--color-ink)' }}
            disabled={isAddPending}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAddPending || !newName.trim()}
            className="text-xs font-semibold px-2 py-0.5 rounded"
            style={{ backgroundColor: 'var(--color-teal)', color: '#fff' }}
          >
            {isAddPending ? <Loader2 size={12} className="animate-spin" /> : 'Add'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm rounded-lg border-2 border-dashed px-3 py-2 w-full transition-colors"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-ink-muted)' }}
        >
          <Plus size={14} />
          <span>Add size</span>
        </button>
      )}
    </div>
  )
}

function SizeRow({ size, onChanged }: { size: OptionRow; onChanged: (updated: OptionRow | null) => void }) {
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      const result = await updateOption(size.id, 'size_options', { is_active: !size.is_active })
      if (result.error) {
        toast.error('Failed to update', { description: result.error })
      } else if (result.data) {
        onChanged(result.data)
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteOption(size.id, 'size_options')
      if (result.error) {
        toast.error('Failed to deactivate', { description: result.error })
      } else {
        onChanged({ ...size, is_active: false })
        toast.success('Size deactivated')
      }
    })
  }

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3"
      style={{ minHeight: 44, opacity: size.is_active ? 1 : 0.5 }}
    >
      <span className="flex-1 text-sm" style={{ color: 'var(--color-ink)' }}>
        {size.name}
      </span>

      {isPending ? (
        <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-ink-muted)' }} />
      ) : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggle}
            className="text-[11px] font-medium rounded-full px-2 py-0.5 border"
            style={{
              borderColor: size.is_active ? 'var(--color-success)' : 'var(--color-border)',
              color: size.is_active ? 'var(--color-success)' : 'var(--color-ink-muted)',
            }}
          >
            {size.is_active ? 'Active' : 'Inactive'}
          </button>
          {size.is_active && (
            <button
              type="button"
              onClick={handleDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg"
              style={{ color: 'var(--color-ink-muted)' }}
              title="Deactivate"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
