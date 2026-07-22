/**
 * Keeps the book form's "Creator" dropdown in step with the CMS.
 *
 * This file is not run by the repo — it lives in Google Apps Script, bound
 * to the intake form. The copy here is so it is version-controlled and
 * findable, rather than existing only inside a Google account.
 *
 * SETUP
 *   1. Open the book form → ⋮ → Script editor
 *   2. Paste this file in
 *   3. Run listItems() once and read the log to find the Creator item's ID
 *   4. Fill in FORM_ID and CREATOR_ITEM_ID below
 *   5. Run syncCreators() once to confirm it works
 *   6. Triggers (clock icon) → add a daily time-driven trigger for syncCreators
 *
 * The dataset is public, so no token is involved and none should ever be
 * pasted here — an Apps Script bound to a form is not a private place.
 */

const PROJECT_ID = 'r9bvatt7'
const DATASET = 'production'
const API_VERSION = '2024-10-01'

/** From the form's URL: /forms/d/<FORM_ID>/edit */
const FORM_ID = 'PASTE_FORM_ID_HERE'

/** From listItems(). A number, not a string. */
const CREATOR_ITEM_ID = 0

/**
 * Deliberately api. and not apicdn. — the CDN serves cached results, and a
 * creator added minutes ago should appear in the form on the next run rather
 * than whenever the cache happens to turn over. This runs once a day, so
 * there is nothing to gain from the cache anyway.
 */
function fetchCreatorNames() {
  const query = '*[_type=="creator" && defined(slug.current)]|order(name asc){name}'
  const url =
    `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
    `?query=${encodeURIComponent(query)}`

  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true })
  if (res.getResponseCode() !== 200) {
    throw new Error(`Sanity returned ${res.getResponseCode()}: ${res.getContentText()}`)
  }

  const result = JSON.parse(res.getContentText()).result || []
  return result.map((c) => c.name).filter(Boolean)
}

function syncCreators() {
  const names = fetchCreatorNames()

  // Refuse to write an empty list. A failed query or an empty dataset would
  // otherwise wipe the dropdown, and a form with no creators to choose from
  // is worse than a form with a stale list.
  if (names.length === 0) {
    throw new Error('Sanity returned no creators — leaving the dropdown alone')
  }

  // The escape hatch matters: someone submitting their first book is not in
  // the CMS yet, so without this they cannot answer the question at all.
  // Keep a short-answer follow-up on the form for whoever picks it.
  names.push('My name is not listed')

  const item = FormApp.openById(FORM_ID).getItemById(CREATOR_ITEM_ID)
  item.asListItem().setChoiceValues(names)

  Logger.log(`Synced ${names.length} choices: ${names.join(', ')}`)
}

/** Run once, by hand, to find CREATOR_ITEM_ID. Logs every item on the form. */
function listItems() {
  FormApp.openById(FORM_ID)
    .getItems()
    .forEach((item) => Logger.log(`${item.getId()}  ${item.getType()}  ${item.getTitle()}`))
}
