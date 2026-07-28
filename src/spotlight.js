import 'dotenv/config';
import { WebClient } from '@slack/web-api';
import { loadState, saveState, requireEnv, pickUnused, isGroupWeek } from './utils.js';

const STATE_FILE = 'spotlight-state.json';

// SPOTLIGHT_CHANNEL may be a name or an ID — conversations.members needs an ID.
async function resolveChannelId(slack, channel) {
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

async function getChannelMemberIds(slack, channelId) {
  const ids = [];
  let cursor;
  do {
    const res = await slack.conversations.members({ channel: channelId, cursor, limit: 200 });
    ids.push(...res.members);
    cursor = res.response_metadata?.next_cursor;
  } while (cursor);
  return ids;
}

async function getActiveUserIds(slack) {
  const ids = new Set();
  let cursor;
  do {
    const res = await slack.users.list({ cursor, limit: 200 });
    for (const user of res.members) {
      if (!user.deleted && !user.is_bot && user.id !== 'USLACKBOT') ids.add(user.id);
    }
    cursor = res.response_metadata?.next_cursor;
  } while (cursor);
  return ids;
}

async function main() {
  // Biweekly: alternates with this-or-that so only two of the four mechanics post per week.
  if (!isGroupWeek('B')) {
    console.log('Not this group\'s week — skipping spotlight.');
    return;
  }

  const token = requireEnv('SLACK_BOT_TOKEN');
  const channel = requireEnv('SPOTLIGHT_CHANNEL');
  const slack = new WebClient(token);

  const channelId = await resolveChannelId(slack, channel);
  const [memberIds, activeUserIds] = await Promise.all([
    getChannelMemberIds(slack, channelId),
    getActiveUserIds(slack),
  ]);
  const eligible = memberIds.filter((id) => activeUserIds.has(id));

  if (eligible.length === 0) {
    throw new Error(`No eligible (human, active) members found in channel "${channel}".`);
  }

  const state = loadState(STATE_FILE, { usedMemberIds: [] });
  const { picked: memberId, usedKeys } = pickUnused(eligible, state.usedMemberIds);

  console.log(`Spotlighting: ${memberId}`);
  await slack.chat.postMessage({
    channel: channelId,
    text: `✨ *Spotlight of the Week*\n\nThis week's spotlight is on <@${memberId}>! Tell us a few words about yourself — what you're into, what makes you tick, anything goes 🙂`,
  });

  saveState(STATE_FILE, { usedMemberIds: usedKeys });
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
