<template>
  <div>
    <h1>Reports</h1>
    <div style="margin-bottom: 16px; display: flex; gap: 8px;">
      <button
        v-for="s in ['pending', 'reviewed', 'dismissed', 'all']"
        :key="s"
        class="btn btn-sm"
        :class="statusFilter === s ? 'btn-primary' : 'btn-secondary'"
        @click="statusFilter = s; load()"
      >{{ s }}</button>
    </div>
    <table class="admin-table">
      <thead>
        <tr><th>Type</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in reports" :key="r.$id">
          <td>{{ r.report_type }}</td>
          <td style="max-width: 260px;">{{ r.reason }}</td>
          <td><span class="admin-badge" :class="r.status === 'pending' ? '' : 'on'">{{ r.status }}</span></td>
          <td>
            <template v-if="r.status === 'pending'">
              <button class="btn btn-secondary btn-sm" @click="resolve(r.$id, 'reviewed')">Mark reviewed</button>
              <button class="btn btn-secondary btn-sm" @click="resolve(r.$id, 'dismissed')">Dismiss</button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!loading && reports.length === 0" class="text-secondary">No reports here.</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listReports, resolveReport } from '@/services/admin'

const auth = useAuthStore()
const reports = ref([])
const loading = ref(true)
const statusFilter = ref('pending')

async function load () {
  loading.value = true
  try {
    const status = statusFilter.value === 'all' ? null : statusFilter.value
    const res = await listReports(status, 50, 0)
    reports.value = res.documents
  } finally {
    loading.value = false
  }
}

async function resolve (reportId, status) {
  const notes = window.prompt(`Notes for marking this report "${status}" (optional):`, '') || ''
  await resolveReport(auth.userId, reportId, status, notes)
  await load()
}

onMounted(load)
</script>
