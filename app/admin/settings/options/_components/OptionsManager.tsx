'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createOption, updateOption, deleteOption } from '@/lib/actions/options'
import { Plus, PencilSimple, Check, X, Trash, DotsSixVertical } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAsyncAction } from '@/lib/hooks/useAsyncAction'
import { Input, IconButton } from '@/components/ui'
import type { OptionRow } from '@/lib/supabase/types'
import type { OptionTable } from '@/lib/validations/options'

interface Props {
  optionTypes: { type: OptionTable; label: string }[]
  activeType: OptionTable
  options: OptionRow[]
}

export default function OptionsManager({ optionTypes, activeType, options }: Props) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newName, setNewName] = useState('')

  const refreshOnSuccess = () => router.refresh()

  const { run: createRun, pending: creating } = useAsyncAction(
    async () => {
      const result = await createOption(activeType, {
        name: newName.trim(),
        sort_order: options.length,
        is_active: true,
      })
      if (result.error) return { error: result.error }
      setNewName('')
    },
    { successToast: 'Option added', onSuccess: refreshOnSuccess }
  )

  const { run: updateRun, pending: updating } = useAsyncAction(
    async (id: string) => {
      const result = await updateOption(id, activeType, { name: editValue.trim() })
      if (result.error) return { error: result.error }
      setEditingId(null)
    },
    { successToast: 'Renamed', onSuccess: refreshOnSuccess }
  )

  const { run: toggleRun, pending: toggling } = useAsyncAction(
    async (option: OptionRow) => {
      const result = await updateOption(option.id, activeType, { is_active: !option.is_active })
      if (result.error) return { error: result.error }
    },
    { successToast: 'Option updated', onSuccess: refreshOnSuccess }
  )

  const { run: deleteRun, pending: deleting } = useAsyncAction(
    async (id: string) => {
      const result = await deleteOption(id, activeType)
      if (result.error) return { error: result.error }
    },
    { successToast: 'Deleted', onSuccess: refreshOnSuccess }
  )

  const busy = creating || updating || toggling || deleting

  const handleCreate = () => {
    if (!newName.trim()) return
    createRun()
  }

  const handleUpdate = (id: string) => {
    if (!editValue.trim()) return
    updateRun(id)
  }

  const handleToggleActive = (option: OptionRow) => {
    toggleRun(option)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Remove this option? It will be hidden from the inquiry form.')) return
    deleteRun(id)
  }

  return (
    <div>
      {/* Type tabs — hidden when only one type is managed here */}
      <div
        className={cn('gap-1 overflow-x-auto pb-1 mb-6 -mx-1 px-1', optionTypes.length > 1 ? 'flex' : 'hidden')}
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
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Option name…"
            size="base"
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={busy || !newName.trim()}
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
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(option.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      autoFocus
                      size="base"
                      className="flex-1 py-1.5"
                    />
                    <IconButton
                      onClick={() => handleUpdate(option.id)}
                      disabled={busy}
                      tone="accent"
                      aria-label="Save"
                    >
                      <Check size={15} weight="bold" />
                    </IconButton>
                    <IconButton
                      onClick={() => setEditingId(null)}
                      disabled={busy}
                      tone="muted"
                      aria-label="Cancel edit"
                    >
                      <X size={15} />
                    </IconButton>
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
                      disabled={busy}
                      className="px-2 py-1 rounded text-[11px] font-medium transition-colors"
                      style={
                        option.is_active
                          ? { backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }
                          : { backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-ink-muted)' }
                      }
                    >
                      {option.is_active ? 'Active' : 'Hidden'}
                    </button>

                    <IconButton
                      onClick={() => { setEditingId(option.id); setEditValue(option.name) }}
                      disabled={busy}
                      tone="muted"
                      aria-label={`Edit ${option.name}`}
                    >
                      <PencilSimple size={14} />
                    </IconButton>

                    <IconButton
                      onClick={() => handleDelete(option.id)}
                      disabled={busy}
                      tone="danger"
                      aria-label={`Delete ${option.name}`}
                    >
                      <Trash size={14} />
                    </IconButton>
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
