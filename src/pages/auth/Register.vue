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
          <div class="input-wrap">
            <input
              class="form-input w-full"
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              placeholder="Minimum 8 characters"
            />
            <button
              type="button"
              class="toggle-visibility"
              tabindex="-1"
              @click="showPassword = !showPassword"
            >
              <svg v-if="showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.86 21.86 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.86 21.86 0 0 1-3.22 4.44M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
          <span class="form-hint">Must include uppercase, number and special character</span>
        </div>
        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <div class="input-wrap">
            <input
              class="form-input w-full"
              :type="showConfirm ? 'text' : 'password'"
              v-model="confirm"
              placeholder="Repeat password"
              @keydown.enter="submit"
            />
            <button
              type="button"
              class="toggle-visibility"
              tabindex="-1"
              @click="showConfirm = !showConfirm"
            >
              <svg v-if="showConfirm" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.86 21.86 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.86 21.86 0 0 1-3.22 4.44M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>
        <button class="btn btn-primary btn-full" :disabled="auth.loading" @click="submit">
          {{ auth.loading ? 'Creating account…' : 'Create Account' }}
        </button>
      </div>

      <div class="divider">
        <span>OR</span>
      </div>

      <div class="social-login">
        <button class="social google" :disabled="auth.loading" @click="handleSocial('google')">
          Continue with Google
        </button>

        <button class="social apple" :disabled="auth.loading" @click="handleSocial('apple')">
          Continue with Apple
        </button>

        <button class="social github" :disabled="auth.loading" @click="handleSocial('github')">
          Continue with GitHub
        </button>

        <button class="social facebook" :disabled="auth.loading" @click="handleSocial('facebook')">
          Continue with Facebook
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
import {
  loginWithGoogle,
  loginWithApple,
  loginWithGithub,
  loginWithFacebook
} from '@/services/auth'

const auth        = useAuthStore()
const router      = useRouter()
const displayName = ref('')
const email       = ref('')
const password    = ref('')
const confirm     = ref('')
const showPassword = ref(false)
const showConfirm  = ref(false)

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

const providerHandlers = {
  google: loginWithGoogle,
  apple: loginWithApple,
  github: loginWithGithub,
  facebook: loginWithFacebook
}

async function handleSocial (provider) {
  auth.clearError()
  try {
    // Each function should trigger the Appwrite OAuth2 redirect flow.
    // The user is sent away from this page, so there's typically no
    // need to handle a return value here.
    await providerHandlers[provider]()
  } catch (e) {
    auth.error = e?.message || `Could not sign in with ${provider}`
  }
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

.input-wrap { position: relative; display: flex; align-items: center; }
.input-wrap .form-input { padding-right: 44px; }
.toggle-visibility {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text2, #999);
  cursor: pointer;
}
.toggle-visibility:hover { color: var(--text1, #333); }

.divider {
  margin: 25px 0;
  text-align: center;
  color: #999;
  position: relative;
}

.divider span {
  background: white;
  padding: 0 12px;
  position: relative;
  z-index: 2;
}

.divider::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #ddd;
}

.social-login {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.social {
  padding: 14px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: .2s;
}

.social:hover {
  transform: translateY(-2px);
}

.social:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.google {
  background: #fff;
  border: 1px solid #ddd;
}

.apple {
  background: #000;
  color: #fff;
}

.github {
  background: #24292f;
  color: #fff;
}

.facebook {
  background: #1877f2;
  color: #fff;
}

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