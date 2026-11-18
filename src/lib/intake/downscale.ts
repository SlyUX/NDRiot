/**
 * Browser-side image helpers shared by the intake forms.
 *
 * Uses browser APIs (`createImageBitmap`, `<canvas>`) so it's only ever called
 * from a client component's event handler — never at module load, so importing
 * it is harmless anywhere.
 */

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_PICK_BYTES = 20 * 1024 * 1024

/**
 * Downscale a chosen image before upload so avatars, logos, and covers arrive
 * small — under the Server Action body limit and any hosting cap, and no larger
 * than the site needs. SVG/GIF pass through untouched; any failure falls back to
 * the original rather than blocking the submission.
 */
export async function downscaleImage(file: File, maxDim = 1600, quality = 0.85): Promise<File> {
  // A square bound (single longest-edge cap) is the `maxW === maxH` case.
  return downscaleToBox(file, maxDim, maxDim, quality)
}

/**
 * Downscale to fit within a `maxW × maxH` box (preserving aspect ratio), for
 * cases with different width/height caps — e.g. a shared chat image, capped at
 * 380×1080. SVG/GIF pass through; any failure falls back to the original so a
 * send is never blocked. Unlike the square helper, this always re-encodes when
 * it shrinks, so an oversized-but-small file (a tall skinny PNG under 1MB) is
 * still brought within the box.
 */
export async function downscaleToBox(
  file: File,
  maxW: number,
  maxH: number,
  quality = 0.85,
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file
  }
  let bitmap: ImageBitmap
  try {
    // Respect EXIF orientation so a phone photo isn't rotated on resize.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }
  const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height)
  // Already within the box and already small — leave it be.
  if (scale === 1 && maxW === maxH && file.size < 1_000_000) {
    bitmap.close()
    return file
  }
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) return file
  // If we didn't shrink the dimensions and the re-encode isn't smaller, keep the
  // original (no point swapping a file for a larger one). When we DID shrink,
  // the box dimensions are the goal, so the re-encode wins regardless.
  if (scale === 1 && blob.size >= file.size) return file
  const base = file.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
}
