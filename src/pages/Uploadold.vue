<template>
  <div class="upload-page">
    <div class="upload-container">
      <h1>Upload Video</h1>

      <!-- Drop zone -->
      <div
        class="drop-zone"
        :class="{ 'drag-over': dragging, 'has-file': videoFile }"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
        @click="fileInput?.click()"
      >
        <input ref="fileInput" type="file" accept="video/*" hidden @change="onFileChange" />
        <div v-if="!videoFile" class="drop-inner">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p class="font-bold">Click to select or drag & drop</p>
          <p class="text-sm text-muted">MP4, WebM, MOV — up to 5GB</p>
        </div>
        <div v-else class="drop-inner">
          <video :src="previewUrl" class="preview-video" controls></video>
          <p class="text-sm text-muted mt-2">{{ videoFile.name }} ({{ fmtSize(videoFile.size) }})</p>
          <button class="btn btn-secondary btn-sm mt-2" @click.stop="clearFile">Change file</button>
        </div>
      </div>

      <!-- Form fields -->
      <div class="upload-form">
        <div class="form-group">
          <label class="form-label">Title <span style="color:var(--primary)">*</span></label>
          <input class="form-input w-full" v-model="form.title" placeholder="Give your video a catchy title" maxlength="255" />
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-input w-full" v-model="form.description" rows="3" placeholder="Describe your video…" maxlength="2000"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Hashtags</label>
          <input class="form-input w-full" v-model="hashtagInput" placeholder="#trending #fun #viral" />
          <span class="form-hint">Space-separated hashtags</span>
        </div>
        <div class="form-group">
          <label class="form-label">Thumbnail</label>
          <input ref="thumbInput" type="file" accept="image/*" hidden @change="onThumbChange" />
          <div class="thumb-row">
            <img v-if="thumbPreview" :src="thumbPreview" class="thumb-preview" />
            <button class="btn btn-secondary btn-sm" @click="thumbInput?.click()">
              {{ thumbPreview ? 'Change thumbnail' : 'Upload thumbnail' }}
            </button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Visibility</label>
          <select class="form-input w-full" v-model="form.visibility">
            <option value="public">Public — Everyone</option>
            <option value="followers_only">Followers only</option>
            <option value="private">Private — Only me</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-check">
            <input type="checkbox" v-model="form.is_draft" />
            <span>Save as draft</span>
          </label>
        </div>

        <!-- Progress -->
        <div v-if="uploading" class="upload-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <p class="text-sm text-center mt-2">{{ progress < 100 ? `Uploading… ${progress}%` : 'Finalising…' }}</p>
        </div>

        <!-- Error -->
        <div v-if="error" class="error-banner">{{ error }}</div>

        <!-- Submit -->
        <button class="btn btn-primary btn-full" :disabled="!canSubmit || uploading" @click="submit">
          {{ uploading ? 'Uploading…' : 'Publish Video' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { createVideo, uploadVideoFile, uploadThumbnail } from '@/services/videos'

const router    = useRouter()
const auth      = useAuthStore()
const fileInput = ref(null)
const thumbInput= ref(null)

const videoFile   = ref(null)
const previewUrl  = ref('')
const thumbFile   = ref(null)
const thumbPreview= ref('')
const dragging    = ref(false)
const uploading   = ref(false)
const progress    = ref(0)
const error       = ref('')
const hashtagInput= ref('')

const form = ref({
  title:       '',
  description: '',
  visibility:  'public',
  is_draft:    false,
})

const canSubmit = computed(() => videoFile.value && form.value.title.trim())

function onDrop (e)       { const f = e.dataTransfer.files[0]; if (f?.type.startsWith('video/')) setVideo(f) }
function onFileChange (e) { const f = e.target.files[0];       if (f) setVideo(f) }
function setVideo (f)     { videoFile.value = f; previewUrl.value = URL.createObjectURL(f); dragging.value = false }
function clearFile ()     { videoFile.value = null; previewUrl.value = ''; if (fileInput.value) fileInput.value.value = '' }
function onThumbChange(e) { const f = e.target.files[0]; if (f) { thumbFile.value = f; thumbPreview.value = URL.createObjectURL(f) } }
const fmtSize = (b) => b >= 1e9 ? (b/1e9).toFixed(1)+'GB' : b >= 1e6 ? (b/1e6).toFixed(1)+'MB' : (b/1024).toFixed(0)+'KB'

const parseHashtags = () => hashtagInput.value.trim().split(/\s+/).filter(t => t).map(t => t.replace(/^#/, '').toLowerCase())

async function submit () {
  error.value = ''
  if (!videoFile.value)          { error.value = 'Please select a video file'; return }
  if (!form.value.title.trim())  { error.value = 'Title is required'; return }

  uploading.value = true
  progress.value  = 0

  try {
    // 1. Upload video
    const videoUrl = await uploadVideoFile(videoFile.value, (p) => { progress.value = Math.floor(p * 0.8) })

    // 2. Upload thumbnail (optional)
    let thumbnailUrl = ''
    if (thumbFile.value) {
      progress.value = 85
      thumbnailUrl = await uploadThumbnail(thumbFile.value)
    }

    progress.value = 95

    // 3. Create video document
    const video = await createVideo(auth.userId, {
      ...form.value,
      video_url:     videoUrl,
      thumbnail_url: thumbnailUrl,
      hashtags:      parseHashtags(),
    })

    progress.value = 100
    router.push(`/video/${video.$id}`)
  } catch (e) {
    error.value = e.message || 'Upload failed. Please try again.'
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.upload-page { min-height: calc(100vh - 56px); padding-top: 56px; padding-bottom: 80px; }
.upload-container { max-width: 700px; margin: 0 auto; padding: 32px 20px; }
h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 24px; }
.drop-zone {
  border: 2px dashed var(--border); border-radius: 16px;
  min-height: 220px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s; margin-bottom: 24px;
  overflow: hidden;
}
.drop-zone:hover, .drop-zone.drag-over { border-color: var(--primary); background: rgba(255,45,85,.04); }
.drop-inner { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px; text-align: center; }
.preview-video { max-height: 300px; border-radius: 8px; }
.upload-form { display: flex; flex-direction: column; gap: 16px; }
textarea { resize: vertical; }
.form-check { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; }
.thumb-row { display: flex; align-items: center; gap: 12px; }
.thumb-preview { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; }
.upload-progress { margin: 4px 0; }
.progress-bar { height: 8px; background: var(--bg3); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary)); transition: width 0.3s; }
</style>
