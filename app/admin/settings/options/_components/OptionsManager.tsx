'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createOption, updateOption, deleteOption } from '@/lib/actions/options'
import { Plus, PencilSimple, Check, X, Trash, DotsSixVertical } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { OptionRow } from '@/lib/supabase/types'
import type { OptionTable } from '@/lib/validations/options'

interface Props {
  optionTypes: { type: OptionTable; label: string }[]
  activeType: OptionTable
  options: OptionRow[]
}

export default function OptionsManager({ optionTypes, activeType, options }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newName, setNewName] = useState('')

  const refresh = () => {
    router.refresh()
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    startTransition(async () => {
      const result = await createOption(activeType, {
        name: newName.trim(),
        sort_order: options.length,
        is_active: true,
      })
      if (result.error) { toast.error('Failed to create', { description: result.error }); return }
      setNewName('')
      refresh()
    })
  }

  const handleUpdate = (id: string) => {
    if (!editValue.trim()) return
    startTransition(async () => {
      const result = await updateOption(id, activeType, { name: editValue.trim() })
      if (result.error) { toast.error('Failed to update', { description: result.error }); return }
      setEditingId(null)
      refresh()
    })
  }

  const handleToggleActive = (option: OptionRow) => {
    startTransition(async () => {
      const result = await updateOption(option.id, activeType, { is_active: !option.is_active })
      if (result.error) { toast.error('Failed to update', { description: result.error }); return }
      refresh()
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Remove this option? It will be hidden from the inquiry form.')) return
    startTransition(async () => {
      const result = await deleteOption(id, activeType)
      if (result.error) { toast.error('Failed to delete', { description: result.error }); return }
      refresh()
    })
  }

  return (
    <div>
      {/* Type tabs */}
      <div
        className="flex gap-1 overflow-x-auto pb-1 mb-6 -mx-1 px-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {optionTypes.map(({ type, label }) => {
          const active = type === activeType
          return (
            <Link
              key={type}
              href={`/admin/settings/options?type=${type}`}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                active
                  ? 'text-[color:var(--color-teal)]'
                  : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink-secondary)]'
              )}
              style={
                active
                  ? { backgroundColor: 'var(--color-teal-light)' }
                  : { backgroundColor: 'var(--color-surface)' }
              }
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Add new */}
      <div
        className="rounded-xl border p-4 mb-4"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-ink-muted)' }}>
          Add New
        </p>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Option name…"
            className="flex-1 rounded-lg border px-3.5 py-2.5 text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-cream)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-ink)',
            }}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={pending || !newName.trim()}
            className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-teal)', color: 'var(--color-cream)' }}
          >
            <Plus size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Options list */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {options.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            No options yet. Add the first one above.
          </p>
        ) : (
          <ul>
            {options.map((option, i) => (
              <li
                key={option.id}
                className="flex items-center gap-3 px-4 py-3"
                style={
                  i !== options.length - 1
                    ? { borderBottom: '1px solid var(--color-border)' }
                    : undefined
                }
              >
                <DotsSixVertical size={14} className="shrink-0" style={{ color: 'var(--color-border-strong)' }} />

                {editingId === option.id ? (
                  <>
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(option.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      autoFocus
                      className="flex-1 rounded-lg border px-3 py-1.5 text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--color-cream)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-ink)',
                      }}
                    />
                    <button onClick={() => handleUpdate(option.id)} disabled={pending} className="p-1.5 rounded" style={{ color: 'var(--color-teal)' }}>
                      <Check size={15} weight="bold" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded" style={{ color: 'var(--color-ink-muted)' }}>
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className={cn('flex-1 text-sm', !option.is_active && 'line-through')}
                      style={{ color: option.is_active ? 'var(--color-ink-secondary)' : 'var(--color-ink-muted)' }}
                    >
                      {option.name}
                    </span>

                    <button
                      onClick={() => handleToggleActive(option)}
                      disabled={pending}
                      className="px-2 py-1 rounded text-[11px] font-medium transition-colors"
                      style={
                        option.is_active
                          ? { backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }
                          : { backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-ink-muted)' }
                      }
                    >
                      {option.is_active ? 'Active' : 'Hidden'}
                    </button>

                    <button
                      onClick={() => { setEditingId(option.id); setEditValue(option.name) }}
                      className="p-1.5 rounded"
                      style={{ color: 'var(--color-ink-muted)' }}
                    >
                      <PencilSimple size={14} />
                    </button>

                    <button
                      onClick={() => handleDelete(option.id)}
                      disabled={pending}
                      className="p-1.5 rounded"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <Trash size={14} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
