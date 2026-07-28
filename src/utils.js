import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(__dirname, '..', 'data');

export function loadState(filename, fallback) {
  const path = join(DATA_DIR, filename);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

export function saveState(filename, data) {
  const path = join(DATA_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// chat.postMessage and friends need a channel ID, not a name — resolve if needed.
export async function resolveChannelId(slack, channel) {
  if (/^[CG][A-Z0-9]{8,}$/.test(channel)) return channel;

  let cursor;
  do {
    const res = await slack.conversations.list({ cursor, limit: 200, types: 'public_channel,private_channel' });
    const match = res.channels.find((c) => c.name === channel);
    if (match) return match.id;
    cursor = res.response_metadata?.next_cursor;
  } while (cursor);

  throw new Error(`Channel "${channel}" not found.`);
}

export function getISOWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Biweekly alternation: group 'A' runs on odd ISO weeks, group 'B' on even ISO weeks,
// so two mechanics post one week and the other two post the next.
export function isGroupWeek(group, date = new Date()) {
  const isOddWeek = getISOWeekNumber(date) % 2 === 1;
  return group === 'A' ? isOddWeek : !isOddWeek;
}

// Picks a random item from `pool` that hasn't been used yet (per `usedKeys`).
// Once every item has been used, the pool resets and starts fresh from this pick.
export function pickUnused(pool, usedKeys, key = (item) => item) {
  const used = new Set(usedKeys);
  let available = pool.filter((item) => !used.has(key(item)));

  let didReset = false;
  if (available.length === 0) {
    available = pool;
    didReset = true;
  }

  const picked = available[Math.floor(Math.random() * available.length)];
  const newUsedKeys = didReset ? [key(picked)] : [...usedKeys, key(picked)];

  return { picked, usedKeys: newUsedKeys, didReset };
}
