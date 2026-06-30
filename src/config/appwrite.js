import { Client, Account, Databases, Storage, Realtime, Query } from 'appwrite'

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID)

export const account   = new Account(client)
export const databases = new Databases(client)
export const storage   = new Storage(client)
export const realtime  = new Realtime(client)
export { client, Query }

// Database
export const DB = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'socialpulse_db'

// Collections
export const C = {
  USERS:          import.meta.env.VITE_APPWRITE_USERS_COLLECTION          || 'users',
  VIDEOS:         import.meta.env.VITE_APPWRITE_VIDEOS_COLLECTION         || 'videos',
  COMMENTS:       import.meta.env.VITE_APPWRITE_COMMENTS_COLLECTION       || 'comments',
  LIKES:          import.meta.env.VITE_APPWRITE_LIKES_COLLECTION          || 'likes',
  FOLLOWS:        import.meta.env.VITE_APPWRITE_FOLLOWS_COLLECTION        || 'follows',
  SAVES:          import.meta.env.VITE_APPWRITE_SAVES_COLLECTION          || 'saves',
  NOTIFICATIONS:  import.meta.env.VITE_APPWRITE_NOTIFICATIONS_COLLECTION  || 'notifications',
  CONVERSATIONS:  import.meta.env.VITE_APPWRITE_CONVERSATIONS_COLLECTION  || 'conversations',
  MESSAGES:       import.meta.env.VITE_APPWRITE_MESSAGES_COLLECTION       || 'messages',
  VIDEO_VIEWS:    import.meta.env.VITE_APPWRITE_VIDEO_VIEWS_COLLECTION    || 'video_views',
  HASHTAGS:       import.meta.env.VITE_APPWRITE_HASHTAGS_COLLECTION       || 'hashtags',
  REPORTS:        import.meta.env.VITE_APPWRITE_REPORTS_COLLECTION        || 'reports',
  BLOCKED_USERS:  import.meta.env.VITE_APPWRITE_BLOCKED_USERS_COLLECTION  || 'blocked_users',
  ADMIN_LOGS:     import.meta.env.VITE_APPWRITE_ADMIN_LOGS_COLLECTION     || 'admin_logs',
}

// Storage Buckets
export const B = {
  VIDEOS:     import.meta.env.VITE_BUCKET_VIDEOS      || 'videos',
  THUMBNAILS: import.meta.env.VITE_BUCKET_THUMBNAILS  || 'thumbnails',
  AVATARS:    import.meta.env.VITE_BUCKET_AVATARS     || 'avatars',
  COVERS:     import.meta.env.VITE_BUCKET_COVERS      || 'covers',
  MESSAGES:   import.meta.env.VITE_BUCKET_MESSAGES    || 'messages_media',
}

// Helpers
export const uid  = () => 'unique()'
export const now  = () => new Date().toISOString()
