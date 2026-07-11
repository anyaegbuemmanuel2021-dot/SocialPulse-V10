// Appwrite Function: cloudinary-cleanup
//
// Deletes a Cloudinary asset. Exists only because Cloudinary's destroy API
// requires a *signed* request (your API secret) — that can never live in
// browser code, so the client calls this function instead of Cloudinary
// directly. See src/services/media.js for the calling side.
//
// Required environment variables (set these in the Appwrite Console under
// this function's Settings -> Variables, NOT in the frontend .env):
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET
//
// Required execute permission: restrict this function to `users` (logged-in
// members only) when you create it, so anonymous callers can't spam deletes.

import { v2 as cloudinary } from 'cloudinary'

export default async ({ req, res, log, error }) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  if (req.method !== 'POST') {
    return res.json({ ok: false, error: 'POST only' }, 405)
  }

  let payload
  try {
    payload = JSON.parse(req.bodyRaw || req.body || '{}')
  } catch {
    return res.json({ ok: false, error: 'Invalid JSON body' }, 400)
  }

  const { publicId, resourceType = 'image' } = payload

  if (!publicId) {
    return res.json({ ok: false, error: 'publicId is required' }, 400)
  }
  if (!['image', 'video', 'raw'].includes(resourceType)) {
    return res.json({ ok: false, error: 'resourceType must be image, video, or raw' }, 400)
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
    log(`Destroyed ${resourceType}/${publicId}: ${result.result}`)
    return res.json({ ok: true, result: result.result })
  } catch (err) {
    error(`Failed to destroy ${resourceType}/${publicId}: ${err.message}`)
    return res.json({ ok: false, error: err.message }, 500)
  }
}
