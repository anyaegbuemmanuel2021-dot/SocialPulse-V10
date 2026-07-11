import { databases, DB, C, B, uid, now } from '@/config/appwrite'
import { Query } from 'appwrite'
import { uploadMedia, deleteMedia, deleteLegacyStorageFile } from '@/services/media'

// ── CRUD ──────────────────────────────────────────────────────────────────────
export async function createVideo (userId, data) {
  const doc = await databases.createDocument(DB, C.VIDEOS, uid(), {
    user_id:             userId,
    title:               data.title               || 'Untitled',
    description:         data.description          || '',
    video_url:           data.video_url            || '',
    video_public_id:     data.video_public_id      || '',
    media_type:          data.media_type            || 'video',
    thumbnail_url:       data.thumbnail_url        || '',
    thumbnail_public_id: data.thumbnail_public_id  || '',
    duration:            data.duration             || 0,
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

  // Delete the underlying media before removing the document, so a
  // dangling document never outlives the media it points to. Records
  // created before the Cloudinary migration have a url but no public_id —
  // fall back to the old Appwrite Storage delete for those.
  if (v.video_public_id) await deleteMedia(v.video_public_id, v.media_type === 'image' ? 'image' : 'video')
  else await deleteLegacyStorageFile(B.VIDEOS, v.video_url)

  if (v.thumbnail_public_id) await deleteMedia(v.thumbnail_public_id, 'image')
  else await deleteLegacyStorageFile(B.THUMBNAILS, v.thumbnail_url)

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
// All five return { url, publicId, duration, width, height, bytes, format }
// (see src/config/cloudinary.js). Store both url and publicId on the
// document — the URL for display, the publicId so the asset can be
// deleted later via the cloudinary-cleanup function.
//
// NOTE: uploadMessageMedia used to be duplicated here and in messaging.js;
// messaging.js is the single source of truth for it now (see that file).

export async function uploadVideoFile (file, onProgress) {
  return uploadMedia(file, 'video', 'socialpulse/videos', onProgress)
}

export async function uploadImagePost (file, onProgress) {
  return uploadMedia(file, 'image', 'socialpulse/posts', onProgress)
}

export async function uploadThumbnail (file) {
  return uploadMedia(file, 'image', 'socialpulse/thumbnails')
}

export async function uploadAvatar (file) {
  return uploadMedia(file, 'image', 'socialpulse/avatars')
}

export async function uploadCover (file) {
  return uploadMedia(file, 'image', 'socialpulse/covers')
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
