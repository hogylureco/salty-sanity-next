import {type SchemaTypeDefinition} from 'sanity'

import {approach} from './documents/approach'
import {baitfish} from './documents/baitfish'
import {blogPost} from './documents/blogPost'
import {environmental} from './documents/environmental'
import {gearPost} from './documents/gearPost'
import {historical} from './documents/historical'
import {lureCatalog} from './documents/lureCatalog'
import {lureCatalogLegacy} from './documents/lureCatalogLegacy'
import {lureGearCategory} from './documents/lureGearCategory'
import {lureGearCategoryLegacy} from './documents/lureGearCategoryLegacy'
import {method} from './documents/method'
import {microSeason} from './documents/microSeason'
import {mode} from './documents/mode'
import {observational} from './documents/observational'
import {parentLure} from './documents/parentLure'
import {parentLureLegacy} from './documents/parentLureLegacy'
import {platform} from './documents/platform'
import {postType} from './documents/postType'
import {region} from './documents/region'
import {season} from './documents/season'
import {speciesPost} from './documents/speciesPost'
import {spot} from './documents/spot'
import {structure} from './documents/structure'
import {structureType} from './documents/structureType'
import {targetSpecies} from './documents/targetSpecies'
import {techniqueRetrieve} from './documents/techniqueRetrieve'
import {techniqueRetrieveLegacy} from './documents/techniqueRetrieveLegacy'
import {video} from './documents/video'
import {zone} from './documents/zone'
import {richText} from './objects/richText'

/**
 * Reusable objects referenced by the document types below.
 *
 * `richTableBlock` (and its `row` / `richTableCell` / `columnHeader` parts) is
 * deliberately absent: it is registered by `richTablePlugin()` in
 * `sanity.config.ts`. Declaring it here too would shadow the plugin's version
 * depending on load order.
 */
const objectTypes: SchemaTypeDefinition[] = [richText]

/**
 * One entry per document type present in the `production` dataset.
 *
 * Four of them exist as near-duplicate pairs — a camelCase variant and a
 * hyphenated one (`lureCatalog`/`lure-catalog`, `lureGearCategory`/
 * `lure-gear-category`, `parentLure`/`parent-lure`, `techniqueRetrieve`/
 * `technique-retrieve`). Both members of every pair hold real documents, so
 * both are registered.
 */
const documentTypes: SchemaTypeDefinition[] = [
  approach,
  baitfish,
  blogPost,
  environmental,
  gearPost,
  historical,
  lureCatalog,
  lureCatalogLegacy,
  lureGearCategory,
  lureGearCategoryLegacy,
  method,
  microSeason,
  mode,
  observational,
  parentLure,
  parentLureLegacy,
  platform,
  postType,
  region,
  season,
  speciesPost,
  spot,
  structure,
  structureType,
  targetSpecies,
  techniqueRetrieve,
  techniqueRetrieveLegacy,
  video,
  zone,
]

export const schema: {types: SchemaTypeDefinition[]} = {
  types: [...objectTypes, ...documentTypes],
}
