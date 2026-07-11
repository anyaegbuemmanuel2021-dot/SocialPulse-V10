import { functions, storage } from '@/config/appwrite'
import { uploadToCloudinary } from '@/config/cloudinary'

// The Appwrite Function that performs signed Cloudinary deletion.
// Override with VITE_APPWRITE_CLOUDINARY_FUNCTION_ID if you deploy it
// under a different function ID.
const CLEANUP_FUNCTION_ID = import.meta.env.VITE_APPWRITE_CLOUDINARY_FUNCTION_ID || 'cloudinary-cleanup'

/**
 * Upload a file to Cloudinary. Thin re-export so callers only need to
 * import from one place; kept separate from config/cloudinary.js so the
 * config module stays free of Appwrite-specific concerns.
 */
export function uploadMedia (file, resourceType, folder, onProgress) {
  return uploadToCloudinary(file, resourceType, folder, onProgress)
}

/**
 * Delete a Cloudinary asset via the cloudinary-cleanup Appwrite Function.
 * Deliberately best-effort: an orphaned Cloudinary asset costs storage,
 * but a failed cleanup call should never block the Appwrite document
 * delete the user actually asked for.
 */
export async function deleteMedia (publicId, resourceType = 'image') {
  if (!publicId) return
  try {
    await functions.createExecution(
      CLEANUP_FUNCTION_ID,
      JSON.stringify({ publicId, resourceType }),
      false, // async: false — wait for the result so failures surface in logs
    )
  } catch (err) {
    console.warn(`[media] Cloudinary cleanup failed for ${publicId}:`, err.message)
  }
}

/**
 * Delete a file that predates the Cloudinary migration — i.e. it still
 * lives in Appwrite Storage (url present, no Cloudinary public_id). Kept
 * around purely so old records don't leak storage forever; new uploads
 * never hit this path. Also best-effort, same reasoning as deleteMedia.
 */
export async function deleteLegacyStorageFile (bucket, url) {
  if (!url) return
  try {
    const fileId = url.split('/').slice(-2, -1)[0]
    if (!fileId) return
    await storage.deleteFile(bucket, fileId)
  } catch (err) {
    console.warn(`[media] Legacy storage cleanup failed for ${url}:`, err.message)
  }
}
