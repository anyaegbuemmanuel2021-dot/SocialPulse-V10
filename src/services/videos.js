import { databases, storage, DB, C, B, uid, now } from '@/config/appwrite'
import { Query, ID } from 'appwrite'

// ── CRUD ──────────────────────────────────────────────────────────────────────
export async function createVideo (userId, data) {
  const doc = await databases.createDocument(DB, C.VIDEOS, uid(), {
    user_id:       userId,
    title:         data.title         || 'Untitled',
    description:   data.description   || '',
    video_url:     data.video_url     || '',
    thumbnail_url: data.thumbnail_url || '',
    duration:      data.duration      || 0,
    hashtags:      data.hashtags      || [],
    mentions:      data.mentions      || [],
    visibility:    data.visibility    || 'public',
    is_draft:      data.is_draft      ?? false,
    scheduled_at:  data.scheduled_at  || null,
    like_count:    0,
    comment_count: 0,
    view_count:    0,
    share_count:   0,
    created_at:    now(),
    updated_at:    now(),
  })
  // Increment user video_count
  _incr(userId, 'video_count', 1)

  // Track hashtags
  if (data.hashtags?.length) {
    data.hashtags.forEach(tag => _upsertHashtag(tag))
  }
  return doc
}

export async function getVideo (videoId) {
  return databases.getDocument(DB, C.VIDEOS, videoId)
}

export async function updateVideo (videoId, data) {
  return databases.updateDocument(DB, C.VIDEOS, videoId, { ...data, updated_at: now() })
}

export async function deleteVideo (videoId) {
  const v = await databases.getDocument(DB, C.VIDEOS, videoId)

  // Delete storage files
  await _tryDeleteFile(B.VIDEOS,     v.video_url)
  await _tryDeleteFile(B.THUMBNAILS, v.thumbnail_url)

  await databases.deleteDocument(DB, C.VIDEOS, videoId)
  _incr(v.user_id, 'video_count', -1)
}

// ── Lists ─────────────────────────────────────────────────────────────────────
export async function listVideos (opts = {}) {
  const queries = [
    Query.equal('visibility', 'public'),
    Query.equal('is_draft', false),
    Query.isNull('scheduled_at'),
    Query.orderDesc('created_at'),
    Query.limit(opts.limit  || 20),
    Query.offset(opts.offset || 0),
  ]
  if (opts.userId)  queries.push(Query.equal('user_id', opts.userId))
  if (opts.hashtag) queries.push(Query.search('hashtags', opts.hashtag))

  const r = await databases.listDocuments(DB, C.VIDEOS, queries)
  return { videos: r.documents, total: r.total }
}

export async function getUserVideos (userId, limit = 20, offset = 0) {
  const r = await databases.listDocuments(DB, C.VIDEOS, [
    Query.equal('user_id', userId),
    Query.equal('is_draft', false),
    Query.orderDesc('created_at'),
    Query.limit(limit),
    Query.offset(offset),
  ])
  return r.documents
}

export async function getDraftVideos (userId) {
  const r = await databases.listDocuments(DB, C.VIDEOS, [
    Query.equal('user_id', userId),
    Query.equal('is_draft', true),
    Query.orderDesc('updated_at'),
  ])
  return r.documents
}

export async function getTrendingVideos (limit = 20, offset = 0) {
  const r = await databases.listDocuments(DB, C.VIDEOS, [
    Query.equal('visibility', 'public'),
    Query.equal('is_draft', false),
    Query.orderDesc('view_count'),
    Query.limit(limit),
    Query.offset(offset),
  ])
  return r.documents
}

export async function searchVideos (q, limit = 20, offset = 0) {
  const r = await databases.listDocuments(DB, C.VIDEOS, [
    Query.or([Query.search('title', q), Query.search('description', q)]),
    Query.equal('visibility', 'public'),
    Query.equal('is_draft', false),
    Query.orderDesc('created_at'),
    Query.limit(limit),
    Query.offset(offset),
  ])
  return { videos: r.documents, total: r.total }
}

// ── Likes ─────────────────────────────────────────────────────────────────────
export async function likeVideo (videoId, userId) {
  const existing = await databases.listDocuments(DB, C.LIKES, [
    Query.equal('user_id', userId),
    Query.equal('video_id', videoId),
    Query.equal('like_type', 'video'),
  ])
  if (existing.total > 0) return false

  await databases.createDocument(DB, C.LIKES, uid(), {
    user_id:   userId,
    video_id:  videoId,
    like_type: 'video',
    created_at: now(),
  })
  _incr(videoId, 'like_count', 1, C.VIDEOS)
  return true
}

export async function unlikeVideo (videoId, userId) {
  const r = await databases.listDocuments(DB, C.LIKES, [
    Query.equal('user_id', userId),
    Query.equal('video_id', videoId),
    Query.equal('like_type', 'video'),
  ])
  if (r.total === 0) return
  await databases.deleteDocument(DB, C.LIKES, r.documents[0].$id)
  _incr(videoId, 'like_count', -1, C.VIDEOS)
}

export async function isVideoLiked (videoId, userId) {
  if (!userId) return false
  const r = await databases.listDocuments(DB, C.LIKES, [
    Query.equal('user_id', userId),
    Query.equal('video_id', videoId),
    Query.equal('like_type', 'video'),
  ])
  return r.total > 0
}

// ── Views ─────────────────────────────────────────────────────────────────────
export async function recordView (videoId, userId = null, duration = 0) {
  await databases.createDocument(DB, C.VIDEO_VIEWS, uid(), {
    video_id:      videoId,
    user_id:       userId,
    view_duration: duration,
    created_at:    now(),
  })
  _incr(videoId, 'view_count', 1, C.VIDEOS)
}

export async function shareVideo (videoId) {
  _incr(videoId, 'share_count', 1, C.VIDEOS)
}

// ── Upload ────────────────────────────────────────────────────────────────────
export async function uploadVideoFile (file, onProgress) {
  const uploaded = await storage.createFile(B.VIDEOS, uid(), file,
    undefined, (evt) => { if (onProgress) onProgress(Math.round(evt.loaded / evt.total * 100)) }
  )
  return storage.getFileView(B.VIDEOS, uploaded.$id)
}

export async function uploadThumbnail (file) {
  const uploaded = await storage.createFile(B.THUMBNAILS, uid(), file)
  return storage.getFileView(B.THUMBNAILS, uploaded.$id)
}

export async function uploadAvatar (file) {
  const uploaded = await storage.createFile(B.AVATARS, uid(), file)
  return storage.getFileView(B.AVATARS, uploaded.$id)
}

export async function uploadCover (file) {
  const uploaded = await storage.createFile(B.COVERS, uid(), file)
  return storage.getFileView(B.COVERS, uploaded.$id)
}

// ── Report ────────────────────────────────────────────────────────────────────
export async function reportVideo (videoId, reporterId, reason) {
  return databases.createDocument(DB, C.REPORTS, uid(), {
    reporter_id:       reporterId,
    reported_video_id: videoId,
    report_type:       'video',
    reason,
    status:            'pending',
    created_at:        now(),
  })
}

// ── Internals ─────────────────────────────────────────────────────────────────
async function _incr (docId, field, delta, collection = C.USERS) {
  try {
    const d = await databases.getDocument(DB, collection, docId)
    await databases.updateDocument(DB, collection, docId, {
      [field]: Math.max(0, (d[field] || 0) + delta),
    })
  } catch { /* non-critical */ }
}

async function _tryDeleteFile (bucket, url) {
  if (!url) return
  try {
    const fileId = url.split('/').slice(-2, -1)[0]
    await storage.deleteFile(bucket, fileId)
  } catch { /* file may not exist */ }
}

async function _upsertHashtag (tag) {
  try {
    const clean = tag.replace('#', '').toLowerCase()
    const r = await databases.listDocuments(DB, C.HASHTAGS, [Query.equal('tag', clean)])
    if (r.total > 0) {
      await databases.updateDocument(DB, C.HASHTAGS, r.documents[0].$id, {
        usage_count: (r.documents[0].usage_count || 0) + 1,
        updated_at: now(),
      })
    } else {
      await databases.createDocument(DB, C.HASHTAGS, uid(), {
        tag: clean,
        usage_count: 1,
        created_at: now(),
        updated_at: now(),
      })
    }
  } catch { /* non-critical */ }
}
