import { Client, Account, Databases, Storage, Functions, Query, ID } from 'appwrite'

// ---------------------------------------------------------------------------
// Env resolution + validation
// ---------------------------------------------------------------------------
// Trim() guards against a common .env bug: trailing spaces or accidental
// quotes around the value (e.g. VITE_APPWRITE_PROJECT_ID = "abc123") which
// Vite will pass through literally and Appwrite will then reject with
// project_not_found because the ID no longer matches exactly.
const clean = (v) => (typeof v === 'string' ? v.trim().replace(/^["']|["']$/g, '') : v)

const ENDPOINT   = clean(import.meta.env.VITE_APPWRITE_ENDPOINT) || 'https://cloud.appwrite.io/v1'
const PROJECT_ID = clean(import.meta.env.VITE_APPWRITE_PROJECT_ID)

if (!PROJECT_ID) {
  // Fail loudly at import time instead of letting every API call surface a
  // vague 404 project_not_found. This is almost always a missing/misnamed
  // .env file or Vite not having been restarted after an env change.
  throw new Error(
    '[appwrite.js] VITE_APPWRITE_PROJECT_ID is missing.\n' +
    '  1. Confirm the file is named ".env" or ".env.local" (not ".env.txt").\n' +
    '  2. Confirm it contains: VITE_APPWRITE_PROJECT_ID=your_project_id\n' +
    '  3. Restart the dev server (Vite only reads .env on startup).'
  )
}

if (import.meta.env.DEV) {
  // Visible only in dev builds; helps confirm what actually loaded.
  console.info('[appwrite.js] endpoint:', ENDPOINT)
  console.info('[appwrite.js] project:', PROJECT_ID)
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)

export const account   = new Account(client)
export const databases = new Databases(client)
export const storage   = new Storage(client)
export const functions = new Functions(client)

// Realtime is not a separate class in the Appwrite SDK — it's accessed via
// client.subscribe(). The old commented-out `new Realtime(client)` line
// never worked; use client.subscribe(...) directly wherever you need it, e.g.:
//   client.subscribe(`databases.${DB}.collections.${C.MESSAGES}.documents`, cb)

export { client, Query }

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
export const DB = clean(import.meta.env.VITE_APPWRITE_DATABASE_ID) || 'socialpulse_db'

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------
export const C = {
  USERS:          clean(import.meta.env.VITE_APPWRITE_USERS_COLLECTION)          || 'users',
  VIDEOS:         clean(import.meta.env.VITE_APPWRITE_VIDEOS_COLLECTION)         || 'videos',
  COMMENTS:       clean(import.meta.env.VITE_APPWRITE_COMMENTS_COLLECTION)       || 'comments',
  LIKES:          clean(import.meta.env.VITE_APPWRITE_LIKES_COLLECTION)          || 'likes',
  FOLLOWS:        clean(import.meta.env.VITE_APPWRITE_FOLLOWS_COLLECTION)        || 'follows',
  SAVES:          clean(import.meta.env.VITE_APPWRITE_SAVES_COLLECTION)          || 'saves',
  NOTIFICATIONS:  clean(import.meta.env.VITE_APPWRITE_NOTIFICATIONS_COLLECTION)  || 'notifications',
  CONVERSATIONS:  clean(import.meta.env.VITE_APPWRITE_CONVERSATIONS_COLLECTION)  || 'conversations',
  MESSAGES:       clean(import.meta.env.VITE_APPWRITE_MESSAGES_COLLECTION)       || 'messages',
  VIDEO_VIEWS:    clean(import.meta.env.VITE_APPWRITE_VIDEO_VIEWS_COLLECTION)    || 'video_views',
  HASHTAGS:       clean(import.meta.env.VITE_APPWRITE_HASHTAGS_COLLECTION)       || 'hashtags',
  REPORTS:        clean(import.meta.env.VITE_APPWRITE_REPORTS_COLLECTION)        || 'reports',
  BLOCKED_USERS:  clean(import.meta.env.VITE_APPWRITE_BLOCKED_USERS_COLLECTION)  || 'blocked_users',
  ADMIN_LOGS:     clean(import.meta.env.VITE_APPWRITE_ADMIN_LOGS_COLLECTION)     || 'admin_logs',
}

// ---------------------------------------------------------------------------
// Storage Buckets (legacy)
// ---------------------------------------------------------------------------
// Media (video/thumbnail/avatar/cover/message uploads) now goes to
// Cloudinary — see src/config/cloudinary.js and src/services/media.js.
// Appwrite Storage is no longer used for new uploads. This export is kept
// only so any old code path that still imports B doesn't crash; it can be
// removed once you've confirmed nothing references it.
export const B = {
  VIDEOS: 'media',
  THUMBNAILS: 'media',
  AVATARS: 'media',
  COVERS: 'media',
  MESSAGES: 'media',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const uid = () => ID.unique()
export const now = () => new Date().toISOString()