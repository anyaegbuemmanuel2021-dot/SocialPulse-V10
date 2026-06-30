#!/usr/bin/env node
/**
 * SocialPulse V10 — Appwrite Auto-Setup Script
 *
 * Run:  node appwrite/setup/setup-collections.js
 *
 * Required env (set in .env.local before running):
 *   APPWRITE_ENDPOINT   — e.g. https://cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID
 *   APPWRITE_API_KEY    — Server key with databases + storage scopes
 *   APPWRITE_DATABASE_ID (optional, defaults to socialpulse_db)
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ── Load .env.local manually (no dotenv dependency needed) ────────────────────
const __dir  = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../../.env.local')
try {
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
} catch {
  console.warn('⚠  .env.local not found — using existing environment variables')
}

// Map VITE_ prefixed vars to non-prefixed for this script
if (!process.env.APPWRITE_ENDPOINT   && process.env.VITE_APPWRITE_ENDPOINT)    process.env.APPWRITE_ENDPOINT   = process.env.VITE_APPWRITE_ENDPOINT
if (!process.env.APPWRITE_PROJECT_ID && process.env.VITE_APPWRITE_PROJECT_ID)  process.env.APPWRITE_PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID
if (!process.env.APPWRITE_DATABASE_ID&& process.env.VITE_APPWRITE_DATABASE_ID) process.env.APPWRITE_DATABASE_ID= process.env.VITE_APPWRITE_DATABASE_ID

// ── Validate ──────────────────────────────────────────────────────────────────
const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://cloud.appwrite.io/v1'
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID
const API_KEY    = process.env.APPWRITE_API_KEY
const DB_ID      = process.env.APPWRITE_DATABASE_ID || 'socialpulse_db'

if (!PROJECT_ID || !API_KEY) {
  console.error('\n❌  Missing required environment variables:')
  if (!PROJECT_ID) console.error('   APPWRITE_PROJECT_ID (or VITE_APPWRITE_PROJECT_ID)')
  if (!API_KEY)    console.error('   APPWRITE_API_KEY')
  console.error('\nAdd them to your .env.local file and re-run.\n')
  process.exit(1)
}

// ── HTTP helper (no external deps) ────────────────────────────────────────────
async function req (method, path, body = null) {
  const { default: https } = await import(ENDPOINT.startsWith('https') ? 'https' : 'http')
  const url  = new URL(ENDPOINT + path)
  const data = body ? JSON.stringify(body) : null
  const headers = {
    'Content-Type':    'application/json',
    'X-Appwrite-Key':  API_KEY,
    'X-Appwrite-Project': PROJECT_ID,
    ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
  }
  return new Promise((resolve, reject) => {
    const r = https.request({ hostname: url.hostname, port: url.port || (ENDPOINT.startsWith('https') ? 443 : 80), path: url.pathname + url.search, method, headers }, res => {
      let out = ''
      res.on('data', chunk => { out += chunk })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(out) }) }
        catch { resolve({ status: res.statusCode, body: out }) }
      })
    })
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

function ok (status) { return status >= 200 && status < 300 }
function already (status) { return status === 409 }

// ── Create Database ───────────────────────────────────────────────────────────
async function ensureDatabase () {
  console.log(`\n📦 Ensuring database "${DB_ID}"…`)
  const r = await req('POST', `/databases`, { databaseId: DB_ID, name: 'SocialPulse DB' })
  if (ok(r.status))      console.log(`   ✅ Database created`)
  else if (already(r.status)) console.log(`   ✓  Database already exists`)
  else console.error(`   ❌ Database error: ${JSON.stringify(r.body)}`)
}

// ── Create Collection ─────────────────────────────────────────────────────────
async function createCollection (colId, schema) {
  // Create collection
  const r = await req('POST', `/databases/${DB_ID}/collections`, {
    collectionId: colId,
    name: colId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    documentSecurity: false,
  })
  if (ok(r.status))           console.log(`   ✅ Collection: ${colId}`)
  else if (already(r.status)) console.log(`   ✓  Collection exists: ${colId}`)
  else { console.error(`   ❌ Failed: ${colId} — ${JSON.stringify(r.body)}`); return }

  await sleep(300)

  // Create attributes
  for (const attr of schema.attributes) {
    await createAttribute(colId, attr)
    await sleep(150)
  }

  // Wait for attributes to be ready
  await sleep(1500)

  // Create indexes
  for (const idx of (schema.indexes || [])) {
    await createIndex(colId, idx)
    await sleep(200)
  }
}

async function createAttribute (colId, attr) {
  let path, body
  const base = { key: attr.key, required: attr.required ?? false }

  switch (attr.type) {
    case 'string':
      path = `/databases/${DB_ID}/collections/${colId}/attributes/string`
      body = { ...base, size: attr.size || 255, array: attr.array || false }
      break
    case 'integer':
      path = `/databases/${DB_ID}/collections/${colId}/attributes/integer`
      body = { ...base, array: attr.array || false }
      break
    case 'double':
      path = `/databases/${DB_ID}/collections/${colId}/attributes/float`
      body = { ...base }
      break
    case 'boolean':
      path = `/databases/${DB_ID}/collections/${colId}/attributes/boolean`
      body = { ...base }
      break
    case 'datetime':
      path = `/databases/${DB_ID}/collections/${colId}/attributes/datetime`
      body = { ...base }
      break
    default:
      console.warn(`     ⚠  Unknown type ${attr.type} for ${attr.key}`)
      return
  }

  const r = await req('POST', path, body)
  if (ok(r.status))           console.log(`     + attr: ${attr.key}`)
  else if (already(r.status)) console.log(`     · attr exists: ${attr.key}`)
  else console.error(`     ❌ attr failed: ${attr.key} — ${r.body?.message}`)
}

async function createIndex (colId, idx) {
  const r = await req('POST', `/databases/${DB_ID}/collections/${colId}/indexes`, {
    key:        idx.key,
    type:       idx.type,
    attributes: idx.attributes,
  })
  if (ok(r.status))           console.log(`     + index: ${idx.key}`)
  else if (already(r.status)) console.log(`     · index exists: ${idx.key}`)
  else console.error(`     ❌ index failed: ${idx.key} — ${r.body?.message}`)
}

// ── Create Buckets ────────────────────────────────────────────────────────────
async function createBucket (def) {
  const r = await req('POST', `/storage/buckets`, {
    bucketId:          def.id,
    name:              def.name,
    fileSecurity:      false,
    maximumFileSize:   def.maxSize,
    allowedFileExtensions: [],
    enabled:           true,
    encryption:        false,
    antivirus:         false,
  })
  if (ok(r.status))           console.log(`   ✅ Bucket: ${def.id}`)
  else if (already(r.status)) console.log(`   ✓  Bucket exists: ${def.id}`)
  else console.error(`   ❌ Bucket failed: ${def.id} — ${r.body?.message}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
;(async () => {
  console.log('═══════════════════════════════════════════════')
  console.log('  SocialPulse V10 — Appwrite Setup')
  console.log('═══════════════════════════════════════════════')
  console.log(`  Endpoint:   ${ENDPOINT}`)
  console.log(`  Project ID: ${PROJECT_ID}`)
  console.log(`  Database:   ${DB_ID}`)

  // Import schema
  const { SCHEMAS, BUCKET_DEFS } = await import('../schema/collections.js')

  // 1. Database
  await ensureDatabase()

  // 2. Collections
  console.log('\n📁 Creating collections…')
  for (const [colId, schema] of Object.entries(SCHEMAS)) {
    await createCollection(colId, schema)
    await sleep(500)
  }

  // 3. Storage buckets
  console.log('\n🗂  Creating storage buckets…')
  for (const def of BUCKET_DEFS) {
    await createBucket(def)
    await sleep(300)
  }

  console.log('\n═══════════════════════════════════════════════')
  console.log('  ✅  Setup complete!')
  console.log('═══════════════════════════════════════════════')
  console.log('\nNext steps:')
  console.log('  1. Run:  npm run dev')
  console.log('  2. Open: http://localhost:5173')
  console.log('  3. Create your first account\n')
})()
