<template>
  <div class="notif-page">
    <div class="notif-container">
      <div class="notif-header">
        <h1>Notifications</h1>
        <button v-if="notifications.length" class="btn btn-secondary btn-sm" @click="readAll">
          Mark all read
        </button>
      </div>

      <!-- Skeleton -->
      <div v-if="loading">
        <div v-for="n in 6" :key="n" class="skeleton" style="height:72px;border-radius:12px;margin-bottom:8px"></div>
      </div>

      <!-- List -->
      <div v-else-if="notifications.length" class="notif-list">
        <div
          v-for="n in notifications" :key="n.$id"
          class="notif-item"
          :class="{ unread: !n.is_read }"
          @click="handleClick(n)"
        >
          <!-- Actor avatar -->
          <div class="notif-avatar-wrap">
            <img :src="actorMap[n.actor_id]?.avatar_url || '/default-avatar.svg'" class="avatar avatar-40" />
            <span class="notif-type-icon">{{ typeIcon(n.notification_type) }}</span>
          </div>

          <!-- Text -->
          <div class="notif-body">
            <p class="notif-text">
              <strong>{{ actorMap[n.actor_id]?.display_name || 'Someone' }}</strong>
              {{ typeText(n.notification_type) }}
              <span v-if="n.message && !n.message.includes(actorMap[n.actor_id]?.display_name)">{{ n.message }}</span>
            </p>
            <p class="notif-time text-xs text-muted">{{ timeAgo(n.created_at) }}</p>
          </div>

          <!-- Unread dot -->
          <div v-if="!n.is_read" class="dot-unread"></div>

          <!-- Thumbnail -->
          <img
            v-if="videoMap[n.video_id]?.thumbnail_url"
            :src="videoMap[n.video_id].thumbnail_url"
            class="notif-thumb"
          />
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="empty-state" style="padding:80px 20px">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <p class="font-bold">No notifications yet</p>
        <p class="text-sm text-muted">We'll let you know when something happens</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  getNotifications, markRead, markAllRead,
  subscribeNotifications
} from '@/services/notifications'
import { getProfile } from '@/services/users'
import { getVideo } from '@/services/videos'

const router = useRouter()
const auth   = useAuthStore()

const notifications = ref([])
const loading       = ref(false)
const actorMap      = ref({})
const videoMap      = ref({})
let   unsub         = null

onMounted(async () => {
  loading.value       = true
  notifications.value = await getNotifications(auth.userId, 50).catch(() => [])
  loading.value       = false

  // Preload actors + videos
  for (const n of notifications.value) {
    if (n.actor_id && !actorMap.value[n.actor_id]) {
      actorMap.value[n.actor_id] = await getProfile(n.actor_id).catch(() => null)
    }
    if (n.video_id && !videoMap.value[n.video_id]) {
      videoMap.value[n.video_id] = await getVideo(n.video_id).catch(() => null)
    }
  }

  // Real-time: prepend new notifications
  unsub = subscribeNotifications(auth.userId, async (event) => {
    if (event.events.some(e => e.includes('.create'))) {
      const n = event.payload
      notifications.value.unshift(n)
      if (n.actor_id && !actorMap.value[n.actor_id]) {
        actorMap.value[n.actor_id] = await getProfile(n.actor_id).catch(() => null)
      }
    }
  })
})

onUnmounted(() => { if (unsub) unsub() })

async function handleClick (n) {
  if (!n.is_read) {
    await markRead(n.$id)
    n.is_read = true
  }
  if      (n.video_id)    router.push(`/video/${n.video_id}`)
  else if (n.actor_id)    router.push(`/profile/${n.actor_id}`)
}

async function readAll () {
  await markAllRead(auth.userId)
  notifications.value.forEach(n => { n.is_read = true })
}

const typeIcon = (t) => ({
  like: '❤️', comment: '💬', follow: '👤', mention: '@', message: '✉️', system: '📢'
})[t] || '🔔'

const typeText = (t) => ({
  like:    'liked your video',
  comment: 'commented on your video',
  follow:  'started following you',
  mention: 'mentioned you',
  message: 'sent you a message',
  system:  'sent you a notification',
})[t] || 'interacted with you'

const timeAgo = (iso) => {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60)      return 'just now'
  if (s < 3600)    return Math.floor(s/60) + 'm ago'
  if (s < 86400)   return Math.floor(s/3600) + 'h ago'
  return            Math.floor(s/86400) + 'd ago'
}
</script>

<style scoped>
.notif-page { min-height: calc(100vh - 56px); padding-top: 72px; padding-bottom: 80px; }
.notif-container { max-width: 680px; margin: 0 auto; padding: 0 20px; }
.notif-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.notif-header h1 { font-size: 1.4rem; font-weight: 800; }
.notif-list { display: flex; flex-direction: column; gap: 4px; }
.notif-item {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: 12px;
  cursor: pointer; transition: background 0.2s; position: relative;
  border: 1px solid transparent;
}
.notif-item:hover { background: var(--bg3); }
.notif-item.unread { background: rgba(255,45,85,.05); border-color: rgba(255,45,85,.12); }
.notif-avatar-wrap { position: relative; flex-shrink: 0; }
.notif-type-icon {
  position: absolute; bottom: -2px; right: -4px;
  font-size: 14px; background: var(--bg); border-radius: 50%;
  width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
}
.notif-body { flex: 1; min-width: 0; }
.notif-text { font-size: 0.9rem; line-height: 1.4; }
.notif-time { margin-top: 2px; }
.notif-thumb {
  width: 48px; height: 48px; border-radius: 8px;
  object-fit: cover; flex-shrink: 0;
}
</style>
