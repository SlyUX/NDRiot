# assets/

Files read at runtime by server code, not served to the browser. Anything in
`public/` is publicly fetchable; these are not.

- **Geist-Black.ttf** — Geist 900, used by the Open Graph image generator.
  Bundled rather than fetched at render time: a network call inside image
  generation is a failure mode that would produce a broken share card, and
  Satori needs the font bytes regardless. Geist is SIL OFL 1.1, which permits
  bundling. Matches the `--font-sans` the site renders in.
