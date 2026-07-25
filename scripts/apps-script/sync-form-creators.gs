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
 *      (bound to the form, it needs no FORM_ID — see getForm())
 *   4. Set CREATOR_ITEM_ID below to that id
 *   5. Run syncCreators() once to confirm it works
 *   6. Triggers (clock icon) → add a daily time-driven trigger for syncCreators
 *
 * The dataset is public, so no token is involved and none should ever be
 * pasted here — an Apps Script bound to a form is not a private place.
 */

const PROJECT_ID = 'r9bvatt7'
const DATASET = 'production'
const API_VERSION = '2024-10-01'

/**
 * Only a fallback. This script is bound to the form (pasted into its Script
 * editor), so getForm() uses getActiveForm() and never touches FORM_ID. It is
 * consulted solely if the script is ever run standalone. Leave it as-is unless
 * you know you are running unbound — a wrong id here is how openById() throws
 * "No item with the given ID could be found".
 *
 * From the form's URL: /forms/d/<FORM_ID>/edit
 */
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

/**
 * The form this script belongs to. Because the script is bound to the form,
 * getActiveForm() returns it directly — no id, so no "wrong form" or "no
 * permission" failure. Falls back to openById(FORM_ID) only if run unbound,
 * where there is no active form to read.
 */
function getForm() {
  const active = FormApp.getActiveForm()
  if (active) return active

  if (!FORM_ID || FORM_ID === 'PASTE_FORM_ID_HERE') {
    throw new Error(
      'No active form (script is not bound to one) and FORM_ID is unset. Either ' +
        'paste this into the form’s own Script editor, or set FORM_ID.',
    )
  }
  return FormApp.openById(FORM_ID)
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

  const item = getForm().getItemById(CREATOR_ITEM_ID)

  // Fail loudly, not cryptically. A stale CREATOR_ITEM_ID (the id changes if the
  // Creator question is deleted and re-added) otherwise surfaces as a null
  // dereference three frames deep, which reads as "the script is broken" rather
  // than "point it at the right question".
  if (!item) {
    throw new Error(
      `No form item with id ${CREATOR_ITEM_ID}. Run listItems() and set ` +
        `CREATOR_ITEM_ID to the Creator question's id.`,
    )
  }

  // Dropdown and Multiple choice are different item types with different
  // accessors, and setChoiceValues on the wrong one throws "not of type List".
  // Support both so the sync does not silently depend on which control the
  // form happens to use — either can hold the creator list.
  const type = item.getType()
  if (type === FormApp.ItemType.LIST) {
    item.asListItem().setChoiceValues(names)
  } else if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
    item.asMultipleChoiceItem().setChoiceValues(names)
  } else {
    throw new Error(
      `Item ${CREATOR_ITEM_ID} ("${item.getTitle()}") is a ${type}, not a Dropdown ` +
        `or Multiple choice. Point CREATOR_ITEM_ID at the Creator question.`,
    )
  }

  Logger.log(`Synced ${names.length} choices to a ${type} item: ${names.join(', ')}`)
}

/**
 * Run once, by hand, to find CREATOR_ITEM_ID. Logs every item on the form and
 * marks the one CREATOR_ITEM_ID currently points at — so a stale id (nothing
 * marked) or a wrong type on the marked row is obvious at a glance.
 */
function listItems() {
  getForm()
    .getItems()
    .forEach((item) => {
      const here = item.getId() === CREATOR_ITEM_ID ? '  <-- CREATOR_ITEM_ID' : ''
      Logger.log(`${item.getId()}  ${item.getType()}  ${item.getTitle()}${here}`)
    })
}
