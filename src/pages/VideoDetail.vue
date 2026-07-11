<template>
  <div class="video-detail-page" v-if="video">
    <div class="vd-container">

      <!-- LEFT: Video Player -->
      <div class="vd-player-col">
        <div class="player-wrap">
          <video
            v-if="video.media_type !== 'image'"
            ref="videoEl"
            :src="video.video_url"
            :poster="video.thumbnail_url"
            class="player-video"
            controls
            playsinline
            @timeupdate="onTimeUpdate"
            @ended="onEnded"
          ></video>
          <img
            v-else
            :src="video.video_url"
            :alt="video.title"
            class="player-video"
          />
        </div>

        <!-- Meta under video -->
        <div class="vd-meta">
          <router-link v-if="video.creator" :to="`/profile/${video.user_id}`" class="creator-row">
            <img :src="video.creator?.avatar_url || '/default-avatar.svg'" class="avatar avatar-40" />
            <div>
              <p class="font-bold">{{ video.creator?.display_name }}</p>
              <p class="text-xs text-muted">@{{ video.creator?.username }}</p>
            </div>
            <svg v-if="video.creator?.verified" width="16" height="16" viewBox="0 0 24 24" fill="#667eea" style="flex-shrink:0">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </router-link>

          <h1 class="vd-title">{{ video.title }}</h1>
          <p v-if="video.description" class="vd-desc">{{ video.description }}</p>

          <div v-if="video.hashtags?.length" class="hashtag-row mt-2">
            <span v-for="tag in video.hashtags" :key="tag" class="ht">#{{ tag }}</span>
          </div>

          <!-- Action Bar -->
          <div class="action-bar">
            <button class="action-btn" :class="{ liked }" @click="toggleLike">
              <svg width="22" height="22" viewBox="0 0 24 24" :fill="liked?'#ff2d55':'none'" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span>{{ fmtNum(video.like_count) }}</span>
            </button>
            <button class="action-btn" :class="{ saved }" @click="toggleSave">
              <svg width="22" height="22" viewBox="0 0 24 24" :fill="saved?'currentColor':'none'" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              <span>Save</span>
            </button>
            <button class="action-btn" @click="copyLink">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <span>Share</span>
            </button>
            <button v-if="isOwner" class="action-btn" @click="deleteVideo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              <span>Delete</span>
            </button>
          </div>

          <div class="vd-stats">
            <span>{{ fmtNum(video.view_count) }} views</span>
            <span>·</span>
            <span>{{ fmtNum(video.comment_count) }} comments</span>
            <span>·</span>
            <span>{{ timeAgo(video.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- RIGHT: Comments -->
      <div class="vd-comments-col">
        <h2 class="comments-title">Comments</h2>

        <!-- Add comment -->
        <div v-if="auth.isAuthenticated" class="add-comment">
          <img :src="auth.profile?.avatar_url || '/default-avatar.svg'" class="avatar avatar-32" />
          <div class="comment-input-wrap">
            <input
              class="form-input comment-input"
              v-model="commentText"
              placeholder="Add a comment…"
              @keydown.enter="submitComment"
            />
            <button class="btn btn-primary btn-sm" :disabled="!commentText.trim()" @click="submitComment">Post</button>
          </div>
        </div>
        <div v-else class="login-prompt">
          <router-link to="/login" class="btn btn-outline btn-sm">Login to comment</router-link>
        </div>

        <!-- Comment list -->
        <div class="comment-list">
          <div v-if="loadingComments" class="loading-row">
            <div class="skeleton" style="height:60px;border-radius:10px;margin-bottom:8px" v-for="n in 4" :key="n"></div>
          </div>

          <div v-else-if="comments.length === 0" class="empty-state" style="padding:30px 0">
            <p class="text-muted text-sm">No comments yet. Be the first!</p>
          </div>

          <CommentItem
            v-for="c in comments"
            :key="c.$id"
            :comment="c"
            @deleted="removeComment"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- Loading / not found -->
  <div v-else-if="notFound" class="empty-state" style="min-height:60vh">
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01"/></svg>
    <p class="font-bold">Video not found</p>
    <router-link to="/" class="btn btn-primary mt-4">Go Home</router-link>
  </div>

  <div v-else class="flex-center" style="min-height:60vh">
    <div class="skeleton" style="width:300px;height:300px;border-radius:16px"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getVideo, likeVideo, unlikeVideo, isVideoLiked, recordView, shareVideo, deleteVideo as delVideo } from '@/services/videos'
import { saveVideo, unsaveVideo, isVideoSaved } from '@/services/social'
import { getVideoComments, postComment } from '@/services/comments'
import CommentItem from '@/components/CommentItem.vue'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const video          = ref(null)
const notFound       = ref(false)
const liked          = ref(false)
const saved          = ref(false)
const comments       = ref([])
const loadingComments= ref(false)
const commentText    = ref('')
const videoEl        = ref(null)
let   viewTracked    = false

const isOwner = computed(() => auth.userId && video.value?.user_id === auth.userId)

onMounted(async () => {
  const id = route.params.id
  try {
    video.value = await getVideo(id)
    if (auth.userId) {
      ;[liked.value, saved.value] = await Promise.all([
        isVideoLiked(id, auth.userId),
        isVideoSaved(id, auth.userId),
      ])
    }
    loadComments()
  } catch {
    notFound.value = true
  }
})

onUnmounted(() => { /* cleanup */ })

async function loadComments () {
  loadingComments.value = true
  comments.value = await getVideoComments(route.params.id, 50).catch(() => [])
  loadingComments.value = false
}

async function submitComment () {
  if (!commentText.value.trim()) return
  const c = await postComment(route.params.id, auth.userId, commentText.value.trim())
  commentText.value = ''
  comments.value.unshift(c)
  if (video.value) video.value.comment_count = (video.value.comment_count || 0) + 1
}

function removeComment (id) {
  comments.value = comments.value.filter(c => c.$id !== id)
  if (video.value) video.value.comment_count = Math.max(0, (video.value.comment_count || 0) - 1)
}

async function toggleLike () {
  if (!auth.isAuthenticated) { router.push('/login'); return }
  const id = video.value.$id
  if (liked.value) {
    await unlikeVideo(id, auth.userId)
    liked.value = false
    video.value.like_count = Math.max(0, (video.value.like_count || 0) - 1)
  } else {
    await likeVideo(id, auth.userId)
    liked.value = true
    video.value.like_count = (video.value.like_count || 0) + 1
  }
}

async function toggleSave () {
  if (!auth.isAuthenticated) { router.push('/login'); return }
  const id = video.value.$id
  if (saved.value) {
    await unsaveVideo(id, auth.userId)
    saved.value = false
  } else {
    await saveVideo(id, auth.userId)
    saved.value = true
  }
}

function copyLink () {
  navigator.clipboard.writeText(window.location.href).catch(() => {})
  shareVideo(video.value.$id)
  alert('Link copied!')
}

async function deleteVideo () {
  if (!confirm('Delete this video?')) return
  await delVideo(video.value.$id)
  router.push('/')
}

function onTimeUpdate () {
  if (!viewTracked && videoEl.value?.currentTime > 3) {
    viewTracked = true
    recordView(video.value.$id, auth.userId || null)
  }
}

function onEnded () { /* optionally autoplay next */ }

const fmtNum = n => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'k' : (n || 0)
const timeAgo = (iso) => {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff/1000), m = Math.floor(s/60), h = Math.floor(m/60), d = Math.floor(h/24)
  if (d > 0) return d + 'd ago'
  if (h > 0) return h + 'h ago'
  if (m > 0) return m + 'm ago'
  return 'just now'
}
</script>

<style scoped>
.video-detail-page { min-height: calc(100vh - 56px); padding-top: 56px; }
.vd-container {
  display: grid; grid-template-columns: 1fr 400px;
  max-width: 1200px; margin: 0 auto; gap: 0;
  min-height: calc(100vh - 56px);
}
.vd-player-col { padding: 24px; }
.player-wrap { border-radius: 16px; overflow: hidden; background: #000; }
.player-video { width: 100%; max-height: 70vh; object-fit: contain; display: block; }
.vd-meta { margin-top: 16px; }
.creator-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; text-decoration: none; color: inherit; }
.vd-title { font-size: 1.3rem; font-weight: 700; margin-bottom: 8px; }
.vd-desc  { color: var(--text2); line-height: 1.6; }
.hashtag-row { display: flex; flex-wrap: wrap; gap: 6px; }
.ht { font-size: 0.85rem; color: var(--secondary); font-weight: 600; }
.action-bar { display: flex; gap: 4px; margin: 16px 0; flex-wrap: wrap; }
.action-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 20px; font-size: 0.88rem; font-weight: 600;
  color: var(--text); background: var(--bg3); transition: all 0.2s;
}
.action-btn:hover { background: var(--border); }
.action-btn.liked { color: #ff2d55; }
.action-btn.saved { color: var(--secondary); }
.vd-stats { font-size: 0.82rem; color: var(--text3); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.vd-comments-col {
  border-left: 1px solid var(--border);
  padding: 24px 20px;
  overflow-y: auto;
  max-height: calc(100vh - 56px);
  position: sticky; top: 56px;
}
.comments-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; }
.add-comment { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 20px; }
.comment-input-wrap { flex: 1; display: flex; gap: 8px; align-items: center; }
.comment-input { flex: 1; }
.login-prompt { text-align: center; padding: 12px; margin-bottom: 16px; }
.comment-list { display: flex; flex-direction: column; gap: 4px; }
.loading-row { display: flex; flex-direction: column; gap: 8px; }

@media (max-width: 900px) {
  .vd-container { grid-template-columns: 1fr; }
  .vd-comments-col { position: static; max-height: none; border-left: none; border-top: 1px solid var(--border); }
  .vd-player-col { padding: 12px; }
}
</style>
