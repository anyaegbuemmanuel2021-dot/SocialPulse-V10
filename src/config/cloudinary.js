// ---------------------------------------------------------------------------
// Cloudinary — media layer
// ---------------------------------------------------------------------------
// All video/image files are uploaded directly from the browser to Cloudinary
// using an UNSIGNED upload preset. Appwrite never touches the binary — it
// only stores the resulting secure_url + public_id as metadata on the
// relevant document (see src/services/videos.js, users.js, messaging.js).
//
// Deleting an asset requires a *signed* request (Cloudinary's destroy API
// needs your API secret, which must never live in browser code), so
// deletion is delegated to the `cloudinary-cleanup` Appwrite Function.
// See src/services/media.js and appwrite/functions/cloudinary-cleanup/.

const clean = (v) => (typeof v === 'string' ? v.trim().replace(/^["']|["']$/g, '') : v)

const CLOUD_NAME    = clean(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME)
const UPLOAD_PRESET = clean(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET)

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  throw new Error(
    '[cloudinary.js] VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET is missing.\n' +
    '  1. In the Cloudinary console: Settings -> Upload -> Upload presets -> Add upload preset.\n' +
    '     Set "Signing Mode" to "Unsigned" and save it.\n' +
    '  2. Add to your .env: VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name\n' +
    '                        VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name\n' +
    '  3. Restart the dev server (Vite only reads .env on startup).'
  )
}

const RESOURCE_TYPE = { video: 'video', image: 'image', raw: 'raw' }

/**
 * Upload a file directly to Cloudinary from the browser.
 *
 * @param {File} file
 * @param {'video'|'image'|'raw'} resourceType
 * @param {string} [folder] - logical folder, e.g. 'socialpulse/videos'
 * @param {(percent: number) => void} [onProgress]
 * @returns {Promise<{url:string, publicId:string, duration:number, width:number, height:number, bytes:number, format:string}>}
 */
export function uploadToCloudinary (file, resourceType, folder, onProgress) {
  const type = RESOURCE_TYPE[resourceType] || 'auto'
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${type}/upload`

  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)
  if (folder) form.append('folder', folder)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint)

    xhr.upload.onprogress = (evt) => {
      if (onProgress && evt.lengthComputable) {
        onProgress(Math.round((evt.loaded / evt.total) * 100))
      }
    }

    xhr.onload = () => {
      let data = null
      try { data = JSON.parse(xhr.responseText) } catch { /* fall through to error below */ }

      if (xhr.status >= 200 && xhr.status < 300 && data) {
        resolve({
          url:      data.secure_url,
          publicId: data.public_id,
          duration: data.duration || 0,
          width:    data.width    || 0,
          height:   data.height   || 0,
          bytes:    data.bytes    || 0,
          format:   data.format   || '',
        })
      } else {
        reject(new Error(data?.error?.message || `Cloudinary upload failed (HTTP ${xhr.status})`))
      }
    }

    xhr.onerror = () => reject(new Error('Cloudinary upload failed — network error'))
    xhr.send(form)
  })
}

/**
 * Build a thumbnail URL for a video already on Cloudinary, without a
 * separate image upload. Useful as a fallback when the user doesn't
 * provide a custom thumbnail.
 */
export function cloudinaryVideoThumbnail (publicId, { width = 400, height = 400 } = {}) {
  if (!publicId) return ''
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_0,w_${width},h_${height},c_fill/${publicId}.jpg`
}
