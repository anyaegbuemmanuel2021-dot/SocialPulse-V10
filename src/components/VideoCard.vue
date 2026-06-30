<template>
  <div class="video-card" @click="goToVideo">
    <div class="video-thumb">
      <img
        v-if="video.thumbnail_url"
        :src="video.thumbnail_url"
        :alt="video.title"
        loading="lazy"
      />
      <div v-else class="thumb-placeholder">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="white" opacity="0.4">
          <polygon points="5,3 19,12 5,21"/>
        </svg>
      </div>

      <!-- Duration badge -->
      <span v-if="video.duration" class="duration-badge">{{ fmtDuration(video.duration) }}</span>

      <!-- Hover overlay -->
      <div class="video-overlay">
        <div class="video-overlay-actions">
          <!-- Like -->
          <button class="overlay-btn" @click.stop="toggleLike">
            <svg width="18" height="18" viewBox="0 0 24 24" :fill="localLiked ? '#ff2d55' : 'none'" stroke="white" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {{ fmtNum(video.like_count) }}
          </button>
          <!-- Save -->
          <button class="overlay-btn" @click.stop="toggleSave">
            <svg width="18" height="18" viewBox="0 0 24 24" :fill="localSaved ? 'white' : 'none'" stroke="white" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="video-info">
      <!-- Creator -->
      <div class="video-creator" v-if="video.creator">
        <img
          :src="video.creator.avatar_url || '/default-avatar.svg'"
          class="creator-avatar"
          :alt="video.creator.display_name"
        />
        <span class="creator-name truncate">{{ video.creator.display_name }}</span>
        <svg v-if="video.creator.verified" width="14" height="14" viewBox="0 0 24 24" fill="#667eea">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
      </div>

      <p class="video-title">{{ video.title }}</p>

      <div class="video-stats">
        <span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="display:inline;vertical-align:-1px">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          {{ fmtNum(video.view_count) }}
        </span>
        <span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="display:inline;vertical-align:-1px">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {{ fmtNum(video.like_count) }}
        </span>
        <span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-1px">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {{ fmtNum(video.comment_count) }}
        </span>
      </div>

      <!-- Hashtags -->
      <div v-if="video.hashtags?.length" class="hashtag-row">
        <span v-for="tag in video.hashtags.slice(0,3)" :key="tag" class="ht">#{{ tag }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { likeVideo, unlikeVideo, isVideoLiked } from '@/services/videos'
import { saveVideo, unsaveVideo, isVideoSaved } from '@/services/social'

const props  = defineProps({ video: { type: Object, required: true } })
const emit   = defineEmits(['liked', 'saved'])
const router = useRouter()
const auth   = useAuthStore()

const localLiked = ref(false)
const localSaved = ref(false)

onMounted(async () => {
  if (auth.userId) {
    [localLiked.value, localSaved.value] = await Promise.all([
      isVideoLiked(props.video.$id, auth.userId),
      isVideoSaved(props.video.$id, auth.userId),
    ])
  }
})

function goToVideo () { router.push(`/video/${props.video.$id}`) }

async function toggleLike (e) {
  e.stopPropagation()
  if (!auth.isAuthenticated) { router.push('/login'); return }
  const videoId = props.video.$id
  if (localLiked.value) {
    await unlikeVideo(videoId, auth.userId)
    localLiked.value = false
    emit('liked', { videoId, liked: false })
  } else {
    await likeVideo(videoId, auth.userId)
    localLiked.value = true
    emit('liked', { videoId, liked: true })
  }
}

async function toggleSave (e) {
  e.stopPropagation()
  if (!auth.isAuthenticated) { router.push('/login'); return }
  const videoId = props.video.$id
  if (localSaved.value) {
    await unsaveVideo(videoId, auth.userId)
    localSaved.value = false
  } else {
    await saveVideo(videoId, auth.userId)
    localSaved.value = true
  }
  emit('saved', { videoId, saved: localSaved.value })
}

const fmtNum = (n = 0) => n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'k' : n
const fmtDuration = (s) => { const m = Math.floor(s/60); const sec = Math.floor(s%60); return `${m}:${String(sec).padStart(2,'0')}` }
</script>

<style scoped>
.video-info { padding: 10px; }
.duration-badge {
  position: absolute; bottom: 8px; right: 8px;
  background: rgba(0,0,0,.7); color: #fff;
  font-size: 0.72rem; padding: 2px 6px; border-radius: 4px;
}
.overlay-btn {
  display: flex; align-items: center; gap: 4px;
  color: white; font-size: 0.82rem; font-weight: 600;
  background: rgba(0,0,0,.4); border-radius: 20px; padding: 4px 10px;
}
.hashtag-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.ht { font-size: 0.78rem; color: var(--secondary); }
.thumb-placeholder {
  width: 100%; height: 100%;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  display: flex; align-items: center; justify-content: center;
}
</style>
