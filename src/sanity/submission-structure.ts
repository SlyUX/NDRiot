import type { StructureResolver } from 'sanity/structure'

/**
 * Sidebar for the Operations workspace (the private `ndriot_auth` dataset).
 * Rag submissions (grouped by status, newest first — they arrive via the on-site
 * form, so no "create" entry) and spinner-rack stores (managed from /admin/spinner;
 * here for raw inspection).
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

const reportBucket = (
  S: Parameters<StructureResolver>[0],
  title: string,
  status: string,
) =>
  S.listItem()
    .id(`report-${status}`)
    .title(title)
    .child(
      S.documentList()
        .title(title)
        .filter('_type == "messageReport" && status == $status')
        .params({ status })
        .defaultOrdering([{ field: 'createdAt', direction: 'desc' }]),
    )

export const submissionStructure: StructureResolver = (S) =>
  S.list()
    .title('Operations')
    .items([
      S.listItem()
        .id('ragSubmissions')
        .title('Rag submissions')
        .child(
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
            ]),
        ),
      S.divider(),
      S.listItem()
        .id('spinnerStores')
        .title('Spinner rack stores')
        .child(
          S.documentTypeList('spinnerStore').title('Spinner rack stores'),
        ),
      S.divider(),
      S.listItem()
        .id('messageThreads')
        .title('Message threads')
        .child(
          S.documentTypeList('messageThread')
            .title('Message threads')
            .defaultOrdering([{ field: 'lastMessageAt', direction: 'desc' }]),
        ),
      S.listItem()
        .id('messageReports')
        .title('Message reports')
        .child(
          S.list()
            .title('Message reports')
            .items([
              reportBucket(S, 'Open', 'open'),
              reportBucket(S, 'Actioned', 'actioned'),
              reportBucket(S, 'Dismissed', 'dismissed'),
              S.divider(),
              S.listItem()
                .id('allReports')
                .title('All reports')
                .child(
                  S.documentTypeList('messageReport')
                    .title('All reports')
                    .defaultOrdering([{ field: 'createdAt', direction: 'desc' }]),
                ),
            ]),
        ),
    ])
