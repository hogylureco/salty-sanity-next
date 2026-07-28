import { defineQuery } from 'next-sanity'

/**
 * Minimal shape projected for every dereferenced reference target. All spot
 * relationships are WEAK, so a `[]->` deref of a dangling ref yields `null`;
 * every consumer must null-guard both individual items and whole arrays.
 */
const refProjection = /* groq */ `{
  _id,
  name,
  "slug": slug.current
}`

/**
 * An Approach carries more than the identity trio: the featured route diagram
 * (a plain ImageKit URL, not a Sanity asset) and its richText `description`,
 * both rendered in the spot's "Approaches" body section. Superset of
 * `refProjection`, so the same array still feeds the identity-only consumers
 * (sidebar rail, Approach Routing chips).
 */
const approachProjection = /* groq */ `{
  _id,
  name,
  "slug": slug.current,
  featuredDiagramUrl,
  description
}`

/**
 * Gear (`lureCatalog`) needs more than the identity trio to render as a card in
 * the "Gear Used At This Spot" rail: the product image and outbound link. These
 * fields live on the `lureCatalog` doc (`imageURL`, `websiteLink`).
 */
const gearProjection = /* groq */ `{
  _id,
  name,
  "slug": slug.current,
  imageURL,
  websiteLink
}`

/**
 * Full detail projection for a single spot, keyed by slug.
 *
 * Notes baked into the projection:
 * - Image assets are resolved to a URL here, not in components.
 * - `structure` (populated in drafts) and `structureTypes` (populated in
 *   published) are the same logical relationship split by perspective; they
 *   are coalesced into a single `structureTypes` list.
 * - `featuredImage` is currently null across the whole dataset; the projection
 *   still resolves it so it works once images are added.
 */
export const spotBySlugQuery = defineQuery(/* groq */ `
  *[_type == "spot" && slug.current == $slug][0]{
    // --- identity / system ---
    _id,
    _type,
    _createdAt,
    _updatedAt,
    id,
    name,
    "slug": slug.current,

    // --- details ---
    spotId,
    postType,
    spotType,
    version,
    publishDate,
    depthRange,
    hazards,
    approachCodePrefix,
    approachCount,
    microSeasons,

    // --- location ---
    latitude,
    longitude,
    zoomLevel,
    macroRegion,
    platform,
    tideStationId,
    currentStationId,
    tideVariance,
    gpxFile,

    // --- content: image (resolved to URL + dimensions in the projection) ---
    featuredImage{
      alt,
      caption,
      hotspot,
      crop,
      "url": asset->url,
      "dimensions": asset->metadata.dimensions
    },

    // Plain-text description for JSON-LD / metadata (no dedicated SEO field).
    "descriptionText": pt::text(coalesce(spotCard, captMikeNotes, historicalAnalysis, environmentalFactors)),

    // --- content: portable text (narrative sections; any may be null) ---
    spotCard,
    captMikeNotes,
    historicalAnalysis,
    environmentalFactors,
    observationalFactors,
    structureApproach,
    gearTechnique,
    QAcaptMike,

    // --- relationships (weak refs; dangling targets resolve to null) ---
    // Approaches: the plain []-> deref dangles for most refs (drafts.-prefixed
    // ids), so resolve with the manual id-match deref — same pattern as
    // lureCatalog/region. Recovers the diagram + description for the "Approaches"
    // body section AND fixes the sidebar rail / Approach Routing chips, which
    // previously under-resolved.
    "approaches": approaches[]{
      "a": *[_type == "approach" && ("drafts." + _id == ^._ref || _id == ^._ref)][0]${approachProjection}
    }.a,
    baitfish[]->${refProjection},
    // Gear (lureCatalog) refs are weak and drafts.-prefixed, so a plain deref
    // dangles for ~90% of spots. Resolve with the manual id-match deref (same
    // pattern as region/structure) so the sidebar gear rail actually populates.
    "lureCatalog": lureCatalog[]{
      "g": *[_type == "lureCatalog" && ("drafts." + _id == ^._ref || _id == ^._ref)][0]${gearProjection}
    }.g,
    lureGearCategory[]->${refProjection},
    microSeason[]->${refProjection},
    mode[]->${refProjection},
    parentLure[]->${refProjection},
    region[]->${refProjection},
    // Raw refs (not deref'd) so the server can build the related-videos query
    // params — most deref to null (dangling), but the _ref value is matchable.
    "regionRef": region[0]._ref,
    "targetSpeciesRefs": targetSpecies[]._ref,
    seasons[]->${refProjection},
    "structureTypes": coalesce(
      structureTypes[]->${refProjection},
      structure[]->${refProjection}
    ),
    targetSpecies[]->${refProjection},
    techniqueRetrieve[]->${refProjection},
    zone[]->${refProjection},
    relatedVideos[]->${refProjection},
    boatRamps[]->${refProjection},
    nearbySpots[]->{
      _id,
      name,
      id,
      "slug": slug.current,
      // Coordinates power the chart's nearby markers (see lib/nearby.ts); scalar
      // lat/lng, not a geopoint. Any may be null on an unmapped spot.
      latitude,
      longitude,
      "summary": pt::text(coalesce(spotCard, captMikeNotes))
    },
    subSpotsFXApproaches[]->${refProjection}
  }
`)

/**
 * Related videos for a spot (approved ranking). ONE scored query, no client
 * merge: tier 1 = a video that references this spot (`video.spot[]`, the real
 * direct link — `spot.relatedVideos` is effectively unused), tier 2 = same
 * region (matched on the raw `region._ref` string, since the deref dangles in
 * drafts), tier 3 = shared target species. Ordered by tier then newest film
 * date, capped at 6, auto-deduped (one row per video). Region name/slug are
 * resolved with a manual-deref subquery so a dangling `region._ref` still
 * yields a usable label + link.
 *
 * Params: $spotIds / $regionRefs / $speciesRefs — each passed in BOTH id forms
 * (plain + `drafts.`-prefixed) by the caller (see lib/taxonomy `bothIdForms`).
 */
export const relatedVideosForSpotQuery = defineQuery(/* groq */ `
  *[_type == "video" && (
    references($spotIds) ||
    region._ref in $regionRefs ||
    count(targetspecies[@._ref in $speciesRefs]) > 0
  )]{
    _id,
    "title": coalesce(name, youtubeTitle),
    // Slug drives the in-app video route (/videos/[slug]); the card links there
    // instead of YouTube. A slugless video falls back to its watch URL.
    "slug": slug.current,
    videoID,
    watchURL,
    videoFilmDate,
    "region": *[_type == "region" && ("drafts." + _id == ^.region._ref || _id == ^.region._ref)][0]{
      name,
      "slug": slug.current
    },
    "tier": select(
      references($spotIds) => 1,
      region._ref in $regionRefs => 2,
      true => 3
    )
  } | order(tier asc, videoFilmDate desc)[0...6]
`)

/**
 * Every video for the /videos index — newest first. Slug-gated (a slugless video
 * has no route). Region resolved via the manual `drafts.`-prefix deref (same as
 * the related-videos query) so a dangling region ref still yields a label + link.
 */
export const videosIndexQuery = defineQuery(/* groq */ `
  *[_type == "video" && defined(slug.current)]{
    _id,
    "title": coalesce(name, youtubeTitle),
    "slug": slug.current,
    videoID,
    watchURL,
    videoFilmDate,
    videoCategory,
    "region": *[_type == "region" && ("drafts." + _id == ^.region._ref || _id == ^.region._ref)][0]{
      name,
      "slug": slug.current
    },
    // Filter facets — resolved names via the manual drafts.-deref (plain deref
    // dangles). Each drives a checkbox group in the videos filter sidebar.
    "species": targetspecies[]{ "n": *[_type=="targetSpecies" && ("drafts."+_id==^._ref || _id==^._ref)][0].name }.n,
    "structures": structure[]{ "n": *[_type=="structure" && ("drafts."+_id==^._ref || _id==^._ref)][0].name }.n,
    "techniques": techniqueretrieve[]{ "n": *[_type=="techniqueRetrieve" && ("drafts."+_id==^._ref || _id==^._ref)][0].name }.n,
    "gearCategories": lureGearCategory[]{ "n": *[_type=="lureGearCategory" && ("drafts."+_id==^._ref || _id==^._ref)][0].name }.n,
    "seasons": season[]{ "n": *[_type=="season" && ("drafts."+_id==^._ref || _id==^._ref)][0].name }.n
  } | order(videoFilmDate desc)
`)

/** Slugs for the video detail route's `generateStaticParams`. */
export const allVideoSlugsQuery = defineQuery(/* groq */ `
  *[_type == "video" && defined(slug.current)]{ "slug": slug.current }
`)

/** Lean projection for the video detail's `generateMetadata`. */
export const videoMetaBySlugQuery = defineQuery(/* groq */ `
  *[_type == "video" && slug.current == $slug][0]{
    "title": coalesce(name, youtubeTitle),
    "excerpt": pt::text(description)
  }
`)

/**
 * Full detail projection for a single video, keyed by slug. Region and featured
 * spots are resolved with the manual `drafts.`-prefix deref (the weak refs store
 * `drafts.`-prefixed ids a plain `->` can't resolve); each is null-guarded, and a
 * dangling ref simply drops out.
 */
export const videoBySlugQuery = defineQuery(/* groq */ `
  *[_type == "video" && slug.current == $slug][0]{
    _id,
    _type,
    "title": coalesce(name, youtubeTitle),
    "slug": slug.current,
    videoID,
    watchURL,
    videoFilmDate,
    videoCategory,
    boat,
    hosts,
    description,
    "descriptionText": pt::text(description),
    "region": *[_type == "region" && ("drafts." + _id == ^.region._ref || _id == ^.region._ref)][0]{
      name,
      "slug": slug.current
    },
    "spots": spot[]{
      "s": *[_type == "spot" && ("drafts." + _id == ^._ref || _id == ^._ref)][0]{
        _id,
        name,
        "id": id,
        "slug": slug.current
      }
    }.s,
    // Gear featured in the video — same manual drafts.-deref as the spot query
    // (a plain deref dangles). Drives the gear slider under the player.
    "lureCatalog": lureCatalog[]{
      "g": *[_type == "lureCatalog" && ("drafts." + _id == ^._ref || _id == ^._ref)][0]${gearProjection}
    }.g
  }
`)

/**
 * Slugs (+ human `id`) for `generateStaticParams`. Only spots that actually
 * have a slug are emitted; slugless spots are handled by the route strategy,
 * not here.
 */
export const allSpotSlugsQuery = defineQuery(/* groq */ `
  *[_type == "spot" && defined(slug.current)]{
    "slug": slug.current,
    id
  }
`)

/**
 * Lean projection for `generateMetadata`. The schema has no dedicated SEO
 * fields, so the description falls back to the first non-empty narrative,
 * flattened to plain text with `pt::text` (truncated in the component).
 */
export const spotMetaBySlugQuery = defineQuery(/* groq */ `
  *[_type == "spot" && slug.current == $slug][0]{
    name,
    "excerpt": pt::text(coalesce(spotCard, captMikeNotes, historicalAnalysis, environmentalFactors))
  }
`)

/**
 * Shared card projection reused by the /spots index and every taxonomy reverse
 * lookup, so cards render identically everywhere (matches the <SpotCard> props).
 */
const spotCardProjection = /* groq */ `
  _id,
  name,
  id,
  "slug": slug.current,
  "summary": pt::text(coalesce(spotCard, captMikeNotes))
`

/**
 * Every spot for the /spots index, name-sorted. `regionName`/`regionSlug` come
 * from the (often-dangling) region ref and are only a fallback — region grouping
 * is primarily derived from the `id` prefix (see lib/taxonomy.ts).
 */
export const spotsIndexQuery = defineQuery(/* groq */ `
  *[_type == "spot" && defined(slug.current)]{
    ${spotCardProjection},
    "regionName": region[0]->name,
    "regionSlug": region[0]->slug.current
  } | order(name)
`)

/**
 * Featured spots (+ boat ramps) for the /spots overview map and filterable grid.
 *
 * - `kind` splits featured spots ("spot") from the boat-ramp variants ("ramp");
 *   the data stores boat ramps under three inconsistent spotType values.
 * - `structures`/`species` are resolved with the manual `drafts.`-prefix deref
 *   (a plain `->` dangles on every one), each null-guarded — they drive the
 *   grid's structure/species filters. Region is derived from the id-prefix in
 *   the page (lib/taxonomy), not from the (dangling) region ref.
 * - Excludes `fx-spot-playbook-approach` sub-spots. Coordinates/slug may be null
 *   (map needs coords; grid cards need a slug) — the page filters accordingly.
 */
export const fsSpotsQuery = defineQuery(/* groq */ `
  *[_type == "spot" && spotType in ["fs-featured-spot", "br-boat-ramp", "boat-ramp", "BR - Boat Ramp"]]{
    _id,
    id,
    name,
    "slug": slug.current,
    latitude,
    longitude,
    "kind": select(spotType == "fs-featured-spot" => "spot", "ramp"),
    "summary": pt::text(coalesce(spotCard, captMikeNotes)),
    "structures": structure[]{
      "r": *[_type == "structure" && ("drafts." + _id == ^._ref || _id == ^._ref)][0]{
        "name": name,
        "slug": slug.current
      }
    }.r,
    "species": targetSpecies[]{
      "r": *[_type == "targetSpecies" && ("drafts." + _id == ^._ref || _id == ^._ref)][0]{
        "name": name,
        "slug": slug.current
      }
    }.r
  } | order(name)
`)

/**
 * Generic taxonomy queries. `$types` is an array so `/structures` can span both
 * `structure` (drafts) and `structureType` (published) with one query.
 */
export const taxonomySlugsQuery = defineQuery(/* groq */ `
  *[_type in $types && defined(slug.current)]{ "slug": slug.current }
`)

export const taxonomyIndexQuery = defineQuery(/* groq */ `
  *[_type in $types && defined(slug.current)]{
    _id,
    name,
    id,
    "slug": slug.current
  } | order(name)
`)

export const taxonomyDocBySlugQuery = defineQuery(/* groq */ `
  *[_type in $types && slug.current == $slug][0]{
    _id,
    _type,
    name,
    id,
    "slug": slug.current,
    description,
    "descriptionText": pt::text(description),
    // Approach-only: the featured route diagram (plain ImageKit URL). Null for
    // every other taxonomy type, so the template just renders it when present.
    featuredDiagramUrl
  }
`)

/**
 * Reverse lookup: spots referencing a taxonomy doc. `references()` matches the
 * exact stored `_ref`; most spot refs use the plain published id, but draft-only
 * targets are stored `drafts.`-prefixed — so callers pass BOTH id forms in
 * `$ids` to catch either. Card shape mirrors `spotsIndexQuery`.
 */
export const taxonomyReverseSpotsQuery = defineQuery(/* groq */ `
  *[_type == "spot" && references($ids)]{
    ${spotCardProjection}
  } | order(name)
`)

/**
 * --- Species posts (the /species hub + /species/posts/[slug] articles) --------
 *
 * `speciesPost` docs are long-form guides (avg ~6KB of body text). All refs are
 * weak and often draft-`_ref`'d, so species/baitfish are resolved with the same
 * manual id-match deref the spot/video queries use — a plain `->` dangles.
 *
 * Dangling entries come back as `null` array members (NOT dropped in-query): a
 * trailing `[defined(@)]` filter looks right but silently nulls EVERY element in
 * this projection, so each consumer null-guards the members in JS instead.
 */

/** Card excerpt: first ~45 words of the flattened body. GROQ can't slice a
 *  string directly (`[0...n]` only slices arrays), so split on spaces, slice the
 *  word array, and re-join. */
const postExcerpt = /* groq */ `array::join(string::split(pt::text(description), " ")[0...45], " ")`

const postSpeciesDeref = /* groq */ `targetSpecies[]{
  "r": *[_type == "targetSpecies" && ("drafts." + _id == ^._ref || _id == ^._ref)][0]{
    "name": name, "slug": slug.current
  }
}.r`

const postBaitfishDeref = /* groq */ `baitfish[]{
  "r": *[_type == "baitfish" && ("drafts." + _id == ^._ref || _id == ^._ref)][0]{
    "name": name, "slug": slug.current
  }
}.r`

/** Landing grid: every species post, with resolved facet names for the sidebar. */
export const speciesPostsIndexQuery = defineQuery(/* groq */ `
  *[_type == "speciesPost" && defined(slug.current)]{
    _id,
    _type,
    name,
    "slug": slug.current,
    "excerpt": ${postExcerpt},
    "species": ${postSpeciesDeref},
    "baitfish": ${postBaitfishDeref}
  } | order(name)
`)

/** Static params for the post detail route. */
export const speciesPostSlugsQuery = defineQuery(/* groq */ `
  *[_type == "speciesPost" && defined(slug.current)]{ "slug": slug.current }
`)

/** One species post (full article) for /species/posts/[slug]. */
export const speciesPostBySlugQuery = defineQuery(/* groq */ `
  *[_type == "speciesPost" && slug.current == $slug][0]{
    _id,
    _type,
    name,
    id,
    "slug": slug.current,
    description,
    "descriptionText": pt::text(description),
    "species": ${postSpeciesDeref},
    "baitfish": ${postBaitfishDeref}
  }
`)

/**
 * Related posts for a species detail page. `references($ids)` matches the stored
 * `_ref` (plain OR drafts.-prefixed — callers pass both id forms via bothIdForms).
 */
export const postsBySpeciesQuery = defineQuery(/* groq */ `
  *[_type == "speciesPost" && references($ids)]{
    _id,
    name,
    "slug": slug.current,
    "excerpt": ${postExcerpt}
  } | order(name)
`)

/**
 * Spots tagged with a species (for the species detail map + spot cards). Matches
 * the ref both id forms; derives the map `kind` from spotType the same way
 * fsSpotsQuery does (anything that isn't a boat ramp is a plain spot marker).
 */
export const spotsBySpeciesQuery = defineQuery(/* groq */ `
  *[_type == "spot" && references($ids)]{
    _id,
    id,
    name,
    "slug": slug.current,
    latitude,
    longitude,
    "kind": select(
      spotType in ["br-boat-ramp", "boat-ramp", "BR - Boat Ramp"] => "ramp",
      "spot"
    )
  } | order(name)
`)

/**
 * Sitemap sources. These are the ONE place we query the PUBLISHED perspective
 * even in dev (see app/sitemap.ts) — a sitemap of draft-only URLs would 404 in
 * production.
 */
export const sitemapSpotsQuery = defineQuery(/* groq */ `
  *[_type == "spot" && defined(slug.current)]{ "slug": slug.current, _updatedAt }
`)

export const sitemapTaxonomyQuery = defineQuery(/* groq */ `
  *[_type in $types && defined(slug.current)]{ _type, "slug": slug.current, _updatedAt }
`)

/**
 * Card queries for the Builder.io marketing components. Fetched client-side from
 * the public (published) perspective. Same card shape as the /spots index.
 */
export const spotCardBySlugQuery = defineQuery(/* groq */ `
  *[_type == "spot" && slug.current == $slug][0]{
    ${spotCardProjection}
  }
`)

// Draft ids use dot separators ("BB.WE.fs…"); published ids are sanitized to
// underscores ("BB_WE_fs…"). Match both so the region grid works in either.
export const spotCardsByRegionQuery = defineQuery(/* groq */ `
  *[_type == "spot" && defined(slug.current) && (
    string::startsWith(id, $code + ".") || string::startsWith(id, $code + "_")
  )]{
    ${spotCardProjection}
  } | order(name)
`)

/**
 * Site-wide search index source (Step 1 of the instant-search feature). ONE
 * query, one array per indexable type, resolved entirely at build time and
 * flattened into the static `/search-index.json` artifact — NEVER queried at
 * runtime. Only types with a reachable `[slug]` route are included; `blogPost`
 * and `speciesPost` are omitted (no routes yet), and `structure`/`structureType`
 * are unioned then deduped alongside every other type in `lib/search/build-index.ts`.
 *
 * Body text is flattened with `pt::text()` at the query layer (NOT shipped as
 * raw PT): `pt::text` concatenates block text and ignores non-text members
 * (richTableBlock, images, embeds) exactly as required — this shrinks the fetch
 * from ~30MB of raw PT to ~3.4MB. That is still over Next's 2MB Data-Cache limit,
 * so the underlying fetch is NOT data-cached (you'll see an "items over 2MB can
 * not be cached" warning). That is fine here: the consumer route
 * (`/search-index.json`) is `force-static`, so this query runs only at build time
 * and on the hourly `revalidate` tick — never per request — and the flattened
 * `body` is then stega-cleaned and hard-capped (CORPUS_CAP) in `build-index.ts`,
 * yielding a ~480KB artifact. Video region is manual-deref'd (weak ref) the same
 * way the videos index does.
 */
export const searchIndexQuery = defineQuery(/* groq */ `
  {
    "spots": *[_type == "spot" && defined(slug.current)]{
      _id, _type, id, name, "slug": slug.current,
      "body": pt::text(spotCard) + " " + pt::text(captMikeNotes) + " " +
        pt::text(historicalAnalysis) + " " + pt::text(environmentalFactors) + " " +
        pt::text(observationalFactors) + " " + pt::text(structureApproach) + " " +
        pt::text(gearTechnique) + " " + pt::text(QAcaptMike)
    },
    "videos": *[_type == "video" && defined(slug.current)]{
      _id, _type, id, "slug": slug.current,
      "name": coalesce(name, youtubeTitle),
      "body": pt::text(description),
      "regionName": *[_type == "region" && ("drafts." + _id == ^.region._ref || _id == ^.region._ref)][0].name
    },
    "approaches": *[_type == "approach" && defined(slug.current)]{
      _id, _type, id, name, "slug": slug.current, "body": pt::text(description)
    },
    "structures": *[_type in ["structure", "structureType"] && defined(slug.current)]{
      _id, _type, id, name, "slug": slug.current, "body": pt::text(description)
    },
    "techniques": *[_type == "techniqueRetrieve" && defined(slug.current)]{
      _id, _type, id, name, "slug": slug.current, "body": pt::text(description)
    },
    "baitfish": *[_type == "baitfish" && defined(slug.current)]{
      _id, _type, id, name, "slug": slug.current, "body": pt::text(description)
    },
    "species": *[_type == "targetSpecies" && defined(slug.current)]{
      _id, _type, id, name, "slug": slug.current, "body": pt::text(description)
    },
    "gearPosts": *[_type == "gearPost" && defined(slug.current)]{
      _id, _type, id, name, "slug": slug.current, "body": pt::text(description)
    },
    "lures": *[_type == "lureCatalog" && defined(slug.current)]{
      _id, _type, id, name, "slug": slug.current, "body": pt::text(description)
    },
    "parentLures": *[_type == "parentLure" && defined(slug.current)]{
      _id, _type, id, name, "slug": slug.current, "body": pt::text(description)
    },
    "regions": *[_type == "region" && defined(slug.current)]{
      _id, _type, id, name, "slug": slug.current, "body": pt::text(description)
    },
    "seasons": *[_type == "season" && defined(slug.current)]{
      _id, _type, id, name, "slug": slug.current, "body": pt::text(description)
    },
    "zones": *[_type == "zone" && defined(slug.current)]{
      _id, _type, id, name, "slug": slug.current, "body": pt::text(description)
    },
    "microSeasons": *[_type == "microSeason" && defined(slug.current)]{
      _id, _type, id, name, "slug": slug.current, "body": pt::text(description)
    }
  }
`)
