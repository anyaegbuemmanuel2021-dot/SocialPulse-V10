import { databases, DB, C } from '@/config/appwrite'
import { Query } from 'appwrite'

// Shared enricher — attaches creator profile to each video
async function enrich (videos) {
  return Promise.all(
    videos.map(async v => {
      try {
        const creator = await databases.getDocument(DB, C.USERS, v.user_id)
        return { ...v, creator }
      } catch {
        return v
      }
    })
  )
}

// ── For You ───────────────────────────────────────────────────────────────────
export async function getForYouFeed (limit = 20, offset = 0) {
  const r = await databases.listDocuments(DB, C.VIDEOS, [
    Query.equal('visibility', 'public'),
    Query.equal('is_draft', false),
    Query.isNull('scheduled_at'),
    Query.orderDesc('view_count'),
    Query.limit(limit),
    Query.offset(offset),
  ])
  return enrich(r.documents)
}

// ── Following ─────────────────────────────────────────────────────────────────
export async function getFollowingFeed (userId, limit = 20, offset = 0) {
  const follows = await databases.listDocuments(DB, C.FOLLOWS, [
    Query.equal('follower_id', userId),
    Query.limit(300),
  ])
  if (follows.total === 0) return getForYouFeed(limit, offset)

  const ids = follows.documents.map(f => f.following_id)
  const r = await databases.listDocuments(DB, C.VIDEOS, [
    Query.equal('user_id', ids),
    Query.equal('visibility', 'public'),
    Query.equal('is_draft', false),
    Query.orderDesc('created_at'),
    Query.limit(limit),
    Query.offset(offset),
  ])
  return enrich(r.documents)
}

// ── Trending ──────────────────────────────────────────────────────────────────
export async function getTrendingFeed (limit = 20, offset = 0) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const r = await databases.listDocuments(DB, C.VIDEOS, [
    Query.equal('visibility', 'public'),
    Query.equal('is_draft', false),
    Query.greaterThan('created_at', cutoff.toISOString()),
    Query.orderDesc('like_count'),
    Query.limit(limit),
    Query.offset(offset),
  ])
  return enrich(r.documents)
}

// ── Hashtag ───────────────────────────────────────────────────────────────────
export async function getHashtagFeed (tag, limit = 20, offset = 0) {
  const clean = tag.replace('#', '')
  const r = await databases.listDocuments(DB, C.VIDEOS, [
    Query.search('hashtags', clean),
    Query.equal('visibility', 'public'),
    Query.equal('is_draft', false),
    Query.orderDesc('created_at'),
    Query.limit(limit),
    Query.offset(offset),
  ])
  return enrich(r.documents)
}

// ── Profile ───────────────────────────────────────────────────────────────────
export async function getProfileFeed (userId, viewerId = null, limit = 20, offset = 0) {
  const user = await databases.getDocument(DB, C.USERS, userId)

  // Private profile — only self or followers
  if (user.is_private && viewerId !== userId) {
    const follows = await databases.listDocuments(DB, C.FOLLOWS, [
      Query.equal('follower_id', viewerId || ''),
      Query.equal('following_id', userId),
    ])
    if (follows.total === 0) return []
  }

  const r = await databases.listDocuments(DB, C.VIDEOS, [
    Query.equal('user_id', userId),
    Query.equal('is_draft', false),
    viewerId === userId
      ? Query.or([Query.equal('visibility', 'public'), Query.equal('visibility', 'private'), Query.equal('visibility', 'followers_only')])
      : Query.equal('visibility', 'public'),
    Query.orderDesc('created_at'),
    Query.limit(limit),
    Query.offset(offset),
  ])
  return r.documents
}

// ── Trending Hashtags ─────────────────────────────────────────────────────────
export async function getTrendingHashtags (limit = 15) {
  const r = await databases.listDocuments(DB, C.HASHTAGS, [
    Query.orderDesc('usage_count'),
    Query.limit(limit),
  ])
  return r.documents
}

// ── Trending Creators ─────────────────────────────────────────────────────────
export async function getTrendingCreators (limit = 10) {
  const r = await databases.listDocuments(DB, C.USERS, [
    Query.equal('is_private', false),
    Query.orderDesc('follower_count'),
    Query.limit(limit),
  ])
  return r.documents
}
