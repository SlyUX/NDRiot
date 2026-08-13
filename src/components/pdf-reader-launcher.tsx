'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { externalHref } from '@/lib/utils'

/**
 * The "read it here" entry point for an issue's PDF.
 *
 * On a pointer-fine device (desktop) it opens a code-split pdf.js reader in a
 * focused overlay — the ~1MB only loads when opened, so the page stays light.
 * On touch devices it does NOT: pdf.js renders each page to a canvas, and mobile
 * browsers cap canvas size/memory, so an art-heavy page fails there. Phones have
 * a genuinely good native PDF viewer anyway, so we hand off to it.
 *
 * Progressive by construction: this is a real link to the PDF; desktop JS
 * intercepts the click to open the reader instead, and if JS never runs the
 * link still opens the file.
 */
const PdfReader = dynamic(() => import('@/components/pdf-reader').then((m) => m.PdfReader), {
  ssr: false,
  loading: () => <p className="text-muted-foreground py-8 text-center text-sm">Loading reader…</p>,
})

export function PdfReaderLauncher({
  url,
  openLabel,
  title,
}: {
  url: string
  openLabel: string
  /** The issue title — labels the dialog for screen readers and context. */
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
            // Touch devices (coarse pointer) fall through to the link → native
            // PDF viewer, which handles big files where pdf.js/canvas fails on
            // mobile. Desktop opens the in-page reader instead. Checked at click
            // time so there's no effect/state and no hydration concern.
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
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto p-4 sm:p-6">
          <DialogTitle className="pr-8">{title}</DialogTitle>
          {open && <PdfReader url={url} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
