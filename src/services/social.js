import { databases, DB, C, uid, now } from '@/config/appwrite'
import { Query } from 'appwrite'

// ── Saves ─────────────────────────────────────────────────────────────────────
export async function saveVideo (videoId, userId) {
  const exists = await databases.listDocuments(DB, C.SAVES, [
    Query.equal('user_id', userId),
    Query.equal('video_id', videoId),
  ])
  if (exists.total > 0) return
  await databases.createDocument(DB, C.SAVES, uid(), {
    user_id:    userId,
    video_id:   videoId,
    created_at: now(),
  })
}

export async function unsaveVideo (videoId, userId) {
  const r = await databases.listDocuments(DB, C.SAVES, [
    Query.equal('user_id', userId),
    Query.equal('video_id', videoId),
  ])
  if (r.total > 0) await databases.deleteDocument(DB, C.SAVES, r.documents[0].$id)
}

export async function isVideoSaved (videoId, userId) {
  if (!userId) return false
  const r = await databases.listDocuments(DB, C.SAVES, [
    Query.equal('user_id', userId),
    Query.equal('video_id', videoId),
  ])
  return r.total > 0
}

export async function getSavedVideos (userId, limit = 20, offset = 0) {
  const r = await databases.listDocuments(DB, C.SAVES, [
    Query.equal('user_id', userId),
    Query.orderDesc('created_at'),
    Query.limit(limit),
    Query.offset(offset),
  ])
  const videos = await Promise.all(
    r.documents.map(s =>
      databases.getDocument(DB, C.VIDEOS, s.video_id).catch(() => null)
    )
  )
  return videos.filter(Boolean)
}

// ── Watch history ─────────────────────────────────────────────────────────────
export async function getWatchHistory (userId, limit = 20) {
  const r = await databases.listDocuments(DB, C.VIDEO_VIEWS, [
    Query.equal('user_id', userId),
    Query.orderDesc('created_at'),
    Query.limit(limit * 3),
  ])
  const seen = new Set()
  const unique = r.documents.filter(d => {
    if (seen.has(d.video_id)) return false
    seen.add(d.video_id)
    return true
  }).slice(0, limit)

  const videos = await Promise.all(
    unique.map(d => databases.getDocument(DB, C.VIDEOS, d.video_id).catch(() => null))
  )
  return videos.filter(Boolean)
}

export async function clearWatchHistory (userId) {
  const r = await databases.listDocuments(DB, C.VIDEO_VIEWS, [
    Query.equal('user_id', userId),
    Query.limit(500),
  ])
  await Promise.all(r.documents.map(d =>
    databases.deleteDocument(DB, C.VIDEO_VIEWS, d.$id)
  ))
}

// ── Liked videos ──────────────────────────────────────────────────────────────
export async function getLikedVideos (userId, limit = 20, offset = 0) {
  const r = await databases.listDocuments(DB, C.LIKES, [
    Query.equal('user_id', userId),
    Query.equal('like_type', 'video'),
    Query.orderDesc('created_at'),
    Query.limit(limit),
    Query.offset(offset),
  ])
  const videos = await Promise.all(
    r.documents.map(l => databases.getDocument(DB, C.VIDEOS, l.video_id).catch(() => null))
  )
  return videos.filter(Boolean)
}
