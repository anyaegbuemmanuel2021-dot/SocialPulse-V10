import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
    {
      path: '/admin',
      component: () => import('@/pages/admin/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: '',          name: 'admin-dashboard', component: () => import('@/pages/admin/Dashboard.vue') },
        { path: 'users',     name: 'admin-users',     component: () => import('@/pages/admin/Users.vue') },
        { path: 'content',   name: 'admin-content',   component: () => import('@/pages/admin/Content.vue') },
        { path: 'reports',   name: 'admin-reports',   component: () => import('@/pages/admin/Reports.vue') },
        { path: 'hashtags',  name: 'admin-hashtags',  component: () => import('@/pages/admin/Hashtags.vue') },
        { path: 'site',      name: 'admin-site',      component: () => import('@/pages/admin/SiteControl.vue') },
        { path: 'logs',      name: 'admin-logs',      component: () => import('@/pages/admin/AuditLog.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'notFound',   component: () => import('@/pages/NotFound.vue') },
  ],
})

router.beforeEach(async (to, from, next) => {
  // We check auth from localStorage token as a lightweight check.
  // Full auth state lives in Pinia (initialized in App.vue).
  const isAuthenticated = !!localStorage.getItem('sp_token')

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }
  if (to.meta.guestOnly && isAuthenticated) {
    return next({ name: 'home' })
  }

  if (to.meta.requiresAdmin) {
    // This is a UX gate only — hides the UI for non-admins so they don't
    // land on a broken/empty admin page. It is NOT the real security
    // boundary: every admin.js write is enforced server-side by Appwrite
    // via Permission.update/delete(Role.label('admin')) on each collection,
    // so even if someone bypassed this guard entirely, unauthorized writes
    // would still be rejected by Appwrite itself.
    const auth = useAuthStore()
    if (!auth.user) await auth.init() // ensure labels are loaded before checking
    if (!auth.isAdmin) {
      return next({ name: 'home' })
    }
  }

  next()
})

export default router
