# ART SAFE PLACE

`ART SAFE PLACE` — веб-продукт для артиста, построенный вокруг двух опор:
`Мир артиста` и `Путь артиста`.

Идея продукта: карьера артиста — это не только песни. Это система из смысла, образа, аудитории, контента, людей, execution-ритма и долгого вектора. Система не убивает творчество, а даёт ему структуру, устойчивость и масштаб.

## Что есть в продукте

- `/id` — `Мир артиста` и `SAFE ID`
- `/today` — `Путь артиста`, приоритеты и daily-ритм
- `/songs` — музыкальный workspace: треки, демо, проекты
- `/find` — поиск людей, сессий и услуг
- `/learn` — контекстное обучение
- `/community` — окружение, обратная связь и accountability
- `/assistant` — отложенная поверхность, не ядро phase 1

## Актуальный first-time flow

Для нового пользователя вход сейчас устроен так:

1. Регистрация на `/signup` по `e-mail + пароль`
2. Визуальная анкета на `/welcome`
3. Одноразовый гайд по `Today -> Songs -> Find -> ID`
4. Возврат на `/today` с приоритетом на `Мир артиста`
5. Дальше пользователь уже двигается по основным поверхностям продукта

Важно: старые пользователи не должны насильно выбрасываться в новый flow, если у них нет новой onboarding-state записи.

## Быстрый запуск

### 1. Установить зависимости

```bash
npm install
```

### 2. Подготовить окружение

```bash
cp .env.example .env
```

По умолчанию приложение ждёт PostgreSQL на:

```env
DATABASE_URL=postgresql://artsafe:artsafe@localhost:5432/artsafehub
```

### 3. Поднять базу

```bash
docker-compose up -d db
```

### 4. Применить миграции и сид

```bash
npx prisma migrate deploy
npm run prisma:seed
```

Для локальной разработки также можно использовать:

```bash
npm run prisma:migrate
```

### 5. Запустить dev server

```bash
npm run dev
```

## Демо-доступ

- `Email:` `demo@artsafehub.app`
- `Password:` `demo1234`

## Полезные команды

### Смена PATH stage у demo-профиля

```bash
npm run demo:stage -- <stageOrder|stageName> [email]
```

Примеры:

```bash
npm run demo:stage -- 2
npm run demo:stage -- "Искра"
npm run demo:stage -- 4 user@example.com
```

### Очистить demo-профиль

```bash
npm run demo:reset
```

### Очистить профильные данные у всех аккаунтов

Сохраняются сами аккаунты, `email` и `password`, но очищаются профили, треки, onboarding-state и связанный пользовательский контент.

```bash
npm run profiles:reset
```

## Проверки

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Технологии

- Next.js 14 (App Router) + TypeScript
- TailwindCSS
- Prisma ORM + PostgreSQL
- NextAuth Credentials
- TanStack Query

## Куда смотреть в коде

- shell и навигация: `src/components/layout/app-shell.tsx`
- корневой вход и redirect-логика: `src/app/page.tsx`
- onboarding state и guide flow: `src/lib/entry-flow.ts`
- визуальная анкета: `src/app/welcome/page.tsx`
- home overview API: `src/app/api/home/overview/route.ts`
- `Мир артиста`: `src/app/id/page.tsx`, `src/app/api/id/route.ts`, `src/lib/artist-world.ts`

## Важно помнить

- Это web-first продукт.
- `AI ASSIST` не является центральной поверхностью phase 1.
- В UI важны формулировки `Мир артиста` и `Путь артиста`, даже если технические URL пока короче.
- Если локально падает Prisma с `Can't reach database server at localhost:5432`, почти всегда сначала нужно проверить, что поднят `docker-compose` и жив контейнер `db`.
