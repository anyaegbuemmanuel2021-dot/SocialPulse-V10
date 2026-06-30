<template>
  <div class="profile-page" v-if="profile">
    <!-- Cover -->
    <div class="cover-wrap">
      <img v-if="profile.cover_url" :src="profile.cover_url" class="cover-img" />
      <div v-else class="cover-placeholder"></div>
    </div>

    <!-- Profile Header -->
    <div class="profile-header container">
      <div class="profile-avatar-wrap">
        <img :src="profile.avatar_url || '/default-avatar.svg'" class="profile-avatar" />
        <svg v-if="profile.verified" class="verified-badge" width="24" height="24" viewBox="0 0 24 24" fill="#667eea">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
      </div>

      <div class="profile-info">
        <h1 class="profile-name">{{ profile.display_name }}</h1>
        <p class="profile-username text-muted">@{{ profile.username }}</p>
        <p v-if="profile.bio" class="profile-bio">{{ profile.bio }}</p>
        <a v-if="profile.website" :href="profile.website" target="_blank" class="profile-website text-primary text-sm">{{ profile.website }}</a>
      </div>

      <div class="profile-stats">
        <div class="stat-item">
          <span class="stat-num">{{ fmtNum(profile.video_count) }}</span>
          <span class="stat-label">Videos</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ fmtNum(profile.follower_count) }}</span>
          <span class="stat-label">Followers</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ fmtNum(profile.following_count) }}</span>
          <span class="stat-label">Following</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ fmtNum(profile.like_count) }}</span>
          <span class="stat-label">Likes</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="profile-actions" v-if="!isSelf">
        <button class="btn btn-primary" :class="{ 'btn-outline': following }" @click="toggleFollow">
          {{ following ? 'Unfollow' : 'Follow' }}
        </button>
        <button class="btn btn-secondary" @click="sendMessage">Message</button>
        <button class="btn btn-secondary" @click="showBlockMenu = !showBlockMenu">•••</button>
        <div v-if="showBlockMenu" class="dropdown-menu">
          <button @click="toggleBlock">{{ blocked ? 'Unblock' : 'Block' }}</button>
          <button @click="report">Report</button>
        </div>
      </div>
      <div class="profile-actions" v-else>
        <router-link to="/settings" class="btn btn-secondary">Edit Profile</router-link>
      </div>
    </div>

    <!-- Videos Grid -->
    <div class="container" style="margin-top: 32px;">
      <div v-if="loadingVideos" class="video-grid">
        <div v-for="n in 6" :key="n" class="skeleton" style="aspect-ratio:9/16;border-radius:12px"></div>
      </div>
      <div v-else-if="videos.length" class="video-grid">
        <VideoCard v-for="v in videos" :key="v.$id" :video="v" />
      </div>
      <div v-else class="empty-state" style="padding:60px 20px">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="2" width="20" height="20" rx="4"/><polygon points="10,8 16,12 10,16"/>
        </svg>
        <p class="font-bold">No videos yet</p>
      </div>
    </div>
  </div>

  <!-- Loading -->
  <div v-else class="flex-center" style="min-height:60vh">
    <div class="spinner"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getProfile } from '@/services/users'
import { followUser, unfollowUser, isFollowing, blockUser, unblockUser, isBlocked, reportUser } from '@/services/users'
import { getProfileFeed } from '@/services/feed'
import { getOrCreateConversation } from '@/services/messaging'
import VideoCard from '@/components/VideoCard.vue'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const profile      = ref(null)
const videos       = ref([])
const loadingVideos= ref(false)
const following    = ref(false)
const blocked      = ref(false)
const showBlockMenu= ref(false)

const isSelf = computed(() => auth.userId === route.params.id)

onMounted(async () => {
  const id = route.params.id
  profile.value = await getProfile(id).catch(() => null)
  if (!profile.value) return

  loadingVideos.value = true
  videos.value = await getProfileFeed(id, auth.userId, 30, 0).catch(() => [])
  loadingVideos.value = false

  if (auth.userId && !isSelf.value) {
    ;[following.value, blocked.value] = await Promise.all([
      isFollowing(auth.userId, id),
      isBlocked(auth.userId, id),
    ])
  }
})

async function toggleFollow () {
  if (!auth.isAuthenticated) { router.push('/login'); return }
  const id = route.params.id
  if (following.value) { await unfollowUser(auth.userId, id); following.value = false }
  else                 { await followUser  (auth.userId, id); following.value = true  }
}

async function toggleBlock () {
  const id = route.params.id
  if (blocked.value) { await unblockUser(auth.userId, id); blocked.value = false }
  else               { await blockUser  (auth.userId, id); blocked.value = true  }
  showBlockMenu.value = false
}

async function sendMessage () {
  if (!auth.isAuthenticated) { router.push('/login'); return }
  const conv = await getOrCreateConversation(auth.userId, route.params.id)
  router.push(`/messages/${conv.$id}`)
}

async function report () {
  const reason = prompt('Reason for report:')
  if (reason) await reportUser(auth.userId, route.params.id, reason)
  showBlockMenu.value = false
  alert('Report submitted. Thank you.')
}

const fmtNum = n => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'k' : (n || 0)
</script>

<style scoped>
.profile-page { padding-top: 56px; padding-bottom: 80px; }
.cover-wrap { height: 220px; overflow: hidden; }
.cover-img { width: 100%; height: 100%; object-fit: cover; }
.cover-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, #667eea, #ff2d55); }
.container { max-width: 1000px; margin: 0 auto; padding: 0 20px; }
.profile-header {
  display: flex; flex-wrap: wrap; gap: 16px;
  align-items: flex-end; margin-top: -48px; padding-top: 0;
}
.profile-avatar-wrap { position: relative; flex-shrink: 0; }
.profile-avatar { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 4px solid var(--bg); }
.verified-badge { position: absolute; bottom: 0; right: 0; }
.profile-info { flex: 1; min-width: 0; padding-top: 56px; }
.profile-name { font-size: 1.4rem; font-weight: 800; }
.profile-username { font-size: 0.9rem; margin-bottom: 6px; }
.profile-bio     { font-size: 0.9rem; color: var(--text2); margin-bottom: 4px; }
.profile-website { display: inline-block; margin-top: 4px; }
.profile-stats {
  display: flex; gap: 20px; padding-top: 56px; flex-shrink: 0;
}
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-num  { font-size: 1.2rem; font-weight: 700; }
.stat-label{ font-size: 0.78rem; color: var(--text2); }
.profile-actions { display: flex; gap: 8px; align-items: center; padding-top: 56px; position: relative; }
.dropdown-menu {
  position: absolute; top: 100%; right: 0; z-index: 50;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 10px; box-shadow: var(--card-shadow);
  padding: 8px 0; min-width: 120px;
}
.dropdown-menu button { display: block; width: 100%; padding: 8px 16px; text-align: left; font-size: 0.9rem; }
.dropdown-menu button:hover { background: var(--bg3); }
.spinner { width: 36px; height: 36px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 640px) {
  .profile-header { flex-direction: column; align-items: center; text-align: center; }
  .profile-info, .profile-stats, .profile-actions { padding-top: 0; }
  .profile-stats { justify-content: center; }
  .profile-actions { justify-content: center; }
}
</style>
