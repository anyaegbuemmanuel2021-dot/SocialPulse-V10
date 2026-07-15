#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Grant Admin — bootstrap / promote script
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Grants (or revokes) real admin access to a user, two things at once:
 *   1. Adds/removes the Appwrite `admin` LABEL on their auth account — this
 *      is the actual security boundary. Every collection's permissions grant
 *      update/delete to Role.label('admin'), so this is what really matters.
 *   2. Mirrors it onto the `is_admin` field on their `users` document, purely
 *      so the app can display/query admin status — this field has NO access
 *      control weight on its own.
 *
 * This has to be a server-side script (not a client button) because setting
 * Appwrite Auth labels requires a privileged API key, which must never ship
 * to the browser. Use this to bootstrap your first admin, then that admin's
 * dashboard can call this same logic via a proper Appwrite Function later if
 * you want in-app promotion — that's a follow-up, not built here.
 *
 * USAGE
 *   node appwrite/setup/grant-admin.cjs you@example.com
 *   node appwrite/setup/grant-admin.cjs you@example.com --revoke
 *
 * REQUIRED ENV (reads .env.local, same as setup-collections.cjs)
 *   APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY,
 *   APPWRITE_DATABASE_ID
 *
 * REQUIRED API KEY SCOPES (in addition to what setup-collections.cjs needs)
 *   users.read, users.write
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { readFileSync } = require('fs')
const { Client, Users, Databases, Query } = require('node-appwrite')

const email = process.argv[2]
const revoke = process.argv.includes('--revoke')

if (!email || email.startsWith('--')) {
  console.error('\nUsage: node appwrite/setup/grant-admin.cjs <email> [--revoke]\n')
  process.exit(1)
}

// Same simple .env.local loader used by setup-collections.cjs
function loadEnv () {
  try {
    const raw = readFileSync('.env.local', 'utf8')
    for (const line of raw.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const key = t.slice(0, eq).trim()
      const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    console.warn('.env.local not found — falling back to existing environment variables')
  }
}

// Retry wrapper for the same transient "fetch failed" issue seen in
// setup-collections.cjs — flaky connections should not kill this either.
function patchRetry (Client) {
  const _originalCall = Client.prototype.call
  Client.prototype.call = async function retryingCall (...args) {
    const maxAttempts = 4
    let lastErr
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await _originalCall.apply(this, args)
      } catch (err) {
        lastErr = err
        const isTransient = err instanceof TypeError && err.message === 'fetch failed'
        if (isTransient && attempt < maxAttempts) {
          const delayMs = 500 * attempt
          console.warn(`   ⚠ transient network error, retrying (${attempt}/${maxAttempts - 1}) in ${delayMs}ms…`)
          await new Promise((r) => setTimeout(r, delayMs))
          continue
        }
        throw err
      }
    }
    throw lastErr
  }
}

async function main () {
  loadEnv()
  patchRetry(Client)

  const endpoint   = process.env.APPWRITE_ENDPOINT
  const projectId  = process.env.APPWRITE_PROJECT_ID
  const apiKey     = process.env.APPWRITE_API_KEY
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'socialpulse_db'
  const usersCollection = process.env.APPWRITE_USERS_COLLECTION || process.env.VITE_APPWRITE_USERS_COLLECTION || 'users'

  if (!endpoint || !projectId || !apiKey) {
    console.error('\n❌ Missing APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_API_KEY in .env.local\n')
    process.exit(1)
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
  const users = new Users(client)
  const databases = new Databases(client)

  console.log(`\n🔎 Looking up account for ${email}…`)
  const matches = await users.list([Query.equal('email', email)])
  if (matches.total === 0) {
    console.error(`\n❌ No Appwrite account found with email "${email}". They need to have registered first.\n`)
    process.exit(1)
  }
  const account = matches.users[0]
  console.log(`   found: ${account.name || '(no name)'} — ${account.$id}`)

  const currentLabels = account.labels || []
  let newLabels
  if (revoke) {
    newLabels = currentLabels.filter((l) => l !== 'admin')
  } else {
    newLabels = currentLabels.includes('admin') ? currentLabels : [...currentLabels, 'admin']
  }

  await users.updateLabels(account.$id, newLabels)
  console.log(`   ✓ labels updated: [${newLabels.join(', ') || '(none)'}]`)

  // Mirror onto the users document, if one exists with this $id. Some
  // projects use the auth user $id directly as the document $id — this
  // assumes that pattern, matching how the rest of this codebase creates
  // profile documents at registration.
  try {
    await databases.updateDocument(databaseId, usersCollection, account.$id, {
      is_admin: !revoke,
      updated_at: new Date().toISOString(),
    })
    console.log(`   ✓ users document is_admin field mirrored`)
  } catch (err) {
    console.warn(`   ⚠ could not update users document (${err.message}) — the LABEL is still set correctly, which is what actually matters for access control. You may need to update the is_admin display field manually.`)
  }

  console.log(`\n${revoke ? '🚫 Admin access revoked' : '✅ Admin access granted'} for ${email}.\n`)
  if (!revoke) {
    console.log('They should log out and back in (or refresh) so their session picks up the new label.\n')
  }
}

main().catch((err) => {
  console.error('\n❌ Failed:', err.message)
  process.exit(1)
})
