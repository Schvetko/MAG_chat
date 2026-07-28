import 'dotenv/config';
import { WebClient } from '@slack/web-api';
import { requireEnv, resolveChannelId } from './utils.js';

async function main() {
  const token = requireEnv('SLACK_BOT_TOKEN');
  const channel = requireEnv('WORKING_ON_CHANNEL');
  const slack = new WebClient(token);
  const channelId = await resolveChannelId(slack, channel);

  console.log('Posting "what I\'m working on" prompt...');
  await slack.chat.postMessage({
    channel: channelId,
    text: "🛠️ *What I'm Working On*\n\nDrop a screenshot, a link, or a couple of lines about what you're working on right now. No calls, no slides — just a quick share 👇",
  });

  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
