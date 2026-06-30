import { databases, client, DB, C, uid, now } from '@/config/appwrite'
import { Query } from 'appwrite'

export async function createNotification (userId, actorId, type, extras = {}) {
  if (userId === actorId) return null // never notify self
  return databases.createDocument(DB, C.NOTIFICATIONS, uid(), {
    user_id:           userId,
    actor_id:          actorId,
    notification_type: type,
    video_id:          extras.videoId   || null,
    comment_id:        extras.commentId || null,
    message:           extras.message   || '',
    is_read:           false,
    created_at:        now(),
  })
}

export async function getNotifications (userId, limit = 30, offset = 0, unreadOnly = false) {
  const q = [
    Query.equal('user_id', userId),
    Query.orderDesc('created_at'),
    Query.limit(limit),
    Query.offset(offset),
  ]
  if (unreadOnly) q.push(Query.equal('is_read', false))
  const r = await databases.listDocuments(DB, C.NOTIFICATIONS, q)
  return r.documents
}

export async function getUnreadCount (userId) {
  const r = await databases.listDocuments(DB, C.NOTIFICATIONS, [
    Query.equal('user_id', userId),
    Query.equal('is_read', false),
    Query.limit(1),
  ])
  return r.total
}

export async function markRead (notifId) {
  return databases.updateDocument(DB, C.NOTIFICATIONS, notifId, { is_read: true })
}

export async function markAllRead (userId) {
  const r = await databases.listDocuments(DB, C.NOTIFICATIONS, [
    Query.equal('user_id', userId),
    Query.equal('is_read', false),
    Query.limit(100),
  ])
  await Promise.all(r.documents.map(n =>
    databases.updateDocument(DB, C.NOTIFICATIONS, n.$id, { is_read: true })
  ))
}

export async function deleteNotification (notifId) {
  await databases.deleteDocument(DB, C.NOTIFICATIONS, notifId)
}

// ── Convenience helpers (called from other services) ─────────────────────────
export function notifyLike    (recipientId, actorId, videoId) {
  return createNotification(recipientId, actorId, 'like',    { videoId, message: 'liked your video' })
}
export function notifyComment (recipientId, actorId, videoId, commentId) {
  return createNotification(recipientId, actorId, 'comment', { videoId, commentId, message: 'commented on your video' })
}
export function notifyFollow  (recipientId, actorId) {
  return createNotification(recipientId, actorId, 'follow',  { message: 'started following you' })
}
export function notifyMention (recipientId, actorId, videoId, commentId) {
  return createNotification(recipientId, actorId, 'mention', { videoId, commentId, message: 'mentioned you' })
}

// ── Real-time subscription ────────────────────────────────────────────────────
export function subscribeNotifications(userId, cb) {
  return client.subscribe(
    `databases.${DB}.collections.${C.NOTIFICATIONS}.documents`,
    (event) => {
      if (event.payload?.user_id === userId) {
        cb(event)
      }
    }
  )
}



