'use client'

import { useState } from 'react'

import { ChatRequestButton } from '@/components/chat-request-button'
import { CollabRequestButton } from '@/components/collab-request-button'
import { SaveButton } from '@/components/save-button'
import type { CollabSettings, MessagingSettings } from '@/lib/site-settings'
import type { CollabStatus } from '@/sanity/collab-client'

type ThreadStatus = 'pending' | 'active' | 'declined' | 'closed' | 'blocked'

/**
 * The profile's Follow + Chat Request row, composed so the two coordinate: a
 * fresh follow offers a "message them?" nudge that opens the chat dialog — the
 * voluntary follow → message path (§3; never a gate). Follow collapses to its
 * glyph once followed. Share sits on its own row (rendered by the page).
 */
export function ProfileActions({
  creatorId,
  creatorName,
  saved,
  signedIn,
  viewerIsCreator,
  followLabel,
  followingLabel,
  signInCopy,
  messaging,
  collab,
  genres,
  threadStatus,
  collabOpen,
  collabStatus,
  collabResponse,
  dashboardHref,
}: {
  creatorId: string
  creatorName: string
  saved: boolean
  signedIn: boolean
  viewerIsCreator: boolean
  followLabel: string
  followingLabel: string
  signInCopy: { title: string; body: string; cta: string }
  messaging: MessagingSettings
  collab: CollabSettings
  genres: readonly string[]
  threadStatus: ThreadStatus | null
  /** The target is open to collaboration (drives the Suggest Collaboration button). */
  collabOpen: boolean
  /** An existing collab request's status/reply, or null — so the button becomes a status line. */
  collabStatus: CollabStatus | null
  collabResponse: string | null
  dashboardHref: string
}) {
  const [chatOpen, setChatOpen] = useState(false)
  const [nudge, setNudge] = useState(false)

  // The nudge only makes sense when a request can actually be sent.
  const canMessage = viewerIsCreator && threadStatus === null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <SaveButton
          itemType="creator"
          itemId={creatorId}
          initialSaved={saved}
          signedIn={signedIn}
          saveLabel={followLabel}
          savedLabel={followingLabel}
          collapseLabelWhenSaved
          onSavedChange={(next) => setNudge(next && canMessage)}
          signInCopy={signInCopy}
        />
        {viewerIsCreator && (
          <ChatRequestButton
            toId={creatorId}
            toName={creatorName}
            copy={messaging}
            threadStatus={threadStatus}
            dashboardHref={dashboardHref}
            open={chatOpen}
            onOpenChange={setChatOpen}
          />
        )}
        {viewerIsCreator && collabOpen && (
          <CollabRequestButton
            toId={creatorId}
            toName={creatorName}
            genres={genres}
            copy={collab}
            status={collabStatus}
            response={collabResponse}
          />
        )}
      </div>
      {nudge && canMessage && (
        <p className="text-xs">
          <button
            type="button"
            onClick={() => {
              setChatOpen(true)
              setNudge(false)
            }}
            className="text-primary hover:text-primary/80 focus-visible:ring-ring font-bold underline underline-offset-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {messaging.followNudge.replace(/\{name\}/g, creatorName)}
          </button>
        </p>
      )}
    </div>
  )
}
