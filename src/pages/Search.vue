<template>
  <div class="search-page">
    <div class="search-bar-wrap">
      <div class="search-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          class="search-input"
          v-model="query"
          placeholder="Search videos, users, #hashtags…"
          @input="onInput"
          autofocus
        />
        <button v-if="query" class="clear-btn" @click="query = ''; results = null">✕</button>
      </div>
    </div>

    <div class="search-content">
      <!-- Tabs -->
      <div class="search-tabs" v-if="results">
        <button v-for="t in tabs" :key="t" class="search-tab" :class="{ active: tab === t }" @click="tab = t">{{ t }}</button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex-center" style="padding:40px">
        <div class="spinner"></div>
      </div>

      <!-- Results: Videos -->
      <div v-else-if="results && tab === 'Videos'">
        <div v-if="results.videos?.length" class="video-grid">
          <VideoCard v-for="v in results.videos" :key="v.$id" :video="v" />
        </div>
        <div v-else class="empty-state"><p>No videos found for "{{ query }}"</p></div>
      </div>

      <!-- Results: Users -->
      <div v-else-if="results && tab === 'Users'">
        <div v-if="results.users?.length" class="user-list">
          <router-link
            v-for="u in results.users" :key="u.$id"
            :to="`/profile/${u.$id}`"
            class="user-row card"
          >
            <img :src="u.avatar_url || '/default-avatar.svg'" class="avatar avatar-48" />
            <div class="user-info">
              <p class="font-bold">{{ u.display_name }}</p>
              <p class="text-sm text-muted">@{{ u.username }}</p>
              <p class="text-xs text-muted">{{ fmtNum(u.follower_count) }} followers</p>
            </div>
            <svg v-if="u.verified" width="16" height="16" viewBox="0 0 24 24" fill="#667eea">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </router-link>
        </div>
        <div v-else class="empty-state"><p>No users found for "{{ query }}"</p></div>
      </div>

      <!-- No query: Discover -->
      <div v-else-if="!query">
        <div v-if="trendingTags.length">
          <h2 class="section-title">Trending Hashtags</h2>
          <div class="tags-grid">
            <button v-for="t in trendingTags" :key="t.$id" class="tag-card" @click="searchTag(t.tag)">
              <span class="tag-name">#{{ t.tag }}</span>
              <span class="tag-count text-muted text-xs">{{ fmtNum(t.usage_count) }} videos</span>
            </button>
          </div>
        </div>
        <div v-if="trending.length" class="mt-4">
          <h2 class="section-title">Trending Videos</h2>
          <div class="video-grid">
            <VideoCard v-for="v in trending" :key="v.$id" :video="v" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchVideos } from '@/services/videos'
import { searchUsers } from '@/services/users'
import { getTrendingHashtags, getTrendingFeed } from '@/services/feed'
import VideoCard from '@/components/VideoCard.vue'

const route   = useRoute()
const router  = useRouter()
const query   = ref(route.query.q || '')
const results = ref(null)
const loading = ref(false)
const tab     = ref('Videos')
const tabs    = ['Videos', 'Users']
const trendingTags = ref([])
const trending     = ref([])

let debounce = null

function onInput () {
  clearTimeout(debounce)
  debounce = setTimeout(() => doSearch(), 400)
}

async function doSearch () {
  if (!query.value.trim()) { results.value = null; return }
  loading.value = true
  const q = query.value.trim()
  router.replace({ query: { q } })
  const [v, u] = await Promise.all([
    searchVideos(q, 20).then(r => r.videos),
    searchUsers(q, 10),
  ])
  results.value = { videos: v, users: u }
  loading.value = false
}

function searchTag (tag) { query.value = '#' + tag; doSearch() }
const fmtNum = n => n >= 1000 ? (n/1000).toFixed(1)+'k' : (n || 0)

onMounted(async () => {
  trendingTags.value = await getTrendingHashtags(12).catch(() => [])
  trending.value     = await getTrendingFeed(12).catch(() => [])
  if (query.value) doSearch()
})
</script>

<style scoped>
.search-page { min-height: calc(100vh - 56px); padding-top: 56px; padding-bottom: 80px; }
.search-bar-wrap { position: sticky; top: 56px; z-index: 100; background: var(--bg); border-bottom: 1px solid var(--border); padding: 12px 20px; }
.search-bar { display: flex; align-items: center; gap: 10px; background: var(--bg3); border-radius: 24px; padding: 10px 16px; max-width: 600px; margin: 0 auto; }
.search-input { flex: 1; background: none; border: none; outline: none; font-size: 0.95rem; color: var(--text); }
.clear-btn { color: var(--text3); font-size: 1rem; }
.search-content { max-width: 1100px; margin: 0 auto; padding: 24px 20px; }
.search-tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
.search-tab { padding: 8px 20px; font-weight: 600; color: var(--text2); border-bottom: 2px solid transparent; transition: all 0.2s; }
.search-tab.active { color: var(--primary); border-bottom-color: var(--primary); }
.section-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 14px; }
.tags-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; margin-bottom: 24px; }
.tag-card { display: flex; flex-direction: column; align-items: flex-start; padding: 14px 16px; background: var(--bg3); border-radius: 12px; transition: all 0.2s; }
.tag-card:hover { background: var(--border); transform: translateY(-2px); }
.tag-name { font-weight: 700; color: var(--primary); font-size: 0.95rem; }
.user-list { display: flex; flex-direction: column; gap: 8px; }
.user-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; }
.user-info { flex: 1; min-width: 0; }
.spinner { width: 36px; height: 36px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
