import 'dotenv/config';
import { WebClient } from '@slack/web-api';
import { loadState, saveState, requireEnv, pickUnused, isGroupWeek, resolveChannelId } from './utils.js';

const STATE_FILE = 'spotlight-state.json';

// Minimum 30 questions, no repeats until exhausted.
const QUESTIONS = [
  "What's something you're really good at that has nothing to do with your job?",
  "What's a place that feels like home to you, and why?",
  'What\'s the best advice a family member ever gave you?',
  "What's a tradition you grew up with that you still carry on?",
  'If you could relive one day of your life exactly as it happened, which would it be?',
  "What's something most people don't know about you?",
  "What's a risk you took that turned out to be worth it?",
  "What's your favorite way to spend a Sunday?",
  'Who has had the biggest influence on who you are today?',
  "What's a memory that still makes you laugh out loud?",
  "What's something you're currently curious about or learning?",
  "What's a small thing that always makes you smile?",
  "What's the most memorable trip you've ever taken?",
  "What's a book, show, or song that shaped how you see the world?",
  "What's a skill you're proud of that took years to build?",
  "What's something on your bucket list you're determined to do?",
  "What's a habit you've picked up that's made your life better?",
  "What's your go-to comfort activity after a long day?",
  'What\'s a food you could eat every single day?',
  "What's something you've changed your mind about over the years?",
  "What's a talent you have that would surprise your coworkers?",
  "What's a fun fact about your family or hometown?",
  "What's something you collect, or used to collect?",
  "What's the best gift you've ever received?",
  'What\'s a moment you felt genuinely proud of yourself?',
  "What's your favorite way to unwind on the weekend?",
  "What's something you learned the hard way?",
  "What's a hobby you'd pick up if time and money weren't an issue?",
  "What's the last thing that made you really laugh?",
  "What's something you're looking forward to right now?",
];

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

  const state = loadState(STATE_FILE, { usedMemberIds: [], usedQuestions: [] });
  const { picked: memberId, usedKeys: usedMemberIds } = pickUnused(eligible, state.usedMemberIds);
  const { picked: question, usedKeys: usedQuestions } = pickUnused(QUESTIONS, state.usedQuestions);

  console.log(`Spotlighting: ${memberId} — "${question}"`);
  await slack.chat.postMessage({
    channel: channelId,
    text: `✨ *Spotlight of the Week*\n\nThis week's spotlight is on <@${memberId}>! ${question}`,
  });

  saveState(STATE_FILE, { usedMemberIds, usedQuestions });
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
