import 'dotenv/config';
import { WebClient } from '@slack/web-api';
import { loadState, saveState, requireEnv, pickUnused, isGroupWeek, resolveChannelId } from './utils.js';

const STATE_FILE = 'poll-state.json';

// Minimum 30 pairs, no repeats until exhausted. People vote by reacting with :a: / :b:.
const PAIRS = [
  ['Tabs', 'Spaces'],
  ['Coffee', 'Tea'],
  ['Dark mode', 'Light mode'],
  ['Cats', 'Dogs'],
  ['Mountains', 'Beach'],
  ['Sweet', 'Savory'],
  ['Morning person', 'Night owl'],
  ['Books', 'Movies'],
  ['Pizza', 'Burger'],
  ['Summer', 'Winter'],
  ['Texting', 'Calling'],
  ['Window seat', 'Aisle seat'],
  ['Working from home', 'Working from office'],
  ['Planning ahead', 'Going with the flow'],
  ['Sweet breakfast', 'Savory breakfast'],
  ['Android', 'iPhone'],
  ['Email', 'Slack message'],
  ['Early meetings', 'Late meetings'],
  ['Salty snacks', 'Sweet snacks'],
  ['City life', 'Countryside life'],
  ['Reading the book', 'Watching the movie'],
  ['Camping', 'Hotel'],
  ['Quiet office', 'Background noise'],
  ['Group chat', 'One-on-one'],
  ['Standing desk', 'Sitting desk'],
  ['Instant noodles', 'Home-cooked meal'],
  ['Roller coasters', 'Ferris wheels'],
  ['Podcasts', 'Music'],
  ['Handwriting notes', 'Typing notes'],
  ['Pineapple on pizza', 'No pineapple on pizza'],
  ['Cold pillow side', 'Warm pillow side'],
  ['Spontaneous trips', 'Planned trips'],
  ['Netflix and chill', 'Going out'],
  ['Board games', 'Video games'],
  ['Full moon', 'Starry sky'],
];

async function main() {
  // Biweekly: alternates with spotlight so only two of the four mechanics post per week.
  if (!isGroupWeek('A')) {
    console.log('Not this group\'s week — skipping this-or-that.');
    return;
  }

  const token = requireEnv('SLACK_BOT_TOKEN');
  const channel = requireEnv('THIS_OR_THAT_CHANNEL');
  const slack = new WebClient(token);
  const channelId = await resolveChannelId(slack, channel);

  const state = loadState(STATE_FILE, { usedPairs: [] });
  const { picked: pair, usedKeys } = pickUnused(PAIRS, state.usedPairs, (p) => p.join(' vs '));
  const [optionA, optionB] = pair;

  console.log(`Posting this-or-that poll: "${optionA}" vs "${optionB}"`);
  const result = await slack.chat.postMessage({
    channel: channelId,
    text: `🆚 *This or That?*\n\n🅰️  ${optionA}\n🅱️  ${optionB}\n\nReact below to vote!`,
  });

  await slack.reactions.add({ channel: channelId, timestamp: result.ts, name: 'a' });
  await slack.reactions.add({ channel: channelId, timestamp: result.ts, name: 'b' });

  saveState(STATE_FILE, { usedPairs: usedKeys });
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
