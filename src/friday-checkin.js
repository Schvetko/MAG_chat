import 'dotenv/config';
import { WebClient } from '@slack/web-api';
import { requireEnv, resolveChannelId } from './utils.js';

async function main() {
  const token = requireEnv('SLACK_BOT_TOKEN');
  const channel = requireEnv('FRIDAY_CHECKIN_CHANNEL');
  const slack = new WebClient(token);
  const channelId = await resolveChannelId(slack, channel);

  console.log('Posting Friday check-in...');
  const opening = await slack.chat.postMessage({
    channel: channelId,
    text: "🎉 *Friday Check-in!*\n\nWrap up the week — drop your answers in the thread 🧵",
  });

  await slack.chat.postMessage({
    channel: channelId,
    thread_ts: opening.ts,
    text: '1️⃣ What did you work on this week?\n2️⃣ What did you learn?\n3️⃣ How are you feeling?',
  });

  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
