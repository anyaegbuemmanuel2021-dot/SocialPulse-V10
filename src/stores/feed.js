import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getForYouFeed, getFollowingFeed, getTrendingFeed, getHashtagFeed } from '@/services/feed'

export const useFeedStore = defineStore('feed', () => {
  const videos      = ref([])
  const feedType    = ref('foryou')   // foryou | following | trending
  const loading     = ref(false)
  const hasMore     = ref(true)
  const offset      = ref(0)
  const LIMIT       = 20

  async function loadFeed (type = 'foryou', userId = null, reset = true) {
    if (reset) { videos.value = []; offset.value = 0; hasMore.value = true }
    if (!hasMore.value || loading.value) return

    loading.value = true
    feedType.value = type

    try {
      let fetched = []
      switch (type) {
        case 'following':
          fetched = await getFollowingFeed(userId, LIMIT, offset.value)
          break
        case 'trending':
          fetched = await getTrendingFeed(LIMIT, offset.value)
          break
        default:
          fetched = await getForYouFeed(LIMIT, offset.value)
      }
      if (fetched.length < LIMIT) hasMore.value = false
      videos.value  = reset ? fetched : [...videos.value, ...fetched]
      offset.value += fetched.length
    } catch (e) {
      console.error('Feed error:', e)
    } finally {
      loading.value = false
    }
  }

  function reset () {
    videos.value = []; offset.value = 0; hasMore.value = true; loading.value = false
  }

  function updateVideoInFeed (videoId, changes) {
    const idx = videos.value.findIndex(v => v.$id === videoId)
    if (idx !== -1) videos.value[idx] = { ...videos.value[idx], ...changes }
  }

  return { videos, feedType, loading, hasMore, loadFeed, reset, updateVideoInFeed }
})
