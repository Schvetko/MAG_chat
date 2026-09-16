import 'dotenv/config';
import { WebClient } from '@slack/web-api';
import { loadState, saveState, requireEnv, pickUnused, resolveChannelId, todayUTC } from './utils.js';

const STATE_FILE = 'theme-state.json';

// Minimum 20 themes, no repeats until exhausted.
const THEMES = [
  { emoji: '🪴', title: 'The oldest thing you own', prompt: 'Post a photo (tell us the story if you want).' },
  { emoji: '🎼', title: 'Your current most-played song', prompt: 'Drop the track.' },
  { emoji: '🏠', title: 'The best corner of your home', prompt: 'Post a photo of it.' },
  { emoji: '🌳', title: 'A favorite spot near where you live', prompt: 'Post a photo of it.' },
  { emoji: '🎙️', title: 'A song from your teenage years you still love', prompt: 'Share the track — no judgment.' },
  { emoji: '🧩', title: 'A hobby outside of work', prompt: 'Post a photo of you doing it, or its result.' },
  { emoji: '🎁', title: 'A gift you loved giving or receiving', prompt: 'Post a photo of it.' },
  { emoji: '🍰', title: 'A dessert you\'d never say no to', prompt: 'Post a photo of it.' },
  { emoji: '🧉', title: 'Your go-to snack', prompt: 'Post a photo of it.' },
  { emoji: '🖼️', title: 'Something on your wall or shelf that means a lot to you', prompt: 'Post a photo (tell us the story if you want).' },
  { emoji: '🌧️', title: 'Your rainy-day setup', prompt: 'Post a photo of how you\'re spending it — blanket, book, tea, show us.' },
  { emoji: '🏋️', title: 'How you stay active', prompt: 'Post a photo — gym, walk, sport, anything counts.' },
  { emoji: '🧳', title: 'Somewhere you\'ve traveled', prompt: 'Post your favorite trip photo.' },
  { emoji: '🌱', title: 'A plant or garden you\'re proud of', prompt: 'Post a photo — or the one you keep killing, we won\'t judge.' },
  { emoji: '🔊', title: 'A song that gets you pumped up', prompt: 'Drop the track.' },
  { emoji: '📸', title: 'Your desk setup', prompt: 'Post a photo!' },
  { emoji: '🌍', title: 'A place on your travel bucket list', prompt: 'Post a photo of it (borrowed from the internet is fine) and tell us why.' },
  { emoji: '🎨', title: 'Something you made', prompt: 'Post a photo of it — art, craft, cooking, code, anything counts.' },
  { emoji: '🧵', title: 'A DIY or repair you\'re proud of', prompt: 'Post a before/after photo.' },
  { emoji: '🛠️', title: 'A tool or gadget you can\'t live without', prompt: 'Post a photo — work or personal, show it off.' },
  { emoji: '🎧', title: 'What you\'re listening to lately', prompt: 'Drop a track or playlist.' },
  { emoji: '🚗', title: 'Your dream car, real or imaginary', prompt: 'Post a photo of it.' },
  { emoji: '🕰️', title: 'An object older than you\'d expect', prompt: 'Post a photo and tell us its story.' },
  { emoji: '📚', title: 'A book that stuck with you', prompt: 'Post a photo of the book (or your bookshelf) and tell us why.' },
  { emoji: '🌦️', title: 'The weather where you are right now', prompt: 'Post a photo of your sky.' },
  { emoji: '🧠', title: 'Something new you learned recently', prompt: 'Post a photo related to it — doesn\'t need to be work-related.' },
  { emoji: '🐾', title: 'Your pet (or the pet you wish you had)', prompt: 'Post a photo — show them off!' },
  { emoji: '🍳', title: 'Something you cooked recently', prompt: 'Post a photo — bonus for the recipe.' },
  { emoji: '🎤', title: 'A song you\'d pick for karaoke', prompt: 'Share the track.' },
  { emoji: '📺', title: 'What you\'re currently watching', prompt: 'Post a screenshot of the title screen or poster.' },
  { emoji: '🧢', title: 'Your go-to outfit or accessory', prompt: 'Post a photo.' },
  { emoji: '☕', title: 'Your favorite drink order', prompt: 'Post a photo of your cup.' },
  { emoji: '🏆', title: 'A small win from this month', prompt: 'Post a photo that captures it — doesn\'t have to be work-related.' },
  { emoji: '🍽️', title: 'Your go-to comfort food', prompt: 'Post a photo of it — bonus if you\'re eating it right now.' },
  { emoji: '🌈', title: 'Something colorful you spotted this week', prompt: 'Post a photo.' },
  { emoji: '🛋️', title: 'Where you relax after work', prompt: 'Post a photo of your spot.' },
  { emoji: '🎵', title: 'A song that always puts you in a good mood', prompt: 'Share the track.' },
  { emoji: '🌇', title: 'A sunrise or sunset you caught recently', prompt: 'Post a photo.' },
  { emoji: '🥾', title: 'Your favorite way to spend a weekend', prompt: 'Post a photo from a recent weekend.' },
  { emoji: '📦', title: 'A package you\'re excited about', prompt: 'Post a photo when it arrives.' },
  { emoji: '🧊', title: 'Something in your fridge right now', prompt: 'Post a photo — no judgment.' },
  { emoji: '🌤️', title: 'The view from your window right now', prompt: 'Snap a quick photo.' },
  { emoji: '🌅', title: 'Where you grew up', prompt: 'Post a photo of your hometown or childhood home.' },
  { emoji: '🎹', title: 'A song that reminds you of a specific memory', prompt: 'Share the track and the memory behind it.' },
  { emoji: '🎂', title: 'A favorite childhood memory', prompt: 'Dig up an old photo and share the story.' },
  { emoji: '🎮', title: 'What you\'re playing these days', prompt: 'Post a screenshot — video games, board games, anything.' },
  { emoji: '🚪', title: 'Your front door or entryway', prompt: 'Post a photo.' },
  { emoji: '🚲', title: 'How you get around', prompt: 'Post a photo of your ride or your commute view.' },
];

async function main() {
  const state = loadState(STATE_FILE, { usedThemes: [], lastPostedDate: null });
  const today = todayUTC();
  if (state.lastPostedDate === today) {
    console.log(`Already posted today (${today}) — skipping.`);
    return;
  }

  const token = requireEnv('SLACK_BOT_TOKEN');
  const channel = requireEnv('WEEKLY_THEME_CHANNEL');
  const slack = new WebClient(token);
  const channelId = await resolveChannelId(slack, channel);

  const { picked: theme, usedKeys } = pickUnused(THEMES, state.usedThemes, (t) => t.title);

  console.log(`Posting weekly theme: "${theme.title}"`);
  await slack.chat.postMessage({
    channel: channelId,
    text: `${theme.emoji} *This week's theme: ${theme.title}*\nReply in the thread below. ${theme.prompt}`,
  });

  saveState(STATE_FILE, { usedThemes: usedKeys, lastPostedDate: today });
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
