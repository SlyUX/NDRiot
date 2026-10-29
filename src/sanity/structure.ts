import type { StructureResolver } from 'sanity/structure'

/**
 * Studio sidebar. Exists to pin `siteSettings` to a single document.
 *
 * Without this, the type behaves like any other and editors can create a
 * second one — at which point the site reads whichever the query happens to
 * return first. Fixing the document ID makes that impossible.
 *
 * Paired with `newDocumentOptions` in sanity.config.ts, which hides it from
 * the global create menu.
 */
const SINGLETONS = ['siteSettings']
// Live in the private `ndriot_auth` dataset and are managed in the Operations
// workspace — never shown or created here in the production workspace. (Without
// spinnerStore here, production auto-lists it as an always-empty item, since the
// stores are in the other dataset.)
const HIDDEN = [...SINGLETONS, 'ragSubmission', 'spinnerStore']

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .id('siteSettings')
        .schemaType('siteSettings')
        .title('Site settings')
        .child(
          S.editor().id('siteSettings').schemaType('siteSettings').documentId('siteSettings'),
        ),
      S.divider(),
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId()
        return id ? !HIDDEN.includes(id) : true
      }),
    ])
