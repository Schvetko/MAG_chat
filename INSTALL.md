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
| Fireside | среда | 09:07 | каждую неделю |
| This or That | пятница | 09:07 | каждую неделю |
| Weekly Theme | понедельник | 09:07 | каждую неделю |
| Spotlight | среда | 09:07 | раз в 2 недели |
| Friday Check-in | пятница | 10:07 | каждую неделю |
| What I'm Working On | 1-е число месяца | 09:07 | раз в месяц |

Время сдвинуто с ровного часа (09:07 вместо 09:00) — по опыту, `schedule`-триггеры GitHub Actions иногда пропускаются именно в пиковые "круглые" минуты из-за высокой нагрузки.

Fireside, Weekly Theme и This or That постятся каждую неделю по своим дням — без чередования. Только Spotlight остался раз в 2 недели: скрипт проверяет `isGroupWeek('B')` в `src/utils.js` и сам решает, постить в этот раз или нет.

Workflow-файлы, обновляющие банки вопросов/тем/опросов и очередь spotlight, коммитят изменённые файлы в `data/` обратно в репозиторий — поэтому им нужен `permissions: contents: write` (уже прописан).

Запустить вручную можно через **Actions → выбрать workflow → Run workflow**.
