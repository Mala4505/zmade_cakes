'use client'

import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { toast } from 'sonner'
import { Spinner, ShareNetwork, DownloadSimple } from '@phosphor-icons/react'

interface Props {
  targetRef: RefObject<HTMLElement | null>
  /** Without extension, e.g. 'zmade-receipt-2026-10-09_jane-doe'. */
  fileName: string
}

function dataUrlToFile(dataUrl: string, name: string): File {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], name, { type: 'image/png' })
}

function canShareFiles(files: File[]): boolean {
  try {
    return typeof navigator !== 'undefined' && !!navigator.canShare?.({ files })
  } catch {
    return false
  }
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Some mobile browsers start the download asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ShareReceiptImageButton({ targetRef, fileName }: Props) {
  const [loading, setLoading] = useState(false)
  // Server and first client render agree on 'share'; corrected after mount.
  const [shareSupported, setShareSupported] = useState(true)

  useEffect(() => {
    setShareSupported(canShareFiles([new File([''], 'probe.png', { type: 'image/png' })]))
  }, [])

  const handleClick = async () => {
    const el = targetRef.current
    if (!el || loading) return
    setLoading(true)
    try {
      const { toPng } = await import('html-to-image')
      // Defensive resets on the cloned root: clip-path and transforms are the usual
      // causes of blank/cropped PNGs in html-to-image's foreignObject render.
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#fefdfb',
        style: { clipPath: 'none', transform: 'none', margin: '0' },
      })
      const file = dataUrlToFile(dataUrl, `${fileName}.png`)

      if (canShareFiles([file])) {
        try {
          await navigator.share({ files: [file], title: 'Payment receipt' })
          return
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
          // NotAllowedError: the click's user activation expired while the
          // image was rendering (Safari is strict). Fall back to a download.
          if (!(err instanceof DOMException && err.name === 'NotAllowedError')) throw err
        }
      }
      downloadFile(file)
    } catch (err) {
      console.error(err)
      toast.error('Could not create the image. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const Icon = shareSupported ? ShareNetwork : DownloadSimple

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
      className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60"
      style={{
        backgroundColor: 'var(--color-teal)',
        color: '#fff',
      }}
    >
      {loading ? <Spinner size={14} className="animate-spin" /> : <Icon size={14} />}
      {loading ? 'Creating image…' : shareSupported ? 'Share as image' : 'Save image'}
    </button>
  )
}
