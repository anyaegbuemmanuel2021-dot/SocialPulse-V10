<template>
  <div class="page-with-sidebar">
    <!-- Sidebar -->
    <aside class="sidebar">
      <nav>
        <router-link to="/"             class="sidebar-link" active-class="active"><IconHome/> Home</router-link>
        <router-link to="/search"       class="sidebar-link" active-class="active"><IconSearch/> Discover</router-link>
        <router-link v-if="auth.isAuthenticated" to="/upload"        class="sidebar-link" active-class="active"><IconPlus/> Upload</router-link>
        <router-link v-if="auth.isAuthenticated" to="/messages"      class="sidebar-link" active-class="active"><IconMsg/> Messages</router-link>
        <router-link v-if="auth.isAuthenticated" to="/notifications"  class="sidebar-link" active-class="active"><IconBell/> Notifications</router-link>
        <router-link v-if="auth.isAuthenticated" :to="`/profile/${auth.userId}`" class="sidebar-link" active-class="active"><IconUser/> Profile</router-link>
        <router-link v-if="auth.isAuthenticated" to="/settings"      class="sidebar-link" active-class="active"><IconSettings/> Settings</router-link>
      </nav>

      <div class="divider"/>

      <!-- Trending hashtags -->
      <div v-if="trendingTags.length">
        <p class="sidebar-section-title">Trending</p>
        <button
          v-for="tag in trendingTags" :key="tag.$id"
          class="tag-pill"
          @click="setHashtag(tag.tag)"
        >#{{ tag.tag }}
          <span class="tag-count">{{ fmtNum(tag.usage_count) }}</span>
        </button>
      </div>

      <div class="divider"/>

      <!-- Suggested creators -->
      <div v-if="suggestedCreators.length">
        <p class="sidebar-section-title">Creators to follow</p>
        <router-link
          v-for="c in suggestedCreators" :key="c.$id"
          :to="`/profile/${c.$id}`"
          class="creator-row"
        >
          <img :src="c.avatar_url || '/default-avatar.svg'" class="avatar avatar-32" :alt="c.display_name" />
          <div class="creator-info">
            <span class="creator-name truncate">{{ c.display_name }}</span>
            <span class="text-xs text-muted">{{ fmtNum(c.follower_count) }} followers</span>
          </div>
        </router-link>
      </div>
    </aside>

    <!-- Feed -->
    <main class="main-content feed-main">
      <!-- Feed Tabs -->
      <div class="feed-tabs">
        <button
          v-for="tab in tabs" :key="tab.id"
          class="feed-tab"
          :class="{ active: activeTab === tab.id }"
          @click="switchTab(tab.id)"
        >{{ tab.label }}</button>
      </div>

      <!-- Hashtag banner -->
      <div v-if="activeTab === 'hashtag'" class="hashtag-banner">
        <span>#{{ currentHashtag }}</span>
        <button class="btn btn-sm btn-secondary" @click="clearHashtag">✕ Clear</button>
      </div>

      <!-- Loading skeletons -->
      <div v-if="loading && videos.length === 0" class="video-grid">
        <div v-for="n in 8" :key="n" class="skeleton-card">
          <div class="skeleton" style="aspect-ratio:9/16;border-radius:12px;margin-bottom:8px"></div>
          <div class="skeleton" style="height:14px;width:80%;border-radius:6px;margin-bottom:6px"></div>
          <div class="skeleton" style="height:12px;width:50%;border-radius:6px"></div>
        </div>
      </div>

      <!-- Video grid -->
      <div v-else-if="videos.length" class="video-grid">
        <VideoCard
          v-for="v in videos" :key="v.$id"
          :video="v"
          @liked="handleLike"
          @saved="handleSave"
        />
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="2" width="20" height="20" rx="4"/>
          <polygon points="10,8 16,12 10,16"/>
        </svg>
        <p class="font-bold">No videos yet</p>
        <p class="text-sm">{{ activeTab === 'following' ? 'Follow creators to see their videos here' : 'Be the first to upload!' }}</p>
        <router-link v-if="!auth.isAuthenticated" to="/register" class="btn btn-primary mt-4">Get Started</router-link>
      </div>

      <!-- Load more -->
      <div v-if="videos.length && hasMore" class="load-more">
        <button class="btn btn-secondary" :disabled="loading" @click="loadMore">
          {{ loading ? 'Loading…' : 'Load more' }}
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, shallowRef } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getForYouFeed, getFollowingFeed, getTrendingFeed, getHashtagFeed, getTrendingHashtags, getTrendingCreators } from '@/services/feed'
import { likeVideo, unlikeVideo, isVideoLiked } from '@/services/videos'
import { saveVideo, unsaveVideo } from '@/services/social'
import VideoCard from '@/components/VideoCard.vue'

/* ─ SVG icon components ─ */
const IconHome     = { template: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>` }
const IconSearch   = { template: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>` }
const IconPlus     = { template: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>` }
const IconMsg      = { template: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>` }
const IconBell     = { template: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>` }
const IconUser     = { template: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="5"/><path d="M12 14c-5 0-8 2.5-8 4v2h16v-2c0-1.5-3-4-8-4z"/></svg>` }
const IconSettings = { template: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>` }

const auth = useAuthStore()

const tabs = [
  { id: 'foryou',    label: 'For You' },
  { id: 'following', label: 'Following' },
  { id: 'trending',  label: 'Trending' },
]

const activeTab       = ref('foryou')
const videos          = ref([])
const loading         = ref(false)
const hasMore         = ref(true)
const offset          = ref(0)
const currentHashtag  = ref('')
const trendingTags    = ref([])
const suggestedCreators = ref([])
const LIMIT = 20

async function fetchVideos (reset = true) {
  if (loading.value || (!hasMore.value && !reset)) return
  loading.value = true
  if (reset) { videos.value = []; offset.value = 0; hasMore.value = true }

  try {
    let result = []
    switch (activeTab.value) {
      case 'following':
        result = await getFollowingFeed(auth.userId, LIMIT, offset.value)
        break
      case 'trending':
        result = await getTrendingFeed(LIMIT, offset.value)
        break
      case 'hashtag':
        result = await getHashtagFeed(currentHashtag.value, LIMIT, offset.value)
        break
      default:
        result = await getForYouFeed(LIMIT, offset.value)
    }
    if (result.length < LIMIT) hasMore.value = false
    videos.value  = reset ? result : [...videos.value, ...result]
    offset.value += result.length
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function switchTab (id) { activeTab.value = id; fetchVideos(true) }
function setHashtag (tag) { currentHashtag.value = tag; activeTab.value = 'hashtag'; fetchVideos(true) }
function clearHashtag  () { currentHashtag.value = ''; activeTab.value = 'foryou'; fetchVideos(true) }
function loadMore      () { fetchVideos(false) }
function fmtNum (n = 0) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n }

function handleLike ({ videoId, liked }) {
  const v = videos.value.find(v => v.$id === videoId)
  if (v) v.like_count = Math.max(0, (v.like_count || 0) + (liked ? 1 : -1))
}
function handleSave ({ videoId, saved }) { /* UI already updated inside VideoCard */ }

onMounted(async () => {
  fetchVideos()
  trendingTags.value       = await getTrendingHashtags(10).catch(() => [])
  suggestedCreators.value  = await getTrendingCreators(5).catch(() => [])
})
</script>

<style scoped>
.feed-main { padding-bottom: 80px; }
.feed-tabs {
  display: flex; gap: 4px; margin-bottom: 20px;
  border-bottom: 1px solid var(--border); padding-bottom: 0;
}
.feed-tab {
  padding: 10px 20px; font-weight: 600; color: var(--text2);
  border-bottom: 2px solid transparent; transition: all 0.2s;
  font-size: 0.95rem;
}
.feed-tab:hover { color: var(--text); }
.feed-tab.active { color: var(--primary); border-bottom-color: var(--primary); }

.hashtag-banner {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; background: var(--bg3); border-radius: 10px;
  margin-bottom: 16px; font-weight: 700; font-size: 1rem; color: var(--primary);
}

.sidebar-section-title {
  font-size: 0.78rem; font-weight: 700; color: var(--text3);
  text-transform: uppercase; letter-spacing: 0.05em;
  padding: 0 4px; margin-bottom: 8px;
}
.tag-pill {
  display: flex; justify-content: space-between; align-items: center;
  width: 100%; padding: 6px 10px; border-radius: 8px;
  font-size: 0.88rem; color: var(--primary); font-weight: 600;
  transition: background 0.2s; margin-bottom: 4px;
}
.tag-pill:hover { background: var(--bg3); }
.tag-count { font-size: 0.75rem; color: var(--text3); font-weight: 400; }

.creator-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 4px; border-radius: 8px; transition: background 0.2s;
  margin-bottom: 4px;
}
.creator-row:hover { background: var(--bg3); }
.creator-info { display: flex; flex-direction: column; min-width: 0; }
.creator-name { font-size: 0.88rem; font-weight: 600; }

.load-more { text-align: center; margin-top: 24px; }

.skeleton-card { overflow: hidden; }
</style>
