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
  type: 'messageReport' | 'forumReport' = 'messageReport',
) =>
  S.listItem()
    .id(`${type}-${status}`)
    .title(title)
    .child(
      S.documentList()
        .title(title)
        .filter('_type == $type && status == $status')
        .params({ status, type })
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
      S.divider(),
      S.listItem()
        .id('forumBoards')
        .title('Forum boards')
        .child(
          S.documentTypeList('forumBoard')
            .title('Forum boards')
            .defaultOrdering([{ field: 'order', direction: 'asc' }]),
        ),
      S.listItem()
        .id('forumThreads')
        .title('Forum threads')
        .child(
          S.documentTypeList('forumThread')
            .title('Forum threads')
            .defaultOrdering([{ field: 'lastPostAt', direction: 'desc' }]),
        ),
      S.listItem()
        .id('forumPosts')
        .title('Forum posts')
        .child(
          S.documentTypeList('forumPost')
            .title('Forum posts')
            .defaultOrdering([{ field: 'createdAt', direction: 'desc' }]),
        ),
      S.listItem()
        .id('forumReports')
        .title('Forum reports')
        .child(
          S.list()
            .title('Forum reports')
            .items([
              reportBucket(S, 'Open', 'open', 'forumReport'),
              reportBucket(S, 'Actioned', 'actioned', 'forumReport'),
              reportBucket(S, 'Dismissed', 'dismissed', 'forumReport'),
              S.divider(),
              S.listItem()
                .id('allForumReports')
                .title('All reports')
                .child(
                  S.documentTypeList('forumReport')
                    .title('All reports')
                    .defaultOrdering([{ field: 'createdAt', direction: 'desc' }]),
                ),
            ]),
        ),
    ])
