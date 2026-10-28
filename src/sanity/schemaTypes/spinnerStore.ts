import { defineType, defineField, defineArrayMember } from 'sanity'

import { US_STATES } from '@/lib/taxonomy'

/**
 * A physical ND Riot spinner rack placed in a store (consignment).
 *
 * Lives ONLY in the private `ndriot_auth` dataset (never public `production`),
 * because it carries commission terms, creator earnings, and payment status.
 * Managed day-to-day through the admin area (/admin/spinner) — this schema is the
 * typed source of truth and a raw-inspection surface in the Submissions Studio
 * workspace. `liveEdit`: it's an operational record, not draft→publish content.
 *
 * Books/creators are denormalized strings (a `ndriot_auth` doc can't reference a
 * `production` doc). The admin "add to rack" action fetches the book server-side
 * and fills these; the Seller Info Band re-reads the live book at print time.
 */
export default defineType({
  name: 'spinnerStore',
  title: 'Spinner rack (store)',
  type: 'document',
  liveEdit: true,
  fieldsets: [
    { name: 'commission', title: 'Commission', options: { columns: 2 } },
  ],
  fields: [
    defineField({
      name: 'state',
      title: 'State',
      type: 'string',
      description: 'The store’s US state (first half of the title).',
      options: {
        list: US_STATES.map((s) => ({ title: `${s.name} (${s.code})`, value: s.code })),
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'storeName',
      title: 'Store name',
      type: 'string',
      description: 'The bookstore / shop name (second half of the title).',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      description: 'Whether the rack is currently placed in this store.',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Ended', value: 'ended' },
        ],
        layout: 'radio',
      },
      initialValue: 'active',
    }),
    defineField({
      name: 'contactName',
      title: 'Store contact',
      type: 'string',
      description: 'Who you coordinate with at the store (optional).',
    }),
    defineField({
      name: 'contactEmail',
      title: 'Store contact email',
      type: 'string',
      description: 'Optional — for your records.',
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'text',
      rows: 2,
      description: 'Optional store address.',
    }),
    defineField({
      name: 'startDate',
      title: 'Placed on',
      type: 'date',
      description: 'When the rack went in.',
    }),
    defineField({
      name: 'endDate',
      title: 'Removed on',
      type: 'date',
      description: 'When it was pulled, if it has ended.',
    }),
    defineField({
      name: 'storeCutPercent',
      title: 'Store commission %',
      type: 'number',
      fieldset: 'commission',
      description: 'The store’s cut of each sale (e.g. 40 = store keeps 40%).',
      validation: (rule) => rule.min(0).max(100),
    }),
    defineField({
      name: 'ndRiotCutPercent',
      title: 'ND Riot %',
      type: 'number',
      fieldset: 'commission',
      initialValue: 0,
      description: 'ND Riot’s cut, if any. 0 for the pilot — set later without a code change.',
      validation: (rule) => rule.min(0).max(100),
    }),
    defineField({
      name: 'rack',
      title: 'Books on the rack',
      type: 'array',
      description:
        'Managed from /admin/spinner. Each book’s price is the per-store sell price (editable); earnings use it.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'rackItem',
          fields: [
            defineField({ name: 'bookId', title: 'Book id', type: 'string', readOnly: true }),
            defineField({ name: 'bookTitle', title: 'Book', type: 'string', readOnly: true }),
            defineField({ name: 'bookSlug', title: 'Book slug', type: 'string', readOnly: true }),
            defineField({ name: 'creatorId', title: 'Creator id', type: 'string', readOnly: true }),
            defineField({ name: 'creatorName', title: 'Creator', type: 'string', readOnly: true }),
            defineField({ name: 'creatorSlug', title: 'Creator slug', type: 'string', readOnly: true }),
            defineField({
              name: 'price',
              title: 'Sell price',
              type: 'number',
              description:
                'Per-store sell price (printed on the band, drives earnings). Can be set higher to offset commission.',
              validation: (rule) => rule.min(0),
            }),
            defineField({
              name: 'priceNote',
              title: 'Price note',
              type: 'string',
              description: 'Optional — e.g. "raised to offset 40% commission".',
            }),
            defineField({ name: 'lastCount', title: 'Last count', type: 'number', validation: (r) => r.min(0) }),
            defineField({ name: 'lastCountDate', title: 'Last count date', type: 'date' }),
            defineField({ name: 'sold', title: 'Sold', type: 'number', validation: (r) => r.min(0) }),
            defineField({ name: 'shrink', title: 'Shrink', type: 'number', validation: (r) => r.min(0) }),
          ],
          preview: {
            select: { title: 'bookTitle', creatorName: 'creatorName', price: 'price', sold: 'sold' },
            prepare: ({ title, creatorName, price, sold }) => ({
              title: title || 'Book',
              subtitle: [creatorName, price != null ? `$${price}` : null, sold != null ? `${sold} sold` : null]
                .filter(Boolean)
                .join(' · '),
            }),
          },
        }),
      ],
    }),
    defineField({
      name: 'payouts',
      title: 'Creator payments',
      type: 'array',
      description:
        'What each creator has been paid so far. Expected earnings are computed from the rack, not stored.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'payout',
          fields: [
            defineField({ name: 'creatorId', title: 'Creator id', type: 'string', readOnly: true }),
            defineField({ name: 'creatorName', title: 'Creator', type: 'string', readOnly: true }),
            defineField({
              name: 'paidTotal',
              title: 'Paid to date',
              type: 'number',
              description: 'Total paid to this creator for this rack so far.',
              validation: (rule) => rule.min(0),
            }),
            defineField({ name: 'lastPaidDate', title: 'Last paid', type: 'date' }),
            defineField({ name: 'notes', title: 'Notes', type: 'string' }),
          ],
          preview: {
            select: { title: 'creatorName', paidTotal: 'paidTotal' },
            prepare: ({ title, paidTotal }) => ({
              title: title || 'Creator',
              subtitle: paidTotal != null ? `$${paidTotal} paid` : 'unpaid',
            }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { state: 'state', storeName: 'storeName', status: 'status' },
    prepare: ({ state, storeName, status }) => ({
      title: `${state ?? '??'} — ${storeName ?? 'Store'}`,
      subtitle: status === 'ended' ? 'Ended' : 'Active',
    }),
  },
})
