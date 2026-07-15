<template>
  <div>
    <h1>Site Control</h1>
    <p class="text-secondary" style="font-size: 13px; margin-bottom: 20px;">
      Turn any part of the site on or off, and set the message users see while it's off.
      Turning off "Entire Site" shows a full maintenance screen to everyone, everywhere.
    </p>

    <div v-if="loading" class="text-secondary">Loading…</div>

    <div v-for="flag in flags" :key="flag.$id" class="admin-flag-row">
      <div class="flag-info">
        <div class="name">{{ flag.label }}</div>
        <textarea
          v-model="flag.message"
          placeholder="Message shown to users while this is disabled…"
          @change="save(flag)"
        ></textarea>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" v-model="flag.enabled" @change="save(flag)" />
        <span class="slider"></span>
      </label>
    </div>

    <div v-if="!loading && flags.length === 0" class="text-secondary">
      No flags found yet — run the deployment script (<code>node appwrite/setup/setup-collections.cjs --yes</code>) to seed the defaults.
    </div>

    <div v-if="savedFlagId" style="margin-top: 12px; font-size: 13px; color: var(--accent);">Saved ✓</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { listSiteFlags, setSiteFlag } from '@/services/siteFlags'

const auth = useAuthStore()
const flags   = ref([])
const loading = ref(true)
const savedFlagId = ref(null)

async function load () {
  loading.value = true
  try {
    flags.value = await listSiteFlags()
  } finally {
    loading.value = false
  }
}

async function save (flag) {
  await setSiteFlag(auth.userId, flag.$id, { enabled: flag.enabled, message: flag.message })
  savedFlagId.value = flag.$id
  setTimeout(() => { savedFlagId.value = null }, 1500)
}

onMounted(load)
</script>
