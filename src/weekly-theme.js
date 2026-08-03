import 'dotenv/config';
import { WebClient } from '@slack/web-api';
import { loadState, saveState, requireEnv, pickUnused, isGroupWeek, resolveChannelId } from './utils.js';

const STATE_FILE = 'theme-state.json';

// Minimum 20 themes, no repeats until exhausted.
const THEMES = [
  { emoji: '📸', title: 'Your desk setup' },
  { emoji: '🌅', title: 'Where you grew up' },
  { emoji: '🍽️', title: 'Your go-to comfort food' },
  { emoji: '🐾', title: 'Your pet (or the pet you wish you had)' },
  { emoji: '📚', title: 'A book that stuck with you' },
  { emoji: '🎧', title: 'What you\'re listening to lately' },
  { emoji: '🌤️', title: 'The view from your window right now' },
  { emoji: '🧳', title: 'Somewhere you\'ve traveled' },
  { emoji: '🎨', title: 'Something you made' },
  { emoji: '🏆', title: 'A small win from this month' },
  { emoji: '📺', title: 'What you\'re currently watching' },
  { emoji: '🌱', title: 'A plant or garden you\'re proud of' },
  { emoji: '🚲', title: 'How you get around' },
  { emoji: '🎮', title: 'What you\'re playing these days' },
  { emoji: '☕', title: 'Your favorite drink order' },
  { emoji: '🧩', title: 'A hobby outside of work' },
  { emoji: '🎂', title: 'A favorite childhood memory' },
  { emoji: '🌍', title: 'A place on your travel bucket list' },
  { emoji: '🛠️', title: 'A tool or gadget you can\'t live without' },
  { emoji: '🥾', title: 'Your favorite way to spend a weekend' },
  { emoji: '🎵', title: 'A song that always puts you in a good mood' },
  { emoji: '🍳', title: 'Something you cooked recently' },
  { emoji: '🖼️', title: 'Something on your wall or shelf that means a lot to you' },
  { emoji: '🌦️', title: 'The weather where you are right now' },
  { emoji: '🧠', title: 'Something new you learned recently' },
];

async function main() {
  // Biweekly: alternates with fireside so only two of the four mechanics post per week.
  if (!isGroupWeek('B')) {
    console.log('Not this group\'s week — skipping weekly-theme.');
    return;
  }

  const token = requireEnv('SLACK_BOT_TOKEN');
  const channel = requireEnv('WEEKLY_THEME_CHANNEL');
  const slack = new WebClient(token);
  const channelId = await resolveChannelId(slack, channel);

  const state = loadState(STATE_FILE, { usedThemes: [] });
  const { picked: theme, usedKeys } = pickUnused(THEMES, state.usedThemes, (t) => t.title);

  console.log(`Posting weekly theme: "${theme.title}"`);
  await slack.chat.postMessage({
    channel: channelId,
    text: `${theme.emoji} *This week's theme: ${theme.title}*\n\n📸 Post a photo in the thread below — or a couple of lines if a photo doesn't fit the theme!`,
  });

  saveState(STATE_FILE, { usedThemes: usedKeys });
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
