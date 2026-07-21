# data/

Form exports, kept out of git. Submissions contain personal contact details
and consent records; they belong in the CMS or the form's own storage, not in
a public repository.

Drop a CSV export here and run:

    node scripts/import-creators.mjs data/<file>.csv           # dry run
    node scripts/import-creators.mjs data/<file>.csv --commit  # writes drafts
