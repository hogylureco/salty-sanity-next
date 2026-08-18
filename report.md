# Content audit report — publish · sitemap · template completeness

## Part 2 — Publish results

`scripts/publish-all.ts` (one transaction per doc: `createOrReplace` at the
published id + `delete` of the draft).

- **Published: 2,078** · **Failed: 4** · **Skipped (BLOCKED): 348** (of 2,430 drafts).
- Build after publish: **`next build` → 1,143 static pages, exit 0**; all
  spot/taxonomy routes still SSG.

### The 4 failures (rolled back — remain draft-only → import-fix list)
All blocked by Sanity's deletion guard: `BB-WE-fs---West-End-of-the-Canal`
holds a **strong** reference (despite the schema's `weak:true`) to each, so the
draft can't be deleted:

- `drafts.49d2b23f-2ba9-4ec0-b83c-be092195851a`
- `drafts.5d05bfb8-9992-403e-85eb-dea61e3d2a31`
- `drafts.8c3bd342-8700-485b-923a-9750047a417d`
- `drafts.e9c8f269-bc32-48c5-80e0-86e36f89b456`

Re-running won't help — the now-published West End still holds the strong refs.
Fix in the importer (make those refs weak / rewrite to published ids), then publish.

## Part 3 — Sitemap coverage

Sitemap: **1,138 URLs** (189 spots + 935 taxonomy + 14 static). Diff vs fresh
(CDN-off) published-with-slug counts:

| Segment | Published (fresh) | Sitemap | Match |
|---|--:|--:|:--|
| spots | 189 | 189 | ✅ |
| species | 46 | 46 | ✅ |
| structures (structure+structureType) | 181 | 181 | ✅ |
| approaches | 182 | **178** | ⚠️ CDN lag (−4) |
| techniques | 38 | 38 | ✅ |
| lures | 390 | 390 | ✅ |
| gear / baitfish / micro-seasons | 1 / 16 / 4 | 1 / 16 / 4 | ✅ |
| parent-lures / seasons / zones | 54 / 7 / 6 | 54 / 7 / 6 | ✅ |
| regions | 15 | **14** | ⚠️ duplicate slug |

- **approaches −4**: the sitemap `publishedClient` uses `useCdn:true`; the CDN
  lags ~4 docs right after a 2,000-doc publish. Self-heals; the sitemap query
  correctly pins the **published** perspective.
- **regions −1**: two region docs share slug **`nantucket-sound`** → one URL
  (sitemap dedupes by URL). Import fix (the page is also ambiguous).
- Spot-check: **10/10 sitemap URLs → 200**, `<h1>` present, none 404 / fell
  through to the Builder catch-all.

## Part 4 — Template / field coverage

### Schema → projection gaps (fields that can never render)
The taxonomy detail uses ONE generic projection (`name/id/slug/description`), so
type-specific fields are dropped:

- **approach**: `featuredDiagramUrl`, `method`, `parentLure`, `platform`, `targetspecies`, `zone`
- **lureCatalog**: `imageURL`, `websiteLink`, `lureCategory`, `method`, `parentLureReference`, `targetSpecies`, `techniqueRetrieve`, `zone`
- **techniqueRetrieve**: `featuredDiagramUrl`, `approach`, `method`, `parentlure`, `platform`, `structure`, `targetspecies`
- **structure**: `method`, `targetSpecies`, `zone`

Spot projection→template: no gaps (Phase 2 audit holds — every projected field renders).

### Field-completeness matrix (189 published spots)
| Field | % populated | | Field | % populated |
|---|--:|---|---|--:|
| name / slug / id | 100% | | captMikeNotes | **100%** |
| spotType | 99% | | historical/environmental/observational | 96% |
| latitude / longitude | 97% | | gearTechnique | 96% |
| tideStationId | 96% | | structureApproach | 94% |
| currentStationId | 94% | | QAcaptMike | 40% (optional) |
| **depthRange** | **1%** | | **spotCard** | **0.5%** |
| **hazards** | **0.5%** | | **featuredImage** | **0%** |

**Zero-narrative published spots: 0** (the empty stubs were correctly BLOCKED).

### Unknown-block sweep (published perspective)
- Block types: `block`, `richTableBlock` — both handled. Styles: `normal/h1/h2/h3/h4/blockquote` — all handled. Marks: `strong/em` — handled. No link annotations.
- **Malformed tables: 0 of 1,811** (per-document shape check). ✅

## Ranked fix list

### Frontend (this repo)
1. **Taxonomy projection/template gaps** — extend `taxonomyDocBySlugQuery` +
   template for `approach`/`lureCatalog`/`techniqueRetrieve`/`structure`
   type-specific fields (diagrams, cross-refs, image/website URLs). Highest value.
2. Minor: `depthRange`/`hazards`/`spotCard`/`featuredImage` render an empty row
   at ~0% populated — consider hiding when null.

### Import-pipeline (the converter/importer)
1. **314 missing slugs** (lureCatalog 230, microSeason 39, lureGearCategory 23,
   spot 20, approach 2) — generate from name. Biggest coverage unlock.
2. **8 missing names** (malformed/null docs: spot 3, technique-retrieve 2,
   techniqueRetrieve 2, approach 1).
3. **Strong references** — the 4 failed docs (+ the strong refs on
   `BB-WE-fs`) should be weak / point at published ids.
4. **Duplicate region slug** `nantucket-sound` (2 docs).
5. **Permanently-dangling refs** — enumerate targets missing in all states
   (deferred: the raw correlated-existence GROQ has a `@`-scoping pitfall; do it
   as a set-diff of referenced ids vs all doc ids).

### Content (Mike's queue)
1. **26 empty-narrative spots** (boat ramps / stubs) — add narrative, or model
   them as non-page reference data.
2. `depthRange` / `hazards` / `spotCard` / `featuredImage` are essentially
   unfilled across the library.
3. `QAcaptMike` absent on ~60% of spots (optional field).

## Appendix — the 348 BLOCKED docs ("#3")
| Reason | Count | Types |
|---|--:|---|
| no-slug | 314 | lureCatalog 230, microSeason 39, lureGearCategory 23, spot 20, approach 2 |
| empty-narrative | 26 | spot (boat-ramp/stub drafts) |
| no-name | 8 | spot 3, technique-retrieve 2, techniqueRetrieve 2, approach 1 |

Full id lists: `publish-results.json` (`blocked` key).
