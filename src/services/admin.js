import { databases, DB, C, uid, now } from '@/config/appwrite'
import { Query } from 'appwrite'

async function log (adminId, action, resourceType, resourceId, changes = {}) {
  await databases.createDocument(DB, C.ADMIN_LOGS, uid(), {
    admin_id:      adminId,
    action,
    resource_type: resourceType,
    resource_id:   resourceId,
    changes:       JSON.stringify(changes),
    created_at:    now(),
  })
}

// ── Users ─────────────────────────────────────────────────────────────────────
export async function disableUser (adminId, userId, reason = '') {
  await databases.updateDocument(DB, C.USERS, userId, {
    is_disabled: true, disabled_reason: reason, updated_at: now()
  })
  await log(adminId, 'disable_user', 'user', userId, { reason })
}

export async function enableUser (adminId, userId) {
  await databases.updateDocument(DB, C.USERS, userId, {
    is_disabled: false, disabled_reason: '', updated_at: now()
  })
  await log(adminId, 'enable_user', 'user', userId)
}

export async function suspendUser (adminId, userId, reason = '', days = 30) {
  const until = new Date()
  until.setDate(until.getDate() + days)
  await databases.updateDocument(DB, C.USERS, userId, {
    is_suspended: true,
    suspended_reason: reason,
    suspended_until: until.toISOString(),
    updated_at: now(),
  })
  await log(adminId, 'suspend_user', 'user', userId, { reason, days })
}

export async function unsuspendUser (adminId, userId) {
  await databases.updateDocument(DB, C.USERS, userId, {
    is_suspended: false, suspended_reason: '', suspended_until: null, updated_at: now()
  })
  await log(adminId, 'unsuspend_user', 'user', userId)
}

export async function verifyUser (adminId, userId) {
  await databases.updateDocument(DB, C.USERS, userId, { verified: true, updated_at: now() })
  await log(adminId, 'verify_user', 'user', userId)
}

export async function unverifyUser (adminId, userId) {
  await databases.updateDocument(DB, C.USERS, userId, { verified: false, updated_at: now() })
  await log(adminId, 'unverify_user', 'user', userId)
}

export async function listUsers (limit = 50, offset = 0, search = '') {
  const q = [Query.orderDesc('created_at'), Query.limit(limit), Query.offset(offset)]
  if (search) q.push(Query.startsWith('username', search))
  const r = await databases.listDocuments(DB, C.USERS, q)
  return r
}

// ── Videos ────────────────────────────────────────────────────────────────────
export async function adminDeleteVideo (adminId, videoId, reason = '') {
  await databases.deleteDocument(DB, C.VIDEOS, videoId)
  await log(adminId, 'delete_video', 'video', videoId, { reason })
}

export async function listAllVideos (limit = 50, offset = 0) {
  const r = await databases.listDocuments(DB, C.VIDEOS, [
    Query.orderDesc('created_at'), Query.limit(limit), Query.offset(offset)
  ])
  return r
}

// ── Reports ───────────────────────────────────────────────────────────────────
export async function listReports (status = null, limit = 50, offset = 0) {
  const q = [Query.orderAsc('created_at'), Query.limit(limit), Query.offset(offset)]
  if (status) q.unshift(Query.equal('status', status))
  const r = await databases.listDocuments(DB, C.REPORTS, q)
  return r
}

export async function resolveReport (adminId, reportId, status, notes = '') {
  await databases.updateDocument(DB, C.REPORTS, reportId, {
    status, admin_notes: notes, reviewed_at: now()
  })
  await log(adminId, 'resolve_report', 'report', reportId, { status, notes })
}

// ── Logs ──────────────────────────────────────────────────────────────────────
export async function getAdminLogs (limit = 50, offset = 0) {
  const r = await databases.listDocuments(DB, C.ADMIN_LOGS, [
    Query.orderDesc('created_at'), Query.limit(limit), Query.offset(offset)
  ])
  return r.documents
}

// ── Hashtags ──────────────────────────────────────────────────────────────────
export async function listHashtags (limit = 50, offset = 0, search = '') {
  const q = [Query.orderDesc('usage_count'), Query.limit(limit), Query.offset(offset)]
  if (search) q.push(Query.startsWith('tag', search))
  return databases.listDocuments(DB, C.HASHTAGS, q)
}

export async function blockHashtag (adminId, hashtagId) {
  await databases.updateDocument(DB, C.HASHTAGS, hashtagId, { is_blocked: true, updated_at: now() })
  await log(adminId, 'block_hashtag', 'hashtag', hashtagId)
}

export async function unblockHashtag (adminId, hashtagId) {
  await databases.updateDocument(DB, C.HASHTAGS, hashtagId, { is_blocked: false, updated_at: now() })
  await log(adminId, 'unblock_hashtag', 'hashtag', hashtagId)
}

// ── Comments (moderation) ───────────────────────────────────────────────────
export async function adminDeleteComment (adminId, commentId) {
  await databases.deleteDocument(DB, C.COMMENTS, commentId)
  await log(adminId, 'delete_comment', 'comment', commentId)
}

// ── Admin grants ─────────────────────────────────────────────────────────────
// NOTE: the real security boundary is the Appwrite `admin` LABEL on the
// user's account (set only via the server-side grant-admin script — see
// appwrite/setup/grant-admin.cjs). This `is_admin` field is a mirror for
// display/query purposes only (e.g. so the Users list can show a badge and
// so you can filter `Query.equal('is_admin', true)`); it carries no access
// control weight by itself, since it lives on a document like any other
// field. Never gate a permission check on this field — always check
// account.labels on the authenticated session instead.
export async function markUserAsAdmin (adminId, userId) {
  await databases.updateDocument(DB, C.USERS, userId, { is_admin: true, updated_at: now() })
  await log(adminId, 'mark_admin', 'user', userId)
}

export async function unmarkUserAsAdmin (adminId, userId) {
  await databases.updateDocument(DB, C.USERS, userId, { is_admin: false, updated_at: now() })
  await log(adminId, 'unmark_admin', 'user', userId)
}

export async function getDashboardStats () {
  const [users, videos, reports] = await Promise.all([
    databases.listDocuments(DB, C.USERS,   [Query.limit(1)]),
    databases.listDocuments(DB, C.VIDEOS,  [Query.limit(1)]),
    databases.listDocuments(DB, C.REPORTS, [Query.equal('status', 'pending'), Query.limit(1)]),
  ])
  return {
    totalUsers:     users.total,
    totalVideos:    videos.total,
    pendingReports: reports.total,
  }
}
