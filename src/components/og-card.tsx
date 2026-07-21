import { clamp, OG_COLORS } from '@/lib/og'

/**
 * The shared Open Graph card layout: artwork left, words right, logo below.
 *
 * Written for Satori, not the browser — every container carries an explicit
 * `display: flex`, styles are inline objects, and there is no Tailwind here
 * because Satori never sees a stylesheet. It looks unlike the rest of the
 * codebase for that reason rather than by neglect.
 *
 * Returns a plain element, so each route wraps it in its own ImageResponse.
 */

export interface OgCardProps {
  /** Small line above the title — a creator, a studio, a section. */
  eyebrow?: string | null
  title: string
  /** Absolute URL. Satori cannot resolve a relative path. */
  imageUrl?: string | null
  /** Square for portraits, 2:3 for covers. */
  imageShape?: 'cover' | 'square'
  logoUrl: string
  /** Beside the logo, e.g. a genre or format. Omitted when empty. */
  footnote?: string | null
}

export function OgCard({
  eyebrow,
  title,
  imageUrl,
  imageShape = 'cover',
  logoUrl,
  footnote,
}: OgCardProps) {
  const artWidth = 300
  const artHeight = imageShape === 'square' ? 300 : 450

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: OG_COLORS.background,
        color: OG_COLORS.foreground,
        fontFamily: 'Geist',
        padding: 64,
        alignItems: 'center',
      }}
    >
      {imageUrl && (
        <div
          style={{
            display: 'flex',
            width: artWidth,
            height: artHeight,
            marginRight: 56,
            flexShrink: 0,
            backgroundColor: '#18181B',
            overflow: 'hidden',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori
              renders this, not the browser; next/image does not exist here. */}
          <img
            src={imageUrl}
            alt=""
            width={artWidth}
            height={artHeight}
            style={{ objectFit: 'cover', width: artWidth, height: artHeight }}
          />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          height: '100%',
        }}
      >
        {eyebrow && (
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: OG_COLORS.primary,
              marginBottom: 18,
            }}
          >
            {clamp(eyebrow, 44)}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            // Sized down for long titles rather than wrapped to four lines,
            // which at share-card scale becomes unreadable.
            fontSize: title.length > 34 ? 62 : 80,
            lineHeight: 1.02,
            letterSpacing: -2,
            textTransform: 'uppercase',
          }}
        >
          {clamp(title, 68)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginTop: 'auto' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
          <img src={logoUrl} alt="" width={132} height={85} />
          {footnote && (
            <div
              style={{
                display: 'flex',
                marginLeft: 28,
                fontSize: 22,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: OG_COLORS.muted,
              }}
            >
              {clamp(footnote, 40)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
