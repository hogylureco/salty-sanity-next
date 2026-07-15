/**
* This configuration file lets you run `$ sanity [command]` in this folder
* Go to https://www.sanity.io/docs/cli to learn more.
**/
import { defineCliConfig } from 'sanity/cli'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET

export default defineCliConfig({
  api: { projectId, dataset },
  typegen: {
    // Frontend queries live at the repo root (`app/`, `lib/`), not under `src/`,
    // so point TypeGen at them explicitly instead of the default `./src` glob.
    path: './{app,lib}/**/*.{ts,tsx,js,jsx}',
  },
})
