# ART SAFE PLACE

Веб-приложение для музыкантов и артистов СНГ. Помогает вести творческий путь от демо до релиза: управление треками, поиск специалистов, обучение и цифровая идентичность артиста.

## Технологии

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **UI:** TailwindCSS
- **Backend:** Route handlers (Next.js API), Prisma ORM
- **БД:** PostgreSQL
- **Аутентификация:** NextAuth (Credentials, JWT)
- **Валидация:** Zod
- **Data fetching:** @tanstack/react-query

## Структура проекта

```
├── src/
│   ├── app/          # Страницы и API routes
│   ├── components/   # UI и feature-компоненты
│   ├── lib/          # Сервисы, хелперы, доменная логика
│   └── contracts/    # Схемы и контракты
├── prisma/           # Схема БД, миграции, seed
├── docs/             # Документация проекта
├── scripts/          # Служебные скрипты
└── uploads/          # Локальное хранилище аудио
```

## Установка и запуск

### 1. Установить зависимости

```bash
npm install
```

### 2. Настроить окружение

```bash
cp .env.example .env
```

Заполнить переменные в `.env`:
- `DATABASE_URL` — строка подключения к PostgreSQL
- `NEXTAUTH_URL` — URL приложения (по умолчанию `http://localhost:3000`)
- `NEXTAUTH_SECRET` — секрет для JWT-сессий

### 3. Запустить базу данных

```bash
docker-compose up -d db
```

### 4. Применить миграции и seed-данные

```bash
npm run prisma:migrate
npm run prisma:seed
```

### 5. Запустить dev-сервер

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3000`.

## Скрипты

| Команда               | Описание                          |
|-----------------------|-----------------------------------|
| `npm run dev`         | Запуск dev-сервера                |
| `npm run build`       | Сборка проекта                    |
| `npm run lint`        | Проверка кода (ESLint)            |
| `npm run typecheck`   | Проверка типов (TypeScript)       |
| `npm run docs`        | Генерация документации (TypeDoc)  |
| `npm run prisma:migrate` | Применение миграций БД         |
| `npm run prisma:seed`    | Заполнение БД тестовыми данными|

## Документация

API-документация генерируется из JSDoc-комментариев в коде с помощью [TypeDoc](https://typedoc.org/):

```bash
npm run docs
```

Результат сохраняется в директорию `docs/api/`.

## Docker

Запуск всего стека (приложение + БД):

```bash
docker-compose up --build
```

## Лицензия

Проект разработан в рамках дисциплины «Технологии разработки программных приложений» (РТУ МИРЭА).
