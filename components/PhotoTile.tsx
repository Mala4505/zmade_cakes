'use client'

import { Plus, Image as ImageIcon, X } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui'

// Shared sizing for the reference-photo grids used on /order (Step 3) and
// /confirm/[token]. Keep these two the only tuning knobs so the two upload
// widgets stay visually identical even though they own their state very
// differently (controlled array vs. self-fetching with server-side delete).
export const PHOTO_TILE_SIZE = 80
export const PHOTO_ICON_SIZE = 18

interface PhotoThumbProps {
  src: string
  alt: string
  removeLabel: string
  onRemove: () => void
  /** Dims the image and disables the remove button while a delete is in flight. */
  removing?: boolean
}

export function PhotoThumb({ src, alt, removeLabel, onRemove, removing = false }: PhotoThumbProps) {
  return (
    <div className="relative" style={{ width: PHOTO_TILE_SIZE, height: PHOTO_TILE_SIZE, flexShrink: 0 }}>
      <div className="rounded-xl overflow-hidden border w-full h-full" style={{ borderColor: 'var(--color-border)' }}>
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          style={{ opacity: removing ? 0.4 : 1 }}
        />
      </div>
      {/* Hit area is 44x44 (min touch target) even though the visible glyph stays small;
          it lives outside the overflow-hidden image wrapper above so it isn't clipped,
          and is offset so the visible circle lands where it always did (top-right corner). */}
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        aria-label={removeLabel}
        className="absolute flex items-center justify-center"
        style={{ top: -12, right: -12, width: 44, height: 44, zIndex: 1, cursor: removing ? 'not-allowed' : 'pointer' }}
      >
        <span
          className="rounded-full flex items-center justify-center"
          style={{ width: 20, height: 20, backgroundColor: 'var(--color-danger)', color: '#fff' }}
        >
          <X size={12} weight="bold" />
        </span>
      </button>
    </div>
  )
}

interface AddPhotoTileProps {
  onClick: () => void
  uploading: boolean
  hasPhotos: boolean
  /** Label shown next to the Plus icon once photos already exist. Omit to show the bare icon. */
  addMoreLabel?: string
}

export function AddPhotoTile({ onClick, uploading, hasPhotos, addMoreLabel }: AddPhotoTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={uploading}
      className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-opacity"
      style={{
        width: PHOTO_TILE_SIZE,
        height: PHOTO_TILE_SIZE,
        flexShrink: 0,
        borderColor: 'var(--color-border)',
        color: 'var(--color-ink-muted)',
        opacity: uploading ? 0.6 : 1,
        cursor: uploading ? 'not-allowed' : 'pointer',
      }}
      aria-label="Add reference photo"
    >
      {uploading ? (
        <>
          <Spinner size={14} />
          <span className="text-xs text-center px-1">Uploading…</span>
        </>
      ) : hasPhotos ? (
        addMoreLabel ? (
          <>
            <Plus size={PHOTO_ICON_SIZE} />
            <span className="text-xs text-center">{addMoreLabel}</span>
          </>
        ) : (
          <Plus size={PHOTO_ICON_SIZE} />
        )
      ) : (
        <>
          <ImageIcon size={PHOTO_ICON_SIZE} />
          <span className="text-xs text-center">Add photo</span>
        </>
      )}
    </button>
  )
}
