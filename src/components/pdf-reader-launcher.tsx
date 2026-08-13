'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { externalHref } from '@/lib/utils'

/**
 * "Read online" for an issue's PDF.
 *
 * Desktop opens the PDF in a focused overlay as an <iframe> — i.e. the browser's
 * own native viewer (zoom, page nav, search, print). No dependency, no worker,
 * no canvas limits: it just works, and Sanity's PDFs allow framing.
 *
 * Touch devices fall through to the link → the phone's native viewer, since
 * iframes don't reliably render PDFs on mobile. Progressive by construction:
 * this is a real link to the file, desktop JS intercepts it to open the overlay,
 * and if JS never runs the link still opens the PDF.
 */
export function PdfReaderLauncher({
  url,
  openLabel,
  title,
}: {
  url: string
  openLabel: string
  /** The issue title — labels the overlay for screen readers and context. */
  title: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button asChild size="lg" className="font-black tracking-wide uppercase">
        <a
          href={externalHref(url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            // Desktop (fine pointer): open the framed native viewer. Touch: let
            // the link open the PDF natively. Checked at click time — no state.
            if (!window.matchMedia('(pointer: coarse)').matches) {
              e.preventDefault()
              setOpen(true)
            }
          }}
        >
          {openLabel}
        </a>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[92vh] w-[95vw] max-w-5xl flex-col gap-0 p-0">
          <DialogTitle className="p-4 pr-10">{title}</DialogTitle>
          {/* Mounted only while open, so the PDF isn't fetched until asked for. */}
          {open && <iframe src={url} title={title} className="w-full flex-1 border-0 bg-white" />}
        </DialogContent>
      </Dialog>
    </>
  )
}
