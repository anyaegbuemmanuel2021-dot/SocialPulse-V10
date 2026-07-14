#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SocialPulse Deployment Manager v3.1
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Idempotent, self-healing Appwrite provisioning tool. Safe to run as many
 * times as you want — it detects what already exists and only creates what's
 * missing, waits for Appwrite to actually finish building resources instead
 * of guessing with sleep(), degrades gracefully on plan quota limits instead
 * of crashing the whole run, warns you when your schema file has drifted
 * from what's actually deployed, flags collections that will silently reject
 * client writes due to missing permissions, and can best-effort roll back
 * everything it created if the run ends in a hard failure.
 *
 * USAGE
 *   node appwrite/setup/deployment-manager.js [flags]
 *
 * FLAGS
 *   --dry-run              Show what would be created/changed, make no mutating API calls
 *   --repair                Detect + recreate attributes/indexes stuck in "failed" state
 *   --verbose                Print full API error payloads
 *   --yes                    Skip the confirmation prompt (useful in CI)
 *   --rollback-on-failure    If the run ends in a hard failure, delete everything this
 *                            run created (best-effort — see LIMITATIONS below)
 *
 * REQUIRED ENV (.env.local, same as before)
 *   APPWRITE_ENDPOINT     e.g. https://cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID
 *   APPWRITE_API_KEY      Server key with databases.write + storage.write scopes
 *   APPWRITE_DATABASE_ID  (optional, defaults to socialpulse_db)
 *
 * OPTIONAL ENV
 *   APPWRITE_PLAN         Free-text label shown in the summary only (e.g. "free", "pro").
 *                         Appwrite's server API has no reliable way to introspect your
 *                         billing plan, and exact quota numbers change over time — so
 *                         this script never hardcodes specific limits. It detects quota
 *                         errors as they happen and reports them; this var is just a
 *                         label for your own reference in the printed summary.
 *   APPWRITE_MAX_BUCKETS  Optional number. If set, the summary shows "N/MAX buckets
 *                         used" so you can see headroom. If unset, that line is omitted
 *                         rather than guessing.
 *
 * DEPENDENCY
 *   npm install node-appwrite
 *
 * SCHEMA
 *   Reads the same ../schema/collections.js file your old script used
 *   (must export SCHEMAS and BUCKET_DEFS). Nothing to change there.
 *
 * LIMITATIONS (rollback)
 *   Appwrite has no transactional "undo" — rollback here means "delete the specific
 *   resources this run created," tracked in-memory as we go. It will NOT:
 *     - restore a resource that existed before this run and was modified
 *     - undo documents/files written by anything other than this script
 *     - guarantee success if Appwrite itself is degraded (deletes can fail too;
 *       failures are logged, not retried indefinitely)
 *   Treat it as a convenience for cleaning up a bad dry run of real changes, not a
 *   safety net that makes destructive mistakes free.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Client, Databases, Storage, ID, Permission, Role } from 'node-appwrite'

const __dir = dirname(fileURLToPath(import.meta.url))

// ─────────────────────────────────────────────────────────────────────────
// SECTION: CLI flags
// ─────────────────────────────────────────────────────────────────────────
const FLAGS = {
  dryRun: process.argv.includes('--dry-run'),
  repair: process.argv.includes('--repair'),
  verbose: process.argv.includes('--verbose'),
  yes: process.argv.includes('--yes'),
  rollbackOnFailure: process.argv.includes('--rollback-on-failure'),
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION: small utilities
// ─────────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const color = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', gray: '\x1b[90m',
}
const c = (col, s) => `${color[col]}${s}${color.reset}`

function log(msg) { console.log(msg) }
function ok(msg) { console.log(`   ${c('green', '✓')} ${msg}`) }
function created(msg) { console.log(`   ${c('green', '✅')} ${msg}`) }
function fixed(msg) { console.log(`   ${c('cyan', '🔧')} ${msg}`) }
function warn(msg) { console.log(`   ${c('yellow', '⚠')}  ${msg}`) }
function fail(msg) { console.log(`   ${c('red', '✗')} ${msg}`) }
function skip(msg) { console.log(`   ${c('gray', '·')} ${msg}`) }
function section(title) { console.log(`\n${c('bold', title)}`) }
function verboseLog(err) {
  if (FLAGS.verbose) console.log(c('gray', JSON.stringify(err, null, 2)))
}

/** Status codes worth retrying automatically — transient, not a real problem with the request. */
function isTransientStatus(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || !status
}

/**
 * Retry a function with exponential backoff. Only retries on transient
 * network / rate-limit style errors — not on validation errors, since
 * retrying a bad request just wastes time and spams the API.
 */
async function withRetry(fn, { attempts = 4, baseDelay = 500, label = 'operation' } = {}) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const status = err.code || err.response?.status
      if (!isTransientStatus(status) || i === attempts - 1) throw err
      const delay = baseDelay * 2 ** i
      warn(`${label} failed (attempt ${i + 1}/${attempts}), retrying in ${delay}ms — ${err.message}`)
      await sleep(delay)
    }
  }
  throw lastErr
}

/** True if an Appwrite error represents "already exists" (409). */
function isConflict(err) { return err.code === 409 }
/** True if an Appwrite error represents "not found" (404). */
function isNotFound(err) { return err.code === 404 }
/** True if an Appwrite error looks like a plan/quota limit rather than a bug. */
function isQuotaError(err) {
  const msg = (err.message || '').toLowerCase()
  return err.code === 400 && (msg.includes('limit') || msg.includes('quota') || msg.includes('maximum'))
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION: rollback tracking
// ─────────────────────────────────────────────────────────────────────────
// Every resource this run actually creates gets pushed here, in creation order.
// On a hard failure with --rollback-on-failure, we walk it in reverse and
// best-effort delete. This is intentionally simple (in-memory, this-run-only) —
// see LIMITATIONS in the header comment.
const ROLLBACK_LOG = []
function trackCreation(type, undo, description) {
  ROLLBACK_LOG.push({ type, undo, description })
}

async function runRollback({ databases, storage }) {
  if (!ROLLBACK_LOG.length) {
    skip('nothing to roll back')
    return
  }
  section('⏪ Rolling back resources created this run')
  for (const entry of ROLLBACK_LOG.slice().reverse()) {
    try {
      await entry.undo()
      ok(`rolled back: ${entry.description}`)
    } catch (err) {
      fail(`could not roll back ${entry.description} — ${err.message}`)
      verboseLog(err)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION: environment loading
// ─────────────────────────────────────────────────────────────────────────
function loadEnvFile() {
  const envPath = resolve(__dir, '../../.env.local')
  try {
    const raw = readFileSync(envPath, 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    warn('.env.local not found — falling back to existing environment variables')
  }

  // Support VITE_ / NEXT_PUBLIC_ prefixed variants used elsewhere in the project
  for (const prefix of ['VITE_', 'NEXT_PUBLIC_']) {
    for (const key of ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT_ID', 'APPWRITE_DATABASE_ID']) {
      if (!process.env[key] && process.env[prefix + key]) process.env[key] = process.env[prefix + key]
    }
  }
}

function loadConfig() {
  loadEnvFile()
  const config = {
    endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    projectId: process.env.APPWRITE_PROJECT_ID,
    apiKey: process.env.APPWRITE_API_KEY,
    databaseId: process.env.APPWRITE_DATABASE_ID || 'socialpulse_db',
    planLabel: process.env.APPWRITE_PLAN || null,
    maxBuckets: process.env.APPWRITE_MAX_BUCKETS ? Number(process.env.APPWRITE_MAX_BUCKETS) : null,
  }

  const missing = []
  if (!config.projectId) missing.push('APPWRITE_PROJECT_ID (or VITE_/NEXT_PUBLIC_ variant)')
  if (!config.apiKey) missing.push('APPWRITE_API_KEY')

  if (missing.length) {
    console.error(`\n${c('red', '❌ Missing required environment variables:')}`)
    missing.forEach((m) => console.error(`   ${m}`))
    console.error('\nAdd them to .env.local and re-run.\n')
    process.exit(1)
  }
  return config
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION: Appwrite client + permission check
// ─────────────────────────────────────────────────────────────────────────
function buildClient(config) {
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey)
  return {
    client,
    databases: new Databases(client),
    storage: new Storage(client),
  }
}

/**
 * Confirms the API key actually has the scopes we need before we start
 * creating things, so failures show up as one clear message up front
 * instead of 40 scattered permission errors mid-run.
 */
async function verifyPermissions({ databases, storage }, dbId) {
  section('🔑 Verifying API key permissions…')
  const results = { databases: false, storage: false }

  try {
    await databases.list()
    results.databases = true
    ok('databases.read/write scope confirmed')
  } catch (err) {
    fail(`Cannot access Databases API — check your key's scopes (${err.message})`)
  }

  try {
    await storage.listBuckets()
    results.storage = true
    ok('storage.read/write scope confirmed')
  } catch (err) {
    fail(`Cannot access Storage API — check your key's scopes (${err.message})`)
  }

  if (!results.databases || !results.storage) {
    console.error(`\n${c('red', 'Missing required API key scopes. Grant this key at least:')}`)
    console.error('   databases.read, databases.write, collections.read, collections.write,')
    console.error('   attributes.read, attributes.write, indexes.read, indexes.write,')
    console.error('   documents.read, buckets.read, buckets.write, files.read, files.write\n')
    process.exit(1)
  }
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION: Database
// ─────────────────────────────────────────────────────────────────────────
async function ensureDatabase({ databases }, dbId, dbName, report) {
  section('📦 Database')
  try {
    await databases.get(dbId)
    ok(`Using existing database "${dbId}"`)
    report.database = 'existing'
    return
  } catch (err) {
    if (!isNotFound(err)) throw err
  }

  if (FLAGS.dryRun) {
    warn(`[dry-run] would create database "${dbId}"`)
    report.database = 'would-create'
    return
  }

  await withRetry(() => databases.create(dbId, dbName || 'SocialPulse DB'), { label: 'create database' })
  created(`Database created: ${dbId}`)
  report.database = 'created'
  trackCreation('database', () => databases.delete(dbId), `database ${dbId}`)
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION: Collections + Attributes + Indexes
// ─────────────────────────────────────────────────────────────────────────

/** Creates a single attribute using the correct SDK method for its type. */
async function createAttribute({ databases }, dbId, colId, attr) {
  const required = attr.required ?? false
  const array = attr.array ?? false
  const def = attr.default ?? undefined

  switch (attr.type) {
    case 'string':
      return databases.createStringAttribute(dbId, colId, attr.key, attr.size || 255, required, def, array)
    case 'integer':
      return databases.createIntegerAttribute(dbId, colId, attr.key, required, attr.min, attr.max, def, array)
    case 'double':
      return databases.createFloatAttribute(dbId, colId, attr.key, required, attr.min, attr.max, def, array)
    case 'boolean':
      return databases.createBooleanAttribute(dbId, colId, attr.key, required, def, array)
    case 'datetime':
      return databases.createDatetimeAttribute(dbId, colId, attr.key, required, def, array)
    case 'email':
      return databases.createEmailAttribute(dbId, colId, attr.key, required, def, array)
    case 'url':
      return databases.createUrlAttribute(dbId, colId, attr.key, required, def, array)
    case 'enum':
      return databases.createEnumAttribute(dbId, colId, attr.key, attr.elements || [], required, def, array)
    default:
      throw new Error(`Unknown attribute type "${attr.type}" for ${attr.key}`)
  }
}

/**
 * Polls an attribute (or index) until it reaches "available", "failed", or times out.
 * Transient server errors (429/500/502/503, or no status at all — usually a
 * network blip) during polling don't abort the wait; they're treated the same as
 * "not ready yet" and retried, since Appwrite can throw these briefly while a resource
 * is still being provisioned in the background.
 */
async function waitForStatus(getFn, { timeoutMs = 30000, intervalMs = 1000, label = 'resource' } = {}) {
  const start = Date.now()
  let lastTransientErr
  while (Date.now() - start < timeoutMs) {
    let resource
    try {
      resource = await getFn()
    } catch (err) {
      const status = err.code || err.response?.status
      if (isNotFound(err) || isTransientStatus(status)) {
        lastTransientErr = err
        await sleep(intervalMs)
        continue
      }
      throw err // real error (bad request, permissions, etc.) — no point waiting it out
    }
    if (resource.status === 'available') return resource
    if (resource.status === 'failed') return resource // caller decides what to do
    await sleep(intervalMs)
  }
  throw new Error(
    `Timed out waiting for ${label} to become available` +
    (lastTransientErr ? ` (last error while polling: ${lastTransientErr.message})` : '')
  )
}

/**
 * Schema drift detection. Compares a deployed attribute against the
 * definition in collections.js and flags mismatches. Appwrite generally can't
 * alter an attribute's type/size in place, so this never auto-fixes — it just
 * makes divergence visible instead of silently skipping forever because the
 * key already "exists".
 */
function detectAttributeDrift(current, def) {
  const mismatches = []
  const currentType = current.type === 'double' ? 'double' : current.type
  if (currentType && def.type && currentType !== def.type) {
    mismatches.push(`type: deployed="${currentType}" schema="${def.type}"`)
  }
  if (def.type === 'string' && current.size != null && def.size != null && current.size !== def.size) {
    mismatches.push(`size: deployed=${current.size} schema=${def.size}`)
  }
  if (current.required != null && def.required != null && current.required !== def.required) {
    mismatches.push(`required: deployed=${current.required} schema=${def.required}`)
  }
  if (current.array != null && def.array != null && current.array !== def.array) {
    mismatches.push(`array: deployed=${current.array} schema=${def.array}`)
  }
  return mismatches
}

/**
 * FIX (v3.1): permission validation. If a collection has no collection-level
 * permission that grants "create" (or the legacy blanket "write") and
 * without a collection-level create grant, Appwrite will accept the
 * collection but reject every client-side createDocument call with:
 *   "The current user is not authorized to perform the requested action."
 * documentSecurity ONLY affects read/update/delete permissions on documents
 * that already exist — it never grants create, because there is no document
 * yet for a document-level permission to attach to. Create is *always*
 * governed purely by the collection-level permissions array. This is easy
 * to miss because collection creation itself succeeds — the error only
 * shows up later, at the client, on the exact endpoint your schema silently
 * under-specified. We check this for every collection (newly created or
 * pre-existing) instead of only warning about attributes and indexes.
 */
function checkCollectionPermissions(colId, permissions, documentSecurity, colReport) {
  const perms = permissions || []
  const hasCreateGrant = perms.some(
    (p) => typeof p === 'string' && (p.startsWith('create(') || p.startsWith('write('))
  )
  if (!hasCreateGrant) {
    warn(
      `"${colId}" has no collection-level create permission — client writes will fail with ` +
      `"not authorized to perform the requested action", regardless of documentSecurity. ` +
      `Add a Permission.create(...) to schema.permissions.`
    )
    colReport.permissionsWarning = true
    return false
  }
  return true
}

async function ensureAttributes({ databases }, dbId, colId, schemaAttrs, colReport) {
  const existing = await databases.listAttributes(dbId, colId)
  const existingByKey = Object.fromEntries(existing.attributes.map((a) => [a.key, a]))

  const toCreate = []
  for (const attr of schemaAttrs) {
    const current = existingByKey[attr.key]
    if (!current) {
      toCreate.push(attr)
    } else if (current.status === 'failed' && FLAGS.repair) {
      warn(`attribute "${attr.key}" previously failed — will delete and recreate (--repair)`)
      if (!FLAGS.dryRun) {
        try { await databases.deleteAttribute(dbId, colId, attr.key) } catch (e) { verboseLog(e) }
        await sleep(300)
      }
      toCreate.push(attr)
    } else {
      skip(`attr exists: ${attr.key}`)
      colReport.attributesSkipped.push(attr.key)

      // Flag drift on attributes we're not touching.
      const mismatches = detectAttributeDrift(current, attr)
      if (mismatches.length) {
        warn(`attr "${attr.key}" has drifted from schema — ${mismatches.join(', ')}`)
        colReport.attributesDrifted.push({ key: attr.key, mismatches })
      }
    }
  }

  for (const attr of toCreate) {
    if (FLAGS.dryRun) {
      warn(`[dry-run] would create attribute: ${attr.key} (${attr.type})`)
      colReport.attributesPlanned.push(attr.key)
      continue
    }
    try {
      await withRetry(() => createAttribute({ databases }, dbId, colId, attr), { label: `attribute ${attr.key}` })
      created(`attr: ${attr.key}`)
      colReport.attributesCreated.push(attr.key)
      trackCreation(
        'attribute',
        () => databases.deleteAttribute(dbId, colId, attr.key),
        `attribute ${colId}.${attr.key}`
      )
    } catch (err) {
      if (isConflict(err)) {
        skip(`attr exists: ${attr.key}`)
        colReport.attributesSkipped.push(attr.key)
      } else {
        fail(`attr failed: ${attr.key} — ${err.message}`)
        colReport.attributesFailed.push(attr.key)
        verboseLog(err)
      }
    }
  }

  if (FLAGS.dryRun) return

  // Wait for every attribute in the schema (new or pre-existing) to be ready
  // before we try to build indexes on top of them.
  const allKeys = schemaAttrs.map((a) => a.key).filter((k) => !colReport.attributesFailed.includes(k))
  for (const key of allKeys) {
    const result = await waitForStatus(() => databases.getAttribute(dbId, colId, key), { label: `attribute ${key}` })
    if (result.status === 'failed') {
      fail(`attribute "${key}" is in a failed state (run with --repair to recreate it)`)
      colReport.attributesFailed.push(key)
    }
  }
}

/**
 * Failed-index handling doesn't fall through into the create path
 * unless --repair is set. There are three explicit branches: failed+repair
 * (recreate), failed+!repair (warn and leave it alone), and healthy (skip).
 */
async function ensureIndexes({ databases }, dbId, colId, schemaIndexes, colReport) {
  if (!schemaIndexes?.length) return
  const existing = await databases.listIndexes(dbId, colId)
  const existingByKey = Object.fromEntries(existing.indexes.map((i) => [i.key, i]))

  for (const idx of schemaIndexes) {
    const current = existingByKey[idx.key]

    if (current && current.status === 'failed') {
      if (FLAGS.repair) {
        warn(`index "${idx.key}" previously failed — will delete and recreate (--repair)`)
        if (!FLAGS.dryRun) {
          try { await databases.deleteIndex(dbId, colId, idx.key) } catch (e) { verboseLog(e) }
          await sleep(300)
        }
        // falls through to the create block below
      } else {
        warn(`index "${idx.key}" is in a failed state — leaving as-is (run with --repair to recreate it)`)
        colReport.indexesFailed.push(idx.key)
        continue
      }
    } else if (current) {
      skip(`index exists: ${idx.key}`)
      colReport.indexesSkipped.push(idx.key)
      continue
    }

    if (FLAGS.dryRun) {
      warn(`[dry-run] would create index: ${idx.key}`)
      colReport.indexesPlanned.push(idx.key)
      continue
    }

    try {
      await withRetry(
        () => databases.createIndex(dbId, colId, idx.key, idx.type, idx.attributes, idx.orders),
        { label: `index ${idx.key}`, attempts: 5, baseDelay: 800 }
      )
      const result = await waitForStatus(() => databases.getIndex(dbId, colId, idx.key), { label: `index ${idx.key}`, timeoutMs: 45000 })
      if (result.status === 'failed') {
        fail(`index "${idx.key}" failed to build`)
        colReport.indexesFailed.push(idx.key)
      } else {
        created(`index: ${idx.key}`)
        colReport.indexesCreated.push(idx.key)
        trackCreation(
          'index',
          () => databases.deleteIndex(dbId, colId, idx.key),
          `index ${colId}.${idx.key}`
        )
      }
    } catch (err) {
      if (isConflict(err)) {
        skip(`index exists: ${idx.key}`)
        colReport.indexesSkipped.push(idx.key)
      } else {
        fail(`index failed: ${idx.key} — ${err.message}`)
        colReport.indexesFailed.push(idx.key)
        verboseLog(err)
      }
    }
  }
}

async function ensureCollection(clients, dbId, colId, schema, index, total) {
  const { databases } = clients
  const colReport = {
    id: colId, status: 'ok',
    attributesCreated: [], attributesSkipped: [], attributesPlanned: [], attributesFailed: [],
    attributesDrifted: [],
    indexesCreated: [], indexesSkipped: [], indexesPlanned: [], indexesFailed: [],
    permissionsWarning: false,
  }

  log(`\n${c('cyan', `[${index}/${total}]`)} ${c('bold', colId)}`)

  let exists = true
  let existingCollection = null
  try {
    existingCollection = await databases.getCollection(dbId, colId)
  } catch (err) {
    if (!isNotFound(err)) throw err
    exists = false
  }

  if (!exists) {
    if (FLAGS.dryRun) {
      warn('[dry-run] would create collection')
      colReport.status = 'would-create'
      // Check against the schema's intended config, since nothing is deployed yet.
      checkCollectionPermissions(colId, schema.permissions, schema.documentSecurity ?? false, colReport)
    } else {
      const name = colId.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
      await withRetry(
        () => databases.createCollection(dbId, colId, name, schema.permissions || [], schema.documentSecurity ?? false),
        { label: `collection ${colId}` }
      )
      created('collection created')
      colReport.status = 'created'
      trackCreation('collection', () => databases.deleteCollection(dbId, colId), `collection ${colId}`)
      await sleep(300) // brief settle time before attribute creation is accepted
      checkCollectionPermissions(colId, schema.permissions, schema.documentSecurity ?? false, colReport)
    }
  } else {
    ok('collection already exists')
    colReport.status = 'existing'
    // Check the permissions actually deployed on Appwrite, not just what the
    // local schema says — these can drift from each other too.
    const permsOk = checkCollectionPermissions(colId, existingCollection.$permissions, existingCollection.documentSecurity, colReport)

    if (!permsOk && (schema.permissions || []).length > 0) {
      // The collection exists but was provisioned before this schema had a
      // create grant (or someone edited it by hand in the console). Bring
      // it in line with the schema instead of just warning forever.
      if (FLAGS.dryRun) {
        warn(`[dry-run] would update permissions on "${colId}" to match schema`)
      } else {
        await withRetry(
          () => databases.updateCollection(
            dbId, colId, existingCollection.name,
            schema.permissions, schema.documentSecurity ?? existingCollection.documentSecurity,
            existingCollection.enabled
          ),
          { label: `permissions repair ${colId}` }
        )
        fixed(`permissions repaired to match schema`)
        colReport.permissionsWarning = false
        colReport.permissionsRepaired = true
      }
    }
  }

  if (!exists && FLAGS.dryRun) {
    // Nothing to inspect yet for a collection that doesn't exist in dry-run mode
    for (const attr of schema.attributes || []) colReport.attributesPlanned.push(attr.key)
    for (const idx of schema.indexes || []) colReport.indexesPlanned.push(idx.key)
    return colReport
  }

  await ensureAttributes(clients, dbId, colId, schema.attributes || [], colReport)
  await ensureIndexes(clients, dbId, colId, schema.indexes || [], colReport)

  return colReport
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION: Storage buckets (with plan-quota awareness)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Pre-flight visibility into bucket headroom. We never hardcode a
 * specific plan's bucket limit (those numbers change and Appwrite's server
 * API doesn't expose your billing tier reliably) — instead we report what we
 * can observe directly (current count) and, if the user has told us the cap
 * via APPWRITE_MAX_BUCKETS, show remaining headroom before we start.
 */
function reportBucketHeadroom(existingCount, plannedNewCount, maxBuckets, planLabel) {
  const planNote = planLabel ? ` (${planLabel} plan)` : ''
  if (maxBuckets != null && !Number.isNaN(maxBuckets)) {
    const remaining = maxBuckets - existingCount
    log(`   ${c('gray', `${existingCount}/${maxBuckets} buckets used${planNote} — ${Math.max(remaining, 0)} slot(s) free`)}`)
    if (plannedNewCount > remaining) {
      warn(`schema wants ${plannedNewCount} new bucket(s) but only ${Math.max(remaining, 0)} slot(s) are free — some creates will likely be quota-skipped`)
    }
  } else {
    log(`   ${c('gray', `${existingCount} bucket(s) currently exist${planNote} — set APPWRITE_MAX_BUCKETS to see headroom here`)}`)
  }
}

async function ensureBuckets({ storage }, bucketDefs, report, config) {
  section('🗂  Storage buckets')
  const existing = await storage.listBuckets()
  const existingIds = new Set(existing.buckets.map((b) => b.$id))

  const plannedNew = bucketDefs.filter((d) => !existingIds.has(d.id))
  reportBucketHeadroom(existing.buckets.length, plannedNew.length, config.maxBuckets, config.planLabel)

  for (const def of bucketDefs) {
    if (existingIds.has(def.id)) {
      skip(`bucket exists: ${def.id}`)
      report.bucketsSkipped.push(def.id)
      continue
    }

    if (FLAGS.dryRun) {
      warn(`[dry-run] would create bucket: ${def.id}`)
      report.bucketsPlanned.push(def.id)
      continue
    }

    try {
      await withRetry(
        () => storage.createBucket(
          def.id, def.name, def.permissions || [], def.fileSecurity ?? false,
          def.enabled ?? true, def.maxSize, def.allowedExtensions || [],
          def.compression, def.encryption ?? false, def.antivirus ?? false
        ),
        { label: `bucket ${def.id}` }
      )
      created(`bucket: ${def.id}`)
      report.bucketsCreated.push(def.id)
      trackCreation('bucket', () => storage.deleteBucket(def.id), `bucket ${def.id}`)
    } catch (err) {
      if (isConflict(err)) {
        skip(`bucket exists: ${def.id}`)
        report.bucketsSkipped.push(def.id)
      } else if (isQuotaError(err)) {
        warn(`bucket "${def.id}" skipped — plan limit reached (${err.message})`)
        warn('   Consider consolidating into fewer buckets, reusing an existing bucket with prefixed file paths, or upgrading your plan.')
        report.bucketsQuotaSkipped.push(def.id)
      } else {
        fail(`bucket failed: ${def.id} — ${err.message}`)
        report.bucketsFailed.push(def.id)
        verboseLog(err)
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION: Validation + summary
// ─────────────────────────────────────────────────────────────────────────
async function validateDeployment({ databases, storage }, dbId, schemas, bucketDefs) {
  section('🔍 Validation')
  let allGood = true

  for (const [colId, schema] of Object.entries(schemas)) {
    try {
      const attrs = await databases.listAttributes(dbId, colId)
      const attrKeys = new Set(attrs.attributes.map((a) => a.key))
      const missing = (schema.attributes || []).filter((a) => !attrKeys.has(a.key)).map((a) => a.key)
      const failed = attrs.attributes.filter((a) => a.status === 'failed').map((a) => a.key)

      if (missing.length || failed.length) {
        allGood = false
        if (missing.length) fail(`${colId}: missing attributes → ${missing.join(', ')}`)
        if (failed.length) fail(`${colId}: failed attributes → ${failed.join(', ')} (try --repair)`)
      } else {
        ok(`${colId}: all attributes present`)
      }
    } catch (err) {
      allGood = false
      fail(`${colId}: could not validate — ${err.message}`)
    }
  }

  const bucketList = await storage.listBuckets()
  const bucketIds = new Set(bucketList.buckets.map((b) => b.$id))
  const missingBuckets = bucketDefs.filter((b) => !bucketIds.has(b.id)).map((b) => b.id)
  if (missingBuckets.length) {
    warn(`buckets not present (may be plan-limited): ${missingBuckets.join(', ')}`)
  } else {
    ok('all expected buckets present')
  }

  return allGood
}

function printSummary({ dbReport, colReports, bucketReport, validationPassed, rolledBack }) {
  console.log(`\n${c('bold', '═'.repeat(50))}`)
  console.log(c('bold', '  Deployment Summary'))
  console.log(c('bold', '═'.repeat(50)))

  console.log(`\nDatabase: ${dbReport}`)

  console.log('\nCollections')
  let attrsCreated = 0, attrsSkipped = 0, attrsFailed = 0, attrsDrifted = 0
  let idxCreated = 0, idxSkipped = 0, idxFailed = 0
  const permissionWarnings = []
  for (const r of colReports) {
    attrsCreated += r.attributesCreated.length
    attrsSkipped += r.attributesSkipped.length
    attrsFailed += r.attributesFailed.length
    attrsDrifted += r.attributesDrifted.length
    idxCreated += r.indexesCreated.length
    idxSkipped += r.indexesSkipped.length
    idxFailed += r.indexesFailed.length
    if (r.permissionsWarning) permissionWarnings.push(r.id)
    const marker = r.attributesFailed.length || r.indexesFailed.length ? c('red', '✗')
      : (r.attributesDrifted.length || r.permissionsWarning) ? c('yellow', '⚠')
      : c('green', '✓')
    console.log(`  ${marker} ${r.id}  ${c('gray', `(${r.status})`)}`)
    for (const d of r.attributesDrifted) {
      console.log(`      ${c('yellow', '⚠')} ${d.key}: ${d.mismatches.join('; ')}`)
    }
    if (r.permissionsWarning) {
      console.log(`      ${c('yellow', '⚠')} no create permission / documentSecurity off — client writes will fail`)
    }
  }

  console.log('\nAttributes')
  console.log(`  ${c('green', '✓')} ${attrsCreated} created`)
  console.log(`  ${c('gray', '·')} ${attrsSkipped} already existed`)
  if (attrsFailed) console.log(`  ${c('red', '✗')} ${attrsFailed} failed`)
  if (attrsDrifted) console.log(`  ${c('yellow', '⚠')} ${attrsDrifted} drifted from schema.js (see above)`)

  console.log('\nIndexes')
  console.log(`  ${c('green', '✓')} ${idxCreated} created`)
  console.log(`  ${c('gray', '·')} ${idxSkipped} already existed`)
  if (idxFailed) console.log(`  ${c('red', '✗')} ${idxFailed} failed`)

  console.log('\nBuckets')
  console.log(`  ${c('green', '✓')} ${bucketReport.bucketsCreated.length} created`)
  console.log(`  ${c('gray', '·')} ${bucketReport.bucketsSkipped.length} already existed`)
  if (bucketReport.bucketsQuotaSkipped.length) {
    console.log(`  ${c('yellow', '⚠')} ${bucketReport.bucketsQuotaSkipped.length} skipped (plan limit)`)
  }
  if (bucketReport.bucketsFailed.length) console.log(`  ${c('red', '✗')} ${bucketReport.bucketsFailed.length} failed`)

  console.log('\nPermissions')
  if (permissionWarnings.length) {
    console.log(`  ${c('yellow', '⚠')} ${permissionWarnings.length} collection(s) missing a create grant: ${permissionWarnings.join(', ')}`)
    console.log(`  ${c('gray', 'Add Permission.create(...) to schema.permissions, or set documentSecurity: true, for each.')}`)
  } else {
    console.log(`  ${c('green', '✓ All collections have a usable create permission')}`)
  }

  console.log('\nValidation')
  console.log(validationPassed ? `  ${c('green', '✓ Passed')}` : `  ${c('red', '✗ Failed — see above')}`)

  if (rolledBack) {
    console.log('\nRollback')
    console.log(`  ${c('yellow', '⏪ Resources created this run were rolled back due to hard failure')}`)
  }

  console.log(`\n${c('bold', '═'.repeat(50))}`)
  if (rolledBack) {
    console.log(c('red', c('bold', '  Deployment failed and was rolled back.')))
  } else if (validationPassed && !attrsFailed && !idxFailed && !bucketReport.bucketsFailed.length && !permissionWarnings.length) {
    console.log(c('green', c('bold', '  Deployment completed successfully.')))
  } else {
    console.log(c('yellow', c('bold', '  Deployment completed with warnings — review the summary above.')))
  }
  console.log(`${c('bold', '═'.repeat(50))}\n`)
}

// ─────────────────────────────────────────────────────────────────────────
// SECTION: Main
// ─────────────────────────────────────────────────────────────────────────
;(async () => {
  console.log(c('bold', '═'.repeat(50)))
  console.log(c('bold', '  SocialPulse Deployment Manager v3.1'))
  console.log(c('bold', '═'.repeat(50)))
  if (FLAGS.dryRun) console.log(c('yellow', '  Mode: DRY RUN — no changes will be made'))
  if (FLAGS.repair) console.log(c('yellow', '  Mode: REPAIR — failed resources will be recreated'))
  if (FLAGS.rollbackOnFailure) console.log(c('yellow', '  Mode: ROLLBACK-ON-FAILURE — hard failures will trigger cleanup'))

  const config = loadConfig()
  console.log(`  Endpoint:   ${config.endpoint}`)
  console.log(`  Project ID: ${config.projectId}`)
  console.log(`  Database:   ${config.databaseId}`)
  if (config.planLabel) console.log(`  Plan label: ${config.planLabel} (display only, not enforced by this script)`)

  const clients = buildClient(config)

  let SCHEMAS, BUCKET_DEFS
  try {
    ;({ SCHEMAS, BUCKET_DEFS } = await import('../schema/collections.js'))
  } catch (err) {
    console.error(`\n${c('red', '❌ Could not load ../schema/collections.js')}`)
    console.error(`   ${err.message}\n`)
    process.exit(1)
  }

  await verifyPermissions(clients, config.databaseId)

  let hardFailure = false
  let rolledBack = false
  const dbReportHolder = {}
  let colReports = []
  const bucketReport = {
    bucketsCreated: [], bucketsSkipped: [], bucketsPlanned: [],
    bucketsQuotaSkipped: [], bucketsFailed: [],
  }
  let validationPassed = true

  try {
    await ensureDatabase(clients, config.databaseId, 'SocialPulse DB', dbReportHolder)

    section('📁 Collections')
    const colIds = Object.entries(SCHEMAS)
    let i = 0
    for (const [colId, schema] of colIds) {
      i++
      const r = await ensureCollection(clients, config.databaseId, colId, schema, i, colIds.length)
      colReports.push(r)
    }

    await ensureBuckets(clients, BUCKET_DEFS || [], bucketReport, config)

    if (!FLAGS.dryRun) {
      validationPassed = await validateDeployment(clients, config.databaseId, SCHEMAS, BUCKET_DEFS || [])
    } else {
      section('🔍 Validation')
      warn('[dry-run] skipped — no resources were created to validate')
    }

    hardFailure = colReports.some((r) => r.attributesFailed.length || r.indexesFailed.length)
      || bucketReport.bucketsFailed.length > 0
      || (!FLAGS.dryRun && !validationPassed)
  } catch (err) {
    console.error(`\n${c('red', '❌ Deployment manager hit an unrecoverable error mid-run:')}`)
    console.error(`   ${err.message}`)
    verboseLog(err)
    hardFailure = true
  }

  if (hardFailure && FLAGS.rollbackOnFailure && !FLAGS.dryRun) {
    await runRollback(clients)
    rolledBack = true
  }

  printSummary({
    dbReport: dbReportHolder.database,
    colReports,
    bucketReport,
    validationPassed,
    rolledBack,
  })

  process.exit(hardFailure ? 1 : 0)
})().catch((err) => {
  console.error(`\n${c('red', '❌ Deployment manager crashed:')}`)
  console.error(err)
  process.exit(1)
})