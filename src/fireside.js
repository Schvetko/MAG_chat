import 'dotenv/config';
import { WebClient } from '@slack/web-api';
import { loadState, saveState, requireEnv, pickUnused, isGroupWeek } from './utils.js';

const STATE_FILE = 'fireside-state.json';

// Not-about-work questions: philosophical, funny, personal. Minimum 30, no repeats until exhausted.
const QUESTIONS = [
  'If you could live in any decade, which would it be and why?',
  'What is a skill you wish you had, but have never had time to learn?',
  "What's the best piece of advice you've ever received?",
  'If you could have dinner with anyone, living or dead, who would it be?',
  'What was your dream job as a kid?',
  "What's a small thing that instantly makes your day better?",
  'If you could instantly master one language, which would you choose?',
  "What's a movie or show you can rewatch endlessly?",
  'If money were no object, what would you do with your time?',
  "What's the most spontaneous thing you've ever done?",
  'If you had to eat one meal for the rest of your life, what would it be?',
  "What's a hobby you've always wanted to try?",
  'If you could teleport anywhere right now, where would you go?',
  "What's the best trip you've ever taken?",
  'If you could switch lives with someone for a day, who would it be?',
  "What's a book or piece of media that changed how you think?",
  'If you had an extra hour every day, how would you spend it?',
  "What's something you believed as a kid that turned out to be completely wrong?",
  'If you could master any musical instrument overnight, what would you pick?',
  "What's your go-to karaoke song?",
  'If you could time travel to witness one historical event, what would it be?',
  "What's a food you were sure you'd hate, but ended up loving?",
  'If you had to describe yourself as a weather pattern, what would it be?',
  "What's the most underrated superpower?",
  'If you could live in a fictional universe, which one would you pick?',
  "What's something on your bucket list that has nothing to do with career?",
  'If you woke up tomorrow with a random new talent, what would you want it to be?',
  "What's the weirdest food combination you actually enjoy?",
  'If you could only listen to one album for a year, what would it be?',
  "What's a tradition from your childhood you still keep?",
  'If your life had a theme song, what would it be?',
  "What's a place you've never been but really want to visit?",
  'If you could ask a magic 8-ball one real question right now, what would it be?',
  "What's your favorite way to spend a rainy day?",
  'If you could permanently swap one everyday object for a magical version, what would it be?',
];

async function main() {
  // Biweekly: alternates with weekly-theme so only two of the four mechanics post per week.
  if (!isGroupWeek('A')) {
    console.log('Not this group\'s week — skipping fireside.');
    return;
  }

  const token = requireEnv('SLACK_BOT_TOKEN');
  const channel = requireEnv('FIRESIDE_CHANNEL');
  const slack = new WebClient(token);

  const state = loadState(STATE_FILE, { usedQuestions: [] });
  const { picked: question, usedKeys } = pickUnused(QUESTIONS, state.usedQuestions);

  console.log(`Posting fireside question: "${question}"`);
  await slack.chat.postMessage({
    channel,
    text: `🔥 *Fireside Question of the Week*\n\n${question}`,
  });

  saveState(STATE_FILE, { usedQuestions: usedKeys });
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
