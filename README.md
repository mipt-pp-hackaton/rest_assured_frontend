# Rest Assured — Frontend

Веб-интерфейс (SPA) для бэкенда мониторинга доступности REST-сервисов **Rest Assured**.

**Бэкенд:** https://github.com/mipt-pp-hackaton/rest_assured
(Docker-образ `ghcr.io/mipt-pp-hackaton/rest_assured:latest`, API по OpenAPI 3.1.)

Приложение показывает состояние отслеживаемых сервисов: сводку по SLA и аптайму,
графики метрик во времени, список инцидентов и управление сервисами/пользователями.

---

## Возможности

- **Аутентификация (JWT, OAuth2 password flow).** Вход, публичная регистрация,
  прозрачное обновление токена по `refresh` при 401, защищённые маршруты. Токены
  хранятся в `localStorage` с fallback в память.
- **Дашборд.** Карточки сервисов со статусом (up / down / unknown), SLA и аптаймом;
  клик по карточке → страница метрик с графиком.
- **Сервисы.** Список (клик по имени → редактирование), создание, редактирование и
  удаление (с подтверждением в строке). У сервиса есть поле `owner_emails` —
  адреса, которым отправляются уведомления об инцидентах.
- **Метрики сервиса.** Панель текущих значений + временной график (up-ratio и
  latency p95) на Recharts с выбором диапазона и размера бакета.
- **Инциденты.** Таблица с фильтрами (только открытые / только SLA-breach /
  по `service id` / лимит).
- **Администрирование.** Суперюзер может создавать пользователей (в т.ч. выдавать
  права админа). Пункт меню и маршрут закрыты `AdminRoute`.
- **Глобальные уведомления.** Любой не-2xx ответа (422 / 500 / сеть / …) показывается
  пользователю тостом; сообщения зависят от статуса ответа.

## Технологии

- **React 19 + TypeScript + Vite**
- **React Router v7** — маршрутизация
- **TanStack Query v5** — загрузка данных, кэш, глобальная обработка ошибок
- **Zod v4** — схемы по OpenAPI, из которых выводятся TS-типы
- **Recharts** — графики метрик
- **Vitest + Testing Library + MSW** — тесты (261 тест / 41 файл)
- **nginx + Docker** — сборка и раздача SPA, reverse-proxy к бэкенду

## Быстрый старт (Docker)

Поднимает весь стек: фронтенд (nginx) + бэкенд + PostgreSQL + MailHog.

```bash
docker compose up --build
```

- SPA: <http://localhost:8080>
- API-документация (Swagger / ReDoc): <http://localhost:8080/docs>, <http://localhost:8080/redoc>
- MailHog (перехваченные письма уведомлений): <http://localhost:8025>
- Демо-вход (создаётся сид-данными бэкенда): **admin@admin.com / admin**

`.env` по умолчанию не нужен — скопируйте `.env.example` → `.env`, только если хотите
изменить порты или базовый URL API. Конфигурация бэкенда монтируется из
`backend/settings.toml` (хост БД = `postgres`, SMTP = `mailhog`).

## Локальная разработка (без Docker)

```bash
npm ci
npm run dev        # Vite dev server
```

Нужен запущенный бэкенд; укажите его адрес в `.env`:
`VITE_API_BASE_URL=http://localhost:8000`.

Скрипты:

| Команда | Назначение |
| --- | --- |
| `npm run dev` | dev-сервер Vite (HMR) |
| `npm run build` | проверка типов + production-сборка в `dist/` |
| `npm run preview` | предпросмотр собранного бандла |
| `npm test` | прогон тестов (Vitest) |
| `npm run typecheck` | проверка типов (`tsc -b`) |
| `npm run lint` | ESLint |

## Маршруты

- **Публичные:** `/login`, `/register`
- **Защищённые** (`ProtectedRoute`): `/` (дашборд), `/services`, `/services/new`,
  `/services/:id` (метрики/график), `/services/:id/edit`, `/incidents`
- **Только для админа** (`AdminRoute`): `/users/new`
- Остальное → страница 404

## Сетевая модель

Браузер общается только с nginx фронтенда (порт `8080`). nginx:

- раздаёт собранный SPA с history-fallback на `index.html`;
- проксирует на `backend:8000` запросы `/api/`, `/health` и документацию
  (`/docs`, `/redoc`, `/openapi.json`).

Поэтому SPA по умолчанию использует относительные same-origin URL
(`VITE_API_BASE_URL` пустой при сборке в Docker). Документация бэкенда живёт в корне
(`/docs`), а не под префиксом `/api`.

## Структура проекта

```
src/
  api/            HTTP-клиент (httpClient, authInterceptor, ApiError), Zod-схемы и
                  типы, клиенты эндпоинтов (auth / services / metrics / incidents /
                  users), errorMessage, queryClient (глобальные тосты на ошибки)
  auth/           AuthContext, useAuth, tokenStorage, ProtectedRoute, AdminRoute
  notifications/  провайдер уведомлений + контекст (Toaster — в components)
  components/     AppLayout, NavBar, QueryStates, Toaster
  features/       auth, dashboard, services, incidents, users — формы, таблицы, график
  pages/          компоненты страниц для маршрутов
  utils/          форматтеры (даты, SLA %, аптайм, статус инцидента)
  test/           настройка Vitest + MSW
nginx/            конфиг nginx (раздача SPA + reverse-proxy)
backend/          settings.toml бэкенда (монтируется в контейнер бэкенда)
Dockerfile        многоступенчатая сборка: Vite build → nginx-unprivileged
docker-compose.yml  стек: frontend + backend + postgres + mailhog
```

## Конфигурация (переменные окружения)

Читаются `docker compose` через `${VAR}` (см. `.env.example`):

| Переменная | Назначение | По умолчанию |
| --- | --- | --- |
| `VITE_API_BASE_URL` | базовый URL API для `npm run dev` | `http://localhost:8000` |
| `FRONTEND_API_BASE_URL` | build-arg для сборки SPA в Docker (пусто = same-origin) | пусто |
| `FRONTEND_HOST_PORT` | хост-порт фронтенда | `8080` |
| `BACKEND_PORT` | порт бэкенда внутри сети | `8000` |
| `MAILHOG_WEB_PORT` | хост-порт веб-интерфейса MailHog | `8025` |

Прикладная конфигурация бэкенда (БД, JWT, SMTP) задаётся в `backend/settings.toml`.

## Тестирование

Юнит- и интеграционные тесты на Vitest + Testing Library с моками сети через MSW.
Запуск:

```bash
npm test          # 261 тест / 41 файл
npm run typecheck
npm run lint
```
