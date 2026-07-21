/**
 * Minimal RFC 4180 CSV parser.
 *
 * Written rather than installed because the one hard part — quoted fields
 * containing commas and newlines — is about fifteen lines, and a form export
 * is exactly the case where that matters. Joseph Christy's first submission
 * has a fifteen-line book list inside a single cell; a naive split on commas
 * or newlines turns one row into sixteen broken ones.
 */
export function parseCsv(text) {
  // Strip a BOM: Google Sheets adds one, and it would otherwise become part
  // of the first header name.
  const input = text.replace(/^﻿/, '')

  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (inQuotes) {
      if (char === '"') {
        // A doubled quote inside a quoted field is one literal quote.
        if (input[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      // Only end the row on the first character of a line break, so CRLF
      // does not produce a phantom empty row.
      if (char === '\r' && input[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  // A file not ending in a newline still has a final field to flush.
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

/** Turns the parsed grid into objects keyed by the header row. */
export function toRecords(rows) {
  if (rows.length === 0) return []
  const [header, ...body] = rows
  return body.map((cells) =>
    Object.fromEntries(header.map((name, i) => [name.trim(), (cells[i] ?? '').trim()])),
  )
}
