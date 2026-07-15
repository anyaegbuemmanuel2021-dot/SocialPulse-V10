<template>
  <div v-if="siteDisabled" class="maintenance-screen">
    <div class="maintenance-card">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 9v4M12 17h.01M10.29 3.86l-8.18 14.18A2 2 0 0 0 4 21h16a2 2 0 0 0 1.89-2.96L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      </svg>
      <h1>We'll be right back</h1>
      <p>{{ siteMessage }}</p>
    </div>
  </div>
  <div v-else class="app-shell" :class="{ 'home-feed-mode': isHome }">
    <!-- Top Navigation -->
    <header class="top-nav" v-if="!isAuthPage">
      <router-link to="/" class="nav-logo">SocialPulse</router-link>

      <div class="nav-search" v-if="route.name !== 'search'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          placeholder="Search videos, users, hashtags…"
          @keydown.enter="goSearch"
          v-model="searchQ"
        />
      </div>

      <div class="nav-actions">
        <!-- Upload -->
        <router-link v-if="auth.isAuthenticated" to="/upload" class="btn btn-primary btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          <span class="nav-upload-label">Upload</span>
        </router-link>

        <!-- Notifications -->
        <router-link v-if="auth.isAuthenticated" to="/notifications" class="nav-icon-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span v-if="unreadNotifs > 0" class="badge">{{ unreadNotifs }}</span>
        </router-link>

        <!-- Messages -->
        <router-link v-if="auth.isAuthenticated" to="/messages" class="nav-icon-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span v-if="unreadMessages > 0" class="badge">{{ unreadMessages }}</span>
        </router-link>

        <!-- Avatar / Login -->
        <router-link v-if="auth.isAuthenticated" :to="`/profile/${auth.userId}`" class="nav-icon-btn">
          <img v-if="auth.profile?.avatar_url" :src="auth.profile.avatar_url" class="avatar-sm" alt="avatar" />
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="8" r="5"/><path d="M12 14c-5 0-8 2.5-8 4v2h16v-2c0-1.5-3-4-8-4z"/>
          </svg>
        </router-link>

        <div v-else class="flex gap-2">
          <router-link to="/login"    class="btn btn-secondary btn-sm">Login</router-link>
          <router-link to="/register" class="btn btn-primary  btn-sm">Sign Up</router-link>
        </div>
      </div>
    </header>

    <!-- Main router view -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- Bottom nav (mobile) -->
    <nav class="bottom-nav" v-if="!isAuthPage">
      <router-link to="/" active-class="active">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>
        </svg>
        <span>Home</span>
      </router-link>
      <router-link to="/search" active-class="active">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span>Search</span>
      </router-link>
      <router-link v-if="auth.isAuthenticated" to="/upload" active-class="active">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>
        </svg>
        <span>Upload</span>
      </router-link>
      <router-link v-if="auth.isAuthenticated" to="/notifications" active-class="active">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span>Alerts</span>
      </router-link>
      <router-link v-if="auth.isAuthenticated" :to="`/profile/${auth.userId}`" active-class="active">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="8" r="5"/><path d="M12 14c-5 0-8 2.5-8 4v2h16v-2c0-1.5-3-4-8-4z"/>
        </svg>
        <span>Profile</span>
      </router-link>
      <router-link v-else to="/login" active-class="active">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        <span>Login</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getUnreadCount } from '@/services/notifications'
import { getUnreadMessageCount } from '@/services/messaging'
import { checkFeature } from '@/services/siteFlags'

const auth   = useAuthStore()
const route  = useRoute()
const router = useRouter()

const searchQ        = ref('')
const unreadNotifs   = ref(0)
const unreadMessages = ref(0)
const siteDisabled   = ref(false)
const siteMessage    = ref('')

const isAuthPage = computed(() => ['login', 'register'].includes(route.name))
const isHome      = computed(() => route.name === 'home')

const goSearch = () => {
  if (searchQ.value.trim()) router.push({ name: 'search', query: { q: searchQ.value.trim() } })
}

onMounted(async () => {
  // Check the global kill-switch first — if the whole site is disabled,
  // there's no point initializing auth/notifications/etc. Fails open (see
  // siteFlags.js) so a missing/misconfigured flag never accidentally locks
  // everyone out.
  try {
    const gate = await checkFeature('site')
    if (!gate.enabled) {
      siteDisabled.value = true
      siteMessage.value = gate.message || 'The site is temporarily unavailable.'
      return
    }
  } catch {
    // If the flag check itself fails (e.g. offline), don't block the app —
    // fail open rather than showing a false maintenance screen.
  }

  await auth.init()
  if (auth.isAuthenticated) {
    unreadNotifs.value   = await getUnreadCount(auth.userId)
    unreadMessages.value = await getUnreadMessageCount(auth.userId)
  }
})

</script>
