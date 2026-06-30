<template>
  <div class="messages-page">
    <div class="messages-sidebar">
      <div class="messages-header">
        <h2>Messages</h2>
        <button class="btn btn-primary btn-sm" @click="showNewConv = true">New</button>
      </div>

      <!-- Search user to start chat -->
      <div v-if="showNewConv" class="new-conv-search">
        <input class="form-input w-full" v-model="searchUser" placeholder="Search users…" @input="onUserSearch" />
        <div v-if="foundUsers.length" class="user-results">
          <button v-for="u in foundUsers" :key="u.$id" class="user-result-row" @click="startConv(u)">
            <img :src="u.avatar_url || '/default-avatar.svg'" class="avatar avatar-32" />
            <span class="font-bold">{{ u.display_name }}</span>
          </button>
        </div>
      </div>

      <!-- Conversation list -->
      <div v-if="loadingConvs" class="conv-skeleton">
        <div class="skeleton" v-for="n in 5" :key="n" style="height:64px;border-radius:10px;margin-bottom:8px"></div>
      </div>
      <div v-else-if="conversations.length" class="conv-list">
        <router-link
          v-for="conv in conversations" :key="conv.$id"
          :to="`/messages/${conv.$id}`"
          class="conv-row"
          active-class="conv-active"
        >
          <img :src="getOtherParticipant(conv)?.avatar_url || '/default-avatar.svg'" class="avatar avatar-40" />
          <div class="conv-info">
            <p class="font-bold truncate">{{ getOtherParticipant(conv)?.display_name || 'User' }}</p>
            <p class="text-xs text-muted truncate">{{ conv.last_message_preview || 'Start chatting…' }}</p>
          </div>
          <span class="conv-time text-xs text-muted">{{ timeAgo(conv.updated_at) }}</span>
        </router-link>
      </div>
      <div v-else class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <p class="font-bold">No conversations</p>
        <p class="text-sm text-muted">Start chatting with someone</p>
      </div>
    </div>

    <!-- No conversation selected -->
    <div class="messages-main flex-center" style="color:var(--text3)">
      <div class="text-center">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.3;margin:0 auto 16px">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <p>Select a conversation to start chatting</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getUserConversations, getOrCreateConversation } from '@/services/messaging'
import { searchUsers, getProfile } from '@/services/users'

const router  = useRouter()
const auth    = useAuthStore()

const conversations = ref([])
const participantMap= ref({})
const loadingConvs  = ref(false)
const showNewConv   = ref(false)
const searchUser    = ref('')
const foundUsers    = ref([])

let debounce = null

onMounted(async () => {
  loadingConvs.value = true
  conversations.value = await getUserConversations(auth.userId, 30).catch(() => [])
  loadingConvs.value = false

  // Preload participant profiles
  for (const conv of conversations.value) {
    for (const id of conv.participant_ids) {
      if (id !== auth.userId && !participantMap.value[id]) {
        participantMap.value[id] = await getProfile(id).catch(() => null)
      }
    }
  }
})

function getOtherParticipant (conv) {
  const otherId = conv.participant_ids.find(id => id !== auth.userId)
  return participantMap.value[otherId]
}

function onUserSearch () {
  clearTimeout(debounce)
  debounce = setTimeout(async () => {
    if (searchUser.value.trim().length < 2) { foundUsers.value = []; return }
    foundUsers.value = await searchUsers(searchUser.value.trim(), 8).catch(() => [])
  }, 300)
}

async function startConv (user) {
  const conv = await getOrCreateConversation(auth.userId, user.$id)
  participantMap.value[user.$id] = user
  showNewConv.value = false
  searchUser.value  = ''
  foundUsers.value  = []
  router.push(`/messages/${conv.$id}`)
}

const timeAgo = (iso) => {
  if (!iso) return ''
  const d = Math.floor((Date.now()-new Date(iso))/86400000)
  const h = Math.floor((Date.now()-new Date(iso))/3600000)
  return d > 0 ? d+'d' : h > 0 ? h+'h' : 'now'
}
</script>

<style scoped>
.messages-page {
  display: grid; grid-template-columns: 340px 1fr;
  height: calc(100vh - 56px); padding-top: 56px; overflow: hidden;
}
.messages-sidebar { border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
.messages-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid var(--border); }
.messages-header h2 { font-size: 1.1rem; font-weight: 700; }
.new-conv-search { padding: 12px; border-bottom: 1px solid var(--border); }
.user-results { margin-top: 8px; }
.user-result-row { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; width: 100%; transition: background 0.2s; }
.user-result-row:hover { background: var(--bg3); }
.conv-skeleton, .conv-list, .empty-state { padding: 12px; flex: 1; overflow-y: auto; }
.conv-row { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; transition: background 0.2s; position: relative; margin-bottom: 2px; }
.conv-row:hover, .conv-active { background: var(--bg3); }
.conv-info { flex: 1; min-width: 0; }
.conv-time { flex-shrink: 0; }
.messages-main { overflow-y: auto; }
@media (max-width: 768px) {
  .messages-page { grid-template-columns: 1fr; }
  .messages-main { display: none; }
}
</style>
