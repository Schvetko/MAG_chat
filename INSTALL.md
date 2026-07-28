# Установка MAG chat

## 1. Создать приложение в Slack

1. Перейди на [api.slack.com/apps](https://api.slack.com/apps)
2. **Create New App → From an app manifest**
3. Выбери workspace, вставь содержимое `slack-app-manifest.json`, нажми **Create**
4. **Settings → Install App → Install to Workspace**
5. Скопируй **Bot User OAuth Token** (`xoxb-...`)

## 2. Настроить окружение

```bash
cp .env.example .env
```

Заполни в `.env`:

| Переменная | Значение |
|---|---|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token из шага 1 |
| `FIRESIDE_CHANNEL` | канал для fireside-вопросов |
| `THIS_OR_THAT_CHANNEL` | канал для this-or-that опросов |
| `WEEKLY_THEME_CHANNEL` | канал для еженедельной темы |
| `SPOTLIGHT_CHANNEL` | канал для spotlight |
| `FRIDAY_CHECKIN_CHANNEL` | канал для пятничного чек-ина |
| `WORKING_ON_CHANNEL` | канал для "what I'm working on" |

Пригласи бота в каждый канал: `/invite @MAG chat`. Для Spotlight приглашение обязательно (боту нужно видеть состав участников канала), для остальных не нужно, если используется `chat:write.public`.

## 3. Spotlight — участники берутся из канала автоматически

Бот сам получает список участников `SPOTLIGHT_CHANNEL` через Slack API (за вычетом ботов и удалённых аккаунтов) и по кругу выбирает случайного из тех, кто ещё не был спотлайтнут в текущем цикле — когда пройдут все, цикл начинается заново. Ничего вручную поддерживать не нужно: кто-то уйдёт из канала — выпадет из пула сам; кто-то зайдёт — попадёт в пул на следующий запуск.

Для этого приложению нужны скоупы `channels:read` (или `groups:read` для приватного канала) и `users:read` — они уже включены в `slack-app-manifest.json`. Если приложение уже было установлено раньше без этих скоупов, зайди в **Settings → OAuth & Permissions**, добавь их вручную и нажми **Reinstall to Workspace** — токен изменится, обнови его в `.env` / GitHub Secrets.

## 4. Запуск локально

```bash
npm install
npm run fireside
npm run this-or-that
npm run weekly-theme
npm run spotlight
npm run friday-checkin
npm run what-im-working-on
```

## 5. Автоматизация через GitHub Actions

В настройках репозитория добавь:

- **Secrets → Actions**: `SLACK_BOT_TOKEN`
- **Variables → Actions**: `FIRESIDE_CHANNEL`, `THIS_OR_THAT_CHANNEL`, `WEEKLY_THEME_CHANNEL`, `SPOTLIGHT_CHANNEL`, `FRIDAY_CHECKIN_CHANNEL`, `WORKING_ON_CHANNEL`

Расписание задано в `.github/workflows/*.yml`:

| Механика | День | Время (UTC) | Периодичность |
|---|---|---|---|
| Fireside | понедельник | 09:00 | раз в 2 недели |
| This or That | среда | 09:00 | раз в 2 недели |
| Weekly Theme | понедельник | 09:00 | раз в 2 недели (чередуется с Fireside) |
| Spotlight | среда | 09:00 | раз в 2 недели (чередуется с This or That) |
| Friday Check-in | пятница | 15:00 | каждую неделю |
| What I'm Working On | 1-е число месяца | 09:00 | раз в месяц |

Fireside/This or That и Weekly Theme/Spotlight объединены в две группы, которые чередуются по неделям (ISO week number, чётность): на одной неделе выходят Fireside (пн) + This or That (ср), на следующей — Weekly Theme (пн) + Spotlight (ср). Workflow всё равно запускается каждый понедельник/среду, но скрипт проверяет `isGroupWeek()` в `src/utils.js` и сам решает, постить в этот раз или нет — это не требует отдельного state-файла и не собьётся при пропущенном запуске.

Workflow-файлы, обновляющие банки вопросов/тем/опросов и очередь spotlight, коммитят изменённые файлы в `data/` обратно в репозиторий — поэтому им нужен `permissions: contents: write` (уже прописан).

Запустить вручную можно через **Actions → выбрать workflow → Run workflow**.
