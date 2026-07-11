<template>
  <div ref="reelEl" class="reel">
    <!-- Video -->
    <video
      v-if="video.media_type !== 'image'"
      ref="videoEl"
      class="reel-media"
      :src="video.video_url"
      :poster="video.thumbnail_url || undefined"
      loop
      muted
      playsinline
      preload="metadata"
      @click="onTap"
      @dblclick="onDoubleTap"
      @waiting="buffering = true"
      @playing="buffering = false"
      @canplay="buffering = false"
    ></video>

    <!-- Image post -->
    <img
      v-else
      class="reel-media reel-image"
      :src="video.video_url"
      :alt="video.title"
      @click="onDoubleTapImage"
    />

    <!-- Buffer spinner -->
    <div v-if="buffering && video.media_type !== 'image'" class="reel-spinner"><span></span></div>

    <!-- Mute indicator (video only) -->
    <transition name="pop">
      <div v-if="showMuteHint && video.media_type !== 'image'" class="reel-mute-hint">
        <svg v-if="muted" width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M11 5 6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14l-1.41-1.41a8 8 0 0 0 0-11.32z"/></svg>
        <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M11 5 6 9H2v6h4l5 4z"/><line x1="23" y1="9" x2="17" y2="15" stroke="white" stroke-width="2"/><line x1="17" y1="9" x2="23" y2="15" stroke="white" stroke-width="2"/></svg>
      </div>
    </transition>

    <!-- Double-tap like burst -->
    <transition name="heart-pop">
      <svg v-if="showHeart" class="reel-heart-burst" width="90" height="90" viewBox="0 0 24 24" fill="#ff2d55">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </transition>

    <!-- Gradient overlay + info -->
    <div class="reel-overlay">
      <div class="reel-info">
        <router-link v-if="video.creator" :to="`/profile/${video.creator.$id}`" class="reel-creator" @click.stop>
          <img :src="video.creator.avatar_url || '/default-avatar.svg'" class="reel-avatar" :alt="video.creator.display_name" />
          <span class="reel-creator-name">{{ video.creator.display_name }}</span>
          <svg v-if="video.creator.verified" width="14" height="14" viewBox="0 0 24 24" fill="#667eea">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        </router-link>
        <p v-if="video.title" class="reel-title">{{ video.title }}</p>
        <div v-if="video.hashtags?.length" class="reel-hashtags">
          <span v-for="tag in video.hashtags.slice(0,3)" :key="tag">#{{ tag }}</span>
        </div>
      </div>

      <div class="reel-actions">
        <button class="reel-action-btn" @click.stop="toggleLike">
          <svg width="30" height="30" viewBox="0 0 24 24" :fill="localLiked ? '#ff2d55' : 'none'" stroke="white" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>{{ fmtNum(video.like_count) }}</span>
        </button>
        <button class="reel-action-btn" @click.stop="goToVideo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>{{ fmtNum(video.comment_count) }}</span>
        </button>
        <button class="reel-action-btn" @click.stop="toggleSave">
          <svg width="28" height="28" viewBox="0 0 24 24" :fill="localSaved ? 'white' : 'none'" stroke="white" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { likeVideo, unlikeVideo, isVideoLiked } from '@/services/videos'
import { saveVideo, unsaveVideo, isVideoSaved } from '@/services/social'

const props  = defineProps({ video: { type: Object, required: true } })
const emit   = defineEmits(['liked', 'saved', 'in-view'])
const router = useRouter()
const auth   = useAuthStore()

const reelEl  = ref(null)
const videoEl = ref(null)
const muted   = ref(true)
const buffering    = ref(false)
const showMuteHint = ref(false)
const showHeart     = ref(false)
const localLiked = ref(false)
const localSaved = ref(false)

let observer = null
let muteHintTimer = null
let heartTimer = null

onMounted(async () => {
  if (auth.userId) {
    [localLiked.value, localSaved.value] = await Promise.all([
      isVideoLiked(props.video.$id, auth.userId),
      isVideoSaved(props.video.$id, auth.userId),
    ])
  }

  // Only the reel that's mostly on-screen plays — this is what guarantees
  // a single active video at a time in the vertical feed.
  observer = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
      emit('in-view')
      if (videoEl.value) {
        videoEl.value.play().catch(() => { /* autoplay can be blocked until user interacts once */ })
      }
    } else {
      videoEl.value?.pause()
    }
  }, { threshold: [0, 0.6, 1] })

  if (reelEl.value) observer.observe(reelEl.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(muteHintTimer)
  clearTimeout(heartTimer)
})

function onTap () {
  if (!videoEl.value) return
  muted.value = !muted.value
  videoEl.value.muted = muted.value
  showMuteHint.value = true
  clearTimeout(muteHintTimer)
  muteHintTimer = setTimeout(() => { showMuteHint.value = false }, 500)
}

function onDoubleTap () { burstHeart(); if (!localLiked.value) toggleLike() }
function onDoubleTapImage () { burstHeart(); if (!localLiked.value) toggleLike() }

function burstHeart () {
  showHeart.value = true
  clearTimeout(heartTimer)
  heartTimer = setTimeout(() => { showHeart.value = false }, 700)
}

function goToVideo () { router.push(`/video/${props.video.$id}`) }

async function toggleLike () {
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

async function toggleSave () {
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
</script>

<style scoped>
.reel {
  position: relative;
  height: 100%;
  width: 100%;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  background: #000;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.reel-media {
  width: 100%; height: 100%;
  object-fit: contain;
  background: #000;
}
@media (max-width: 900px) {
  .reel-media { object-fit: cover; } /* TikTok-style full-bleed fill on phones */
}
.reel-image { object-fit: contain; cursor: pointer; }
.reel-media[src] { cursor: pointer; }

.reel-spinner {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.reel-spinner span {
  width: 36px; height: 36px; border-radius: 50%;
  border: 3px solid rgba(255,255,255,.25); border-top-color: #fff;
  animation: reel-spin 0.8s linear infinite;
}
@keyframes reel-spin { to { transform: rotate(360deg); } }

.reel-mute-hint {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 64px; height: 64px; border-radius: 50%;
  background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.reel-heart-burst {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  filter: drop-shadow(0 2px 8px rgba(0,0,0,.4));
  pointer-events: none;
}
.pop-enter-active, .pop-leave-active { transition: opacity 0.2s, transform 0.2s; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }

.heart-pop-enter-active { transition: transform 0.35s cubic-bezier(.17,.89,.32,1.49), opacity 0.35s; }
.heart-pop-leave-active { transition: opacity 0.3s; }
.heart-pop-enter-from { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
.heart-pop-leave-to { opacity: 0; }

.reel-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: flex-end; justify-content: space-between;
  padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(to top, rgba(0,0,0,.55) 0%, rgba(0,0,0,.15) 30%, transparent 55%);
  pointer-events: none;
}
.reel-overlay > * { pointer-events: auto; }

@media (max-width: 900px) {
  /* Clear the floating bottom nav (56px) that now sits on top of the video */
  .reel-overlay { padding-bottom: calc(56px + 20px + env(safe-area-inset-bottom, 0px)); }
}

.reel-info { max-width: 78%; color: #fff; }
.reel-creator { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.reel-avatar { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; border: 1.5px solid rgba(255,255,255,.8); }
.reel-creator-name { font-weight: 700; font-size: 0.95rem; }
.reel-title { font-size: 0.9rem; line-height: 1.35; margin-bottom: 6px; word-break: break-word; }
.reel-hashtags { display: flex; flex-wrap: wrap; gap: 6px; font-size: 0.85rem; opacity: 0.9; }

.reel-actions { display: flex; flex-direction: column; align-items: center; gap: 18px; }
.reel-action-btn {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  color: #fff; font-size: 0.75rem; font-weight: 600;
  filter: drop-shadow(0 1px 3px rgba(0,0,0,.5));
  transition: transform 0.15s;
}
.reel-action-btn:active { transform: scale(0.85); }
</style>
