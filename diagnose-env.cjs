const fs = require('fs');

const raw = fs.readFileSync('.env.local', 'utf8');

for (const line of raw.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  const key = t.slice(0, eq).trim();
  const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');

  if (key.includes('KEY')) {
    console.log(key, 'len=' + val.length, 'last6=' + val.slice(-6));
  } else {
    console.log(key, '=', JSON.stringify(val));
  }
}
