<template>
  <div>
    <h1>Content</h1>
    <table class="admin-table">
      <thead>
        <tr><th>Video</th><th>Stats</th><th>Actions</th></tr>
      </thead>
      <tbody>
        <tr v-for="v in videos" :key="v.$id">
          <td>
            <div>{{ v.title || '(untitled)' }}</div>
            <div class="text-secondary" style="font-size: 12px;">{{ v.$id }}</div>
          </td>
          <td class="text-secondary" style="font-size: 13px;">
            ▶ {{ v.view_count || 0 }} · ♥ {{ v.like_count || 0 }} · 💬 {{ v.comment_count || 0 }}
          </td>
          <td>
            <router-link :to="{ name: 'video', params: { id: v.$id } }" class="btn btn-secondary btn-sm" target="_blank">View</router-link>
            <button class="btn btn-secondary btn-sm" @click="remove(v.$id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!loading && videos.length === 0" class="text-secondary">No videos found.</div>
    <div style="margin-top: 16px; display: flex; gap: 8px;">
      <button class="btn btn-secondary btn-sm" :disabled="offset === 0" @click="page(-1)">← Prev</button>
      <button class="btn btn-secondary btn-sm" :disabled="videos.length < limit" @click="page(1)">Next →</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listAllVideos, adminDeleteVideo } from '@/services/admin'

const auth = useAuthStore()
const videos  = ref([])
const loading = ref(true)
const limit   = 25
const offset  = ref(0)

async function load () {
  loading.value = true
  try {
    const res = await listAllVideos(limit, offset.value)
    videos.value = res.documents
  } finally {
    loading.value = false
  }
}

function page (dir) {
  offset.value = Math.max(0, offset.value + dir * limit)
  load()
}

async function remove (videoId) {
  const reason = window.prompt('Reason for removing this video (visible in audit log):', '')
  if (reason === null) return
  if (!window.confirm('This permanently deletes the video document. Continue?')) return
  await adminDeleteVideo(auth.userId, videoId, reason)
  await load()
}

onMounted(load)
</script>
