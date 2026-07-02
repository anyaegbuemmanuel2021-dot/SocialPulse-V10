<template>
  <div class="auth-page">
    <!-- Left Side -->
    <div class="auth-box">

      <div class="auth-logo">
        <svg width="48" height="48" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="48" fill="#ff2d55"/>
          <text
            x="50"
            y="67"
            font-size="42"
            font-weight="bold"
            text-anchor="middle"
            fill="white"
            font-family="Arial"
          >
            SP
          </text>
        </svg>

        <h1>SocialPulse</h1>
      </div>

      <h2>Welcome Back</h2>
      <p class="subtitle">
        Sign in to continue sharing amazing videos.
      </p>

      <div
        v-if="auth.error"
        class="error-banner"
      >
        {{ auth.error }}
      </div>

      <div class="form-fields">

        <div class="form-group">
          <label class="form-label">Email</label>

          <input
            v-model="email"
            type="email"
            class="form-input"
            placeholder="you@example.com"
            autocomplete="email"
            @keydown.enter="submit"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>

          <div class="password-wrapper">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input password-input"
              placeholder="••••••••"
              autocomplete="current-password"
              @keydown.enter="submit"
            />

            <button
              type="button"
              class="password-toggle"
              :disabled="auth.loading"
              @click="showPassword = !showPassword"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
            >
              <!-- Eye -->
              <svg
                v-if="!showPassword"
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>

              <!-- Eye Off -->
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a21.77 21.77 0 0 1 5.06-6.94"/>
                <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-3.17 4.53"/>
                <path d="M1 1l22 22"/>
                <path d="M10.58 10.58A2 2 0 1 0 13.42 13.42"/>
              </svg>
            </button>
          </div>
        </div>

        <button
          class="login-btn"
          @click="submit"
          :disabled="auth.loading"
        >
          {{ auth.loading ? "Signing In..." : "Sign In" }}
        </button>

      </div>

      <div class="divider">
        <span>OR</span>
      </div>

      <div class="social-login">

        <button
          class="social google"
          @click="loginWithGoogle"
        >
          Continue with Google
        </button>

        <button
          class="social apple"
          @click="loginWithApple"
        >
          Continue with Apple
        </button>

        <button
          class="social github"
          @click="loginWithGithub"
        >
          Continue with GitHub
        </button>

        <button
          class="social facebook"
          @click="loginWithFacebook"
        >
          Continue with Facebook
        </button>

      </div>

      <p class="register-link">
        Don't have an account?

        <router-link to="/register">
          Sign Up
        </router-link>

      </p>

    </div>

    <!-- Right Side -->

    <div class="auth-panel">

      <h2>Share Your World</h2>

      <p>
        Watch, create and connect with millions of people on SocialPulse.
      </p>

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

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)

async function submit() {

  auth.clearError()

  if (!email.value || !password.value) {
    auth.error = 'Please fill in all fields.'
    return
  }

  const ok = await auth.doLogin(
    email.value.trim(),
    password.value
  )

  if (ok) {
    const redirect =
      router.currentRoute.value.query.redirect || '/'

    router.push(redirect)
  }

}
</script>

<style scoped>

.auth-page{
    min-height:100vh;
    display:grid;
    grid-template-columns:1fr 1fr;
}

.auth-box{

    display:flex;
    flex-direction:column;
    justify-content:center;

    max-width:460px;

    margin:auto;

    padding:50px;

}

.auth-logo{

    display:flex;
    align-items:center;

    gap:12px;

    margin-bottom:30px;

}

.auth-logo h1{

    font-size:30px;
    font-weight:800;

}

.subtitle{

    color:#777;

    margin-bottom:25px;

}

.form-fields{

    display:flex;

    flex-direction:column;

    gap:18px;

}

.form-group{

    display:flex;

    flex-direction:column;

}

.form-group label{

    margin-bottom:8px;

    font-weight:600;

}

.form-group input{

    padding:14px;

    border:1px solid #ddd;

    border-radius:10px;

    font-size:15px;

}

.password-wrapper{
    position:relative;
    width:100%;
}

.password-input{
    padding-right:50px;
}

.password-toggle{
    position:absolute;
    top:50%;
    right:14px;
    transform:translateY(-50%);
    border:none;
    background:transparent;
    cursor:pointer;
    color:#888;
    display:flex;
    align-items:center;
    justify-content:center;
    transition:.2s;
}

.password-toggle:hover{
    color:#ff2d55;
}

.password-toggle:disabled{
    opacity:.5;
    cursor:not-allowed;
}

.password-toggle svg{
    width:22px;
    height:22px;
}

.login-btn{

    padding:15px;

    border:none;

    border-radius:12px;

    background:#ff2d55;

    color:white;

    cursor:pointer;

    font-size:16px;

    font-weight:bold;

}

.login-btn:hover{

    opacity:.9;

}

.login-btn:disabled{

    opacity:.6;

    cursor:not-allowed;

}

.divider{

    margin:25px 0;

    text-align:center;

    color:#999;

    position:relative;

}

.divider span{

    background:white;

    padding:0 12px;

    position:relative;

    z-index:2;

}

.divider::before{

    content:"";

    position:absolute;

    top:50%;

    left:0;

    right:0;

    height:1px;

    background:#ddd;

}

.social-login{

    display:flex;

    flex-direction:column;

    gap:12px;

}

.social{

    padding:14px;

    border-radius:10px;

    cursor:pointer;

    border:none;

    font-weight:600;

    transition:.2s;

}

.social:hover{

    transform:translateY(-2px);

}

.google{

    background:#ffffff;

    border:1px solid #ddd;

}

.apple{

    background:#000;

    color:white;

}

.github{

    background:#24292f;

    color:white;

}

.facebook{

    background:#1877f2;

    color:white;

}

.register-link{

    margin-top:30px;

    text-align:center;

}

.register-link a{

    color:#ff2d55;

    font-weight:bold;

    text-decoration:none;

}

.error-banner{

    background:#ffdddd;

    color:#c62828;

    padding:12px;

    border-radius:10px;

    margin-bottom:20px;

}

.auth-panel{

    background:linear-gradient(135deg,#667eea,#ff2d55);

    display:flex;

    flex-direction:column;

    justify-content:center;

    align-items:center;

    color:white;

    text-align:center;

    padding:60px;

}

.auth-panel h2{

    font-size:42px;

    margin-bottom:20px;

}

.auth-panel p{

    font-size:18px;

    opacity:.95;

}

@media (max-width:768px){

.auth-page{
    grid-template-columns:1fr;
}

.auth-panel{
    display:none;
}

.auth-box{
    padding:30px;
}

}

</style>