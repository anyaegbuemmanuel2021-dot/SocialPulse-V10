/**
 * SocialPulse V10 — Appwrite Collection Schema Definitions
 * Used by the setup script to create all collections automatically.
 */

export const DB_ID = process.env.APPWRITE_DATABASE_ID || 'socialpulse_db'

// ── Collection IDs ────────────────────────────────────────────────────────────
export const COL = {
  USERS:          'users',
  VIDEOS:         'videos',
  COMMENTS:       'comments',
  LIKES:          'likes',
  FOLLOWS:        'follows',
  SAVES:          'saves',
  NOTIFICATIONS:  'notifications',
  CONVERSATIONS:  'conversations',
  MESSAGES:       'messages',
  VIDEO_VIEWS:    'video_views',
  HASHTAGS:       'hashtags',
  REPORTS:        'reports',
  BLOCKED_USERS:  'blocked_users',
  ADMIN_LOGS:     'admin_logs',
}

// ── Bucket IDs ────────────────────────────────────────────────────────────────
export const BUCK = {
  VIDEOS:     'videos',
  THUMBNAILS: 'thumbnails',
  AVATARS:    'avatars',
  COVERS:     'covers',
  MESSAGES:   'messages_media',
}

// ── Schema Definitions ────────────────────────────────────────────────────────
// Each entry: { key, type, required, size?, array?, default? }

export const SCHEMAS = {

  [COL.USERS]: {
    attributes: [
      { key: 'user_id',         type: 'string',   required: true,  size: 36   },
      { key: 'email',           type: 'string',   required: true,  size: 255  },
      { key: 'username',        type: 'string',   required: true,  size: 50   },
      { key: 'display_name',    type: 'string',   required: true,  size: 100  },
      { key: 'bio',             type: 'string',   required: false, size: 500  },
      { key: 'avatar_url',      type: 'string',   required: false, size: 1024 },
      { key: 'cover_url',       type: 'string',   required: false, size: 1024 },
      { key: 'website',         type: 'string',   required: false, size: 500  },
      { key: 'verified',        type: 'boolean',  required: false },
      { key: 'is_private',      type: 'boolean',  required: false },
      { key: 'is_disabled',     type: 'boolean',  required: false },
      { key: 'is_suspended',    type: 'boolean',  required: false },
      { key: 'disabled_reason', type: 'string',   required: false, size: 500 },
      { key: 'suspended_reason',type: 'string',   required: false, size: 500 },
      { key: 'suspended_until', type: 'datetime', required: false },
      { key: 'follower_count',  type: 'integer',  required: false },
      { key: 'following_count', type: 'integer',  required: false },
      { key: 'video_count',     type: 'integer',  required: false },
      { key: 'like_count',      type: 'integer',  required: false },
      { key: 'created_at',      type: 'datetime', required: true  },
      { key: 'updated_at',      type: 'datetime', required: false },
      { key: 'last_login',      type: 'datetime', required: false },
    ],
    indexes: [
      { key: 'idx_username',  type: 'unique', attributes: ['username']  },
      { key: 'idx_email',     type: 'unique', attributes: ['email']     },
      { key: 'idx_created',   type: 'key',    attributes: ['created_at'] },
      { key: 'idx_followers', type: 'key',    attributes: ['follower_count'] },
    ],
  },

  [COL.VIDEOS]: {
    attributes: [
      { key: 'user_id',       type: 'string',   required: true,  size: 36   },
      { key: 'title',         type: 'string',   required: true,  size: 255  },
      { key: 'description',   type: 'string',   required: false, size: 2000 },
      { key: 'video_url',     type: 'string',   required: true,  size: 2048 },
      { key: 'thumbnail_url', type: 'string',   required: false, size: 2048 },
      { key: 'duration',      type: 'double',   required: false },
      { key: 'hashtags',      type: 'string',   required: false, size: 50,   array: true },
      { key: 'mentions',      type: 'string',   required: false, size: 50,   array: true },
      { key: 'visibility',    type: 'string',   required: false, size: 20   },
      { key: 'is_draft',      type: 'boolean',  required: false },
      { key: 'scheduled_at',  type: 'datetime', required: false },
      { key: 'like_count',    type: 'integer',  required: false },
      { key: 'comment_count', type: 'integer',  required: false },
      { key: 'view_count',    type: 'integer',  required: false },
      { key: 'share_count',   type: 'integer',  required: false },
      { key: 'created_at',    type: 'datetime', required: true  },
      { key: 'updated_at',    type: 'datetime', required: false },
    ],
    indexes: [
      { key: 'idx_user',        type: 'key',      attributes: ['user_id']    },
      { key: 'idx_created',     type: 'key',      attributes: ['created_at'] },
      { key: 'idx_views',       type: 'key',      attributes: ['view_count'] },
      { key: 'idx_likes',       type: 'key',      attributes: ['like_count'] },
      { key: 'idx_visibility',  type: 'key',      attributes: ['visibility'] },
      { key: 'idx_draft',       type: 'key',      attributes: ['is_draft']   },
      { key: 'idx_title',       type: 'fulltext', attributes: ['title']      },
      { key: 'idx_description', type: 'fulltext', attributes: ['description']},
    ],
  },

  [COL.COMMENTS]: {
    attributes: [
      { key: 'video_id',          type: 'string',   required: true,  size: 36   },
      { key: 'user_id',           type: 'string',   required: true,  size: 36   },
      { key: 'parent_comment_id', type: 'string',   required: false, size: 36   },
      { key: 'content',           type: 'string',   required: true,  size: 1000 },
      { key: 'mentions',          type: 'string',   required: false, size: 50,  array: true },
      { key: 'like_count',        type: 'integer',  required: false },
      { key: 'reply_count',       type: 'integer',  required: false },
      { key: 'created_at',        type: 'datetime', required: true  },
      { key: 'updated_at',        type: 'datetime', required: false },
    ],
    indexes: [
      { key: 'idx_video',   type: 'key', attributes: ['video_id']          },
      { key: 'idx_user',    type: 'key', attributes: ['user_id']           },
      { key: 'idx_parent',  type: 'key', attributes: ['parent_comment_id'] },
      { key: 'idx_created', type: 'key', attributes: ['created_at']        },
    ],
  },

  [COL.LIKES]: {
    attributes: [
      { key: 'user_id',    type: 'string',   required: true,  size: 36 },
      { key: 'video_id',   type: 'string',   required: false, size: 36 },
      { key: 'comment_id', type: 'string',   required: false, size: 36 },
      { key: 'like_type',  type: 'string',   required: true,  size: 20 },
      { key: 'created_at', type: 'datetime', required: true  },
    ],
    indexes: [
      { key: 'idx_user',    type: 'key', attributes: ['user_id']    },
      { key: 'idx_video',   type: 'key', attributes: ['video_id']   },
      { key: 'idx_comment', type: 'key', attributes: ['comment_id'] },
      { key: 'idx_type',    type: 'key', attributes: ['like_type']  },
    ],
  },

  [COL.FOLLOWS]: {
    attributes: [
      { key: 'follower_id',  type: 'string',   required: true, size: 36 },
      { key: 'following_id', type: 'string',   required: true, size: 36 },
      { key: 'created_at',   type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'idx_follower',  type: 'key', attributes: ['follower_id']  },
      { key: 'idx_following', type: 'key', attributes: ['following_id'] },
    ],
  },

  [COL.SAVES]: {
    attributes: [
      { key: 'user_id',    type: 'string',   required: true, size: 36 },
      { key: 'video_id',   type: 'string',   required: true, size: 36 },
      { key: 'created_at', type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'idx_user',  type: 'key', attributes: ['user_id']  },
      { key: 'idx_video', type: 'key', attributes: ['video_id'] },
    ],
  },

  [COL.NOTIFICATIONS]: {
    attributes: [
      { key: 'user_id',           type: 'string',   required: true,  size: 36  },
      { key: 'actor_id',          type: 'string',   required: true,  size: 36  },
      { key: 'notification_type', type: 'string',   required: true,  size: 30  },
      { key: 'video_id',          type: 'string',   required: false, size: 36  },
      { key: 'comment_id',        type: 'string',   required: false, size: 36  },
      { key: 'message',           type: 'string',   required: false, size: 500 },
      { key: 'is_read',           type: 'boolean',  required: false },
      { key: 'created_at',        type: 'datetime', required: true  },
    ],
    indexes: [
      { key: 'idx_user',    type: 'key', attributes: ['user_id']   },
      { key: 'idx_read',    type: 'key', attributes: ['is_read']   },
      { key: 'idx_created', type: 'key', attributes: ['created_at']},
    ],
  },

  [COL.CONVERSATIONS]: {
    attributes: [
      { key: 'participant_ids',  type: 'string',   required: true,  size: 36, array: true },
      { key: 'last_message_id',  type: 'string',   required: false, size: 36  },
      { key: 'last_message_at',  type: 'datetime', required: false },
      { key: 'created_at',       type: 'datetime', required: true  },
      { key: 'updated_at',       type: 'datetime', required: false },
    ],
    indexes: [
      { key: 'idx_updated', type: 'key', attributes: ['updated_at'] },
    ],
  },

  [COL.MESSAGES]: {
    attributes: [
      { key: 'conversation_id', type: 'string',   required: true,  size: 36   },
      { key: 'sender_id',       type: 'string',   required: true,  size: 36   },
      { key: 'content',         type: 'string',   required: true,  size: 4000 },
      { key: 'media_url',       type: 'string',   required: false, size: 2048 },
      { key: 'media_type',      type: 'string',   required: false, size: 20   },
      { key: 'is_read',         type: 'boolean',  required: false },
      { key: 'read_at',         type: 'datetime', required: false },
      { key: 'created_at',      type: 'datetime', required: true  },
    ],
    indexes: [
      { key: 'idx_conv',    type: 'key', attributes: ['conversation_id'] },
      { key: 'idx_sender',  type: 'key', attributes: ['sender_id']      },
      { key: 'idx_created', type: 'key', attributes: ['created_at']     },
      { key: 'idx_read',    type: 'key', attributes: ['is_read']        },
    ],
  },

  [COL.VIDEO_VIEWS]: {
    attributes: [
      { key: 'video_id',      type: 'string',   required: true,  size: 36 },
      { key: 'user_id',       type: 'string',   required: false, size: 36 },
      { key: 'view_duration', type: 'integer',  required: false },
      { key: 'created_at',    type: 'datetime', required: true  },
    ],
    indexes: [
      { key: 'idx_video',   type: 'key', attributes: ['video_id']  },
      { key: 'idx_user',    type: 'key', attributes: ['user_id']   },
      { key: 'idx_created', type: 'key', attributes: ['created_at']},
    ],
  },

  [COL.HASHTAGS]: {
    attributes: [
      { key: 'tag',         type: 'string',   required: true, size: 100 },
      { key: 'usage_count', type: 'integer',  required: false },
      { key: 'created_at',  type: 'datetime', required: true  },
      { key: 'updated_at',  type: 'datetime', required: false },
    ],
    indexes: [
      { key: 'idx_tag',   type: 'unique', attributes: ['tag']         },
      { key: 'idx_usage', type: 'key',    attributes: ['usage_count'] },
    ],
  },

  [COL.REPORTS]: {
    attributes: [
      { key: 'reporter_id',       type: 'string',   required: true,  size: 36   },
      { key: 'reported_user_id',  type: 'string',   required: false, size: 36   },
      { key: 'reported_video_id', type: 'string',   required: false, size: 36   },
      { key: 'reported_comment_id',type:'string',   required: false, size: 36   },
      { key: 'report_type',       type: 'string',   required: true,  size: 20   },
      { key: 'reason',            type: 'string',   required: true,  size: 1000 },
      { key: 'status',            type: 'string',   required: false, size: 20   },
      { key: 'admin_notes',       type: 'string',   required: false, size: 1000 },
      { key: 'created_at',        type: 'datetime', required: true  },
      { key: 'reviewed_at',       type: 'datetime', required: false },
    ],
    indexes: [
      { key: 'idx_status',   type: 'key', attributes: ['status']     },
      { key: 'idx_reporter', type: 'key', attributes: ['reporter_id']},
      { key: 'idx_created',  type: 'key', attributes: ['created_at'] },
    ],
  },

  [COL.BLOCKED_USERS]: {
    attributes: [
      { key: 'blocker_id',  type: 'string',   required: true, size: 36 },
      { key: 'blocked_id',  type: 'string',   required: true, size: 36 },
      { key: 'created_at',  type: 'datetime', required: true },
    ],
    indexes: [
      { key: 'idx_blocker', type: 'key', attributes: ['blocker_id'] },
      { key: 'idx_blocked', type: 'key', attributes: ['blocked_id'] },
    ],
  },

  [COL.ADMIN_LOGS]: {
    attributes: [
      { key: 'admin_id',      type: 'string',   required: true,  size: 36   },
      { key: 'action',        type: 'string',   required: true,  size: 100  },
      { key: 'resource_type', type: 'string',   required: true,  size: 50   },
      { key: 'resource_id',   type: 'string',   required: true,  size: 36   },
      { key: 'changes',       type: 'string',   required: false, size: 4000 },
      { key: 'created_at',    type: 'datetime', required: true  },
    ],
    indexes: [
      { key: 'idx_admin',   type: 'key', attributes: ['admin_id']   },
      { key: 'idx_action',  type: 'key', attributes: ['action']     },
      { key: 'idx_created', type: 'key', attributes: ['created_at'] },
    ],
  },
}

// ── Storage Bucket Definitions ─────────────────────────────────────────────────
export const BUCKET_DEFS = [
  { id: BUCK.VIDEOS,     name: 'Videos',           maxSize: 5368709120, types: ['video/mp4','video/webm','video/quicktime','video/x-msvideo'] },
  { id: BUCK.THUMBNAILS, name: 'Thumbnails',        maxSize: 10485760,  types: ['image/jpeg','image/png','image/webp'] },
  { id: BUCK.AVATARS,    name: 'Avatars',           maxSize: 5242880,   types: ['image/jpeg','image/png','image/webp','image/gif'] },
  { id: BUCK.COVERS,     name: 'Cover Photos',      maxSize: 10485760,  types: ['image/jpeg','image/png','image/webp'] },
  { id: BUCK.MESSAGES,   name: 'Message Media',     maxSize: 52428800,  types: ['image/jpeg','image/png','image/webp','application/pdf'] },
]
