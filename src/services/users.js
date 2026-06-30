import { databases, DB, C, uid, now } from '@/config/appwrite'
import { Query } from 'appwrite'

// ── Profile ───────────────────────────────────────────────────────────────────
export async function getProfile (userId) {
  return databases.getDocument(DB, C.USERS, userId)
}

export async function getProfileByUsername (username) {
  const r = await databases.listDocuments(DB, C.USERS, [Query.equal('username', username)])
  return r.documents[0] || null
}

export async function updateProfile (userId, data) {
  return databases.updateDocument(DB, C.USERS, userId, { ...data, updated_at: now() })
}

export async function searchUsers (q, limit = 20) {
  const r = await databases.listDocuments(DB, C.USERS, [
    Query.or([Query.startsWith('username', q), Query.startsWith('display_name', q)]),
    Query.limit(limit),
  ])
  return r.documents
}

export async function getSuggestedUsers (currentUserId, limit = 10) {
  const r = await databases.listDocuments(DB, C.USERS, [
    Query.notEqual('$id', currentUserId),
    Query.equal('is_private', false),
    Query.orderDesc('follower_count'),
    Query.limit(limit * 2),
  ])
  return r.documents.slice(0, limit)
}

// ── Follow ────────────────────────────────────────────────────────────────────
export async function followUser (followerId, followingId) {
  // Prevent duplicates
  const existing = await databases.listDocuments(DB, C.FOLLOWS, [
    Query.equal('follower_id', followerId),
    Query.equal('following_id', followingId),
  ])
  if (existing.total > 0) return existing.documents[0]

  const doc = await databases.createDocument(DB, C.FOLLOWS, uid(), {
    follower_id:  followerId,
    following_id: followingId,
    created_at:   now(),
  })

  // Increment counters (best-effort)
  _incr(followingId, 'follower_count',  1)
  _incr(followerId,  'following_count', 1)

  return doc
}

export async function unfollowUser (followerId, followingId) {
  const r = await databases.listDocuments(DB, C.FOLLOWS, [
    Query.equal('follower_id', followerId),
    Query.equal('following_id', followingId),
  ])
  if (r.total === 0) return
  await databases.deleteDocument(DB, C.FOLLOWS, r.documents[0].$id)
  _incr(followingId, 'follower_count',  -1)
  _incr(followerId,  'following_count', -1)
}

export async function isFollowing (followerId, followingId) {
  const r = await databases.listDocuments(DB, C.FOLLOWS, [
    Query.equal('follower_id', followerId),
    Query.equal('following_id', followingId),
  ])
  return r.total > 0
}

export async function getFollowers (userId, limit = 30, offset = 0) {
  const r = await databases.listDocuments(DB, C.FOLLOWS, [
    Query.equal('following_id', userId),
    Query.orderDesc('created_at'),
    Query.limit(limit),
    Query.offset(offset),
  ])
  return _enrichFollowDocs(r.documents, 'follower_id')
}

export async function getFollowing (userId, limit = 30, offset = 0) {
  const r = await databases.listDocuments(DB, C.FOLLOWS, [
    Query.equal('follower_id', userId),
    Query.orderDesc('created_at'),
    Query.limit(limit),
    Query.offset(offset),
  ])
  return _enrichFollowDocs(r.documents, 'following_id')
}

// ── Block ─────────────────────────────────────────────────────────────────────
export async function blockUser (blockerId, blockedId) {
  const existing = await databases.listDocuments(DB, C.BLOCKED_USERS, [
    Query.equal('blocker_id', blockerId),
    Query.equal('blocked_id', blockedId),
  ])
  if (existing.total > 0) return
  await databases.createDocument(DB, C.BLOCKED_USERS, uid(), {
    blocker_id: blockerId,
    blocked_id: blockedId,
    created_at: now(),
  })
}

export async function unblockUser (blockerId, blockedId) {
  const r = await databases.listDocuments(DB, C.BLOCKED_USERS, [
    Query.equal('blocker_id', blockerId),
    Query.equal('blocked_id', blockedId),
  ])
  if (r.total > 0) await databases.deleteDocument(DB, C.BLOCKED_USERS, r.documents[0].$id)
}

export async function isBlocked (blockerId, blockedId) {
  const r = await databases.listDocuments(DB, C.BLOCKED_USERS, [
    Query.equal('blocker_id', blockerId),
    Query.equal('blocked_id', blockedId),
  ])
  return r.total > 0
}

export async function getBlockedUsers (blockerId) {
  const r = await databases.listDocuments(DB, C.BLOCKED_USERS, [
    Query.equal('blocker_id', blockerId),
    Query.orderDesc('created_at'),
    Query.limit(100),
  ])
  return Promise.all(r.documents.map(d => databases.getDocument(DB, C.USERS, d.blocked_id)))
}

// ── Report ────────────────────────────────────────────────────────────────────
export async function reportUser (reporterId, reportedUserId, reason) {
  return databases.createDocument(DB, C.REPORTS, uid(), {
    reporter_id:      reporterId,
    reported_user_id: reportedUserId,
    report_type:      'user',
    reason,
    status:           'pending',
    created_at:       now(),
  })
}

// ── Internals ─────────────────────────────────────────────────────────────────
async function _incr (userId, field, delta) {
  try {
    const u = await databases.getDocument(DB, C.USERS, userId)
    await databases.updateDocument(DB, C.USERS, userId, {
      [field]: Math.max(0, (u[field] || 0) + delta),
    })
  } catch { /* non-critical */ }
}

async function _enrichFollowDocs (docs, idField) {
  return Promise.all(docs.map(d =>
    databases.getDocument(DB, C.USERS, d[idField]).catch(() => null)
  )).then(r => r.filter(Boolean))
}
