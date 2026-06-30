import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  initializeAuth, register, login, logout,
  currentUser, currentProfile, isLoggedIn, setProfile
} from '@/services/auth'

export const useAuthStore = defineStore('auth', () => {
  const user    = ref(null)
  const profile = ref(null)
  const loading = ref(false)
  const error   = ref('')

  const isAuthenticated = computed(() => !!user.value)
  const userId          = computed(() => user.value?.$id || null)

  async function init () {
    loading.value = true
    await initializeAuth()
    user.value    = currentUser()
    profile.value = currentProfile()
    loading.value = false
  }

  async function doRegister (email, password, displayName) {
    loading.value = true; error.value = ''
    try {
      const d = await register(email, password, displayName)
      user.value    = d.user
      profile.value = d.profile
      return true
    } catch (e) {
      error.value = e.message || 'Registration failed'
      return false
    } finally { loading.value = false }
  }

  async function doLogin (email, password) {
    loading.value = true; error.value = ''
    try {
      const d = await login(email, password)
      user.value    = d.user
      profile.value = d.profile
      return true
    } catch (e) {
      error.value = e.message || 'Login failed'
      return false
    } finally { loading.value = false }
  }

  async function doLogout () {
    await logout()
    user.value = null; profile.value = null
  }

  function updateProfile (p) {
    profile.value = p
    setProfile(p)
  }

  function clearError () { error.value = '' }

  return {
    user, profile, loading, error,
    isAuthenticated, userId,
    init, doRegister, doLogin, doLogout, updateProfile, clearError
  }
})
