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
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size < 1_000_000) {
    bitmap.close()
    return file
  }
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
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
  if (!blob || blob.size >= file.size) return file
  const base = file.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
}
