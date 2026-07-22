import {type SchemaTypeDefinition} from 'sanity'

import {approach} from './documents/approach'
import {baitfish} from './documents/baitfish'
import {blogPost} from './documents/blogPost'
import {environmental} from './documents/environmental'
import {gearPost} from './documents/gearPost'
import {historical} from './documents/historical'
import {lureCatalog} from './documents/lureCatalog'
import {lureGearCategory} from './documents/lureGearCategory'
import {method} from './documents/method'
import {microSeason} from './documents/microSeason'
import {mode} from './documents/mode'
import {observational} from './documents/observational'
import {parentLure} from './documents/parentLure'
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
 * One entry per CANONICAL document type in the `production` dataset.
 *
 * The dataset also holds a parallel set of orphaned hyphenated stub documents
 * (`lure-catalog`, `lure-gear-category`, `parent-lure`, `technique-retrieve`)
 * left behind by an early kebab-case import — sparse id/name/slug records with
 * zero incoming references, superseded by the camelCase types below (which carry
 * the full fields, image URLs, and all the reference wiring the app queries).
 * Those hyphenated types are deliberately NOT registered here, so this Studio
 * matches the Sanity-hosted one and doesn't surface the junk. The stub documents
 * are slated for deletion from the dataset; until then they simply render as
 * "unknown type" if opened directly and never appear in the desk.
 */
const documentTypes: SchemaTypeDefinition[] = [
  approach,
  baitfish,
  blogPost,
  environmental,
  gearPost,
  historical,
  lureCatalog,
  lureGearCategory,
  method,
  microSeason,
  mode,
  observational,
  parentLure,
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
  video,
  zone,
]

export const schema: {types: SchemaTypeDefinition[]} = {
  types: [...objectTypes, ...documentTypes],
}
