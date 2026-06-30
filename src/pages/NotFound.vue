<template>
  <div class="not-found">
    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
      <circle cx="12" cy="12" r="10"/>
      <path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
      <line x1="9" y1="9" x2="9.01" y2="9" stroke-width="3" stroke-linecap="round"/>
      <line x1="15" y1="9" x2="15.01" y2="9" stroke-width="3" stroke-linecap="round"/>
    </svg>
    <h1>404</h1>
    <p>Sorry, this page doesn't exist.</p>
    <router-link to="/" class="btn btn-primary">Go Home</router-link>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 16px; text-align: center; padding: 20px; color: var(--text2);
}
h1 { font-size: 5rem; font-weight: 900; color: var(--primary); line-height: 1; }
p  { font-size: 1.1rem; }
</style>
