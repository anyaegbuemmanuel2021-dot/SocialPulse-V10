<template>
  <div>
    <h1>Hashtags</h1>
    <input
      v-model="search"
      @input="debouncedLoad"
      placeholder="Search hashtags…"
      class="form-input"
      style="margin-bottom: 16px; max-width: 320px;"
    />
    <table class="admin-table">
      <thead>
        <tr><th>Tag</th><th>Usage</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody>
        <tr v-for="h in hashtags" :key="h.$id">
          <td>#{{ h.tag }}</td>
          <td>{{ h.usage_count || 0 }}</td>
          <td><span class="admin-badge" :class="h.is_blocked ? 'off' : 'on'">{{ h.is_blocked ? 'Blocked' : 'Active' }}</span></td>
          <td>
            <button v-if="!h.is_blocked" class="btn btn-secondary btn-sm" @click="act(blockHashtag, h.$id)">Block</button>
            <button v-else class="btn btn-secondary btn-sm" @click="act(unblockHashtag, h.$id)">Unblock</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!loading && hashtags.length === 0" class="text-secondary">No hashtags found.</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listHashtags, blockHashtag, unblockHashtag } from '@/services/admin'

const auth = useAuthStore()
const hashtags = ref([])
const loading = ref(true)
const search  = ref('')

let debounceTimer = null
function debouncedLoad () {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(load, 350)
}

async function load () {
  loading.value = true
  try {
    const res = await listHashtags(50, 0, search.value.trim())
    hashtags.value = res.documents
  } finally {
    loading.value = false
  }
}

async function act (fn, hashtagId) {
  await fn(auth.userId, hashtagId)
  await load()
}

onMounted(load)
</script>
