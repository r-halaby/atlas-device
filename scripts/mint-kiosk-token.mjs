// Mints a long-lived Clerk M2M JWT for the kiosk to authenticate to Convex.
//
// Prereqs (do these in the Clerk dashboard, once):
//   1. Create a Machine (M2M application) for the kiosk.
//   2. Copy its Machine Secret Key.
//   3. Note your Clerk organization ID (org_...).
//
// Usage:
//   CLERK_MACHINE_SECRET_KEY=ak_... CLERK_ORG_ID=org_... npm run mint-token
//
// Paste the printed JWT into the kiosk's .env as VITE_CONVEX_AUTH_TOKEN.

import { createClerkClient } from '@clerk/backend'

const machineSecretKey = process.env.CLERK_MACHINE_SECRET_KEY
const orgId = process.env.CLERK_ORG_ID

if (!machineSecretKey || !orgId) {
  console.error('Missing env: CLERK_MACHINE_SECRET_KEY and CLERK_ORG_ID are required.')
  process.exit(1)
}

const clerk = createClerkClient({ secretKey: 'sk_placeholder_unused' })

const token = await clerk.m2m.createToken({
  machineSecretKey,
  tokenFormat: 'jwt',
  // aud must match applicationID in ideate's convex/auth.config.ts.
  // org_id is read by resolveCallerConvexOrgId() in convex/canvas.ts.
  claims: {
    aud: 'convex',
    org_id: orgId,
  },
  secondsUntilExpiration: null,
})

console.log(token.token)
