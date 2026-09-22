# Gikuyu + English Bible corpus

Source: [API.Bible](https://scripture.api.bible/) (American Bible Society).

| File | Bible | ID |
| --- | --- | --- |
| `verses_gikuyu.jsonl` | Biblica® Open Kikuyu Holy Word of God 2013 | `be8dc4ba39edf911-01` |
| `verses_english.jsonl` | Berean Standard Bible (parallel reference) | `bba9f40183526463-01` |

Each line is one verse, joinable across files by `(book, chapter, verse)` for
parallel-corpus / translation training.

```json
{"bible_id": "...", "label": "gikuyu", "book": "GEN", "book_name": "Kĩambĩrĩria",
 "chapter": 1, "verse": 1, "reference": "Kĩambĩrĩria 1:1", "text": "Kĩambĩrĩria-inĩ ..."}
```

## Run via GitHub Actions (free)

1. **Add the API key as a repo secret** (one-time):
   `Settings → Secrets and variables → Actions → New repository secret`
   - Name: `BIBLE_API_KEY`
   - Value: your API.Bible key
2. Trigger the workflow: `Actions → Fetch Bible corpus → Run workflow`.
3. The two languages run in parallel as a matrix. When both finish, a third
   job opens a PR with the refreshed JSONL files. Each run also uploads
   artifacts (`bible-gikuyu`, `bible-english`) downloadable for 90 days.
4. Schedule: weekly auto-refresh on Sundays at 03:17 UTC.

Progress is cached per language (`.chapters_done_<label>`), so a re-run only
fetches new/missing chapters.

## Run locally

```bash
export BIBLE_API_KEY=<your_api.bible_key>
python scripts/fetch_gikuyu_bible.py                                  # Gikuyu
python scripts/fetch_gikuyu_bible.py --bible-id bba9f40183526463-01 \
    --label english                                                   # BSB English
```

## Quota note

API.Bible's free tier is 5,000 requests/day per key. The script fetches one
request per chapter (~1,250 per Bible), so a full Gikuyu + English pull is
~2,500 requests — fits in a single day.

## License

Both translations are published under terms allowing non-commercial reuse.
Confirm current licenses at api.bible before redistributing or training
commercial models.
