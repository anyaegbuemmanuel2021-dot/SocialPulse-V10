import { databases, DB, C, uid, now } from '@/config/appwrite'
import { Query } from 'appwrite'

export async function postComment (videoId, userId, content, parentId = null) {
  const doc = await databases.createDocument(DB, C.COMMENTS, uid(), {
    video_id:          videoId,
    user_id:           userId,
    parent_comment_id: parentId || null,
    content,
    like_count:  0,
    reply_count: 0,
    created_at:  now(),
    updated_at:  now(),
  })
  _incr(videoId, 'comment_count', 1, C.VIDEOS)
  if (parentId) _incr(parentId, 'reply_count', 1, C.COMMENTS)
  return doc
}

export async function getVideoComments (videoId, limit = 30, offset = 0) {
  const r = await databases.listDocuments(DB, C.COMMENTS, [
    Query.equal('video_id', videoId),
    Query.isNull('parent_comment_id'),
    Query.orderDesc('created_at'),
    Query.limit(limit),
    Query.offset(offset),
  ])
  return r.documents
}

export async function getReplies (commentId, limit = 20) {
  const r = await databases.listDocuments(DB, C.COMMENTS, [
    Query.equal('parent_comment_id', commentId),
    Query.orderAsc('created_at'),
    Query.limit(limit),
  ])
  return r.documents
}

export async function deleteComment (commentId) {
  const c = await databases.getDocument(DB, C.COMMENTS, commentId)
  await databases.deleteDocument(DB, C.COMMENTS, commentId)
  _incr(c.video_id, 'comment_count', -1, C.VIDEOS)
  if (c.parent_comment_id) _incr(c.parent_comment_id, 'reply_count', -1, C.COMMENTS)
}

export async function likeComment (commentId, userId) {
  const existing = await databases.listDocuments(DB, C.LIKES, [
    Query.equal('user_id', userId),
    Query.equal('comment_id', commentId),
    Query.equal('like_type', 'comment'),
  ])
  if (existing.total > 0) return false
  await databases.createDocument(DB, C.LIKES, uid(), {
    user_id:    userId,
    comment_id: commentId,
    like_type:  'comment',
    created_at: now(),
  })
  _incr(commentId, 'like_count', 1, C.COMMENTS)
  return true
}

export async function unlikeComment (commentId, userId) {
  const r = await databases.listDocuments(DB, C.LIKES, [
    Query.equal('user_id', userId),
    Query.equal('comment_id', commentId),
    Query.equal('like_type', 'comment'),
  ])
  if (r.total === 0) return
  await databases.deleteDocument(DB, C.LIKES, r.documents[0].$id)
  _incr(commentId, 'like_count', -1, C.COMMENTS)
}

export async function isCommentLiked (commentId, userId) {
  if (!userId) return false
  const r = await databases.listDocuments(DB, C.LIKES, [
    Query.equal('user_id', userId),
    Query.equal('comment_id', commentId),
    Query.equal('like_type', 'comment'),
  ])
  return r.total > 0
}

export async function reportComment (commentId, reporterId, reason) {
  return databases.createDocument(DB, C.REPORTS, uid(), {
    reporter_id:         reporterId,
    reported_comment_id: commentId,
    report_type:         'comment',
    reason,
    status:              'pending',
    created_at:          now(),
  })
}

async function _incr (docId, field, delta, col) {
  try {
    const d = await databases.getDocument(DB, col, docId)
    await databases.updateDocument(DB, col, docId, {
      [field]: Math.max(0, (d[field] || 0) + delta),
    })
  } catch { /* non-critical */ }
}
