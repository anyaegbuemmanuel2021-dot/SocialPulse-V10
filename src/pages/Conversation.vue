<template>
  <div class="conv-page">
    <!-- Sidebar: conversation list (reused layout) -->
    <div class="conv-sidebar">
      <div class="conv-sidebar-header">
        <router-link to="/messages" class="btn btn-secondary btn-sm">← Back</router-link>
        <h2>Messages</h2>
      </div>
    </div>

    <!-- Chat area -->
    <div class="chat-area">
      <!-- Header -->
      <div class="chat-header" v-if="otherUser">
        <router-link to="/messages" class="chat-back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </router-link>
        <router-link :to="`/profile/${otherUser.$id}`" class="chat-user">
          <img :src="otherUser.avatar_url || '/default-avatar.svg'" class="avatar avatar-40" />
          <div class="chat-user-text">
            <p class="font-bold truncate">{{ otherUser.display_name }}</p>
            <p class="text-xs text-muted truncate">@{{ otherUser.username }}</p>
          </div>
        </router-link>
      </div>

      <!-- Messages -->
      <div class="messages-list" ref="msgList">
        <div v-if="loading" class="flex-center" style="padding:40px"><div class="spinner"></div></div>
        <template v-else>
          <div
            v-for="msg in messages" :key="msg.$id"
            class="msg-row"
            :class="{ 'msg-mine': msg.sender_id === auth.userId }"
          >
            <img
              v-if="msg.sender_id !== auth.userId"
              :src="otherUser?.avatar_url || '/default-avatar.svg'"
              class="avatar avatar-32 msg-avatar"
            />
            <div class="msg-bubble">
              <p class="msg-text">{{ msg.content }}</p>
              <img v-if="msg.media_url && msg.media_type === 'image'" :src="msg.media_url" class="msg-media" />
              <span class="msg-time">{{ timeAgo(msg.created_at) }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- Input -->
      <div class="chat-input-bar">
        <input ref="mediaInput" type="file" accept="image/*" hidden @change="onMedia" />
        <button class="icon-btn" @click="mediaInput?.click()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <input
          class="chat-input"
          v-model="text"
          placeholder="Type a message…"
          @keydown.enter="send"
        />
        <button class="btn btn-primary btn-sm" :disabled="!text.trim() && !mediaFile" @click="send">Send</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getMessages, sendMessage, markConversationRead, subscribeMessages, uploadMessageMedia } from '@/services/messaging'
import { getProfile } from '@/services/users'
import { getConversation } from '@/services/messaging'

const route  = useRoute()
const auth   = useAuthStore()
const convId = route.params.id

const messages  = ref([])
const loading   = ref(false)
const text      = ref('')
const otherUser = ref(null)
const msgList   = ref(null)
const mediaInput= ref(null)
const mediaFile = ref(null)
let   unsubscribe = null

onMounted(async () => {
  loading.value = true
  messages.value = await getMessages(convId, 100).catch(() => [])
  loading.value  = false

  // Get other participant
  const conv = await getConversation(convId).catch(() => null)
  if (conv) {
    const otherId = conv.participant_ids.find(id => id !== auth.userId)
    if (otherId) otherUser.value = await getProfile(otherId).catch(() => null)
  }

  // Mark as read
  markConversationRead(convId, auth.userId)

  // Scroll to bottom
  await nextTick()
  scrollBottom()

  // Subscribe to real-time
  unsubscribe = subscribeMessages(convId, (event) => {
    if (event.events.some(e => e.includes('.create'))) {
      messages.value.push(event.payload)
      nextTick(scrollBottom)
    }
  })
})

onUnmounted(() => { if (unsubscribe) unsubscribe() })

async function send () {
  if (!text.value.trim() && !mediaFile.value) return

  let mediaUrl      = null
  let mediaType     = null
  let mediaPublicId = null

  if (mediaFile.value) {
    const r       = await uploadMessageMedia(mediaFile.value)
    mediaUrl      = r.url
    mediaPublicId = r.publicId
    mediaType     = 'image'
    mediaFile.value = null
  }

  const msg = await sendMessage(convId, auth.userId, text.value.trim() || '📷', mediaUrl, mediaType, mediaPublicId)
  text.value = ''
  // Optimistic update (realtime will also fire, deduplicate by $id)
  if (!messages.value.find(m => m.$id === msg.$id)) {
    messages.value.push(msg)
    await nextTick()
    scrollBottom()
  }
}

function onMedia (e) { mediaFile.value = e.target.files[0] }
function scrollBottom () { if (msgList.value) msgList.value.scrollTop = msgList.value.scrollHeight }
const timeAgo = (iso) => {
  if (!iso) return ''
  const m = Math.floor((Date.now()-new Date(iso))/60000)
  const h = Math.floor(m/60)
  return h > 0 ? h+'h ago' : m > 0 ? m+'m ago' : 'now'
}
</script>

<style scoped>
.conv-page { display: grid; grid-template-columns: 280px 1fr; height: calc(100vh - 56px); padding-top: 56px; overflow: hidden; }
.conv-sidebar { border-right: 1px solid var(--border); }
.conv-sidebar-header { display: flex; align-items: center; gap: 12px; padding: 16px; border-bottom: 1px solid var(--border); }
.conv-sidebar-header h2 { font-size: 1rem; font-weight: 700; }
.chat-area { display: flex; flex-direction: column; overflow: hidden; }
.chat-header { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--border); }
.chat-back-btn {
  display: none; /* only needed on mobile — desktop still has the sidebar's Back link */
  flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%;
  align-items: center; justify-content: center; color: var(--text);
}
.chat-back-btn:hover { background: var(--bg3); }
.chat-user { display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit; min-width: 0; }
.chat-user-text { min-width: 0; }
.messages-list { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.msg-row { display: flex; align-items: flex-end; gap: 8px; }
.msg-mine { flex-direction: row-reverse; }
.msg-avatar { flex-shrink: 0; }
.msg-bubble { max-width: 70%; min-width: 0; }
.msg-text { background: var(--bg3); padding: 10px 14px; border-radius: 18px; border-bottom-left-radius: 4px; font-size: 0.9rem; line-height: 1.5; overflow-wrap: break-word; word-break: break-word; }
.msg-mine .msg-text { background: var(--primary); color: white; border-radius: 18px; border-bottom-right-radius: 4px; }
.msg-media { max-width: 200px; border-radius: 10px; margin-top: 6px; }
.msg-time { font-size: 0.7rem; color: var(--text3); margin-top: 2px; display: block; }
.msg-mine .msg-time { text-align: right; }
.chat-input-bar { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border); }
.chat-input { flex: 1; background: var(--bg3); border: none; border-radius: 20px; padding: 10px 16px; font-size: 0.9rem; color: var(--text); outline: none; }
.icon-btn { color: var(--text2); transition: color 0.2s; }
.icon-btn:hover { color: var(--primary); }
.spinner { width: 36px; height: 36px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 768px) {
  .conv-page { grid-template-columns: 1fr; }
  .conv-sidebar { display: none; }
  .chat-back-btn { display: flex; }
}
</style>
