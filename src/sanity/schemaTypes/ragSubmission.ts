import { defineType, defineField } from 'sanity'

/**
 * A creator's submission to an ND Riot Rag issue.
 *
 * PRIVACY: these live ONLY in the private `ndriot_auth` dataset (never the
 * world-readable `production` dataset), because they carry the submitter's email
 * and their unpublished pitch. They are reviewed in the "Submissions" Studio
 * workspace, not the main one. Because a `ndriot_auth` document cannot hold a
 * `reference` to a `production` document (cross-dataset references aren't
 * supported), the issue and creator are stored denormalized as plain strings.
 *
 * The submit form writes these from a server action (src/app/actions/rag-submission.ts);
 * reviewers (Joe/Stephen) set `status` via the Accept / Resubmit / Decline
 * document actions, which send the templated reply email.
 */
export default defineType({
  name: 'ragSubmission',
  title: 'Rag submission',
  type: 'document',
  // Capture-time identity is recorded by the form, not edited by reviewers.
  readOnly: false,
  fields: [
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      description: 'Review state. Use the Accept / Resubmit / Decline actions — they also send the reply email.',
      options: {
        list: [
          { title: 'New', value: 'new' },
          { title: 'Accepted', value: 'accepted' },
          { title: 'Resubmit', value: 'resubmit' },
          { title: 'Declined', value: 'declined' },
        ],
        layout: 'radio',
      },
      initialValue: 'new',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'decisionNote',
      title: 'Decision note',
      type: 'text',
      rows: 3,
      readOnly: true,
      description:
        'The optional personal line sent with the reply. You type it in the Accept / Resubmit / Decline dialog; it’s recorded here after sending.',
    }),
    defineField({
      name: 'issueTitle',
      title: 'Issue',
      type: 'string',
      readOnly: true,
      description: 'Which Rag issue this was submitted to (captured at submission).',
    }),
    defineField({
      name: 'issueNumber',
      title: 'Issue number',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'issueId',
      title: 'Issue id',
      type: 'string',
      readOnly: true,
      description: 'The ragIssue document id (production), for reference.',
    }),
    defineField({
      name: 'issueSlug',
      title: 'Issue slug',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'creatorName',
      title: 'Creator',
      type: 'string',
      readOnly: true,
      description: 'The submitting creator (captured at submission).',
    }),
    defineField({
      name: 'creatorSlug',
      title: 'Creator slug',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'creatorId',
      title: 'Creator id',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'submitterName',
      title: 'Submitter name',
      type: 'string',
      readOnly: true,
      description: 'The signed-in account name at submission.',
    }),
    defineField({
      name: 'submitterEmail',
      title: 'Submitter email',
      type: 'string',
      readOnly: true,
      description: 'Where the reply goes. Private — only in this dataset.',
    }),
    defineField({
      name: 'pitch',
      title: 'Pitch',
      type: 'text',
      rows: 10,
      readOnly: true,
      description: 'What the creator has in mind (up to 750 words).',
    }),
    defineField({
      name: 'pageCount',
      title: 'Page count',
      type: 'number',
      readOnly: true,
      description: 'Proposed page count (1–12).',
    }),
    defineField({
      name: 'workSampleImages',
      title: 'Work samples (images)',
      type: 'array',
      of: [{ type: 'imageWithAlt' }],
      readOnly: true,
      description: 'Uploaded examples of current work.',
    }),
    defineField({
      name: 'workSampleLink',
      title: 'Work samples (link)',
      type: 'url',
      readOnly: true,
      description: 'A link to current work (Drive, Dropbox, portfolio, etc.).',
    }),
    defineField({
      name: 'submittedAt',
      title: 'Submitted',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  orderings: [
    {
      name: 'submittedDesc',
      title: 'Newest first',
      by: [{ field: 'submittedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      creatorName: 'creatorName',
      issueTitle: 'issueTitle',
      issueNumber: 'issueNumber',
      status: 'status',
      media: 'workSampleImages.0',
    },
    prepare: ({ creatorName, issueTitle, issueNumber, status, media }) => ({
      title: creatorName || 'Submission',
      subtitle: [
        status ? status.toUpperCase() : null,
        issueNumber ? `#${issueNumber}` : null,
        issueTitle,
      ]
        .filter(Boolean)
        .join(' · '),
      media,
    }),
  },
})
