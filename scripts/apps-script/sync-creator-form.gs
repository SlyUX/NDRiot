/**
 * Keeps the CREATOR intake form's two "pick an existing thing" dropdowns in
 * step with the CMS:
 *
 *   1. "Which profile are you updating?" — every existing creator, so a
 *      returning creator selects their real profile instead of free-typing a
 *      near-miss of their name and forking a second record.
 *   2. "Studio or trading name"          — every existing organization, plus a
 *      "not listed" escape, so a studio is reused rather than duplicated
 *      ("PiP Publishing" beside "PiP Comics Collective").
 *
 * Controlled lists are the actual fix for the duplication the importer used to
 * absorb; the importer now matches on these exact values.
 *
 * This file lives in Google Apps Script, bound to the creator form. The copy
 * here is so it is version-controlled and findable. It is a sibling of
 * sync-form-creators.gs (the book form's single-dropdown version) and shares
 * its hardening: it reads its own bound form, supports Dropdown or Multiple
 * choice, and fails with a message that names the fix.
 *
 * SETUP
 *   1. Open the creator form → ⋮ → Script editor, paste this in
 *   2. Run listItems() and read the log to find the two item ids
 *   3. Set PROFILE_ITEM_ID and STUDIO_ITEM_ID below
 *   4. Run syncCreatorForm() once to confirm, then add a daily trigger for it
 *
 * The dataset is public, so no token is involved and none belongs here.
 */

const PROJECT_ID = 'r9bvatt7'
const DATASET = 'production'
const API_VERSION = '2024-10-01'

/** From listItems(). Numbers, not strings. */
const PROFILE_ITEM_ID = 0
const STUDIO_ITEM_ID = 0

/**
 * The studio escape hatch. Must match the importer's sentinel test
 * (/not listed|isn.?t listed/i in import-creators.mjs), which then reads the
 * "Studio or organization name (if not listed)" follow-up. Keep the two in step.
 */
const STUDIO_NOT_LISTED = "My studio isn't listed"

/**
 * Only a fallback. Bound to the form, so getForm() uses getActiveForm() and
 * never touches this. Set it only if you ever run the script unbound.
 * From the form's URL: /forms/d/<FORM_ID>/edit
 */
const FORM_ID = 'PASTE_FORM_ID_HERE'

/**
 * The form this script belongs to. Bound, so getActiveForm() returns it
 * directly — no id, no "wrong form / no permission" failure. Falls back to
 * openById(FORM_ID) only if run unbound.
 */
function getForm() {
  const active = FormApp.getActiveForm()
  if (active) return active

  if (!FORM_ID || FORM_ID === 'PASTE_FORM_ID_HERE') {
    throw new Error(
      'No active form (script is not bound) and FORM_ID is unset. Paste this ' +
        'into the creator form’s own Script editor, or set FORM_ID.',
    )
  }
  return FormApp.openById(FORM_ID)
}

/**
 * Names for a GROQ query, ordered. `api.` not `apicdn.` — a creator or org
 * added minutes ago should appear on the next run, not whenever the cache
 * turns over.
 */
function fetchNames(query) {
  const url =
    `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
    `?query=${encodeURIComponent(query)}`

  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true })
  if (res.getResponseCode() !== 200) {
    throw new Error(`Sanity returned ${res.getResponseCode()}: ${res.getContentText()}`)
  }

  const result = JSON.parse(res.getContentText()).result || []
  return result.map((r) => r.name).filter(Boolean)
}

/**
 * Replaces a dropdown / multiple-choice item's choices. Fails loudly on a stale
 * id or the wrong item type rather than dying three frames deep — same handling
 * as the book form's sync.
 */
function setChoices(itemId, label, choices) {
  const item = getForm().getItemById(itemId)
  if (!item) {
    throw new Error(
      `No form item with id ${itemId} (${label}). Run listItems() and set the id.`,
    )
  }
  const type = item.getType()
  if (type === FormApp.ItemType.LIST) {
    item.asListItem().setChoiceValues(choices)
  } else if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
    item.asMultipleChoiceItem().setChoiceValues(choices)
  } else {
    throw new Error(
      `Item ${itemId} ("${item.getTitle()}") is a ${type}, not a Dropdown or ` +
        `Multiple choice. Point ${label} at the right question.`,
    )
  }
  Logger.log(`${label}: synced ${choices.length} choices to a ${type} item`)
}

function syncCreatorForm() {
  const creators = fetchNames(
    '*[_type=="creator" && !(_id in path("drafts.**")) && defined(slug.current)]|order(name asc){name}',
  )
  const orgs = fetchNames('*[_type=="organization"]|order(name asc){name}')

  // Refuse to write an empty list — a failed query would otherwise wipe a
  // dropdown, and an empty control is worse than a stale one.
  if (creators.length === 0 && orgs.length === 0) {
    throw new Error('Sanity returned no creators and no organizations — leaving the form alone')
  }

  // Existing profiles only — the update path is for people already here, so it
  // needs no "not listed" escape (that is what the New/Update branch is for).
  if (creators.length > 0) {
    setChoices(PROFILE_ITEM_ID, 'Which profile are you updating?', creators)
  }

  // Studios: existing orgs, then the escape that routes to the follow-up field.
  if (orgs.length > 0) {
    setChoices(STUDIO_ITEM_ID, 'Studio or trading name', orgs.concat([STUDIO_NOT_LISTED]))
  }
}

/**
 * Run once, by hand, to find the item ids. Logs every item and marks the two
 * this script is configured for — so a stale id (nothing marked) or a wrong
 * type on a marked row is obvious at a glance.
 */
function listItems() {
  getForm()
    .getItems()
    .forEach((item) => {
      const id = item.getId()
      const mark =
        id === PROFILE_ITEM_ID ? '  <-- PROFILE_ITEM_ID' : id === STUDIO_ITEM_ID ? '  <-- STUDIO_ITEM_ID' : ''
      Logger.log(`${id}  ${item.getType()}  ${item.getTitle()}${mark}`)
    })
}
