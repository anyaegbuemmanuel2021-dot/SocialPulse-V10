import { databases, DB, C, uid, Query } from '@/config/appwrite'

// ── Reads (public — no auth required) ───────────────────────────────────────

/** Fetch all flags, e.g. for the admin Site Control page. */
export async function listSiteFlags () {
  const res = await databases.listDocuments(DB, C.SITE_FLAGS, [Query.limit(100)])
  return res.documents
}

/**
 * Fetch a single flag by key. Returns null if it doesn't exist yet (e.g.
 * the deployment script hasn't been (re)run since this flag was added).
 * Callers should treat "not found" the same as "enabled" — fail open, not
 * closed, so a missing/misconfigured flag document never accidentally
 * locks users out of a feature that was never meant to be gated.
 */
export async function getSiteFlag (key) {
  const res = await databases.listDocuments(DB, C.SITE_FLAGS, [Query.equal('key', key), Query.limit(1)])
  return res.documents[0] || null
}

/**
 * Convenience helper for gating a feature in a component:
 *   const gate = await checkFeature('uploads')
 *   if (!gate.enabled) { showBanner(gate.message); return }
 */
export async function checkFeature (key) {
  const flag = await getSiteFlag(key)
  if (!flag) return { enabled: true, message: '' } // fail open — see getSiteFlag note
  return { enabled: flag.enabled !== false, message: flag.message || '' }
}

// ── Writes (admin-label enforced by Appwrite permissions) ──────────────────
// These calls will be rejected server-side by Appwrite with a 401 unless the
// caller's session has the `admin` label — the client-side admin route guard
// is UX only, this permission grant is the actual security boundary.

export async function setSiteFlag (adminId, flagId, { enabled, message }) {
  return databases.updateDocument(DB, C.SITE_FLAGS, flagId, {
    enabled,
    message,
    updated_by: adminId,
    updated_at: new Date().toISOString(),
  })
}

/** Create a brand-new flag beyond the seeded defaults, e.g. gating a new feature. */
export async function createSiteFlag (adminId, { key, label, enabled = true, message = '' }) {
  return databases.createDocument(DB, C.SITE_FLAGS, uid(), {
    key,
    label,
    enabled,
    message,
    updated_by: adminId,
    updated_at: new Date().toISOString(),
  })
}
