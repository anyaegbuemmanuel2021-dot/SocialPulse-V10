<template>
  <div>
    <h1>Dashboard</h1>
    <div v-if="loading" class="text-secondary">Loading stats…</div>
    <div v-else class="admin-stats-grid">
      <div class="admin-stat-card"><div class="value">{{ stats.totalUsers ?? '—' }}</div><div class="label">Total users</div></div>
      <div class="admin-stat-card"><div class="value">{{ stats.totalVideos ?? '—' }}</div><div class="label">Total videos</div></div>
      <div class="admin-stat-card"><div class="value">{{ stats.pendingReports ?? '—' }}</div><div class="label">Pending reports</div></div>
    </div>
    <p class="text-secondary" style="font-size: 13px;">
      For deeper analytics (DAU/MAU, watch time, revenue, etc.) a dedicated
      analytics pipeline is needed — that's a separate build, not covered here.
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getDashboardStats } from '@/services/admin'

const stats   = ref({})
const loading = ref(true)

onMounted(async () => {
  try {
    stats.value = await getDashboardStats()
  } finally {
    loading.value = false
  }
})
</script>
