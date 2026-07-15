<template>
  <div>
    <h1>Users</h1>
    <input
      v-model="search"
      @input="debouncedLoad"
      placeholder="Search by username or email…"
      class="form-input"
      style="margin-bottom: 16px; max-width: 320px;"
    />
    <table class="admin-table">
      <thead>
        <tr>
          <th>User</th>
          <th>Status</th>
          <th>Verified</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.$id">
          <td>
            <div>{{ u.display_name || u.username }}</div>
            <div class="text-secondary" style="font-size: 12px;">{{ u.email }}</div>
          </td>
          <td>
            <span v-if="u.is_disabled" class="admin-badge off">Disabled</span>
            <span v-else-if="u.is_suspended" class="admin-badge off">Suspended</span>
            <span v-else class="admin-badge on">Active</span>
          </td>
          <td>
            <span :class="['admin-badge', u.verified ? 'on' : '']">{{ u.verified ? 'Verified' : '—' }}</span>
          </td>
          <td style="white-space: nowrap;">
            <button v-if="!u.verified" class="btn btn-secondary btn-sm" @click="act(verifyUser, u.$id)">Verify</button>
            <button v-else class="btn btn-secondary btn-sm" @click="act(unverifyUser, u.$id)">Unverify</button>

            <button v-if="!u.is_suspended" class="btn btn-secondary btn-sm" @click="promptSuspend(u.$id)">Suspend</button>
            <button v-else class="btn btn-secondary btn-sm" @click="act(unsuspendUser, u.$id)">Unsuspend</button>

            <button v-if="!u.is_disabled" class="btn btn-secondary btn-sm" @click="promptDisable(u.$id)">Disable</button>
            <button v-else class="btn btn-secondary btn-sm" @click="act(enableUser, u.$id)">Enable</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!loading && users.length === 0" class="text-secondary">No users found.</div>
    <div style="margin-top: 16px; display: flex; gap: 8px;">
      <button class="btn btn-secondary btn-sm" :disabled="offset === 0" @click="page(-1)">← Prev</button>
      <button class="btn btn-secondary btn-sm" :disabled="users.length < limit" @click="page(1)">Next →</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  listUsers, verifyUser, unverifyUser,
  suspendUser, unsuspendUser, disableUser, enableUser,
} from '@/services/admin'

const auth = useAuthStore()

const users   = ref([])
const loading = ref(true)
const search  = ref('')
const limit   = 25
const offset  = ref(0)

let debounceTimer = null
function debouncedLoad () {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { offset.value = 0; load() }, 350)
}

async function load () {
  loading.value = true
  try {
    const res = await listUsers(limit, offset.value, search.value.trim())
    users.value = res.documents
  } finally {
    loading.value = false
  }
}

function page (dir) {
  offset.value = Math.max(0, offset.value + dir * limit)
  load()
}

async function act (fn, userId, ...args) {
  await fn(auth.userId, userId, ...args)
  await load()
}

function promptSuspend (userId) {
  const reason = window.prompt('Reason for suspension (visible in audit log):', '')
  if (reason === null) return
  act(suspendUser, userId, reason, 30)
}

function promptDisable (userId) {
  const reason = window.prompt('Reason for disabling this account:', '')
  if (reason === null) return
  act(disableUser, userId, reason)
}

onMounted(load)
</script>
