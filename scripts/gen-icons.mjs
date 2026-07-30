/**
 * Generate the app / install icons from the ND Riot square mark.
 *
 * Source is the transparent square mark (public/square-logo/NDR_sq_favicon.png)
 * composited on the near-black (#030303) surface, so the installed app, the
 * browser tab, and a shared link all read as one brand. Maskable gets extra
 * padding so the N/D never land in the mask's crop.
 *
 * Static output (committed) rather than runtime generation: an icon is fetched
 * constantly and never changes between mark edits. Re-run after changing the
 * mark:  node scripts/gen-icons.mjs
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(root, 'public', 'square-logo', 'NDR_sq_favicon.png')
const BG = { r: 3, g: 3, b: 3, alpha: 1 } // --background #030303

async function make(size, pad, outPath) {
  const inner = Math.round(size * (1 - pad * 2))
  const mark = await sharp(SRC)
    .resize({ width: inner, height: inner, fit: 'inside' })
    .png()
    .toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(outPath)
  console.log('wrote', outPath.replace(root + '/', ''))
}

// Manifest install icons (public/, referenced by app/manifest.ts). The mark
// already carries its own margin, so 'any' icons need only a touch more.
await make(192, 0.06, join(root, 'public', 'icon-192.png'))
await make(512, 0.06, join(root, 'public', 'icon-512.png'))
await make(512, 0.2, join(root, 'public', 'icon-maskable-512.png'))
// Next file-convention icons (auto-injected <link> tags).
await make(180, 0.06, join(root, 'src', 'app', 'apple-icon.png'))
await make(512, 0.06, join(root, 'src', 'app', 'icon.png'))
