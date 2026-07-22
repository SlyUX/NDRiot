# data/

Form exports, kept out of git. Submissions contain personal contact details
and consent records; they belong in the CMS or the form's own storage, not in
a public repository.

## Naming

    creators-YYYY-MM-DD.csv
    books-YYYY-MM-DD.csv

Google exports as `Add a comic to ND Riot (Responses) - Form Responses 1.csv`.
Rename on arrival. The spaces and parentheses are the reason: parentheses are
glob syntax in zsh, so the default name has to be quoted to be passed to the
importer at all, and tab-completion is no help.

Date the export, not the import. Two exports of the same form differ only by
when they were taken, and that is usually the thing you need to tell them
apart.

Old exports are safe to keep. The importer skips rows whose slug already
exists, so re-running an old file writes nothing — which makes the pile of
dated exports a usable record of what was submitted when.

## Importing

    npm run import:creators -- data/creators-2026-07-21.csv           # dry run
    npm run import:creators -- data/creators-2026-07-21.csv --commit  # writes drafts

    npm run import:books -- data/books-2026-07-22.csv
    npm run import:books -- data/books-2026-07-22.csv --commit

The `--` is required. Without it npm keeps the arguments instead of passing
them on, and the script sees no file.

Creators before books: a book whose creator is not already in the CMS is
skipped with a warning rather than guessed at.

Everything is created as a **draft**. Nothing reaches the site until it is
published in the Studio.
