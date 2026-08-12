/**
 * A privacy-minded YouTube embed for resource pages.
 *
 * Uses youtube-nocookie.com (no tracking cookie until play) and lazy-loads the
 * iframe, so a page full of nothing-yet-played videos stays light. Server
 * component — it's just an iframe, no client logic. Renders nothing if the URL
 * isn't a recognizable YouTube link (the caller shows the body regardless).
 */

/** Pull the 11-char video id out of any common YouTube URL shape. */
export function youtubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  )
  return match ? match[1] : null
}

export function VideoEmbed({ url, title }: { url: string; title: string }) {
  const id = youtubeId(url)
  if (!id) return null

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={title}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  )
}
