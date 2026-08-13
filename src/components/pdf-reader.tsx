'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import { Button } from '@/components/ui/button'
import { externalHref } from '@/lib/utils'

/**
 * An in-page PDF reader (pdf.js via react-pdf), one page at a time.
 *
 * The document stays in Sanity — pdf.js fetches it from the CDN and renders each
 * page to a canvas, so there's no third-party upload. This is loaded on demand
 * (see PdfReaderLauncher), so the ~pdf.js weight only ships when a reader opens.
 *
 * The pagination labels here are mechanical UI (like the scroller's arrows),
 * kept in code rather than the CMS. On any failure it falls back to a plain
 * link to the file.
 */

// The worker is served from /public (copied there by scripts/copy-pdf-worker.mjs
// on predev/prebuild) rather than resolved through the bundler — a plain static
// file is the most reliable path across dev, Turbopack build, and Vercel.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export function PdfReader({ url }: { url: string }) {
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [width, setWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Render each page to fit the container (capped for readability on wide screens).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setWidth(Math.min(el.clientWidth, 860))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const go = useCallback(
    (delta: number) => setPage((p) => Math.min(Math.max(1, p + delta), numPages || 1)),
    [numPages],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') go(-1)
    else if (e.key === 'ArrowRight') go(1)
  }

  // Error-state affordance (mechanical reader UI, like the loading text).
  const fallback = (
    <p className="text-muted-foreground py-8 text-center text-sm">
      <a
        href={externalHref(url)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2"
      >
        Open the PDF directly
      </a>
    </p>
  )

  return (
    <div
      ref={containerRef}
      className="border-border focus-visible:ring-ring flex flex-col items-center border bg-black/40 focus-visible:ring-2 focus-visible:outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="PDF reader"
    >
      {/* Nav pinned to the top of the reader so it stays reachable while a tall
          page scrolls. Only once the document knows its page count. */}
      {numPages > 0 && (
        <div className="border-border bg-background/95 sticky top-0 z-10 flex w-full items-center justify-center gap-4 border-b py-2 backdrop-blur">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => go(-1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm tabular-nums" aria-live="polite">
            Page {page} of {numPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => go(1)}
            disabled={page >= numPages}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <div className="p-3 sm:p-4">
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages)
            setPage(1)
          }}
          loading={<p className="text-muted-foreground py-8 text-sm">Loading…</p>}
          error={fallback}
          className="flex w-full justify-center"
        >
          {width > 0 && (
            <Page
              pageNumber={page}
              width={width - 32}
              loading={<p className="text-muted-foreground py-8 text-sm">Loading page…</p>}
              className="[&_canvas]:mx-auto [&_canvas]:h-auto! [&_canvas]:max-w-full!"
            />
          )}
        </Document>
      </div>
    </div>
  )
}
