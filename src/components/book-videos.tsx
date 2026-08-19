"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import { VideoEmbed, youtubeId } from "@/components/video-embed";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Video = { title: string | null; url: string | null };

/**
 * A book's videos as a thumbnail grid; clicking one opens the player in a
 * lightbox that autoplays. Reuses VideoEmbed (youtube-nocookie — no tracking
 * cookie loads until a video actually opens) and the site Dialog primitive.
 * Non-YouTube URLs are dropped. Client-side because the lightbox is interactive.
 */
export function BookVideos({ videos }: { videos: Video[] }) {
  const items = videos
    .map((v) => ({
      title: v.title ?? "",
      url: v.url ?? "",
      id: v.url ? youtubeId(v.url) : null,
    }))
    .filter((v): v is { title: string; url: string; id: string } =>
      Boolean(v.id),
    );
  const [open, setOpen] = useState<number | null>(null);

  if (items.length === 0) return null;
  const active = open !== null ? items[open] : null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((video, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Play video: ${video.title}`}
              className="group focus-visible:ring-ring block w-full text-left focus-visible:ring-2 focus-visible:outline-none"
            >
              <div className="bg-muted relative aspect-video overflow-hidden">
                {/* Plain img: YouTube's thumbnail host isn't in the next/image
                    allowlist, and this needs no optimization. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/15">
                  <Play
                    aria-hidden="true"
                    fill="currentColor"
                    className="size-9 text-white drop-shadow"
                  />
                </span>
              </div>
              <span className="mt-1.5 block truncate text-xs font-bold tracking-wide">
                {video.title}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">{active?.title ?? "Video"}</DialogTitle>
          {active && (
            <VideoEmbed url={active.url} title={active.title} autoplay />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
