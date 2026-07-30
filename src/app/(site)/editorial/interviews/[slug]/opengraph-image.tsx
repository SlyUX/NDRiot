import { ImageResponse } from 'next/og'

import { OgCard } from '@/components/og-card'
import { logoDataUri, ogFonts, ogImageUrl, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og'
import { safeFetch, INTERVIEW_QUERY } from '@/lib/queries'
import type { InterviewDetail } from '@/lib/types'

export const alt = 'An interview on ND Riot'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [interview, logoUrl, fonts] = await Promise.all([
    safeFetch<InterviewDetail | null>(INTERVIEW_QUERY, { slug }, null),
    logoDataUri(),
    ogFonts(),
  ])

  if (!interview) {
    return new ImageResponse(<OgCard title="Not found" logoUrl={logoUrl} />, { ...size, fonts })
  }

  return new ImageResponse(
    (
      <OgCard
        eyebrow={interview.subjectName ?? interview.interviewerName ?? 'Interview'}
        title={interview.title}
        imageUrl={interview.cover ? ogImageUrl(interview.cover, 600, 900) : null}
        logoUrl={logoUrl}
      />
    ),
    { ...size, fonts },
  )
}
