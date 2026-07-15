<template>
  <div>
    <h1>Audit Log</h1>
    <table class="admin-table">
      <thead>
        <tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th></tr>
      </thead>
      <tbody>
        <tr v-for="l in logs" :key="l.$id">
          <td class="text-secondary" style="font-size: 12px; white-space: nowrap;">{{ formatDate(l.created_at) }}</td>
          <td style="font-size: 12px;">{{ l.admin_id }}</td>
          <td>{{ l.action }}</td>
          <td class="text-secondary" style="font-size: 12px;">{{ l.resource_type }} · {{ l.resource_id }}</td>
        </tr>
      </tbody>
    </table>
    <div v-if="!loading && logs.length === 0" class="text-secondary">No admin actions logged yet.</div>
    <div style="margin-top: 16px; display: flex; gap: 8px;">
      <button class="btn btn-secondary btn-sm" :disabled="offset === 0" @click="page(-1)">← Prev</button>
      <button class="btn btn-secondary btn-sm" :disabled="logs.length < limit" @click="page(1)">Next →</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAdminLogs } from '@/services/admin'

const logs    = ref([])
const loading = ref(true)
const limit   = 50
const offset  = ref(0)

function formatDate (iso) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

async function load () {
  loading.value = true
  try {
    logs.value = await getAdminLogs(limit, offset.value)
  } finally {
    loading.value = false
  }
}

function page (dir) {
  offset.value = Math.max(0, offset.value + dir * limit)
  load()
}

onMounted(load)
</script>
