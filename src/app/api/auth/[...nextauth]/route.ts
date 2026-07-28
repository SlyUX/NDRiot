import { handlers } from '@/auth'

// Auth.js mounts its sign-in / callback / sign-out endpoints here. Outside the
// (site) route group on purpose — these are machinery, not a page.
export const { GET, POST } = handlers
