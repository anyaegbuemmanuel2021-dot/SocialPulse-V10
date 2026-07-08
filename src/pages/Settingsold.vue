<template>
  <div class="settings-page">
    <div class="settings-container">
      <h1>Settings</h1>

      <div class="settings-grid">
        <!-- LEFT: navigation tabs -->
        <aside class="settings-nav">
          <button
            v-for="tab in tabs" :key="tab.id"
            class="settings-nav-btn"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <span v-html="tab.icon"></span>
            {{ tab.label }}
          </button>
          <div class="divider"/>
          <button class="settings-nav-btn danger" @click="handleLogout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </aside>

        <!-- RIGHT: tab content -->
        <div class="settings-content">

          <!-- ── Profile Tab ── -->
          <section v-if="activeTab === 'profile'">
            <h2>Edit Profile</h2>

            <!-- Avatar -->
            <div class="avatar-section">
              <div class="avatar-preview-wrap">
                <img :src="previewAvatar || profile.avatar_url || '/default-avatar.svg'" class="avatar avatar-96" />
                <button class="avatar-change-btn" @click="avatarInput?.click()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
              <input ref="avatarInput" type="file" accept="image/*" hidden @change="onAvatarChange" />
              <div>
                <p class="font-bold">Profile Photo</p>
                <p class="text-sm text-muted">JPG, PNG or WebP — max 5MB</p>
              </div>
            </div>

            <!-- Cover photo -->
            <div class="cover-section">
              <div class="cover-preview-wrap" @click="coverInput?.click()">
                <img :src="previewCover || profile.cover_url" v-if="previewCover || profile.cover_url" class="cover-preview" />
                <div v-else class="cover-placeholder">Click to add cover photo</div>
              </div>
              <input ref="coverInput" type="file" accept="image/*" hidden @change="onCoverChange" />
            </div>

            <div class="form-stack">
              <div class="form-group">
                <label class="form-label">Display Name</label>
                <input class="form-input w-full" v-model="form.display_name" maxlength="100" />
              </div>
              <div class="form-group">
                <label class="form-label">Username</label>
                <input class="form-input w-full" v-model="form.username" maxlength="30" />
                <span class="form-hint">Letters, numbers and underscores only</span>
              </div>
              <div class="form-group">
                <label class="form-label">Bio</label>
                <textarea class="form-input w-full" v-model="form.bio" rows="3" maxlength="500" placeholder="Tell people about yourself…"></textarea>
                <span class="form-hint">{{ form.bio?.length || 0 }}/500</span>
              </div>
              <div class="form-group">
                <label class="form-label">Website</label>
                <input class="form-input w-full" v-model="form.website" type="url" placeholder="https://yoursite.com" />
              </div>
              <div class="form-group">
                <label class="toggle-row">
                  <div>
                    <p class="font-bold">Private Account</p>
                    <p class="text-sm text-muted">Only approved followers can see your videos</p>
                  </div>
                  <div class="toggle" :class="{ on: form.is_private }" @click="form.is_private = !form.is_private">
                    <div class="toggle-thumb"></div>
                  </div>
                </label>
              </div>

              <div v-if="saveError"   class="error-banner">{{ saveError }}</div>
              <div v-if="saveSuccess" class="success-banner">Profile saved successfully!</div>

              <button class="btn btn-primary" :disabled="saving" @click="saveProfile">
                {{ saving ? 'Saving…' : 'Save Changes' }}
              </button>
            </div>
          </section>

          <!-- ── Account Tab ── -->
          <section v-if="activeTab === 'account'">
            <h2>Account & Security</h2>

            <div class="form-stack">
              <div class="settings-card">
                <h3>Change Password</h3>
                <div class="form-group">
                  <label class="form-label">Current Password</label>
                  <input class="form-input w-full" type="password" v-model="pwForm.current" />
                </div>
                <div class="form-group">
                  <label class="form-label">New Password</label>
                  <input class="form-input w-full" type="password" v-model="pwForm.newPw" />
                </div>
                <div class="form-group">
                  <label class="form-label">Confirm New Password</label>
                  <input class="form-input w-full" type="password" v-model="pwForm.confirm" />
                </div>
                <div v-if="pwError"   class="error-banner">{{ pwError }}</div>
                <div v-if="pwSuccess" class="success-banner">Password changed!</div>
                <button class="btn btn-primary" :disabled="pwSaving" @click="changePassword">
                  {{ pwSaving ? 'Saving…' : 'Change Password' }}
                </button>
              </div>

              <div class="settings-card danger-zone">
                <h3>Danger Zone</h3>
                <p class="text-sm text-muted mb-4">These actions cannot be undone.</p>
                <button class="btn btn-outline" style="border-color:#e11d48;color:#e11d48" @click="confirmDeactivate">
                  Deactivate Account
                </button>
              </div>
            </div>
          </section>

          <!-- ── Notifications Tab ── -->
          <section v-if="activeTab === 'notifications'">
            <h2>Notification Preferences</h2>
            <div class="form-stack">
              <div class="settings-card" v-for="pref in notifPrefs" :key="pref.id">
                <label class="toggle-row">
                  <div>
                    <p class="font-bold">{{ pref.label }}</p>
                    <p class="text-sm text-muted">{{ pref.desc }}</p>
                  </div>
                  <div class="toggle" :class="{ on: pref.enabled }" @click="pref.enabled = !pref.enabled">
                    <div class="toggle-thumb"></div>
                  </div>
                </label>
              </div>
              <button class="btn btn-primary" @click="saveNotifPrefs">Save Preferences</button>
            </div>
          </section>

          <!-- ── Privacy Tab ── -->
          <section v-if="activeTab === 'privacy'">
            <h2>Privacy</h2>
            <div class="form-stack">
              <div class="settings-card">
                <h3>Blocked Users</h3>
                <div v-if="blockedUsers.length" class="blocked-list">
                  <div v-for="u in blockedUsers" :key="u.$id" class="blocked-row">
                    <img :src="u.avatar_url || '/default-avatar.svg'" class="avatar avatar-32" />
                    <span class="flex-1 font-bold">{{ u.display_name }}</span>
                    <button class="btn btn-secondary btn-sm" @click="unblock(u.$id)">Unblock</button>
                  </div>
                </div>
                <p v-else class="text-sm text-muted">You have not blocked anyone.</p>
              </div>

              <div class="settings-card">
                <h3>Data & Privacy</h3>
                <p class="text-sm text-muted mb-4">Download or delete your data.</p>
                <div class="flex gap-2">
                  <button class="btn btn-secondary btn-sm" @click="exportData">Export My Data</button>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { updateProfile, getBlockedUsers, unblockUser } from '@/services/users'
import { uploadAvatar, uploadCover } from '@/services/videos'
import { updatePassword } from '@/services/auth'

const router = useRouter()
const auth   = useAuthStore()

const activeTab = ref('profile')
const tabs = [
  { id: 'profile',       label: 'Profile',        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="5"/><path d="M12 14c-5 0-8 2.5-8 4v2h16v-2c0-1.5-3-4-8-4z"/></svg>' },
  { id: 'account',       label: 'Account',        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' },
  { id: 'notifications', label: 'Notifications',  icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' },
  { id: 'privacy',       label: 'Privacy',        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
]

// Profile form
const profile      = ref(auth.profile || {})
const form         = reactive({
  display_name: auth.profile?.display_name || '',
  username:     auth.profile?.username     || '',
  bio:          auth.profile?.bio          || '',
  website:      auth.profile?.website      || '',
  is_private:   auth.profile?.is_private   ?? false,
})
const saving       = ref(false)
const saveError    = ref('')
const saveSuccess  = ref(false)
const avatarInput  = ref(null)
const coverInput   = ref(null)
const previewAvatar= ref('')
const previewCover = ref('')
let   newAvatarFile= null
let   newCoverFile = null

// Password form
const pwForm    = reactive({ current: '', newPw: '', confirm: '' })
const pwSaving  = ref(false)
const pwError   = ref('')
const pwSuccess = ref(false)

// Notif prefs
const notifPrefs = ref([
  { id: 'likes',    label: 'Likes',          desc: 'When someone likes your video',    enabled: true },
  { id: 'comments', label: 'Comments',       desc: 'When someone comments on your video', enabled: true },
  { id: 'follows',  label: 'New Followers',  desc: 'When someone follows you',         enabled: true },
  { id: 'mentions', label: 'Mentions',       desc: 'When someone mentions you',        enabled: true },
  { id: 'messages', label: 'Messages',       desc: 'When you receive a direct message',enabled: true },
])

// Blocked users
const blockedUsers = ref([])

onMounted(async () => {
  blockedUsers.value = await getBlockedUsers(auth.userId).catch(() => [])
})

function onAvatarChange (e) {
  newAvatarFile  = e.target.files[0]
  if (newAvatarFile) previewAvatar.value = URL.createObjectURL(newAvatarFile)
}
function onCoverChange (e) {
  newCoverFile  = e.target.files[0]
  if (newCoverFile) previewCover.value = URL.createObjectURL(newCoverFile)
}

async function saveProfile () {
  saving.value = true; saveError.value = ''; saveSuccess.value = false
  try {
    const updates = { ...form }
    if (newAvatarFile) updates.avatar_url = await uploadAvatar(newAvatarFile)
    if (newCoverFile)  updates.cover_url  = await uploadCover(newCoverFile)
    const updated = await updateProfile(auth.userId, updates)
    auth.updateProfile(updated)
    profile.value    = updated
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (e) {
    saveError.value = e.message || 'Failed to save profile'
  } finally {
    saving.value = false
  }
}

async function changePassword () {
  pwError.value = ''; pwSuccess.value = false
  if (!pwForm.current)             { pwError.value = 'Enter current password'; return }
  if (pwForm.newPw.length < 8)     { pwError.value = 'New password too short'; return }
  if (pwForm.newPw !== pwForm.confirm) { pwError.value = 'Passwords do not match'; return }
  pwSaving.value = true
  try {
    await updatePassword(pwForm.newPw, pwForm.current)
    pwSuccess.value = true
    pwForm.current = ''; pwForm.newPw = ''; pwForm.confirm = ''
    setTimeout(() => { pwSuccess.value = false }, 3000)
  } catch (e) {
    pwError.value = e.message || 'Failed to change password'
  } finally {
    pwSaving.value = false
  }
}

async function saveNotifPrefs () {
  // Save to user profile/local storage — extend as needed
  localStorage.setItem('sp_notif_prefs', JSON.stringify(notifPrefs.value.map(p => ({ id: p.id, enabled: p.enabled }))))
  alert('Preferences saved!')
}

async function unblock (userId) {
  await unblockUser(auth.userId, userId)
  blockedUsers.value = blockedUsers.value.filter(u => u.$id !== userId)
}

function exportData () {
  const data = { profile: auth.profile, exportedAt: new Date().toISOString() }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = 'socialpulse-data.json'; a.click()
}

function confirmDeactivate () {
  if (confirm('Are you sure you want to deactivate your account? This cannot be undone.')) {
    alert('Please contact support to complete account deactivation.')
  }
}

async function handleLogout () {
  await auth.doLogout()
  router.push('/login')
}
</script>

<style scoped>
.settings-page { min-height: calc(100vh - 56px); padding-top: 72px; padding-bottom: 80px; }
.settings-container { max-width: 960px; margin: 0 auto; padding: 0 20px; }
h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 24px; }
.settings-grid { display: grid; grid-template-columns: 200px 1fr; gap: 24px; }
.settings-nav { display: flex; flex-direction: column; gap: 4px; }
.settings-nav-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 10px; font-size: 0.9rem; font-weight: 600;
  color: var(--text2); transition: all 0.2s; text-align: left; width: 100%;
}
.settings-nav-btn:hover { background: var(--bg3); color: var(--text); }
.settings-nav-btn.active { background: var(--bg3); color: var(--primary); }
.settings-nav-btn.danger { color: #e11d48; }
.settings-nav-btn.danger:hover { background: rgba(225,29,72,.08); }
.settings-content h2 { font-size: 1.2rem; font-weight: 700; margin-bottom: 20px; }
.form-stack { display: flex; flex-direction: column; gap: 16px; }
.settings-card { padding: 20px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; }
.settings-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 14px; }
.danger-zone { border-color: rgba(225,29,72,.3); }
.avatar-section { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
.avatar-preview-wrap { position: relative; }
.avatar-change-btn {
  position: absolute; bottom: 0; right: 0;
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--primary); color: white;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,.3);
}
.cover-section { margin-bottom: 20px; }
.cover-preview-wrap { border-radius: 12px; overflow: hidden; cursor: pointer; }
.cover-preview { width: 100%; height: 140px; object-fit: cover; }
.cover-placeholder {
  width: 100%; height: 140px;
  background: var(--bg3); border: 2px dashed var(--border);
  border-radius: 12px; display: flex; align-items: center; justify-content: center;
  color: var(--text3); font-size: 0.9rem; cursor: pointer;
}
.toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; cursor: pointer; }
.toggle {
  width: 44px; height: 24px; border-radius: 12px;
  background: var(--border); position: relative;
  transition: background 0.2s; flex-shrink: 0;
}
.toggle.on { background: var(--primary); }
.toggle-thumb {
  position: absolute; top: 3px; left: 3px;
  width: 18px; height: 18px; border-radius: 50%; background: white;
  transition: transform 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,.2);
}
.toggle.on .toggle-thumb { transform: translateX(20px); }
.success-banner { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; border-radius: 8px; padding: 10px 14px; font-size: 0.88rem; }
.blocked-list { display: flex; flex-direction: column; gap: 8px; }
.blocked-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
@media (max-width: 768px) {
  .settings-grid { grid-template-columns: 1fr; }
  .settings-nav { flex-direction: row; flex-wrap: wrap; }
  .settings-nav-btn { flex: 1; min-width: 100px; justify-content: center; }
}
</style>
