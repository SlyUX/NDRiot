'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Modal dialog, on Radix. Square corners and token colors (§9). A short
 * coordinated entrance — the backdrop fades while the panel fades + zooms in
 * together (tw-animate-css, keyed off Radix's data-state) — collapsed to instant
 * under prefers-reduced-motion by the global rule in globals.css. Radix handles
 * focus trapping, Escape, and the required labelling.
 *
 * `variant="sheet"` is for a full-height surface (a conversation): edge-to-edge
 * on phones so the keyboard can't shove a centered box around, and a tall
 * centered panel from `sm` up. A flex column — give it a scrolling body between a
 * header and a pinned footer.
 */
const dialogContentVariants = cva(
  'border-border bg-background fixed z-50 duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  {
    variants: {
      variant: {
        default:
          'top-1/2 left-1/2 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border p-6 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90',
        sheet:
          'inset-0 flex w-full flex-col overflow-hidden sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[82vh] sm:max-h-[640px] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogContent({
  className,
  children,
  variant,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof dialogContentVariants>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(dialogContentVariants({ variant }), className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          className="focus-visible:ring-ring text-muted-foreground hover:text-foreground absolute top-3 right-3 focus-visible:ring-2 focus-visible:outline-none"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg font-black tracking-tight uppercase', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogTitle, DialogDescription }
