const { readFileSync } = require('fs');
const { Client, Storage } = require('node-appwrite');

// Load .env.local the same simple way
const raw = readFileSync('.env.local', 'utf8');
for (const line of raw.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  const key = t.slice(0, eq).trim();
  const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = val;
}

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

storage.listBuckets()
  .then((r) => console.log('OK', r))
  .catch((e) => {
    console.log('MESSAGE:', e.message);
    console.log('CODE:', e.code);
    console.log('TYPE:', e.type);
    console.log('RESPONSE:', e.response);
    console.log('CAUSE:', e.cause);
    console.log('STACK:', e.stack);
  });
