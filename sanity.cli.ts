import { defineCliConfig } from 'sanity/cli'

import { projectId, dataset } from './src/sanity/env'

/**
 * CLI config, used by `sanity schema extract` and `sanity typegen generate`.
 *
 * Separate from sanity.config.ts, which configures the Studio itself. The CLI
 * only needs to know which project and dataset it is talking to.
 */
export default defineCliConfig({
  api: { projectId, dataset },
})
