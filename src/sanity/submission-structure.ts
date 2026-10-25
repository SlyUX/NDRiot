import type { StructureResolver } from 'sanity/structure'

/**
 * Sidebar for the Submissions workspace (the private `ndriot_auth` dataset).
 * Only Rag submissions live here for review; grouped by status so New ones are
 * front-and-centre, newest first. Submissions arrive via the on-site form, so
 * there's no "create" entry.
 */
const bucket = (
  S: Parameters<StructureResolver>[0],
  title: string,
  status: string,
) =>
  S.listItem()
    .id(status)
    .title(title)
    .child(
      S.documentList()
        .title(title)
        .filter('_type == "ragSubmission" && status == $status')
        .params({ status })
        .defaultOrdering([{ field: 'submittedAt', direction: 'desc' }]),
    )

export const submissionStructure: StructureResolver = (S) =>
  S.list()
    .title('Rag submissions')
    .items([
      bucket(S, 'New', 'new'),
      bucket(S, 'Accepted', 'accepted'),
      bucket(S, 'Resubmit', 'resubmit'),
      bucket(S, 'Declined', 'declined'),
      S.divider(),
      S.listItem()
        .id('all')
        .title('All submissions')
        .child(
          S.documentTypeList('ragSubmission')
            .title('All submissions')
            .defaultOrdering([{ field: 'submittedAt', direction: 'desc' }]),
        ),
    ])
