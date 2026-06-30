<template>
  <div class="comment-item">
    <img :src="author?.avatar_url || '/default-avatar.svg'" class="avatar avatar-32" />
    <div class="comment-body">
      <div class="comment-header">
        <span class="comment-author">{{ author?.display_name || 'User' }}</span>
        <span class="comment-time text-xs text-muted">{{ timeAgo(comment.created_at) }}</span>
      </div>
      <p class="comment-text">{{ comment.content }}</p>
      <div class="comment-actions">
        <button class="small-btn" :class="{ liked: localLiked }" @click="toggleLike">
          <svg width="13" height="13" viewBox="0 0 24 24" :fill="localLiked?'#ff2d55':'none'" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {{ comment.like_count || 0 }}
        </button>
        <button class="small-btn" @click="showReply = !showReply">Reply</button>
        <button v-if="canDelete" class="small-btn danger" @click="remove">Delete</button>
      </div>

      <!-- Reply input -->
      <div v-if="showReply && auth.isAuthenticated" class="reply-input">
        <input class="form-input" v-model="replyText" placeholder="Write a reply…" @keydown.enter="submitReply" style="font-size:0.85rem;padding:6px 10px" />
        <button class="btn btn-primary btn-sm" :disabled="!replyText.trim()" @click="submitReply">Reply</button>
      </div>

      <!-- Replies -->
      <div v-if="replies.length" class="replies">
        <CommentItem v-for="r in replies" :key="r.$id" :comment="r" @deleted="removeReply" />
      </div>
      <button v-if="comment.reply_count > 0 && !repliesLoaded" class="small-btn mt-2" @click="loadReplies">
        View {{ comment.reply_count }} replies
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getReplies, postComment, deleteComment, likeComment, unlikeComment, isCommentLiked } from '@/services/comments'
import { getProfile } from '@/services/users'

const props = defineProps({ comment: { type: Object, required: true } })
const emit  = defineEmits(['deleted'])
const auth  = useAuthStore()

const author       = ref(null)
const localLiked   = ref(false)
const showReply    = ref(false)
const replyText    = ref('')
const replies      = ref([])
const repliesLoaded= ref(false)

const canDelete = ref(false)

onMounted(async () => {
  author.value    = await getProfile(props.comment.user_id).catch(() => null)
  canDelete.value = auth.userId === props.comment.user_id
  if (auth.userId) localLiked.value = await isCommentLiked(props.comment.$id, auth.userId).catch(() => false)
})

async function toggleLike () {
  if (!auth.isAuthenticated) return
  if (localLiked.value) { await unlikeComment(props.comment.$id, auth.userId); localLiked.value = false }
  else                  { await likeComment  (props.comment.$id, auth.userId); localLiked.value = true  }
}

async function submitReply () {
  if (!replyText.value.trim()) return
  const r = await postComment(props.comment.video_id, auth.userId, replyText.value.trim(), props.comment.$id)
  replies.value.push(r)
  replyText.value = ''
  showReply.value = false
}

async function loadReplies () {
  replies.value    = await getReplies(props.comment.$id).catch(() => [])
  repliesLoaded.value = true
}

async function remove () {
  if (!confirm('Delete comment?')) return
  await deleteComment(props.comment.$id)
  emit('deleted', props.comment.$id)
}

function removeReply (id) { replies.value = replies.value.filter(r => r.$id !== id) }
const timeAgo = (iso) => {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso))/86400000)
  const h = Math.floor((Date.now() - new Date(iso))/3600000)
  const m = Math.floor((Date.now() - new Date(iso))/60000)
  return d > 0 ? d+'d' : h > 0 ? h+'h' : m > 0 ? m+'m' : 'now'
}
</script>

<style scoped>
.comment-item { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
.comment-body { flex: 1; min-width: 0; }
.comment-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.comment-author { font-size: 0.85rem; font-weight: 600; }
.comment-text   { font-size: 0.88rem; color: var(--text); line-height: 1.5; }
.comment-actions { display: flex; align-items: center; gap: 12px; margin-top: 6px; }
.small-btn { font-size: 0.78rem; color: var(--text2); font-weight: 600; display: flex; align-items: center; gap: 4px; transition: color 0.2s; }
.small-btn:hover { color: var(--text); }
.small-btn.liked  { color: #ff2d55; }
.small-btn.danger { color: #e11d48; }
.reply-input { display: flex; gap: 8px; margin-top: 8px; }
.replies { margin-top: 8px; border-left: 2px solid var(--border); padding-left: 12px; }
</style>
