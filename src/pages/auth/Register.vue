<template>
  <div class="auth-page">
    <div class="auth-box">
      <div class="auth-logo">
        <svg width="40" height="40" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="48" fill="#ff2d55"/>
          <text x="50" y="67" font-size="44" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial,sans-serif">SP</text>
        </svg>
        <h1>SocialPulse</h1>
      </div>

      <h2>Create account</h2>
      <p class="subtitle">Start sharing your world</p>

      <div v-if="auth.error" class="error-banner mt-2">{{ auth.error }}</div>

      <div class="form-fields">
        <div class="form-group">
          <label class="form-label">Display Name</label>
          <input class="form-input w-full" type="text" v-model="displayName" placeholder="Your Name" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input w-full" type="email" v-model="email" placeholder="you@example.com" />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input class="form-input w-full" type="password" v-model="password" placeholder="Minimum 8 characters" />
          <span class="form-hint">Must include uppercase, number and special character</span>
        </div>
        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <input class="form-input w-full" type="password" v-model="confirm" placeholder="Repeat password" @keydown.enter="submit" />
        </div>
        <button class="btn btn-primary btn-full" :disabled="auth.loading" @click="submit">
          {{ auth.loading ? 'Creating account…' : 'Create Account' }}
        </button>
      </div>

      <p class="text-sm text-center mt-4" style="color:var(--text2)">
        Already have an account?
        <router-link to="/login" class="text-primary font-bold">Sign in</router-link>
      </p>
    </div>

    <div class="auth-panel">
      <h2>Join the community</h2>
      <p>Millions of creators sharing moments every day.</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth        = useAuthStore()
const router      = useRouter()
const displayName = ref('')
const email       = ref('')
const password    = ref('')
const confirm     = ref('')

function validate () {
  if (!displayName.value.trim()) return 'Display name is required'
  if (!email.value.trim())       return 'Email is required'
  if (password.value.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password.value)) return 'Password needs an uppercase letter'
  if (!/[0-9]/.test(password.value)) return 'Password needs a number'
  if (!/[^A-Za-z0-9]/.test(password.value)) return 'Password needs a special character'
  if (password.value !== confirm.value) return 'Passwords do not match'
  return null
}

async function submit () {
  auth.clearError()
  const err = validate()
  if (err) { auth.error = err; return }
  const ok = await auth.doRegister(email.value.trim(), password.value, displayName.value.trim())
  if (ok) router.push('/')
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr;
}
.auth-box {
  display: flex; flex-direction: column; justify-content: center;
  padding: 60px 48px; max-width: 480px; width: 100%;
}
.auth-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
.auth-logo h1 { font-size: 1.6rem; font-weight: 800; }
h2 { font-size: 1.6rem; font-weight: 700; margin-bottom: 4px; }
.subtitle { color: var(--text2); margin-bottom: 28px; }
.form-fields { display: flex; flex-direction: column; gap: 16px; margin-top: 20px; }
.auth-panel {
  background: linear-gradient(135deg, #ff2d55 0%, #667eea 100%);
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; color: white; padding: 60px; text-align: center;
}
.auth-panel h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 12px; }
.auth-panel p { font-size: 1.1rem; opacity: 0.9; }
@media (max-width: 768px) {
  .auth-page { grid-template-columns: 1fr; }
  .auth-panel { display: none; }
  .auth-box { padding: 40px 24px; max-width: 100%; }
}
</style>
