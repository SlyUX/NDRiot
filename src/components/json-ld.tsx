/**
 * Renders a schema.org JSON-LD block.
 *
 * Structured data is how search engines and AI answer engines read a page as
 * entities (a comic, its maker, an article) rather than guessing from prose.
 * It ships as a script the crawler parses, never rendered to the reader.
 *
 * The `<` escape stops a stray `</script>` inside a value (a title, a bio) from
 * closing the tag early — the one real injection risk for inlined JSON-LD.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
