import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/',             name: 'home',          component: () => import('@/pages/Home.vue') },
    { path: '/login',        name: 'login',         component: () => import('@/pages/auth/Login.vue'),    meta: { guestOnly: true } },
    { path: '/register',     name: 'register',      component: () => import('@/pages/auth/Register.vue'), meta: { guestOnly: true } },
    { path: '/profile/:id',  name: 'profile',       component: () => import('@/pages/Profile.vue') },
    { path: '/video/:id',    name: 'video',         component: () => import('@/pages/VideoDetail.vue') },
    { path: '/upload',       name: 'upload',        component: () => import('@/pages/Upload.vue'),        meta: { requiresAuth: true } },
    { path: '/search',       name: 'search',        component: () => import('@/pages/Search.vue') },
    { path: '/messages',     name: 'messages',      component: () => import('@/pages/Messages.vue'),      meta: { requiresAuth: true } },
    { path: '/messages/:id', name: 'conversation',  component: () => import('@/pages/Conversation.vue'),  meta: { requiresAuth: true } },
    { path: '/notifications',name: 'notifications', component: () => import('@/pages/Notifications.vue'), meta: { requiresAuth: true } },
    { path: '/settings',     name: 'settings',      component: () => import('@/pages/Settings.vue'),      meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', name: 'notFound',   component: () => import('@/pages/NotFound.vue') },
  ],
})

router.beforeEach((to, from, next) => {
  // We check auth from localStorage token as a lightweight check.
  // Full auth state lives in Pinia (initialized in App.vue).
  const isAuthenticated = !!localStorage.getItem('sp_token')

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }
  if (to.meta.guestOnly && isAuthenticated) {
    return next({ name: 'home' })
  }
  next()
})

export default router
