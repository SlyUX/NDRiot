'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

/**
 * The "read it here" entry point for an issue's PDF.
 *
 * The reader (pdf.js, ~1MB) is code-split and only imported when the overlay
 * opens — so the issue page stays light until someone actually reads. Opens in a
 * focused Radix dialog rather than inline, so the reader gets real room. Reading
 * happens client-side against the Sanity-hosted file; nothing is re-uploaded.
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
      <Button
        type="button"
        size="lg"
        onClick={() => setOpen(true)}
        className="font-black tracking-wide uppercase"
      >
        {openLabel}
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
