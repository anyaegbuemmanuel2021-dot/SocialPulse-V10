<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <h2>⚙ Admin</h2>
      <router-link :to="{ name: 'admin-dashboard' }">Dashboard</router-link>
      <router-link :to="{ name: 'admin-users' }">Users</router-link>
      <router-link :to="{ name: 'admin-content' }">Content</router-link>
      <router-link :to="{ name: 'admin-reports' }">Reports</router-link>
      <router-link :to="{ name: 'admin-hashtags' }">Hashtags</router-link>
      <router-link :to="{ name: 'admin-site' }">Site Control</router-link>
      <router-link :to="{ name: 'admin-logs' }">Audit Log</router-link>
      <router-link :to="{ name: 'home' }" style="margin-top: 16px; opacity: 0.6;">← Back to site</router-link>
    </aside>
    <main class="admin-main">
      <router-view />
    </main>
  </div>
</template>
