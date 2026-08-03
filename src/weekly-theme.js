import 'dotenv/config';
import { WebClient } from '@slack/web-api';
import { loadState, saveState, requireEnv, pickUnused, isGroupWeek, resolveChannelId } from './utils.js';

const STATE_FILE = 'theme-state.json';

// Minimum 20 themes, no repeats until exhausted.
const THEMES = [
  { emoji: '📸', title: 'Your desk setup', prompt: 'Share a photo!' },
  { emoji: '🌅', title: 'Where you grew up', prompt: 'A photo or a couple of lines about home.' },
  { emoji: '🍽️', title: 'Your go-to comfort food', prompt: 'Bonus points for a photo.' },
  { emoji: '🐾', title: 'Your pet (or the pet you wish you had)', prompt: 'Show them off!' },
  { emoji: '📚', title: 'A book that stuck with you', prompt: 'What was it and why?' },
  { emoji: '🎧', title: 'What you\'re listening to lately', prompt: 'Drop a track or playlist.' },
  { emoji: '🌤️', title: 'The view from your window right now', prompt: 'Snap a quick photo.' },
  { emoji: '🧳', title: 'Somewhere you\'ve traveled', prompt: 'A favorite trip photo or memory.' },
  { emoji: '🎨', title: 'Something you made', prompt: 'Art, craft, cooking, code — anything counts.' },
  { emoji: '🏆', title: 'A small win from this month', prompt: 'Doesn\'t have to be work-related.' },
  { emoji: '📺', title: 'What you\'re currently watching', prompt: 'Show or movie recommendations welcome.' },
  { emoji: '🌱', title: 'A plant or garden you\'re proud of', prompt: 'Or the one you keep killing — we won\'t judge.' },
  { emoji: '🚲', title: 'How you get around', prompt: 'Bike, car, transit, on foot — show your commute.' },
  { emoji: '🎮', title: 'What you\'re playing these days', prompt: 'Video games, board games, anything.' },
  { emoji: '☕', title: 'Your favorite drink order', prompt: 'Coffee, tea, or something else entirely.' },
  { emoji: '🧩', title: 'A hobby outside of work', prompt: 'What do you do to unwind?' },
  { emoji: '🎂', title: 'A favorite childhood memory', prompt: 'Share a story or an old photo.' },
  { emoji: '🌍', title: 'A place on your travel bucket list', prompt: 'Where and why?' },
  { emoji: '🛠️', title: 'A tool or gadget you can\'t live without', prompt: 'Work or personal, show it off.' },
  { emoji: '🥾', title: 'Your favorite way to spend a weekend', prompt: 'A photo or a quick description.' },
  { emoji: '🎵', title: 'A song that always puts you in a good mood', prompt: 'Share the track.' },
  { emoji: '🍳', title: 'Something you cooked recently', prompt: 'Bonus for the recipe.' },
  { emoji: '🖼️', title: 'Something on your wall or shelf that means a lot to you', prompt: 'Tell us the story.' },
  { emoji: '🌦️', title: 'The weather where you are right now', prompt: 'A photo of your sky.' },
  { emoji: '🧠', title: 'Something new you learned recently', prompt: 'Doesn\'t need to be work-related.' },
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
    text: `${theme.emoji} *This week's theme: ${theme.title}*\nPost a photo in the thread below. ${theme.prompt}`,
  });

  saveState(STATE_FILE, { usedThemes: usedKeys });
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
