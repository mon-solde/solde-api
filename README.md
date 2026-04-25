# taxi-vroom-api

## Prerequisites

- [Node.js](https://nodejs.org/) v20.1.0 (managed via [Volta](https://volta.sh/))
- [Docker](https://www.docker.com/) and Docker Compose

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and adjust if needed:

```bash
cp .env.example .env
```

Default values:

| Variable       | Value                                          |
|----------------|------------------------------------------------|
| `DB_HOST`      | `localhost`                                    |
| `DB_PORT`      | `5432`                                         |
| `DB_USERNAME`  | `user`                                         |
| `DB_PASSWORD`  | `password`                                     |
| `DB_NAME`      | `ddh`                                          |
| `DATABASE_URL` | `postgresql://user:password@localhost:5432/ddh` |

### 3. Start the infrastructure

Launch PostgreSQL and pgAdmin via Docker:

```bash
npm run docker:env
```

To run in detached mode (background):

```bash
docker-compose --file docker/docker-compose.yml up --build -d
```

- **PostgreSQL** is available on port `5432`
- **pgAdmin** is available at [http://localhost:5050](http://localhost:5050) (login: `admin@email.com` / `admin`)

### 4. Apply the database schema

```bash
npm run db:push
```

### 5. (Optional) Seed the database

```bash
npm run db:seed
```

### 6. Start the application

```bash
npm run start:dev
```

## Tests

The tests use a separate database (`ddh_tests`) to avoid touching your dev data.

### First-time setup (one time only)

**1. Create the test database:**

```bash
docker exec -it postgres-container psql -U user -d ddh -c "CREATE DATABASE ddh_tests;"
```

**2. Apply the schema to the test database:**

```bash
npm run db:push:tests
```

### Run the tests

```bash
npm run test       # unit tests only
npm run test:e2e   # end-to-end tests only
```

> After any schema change (`prisma/schema.prisma`), re-run `npm run db:push:tests` to keep the test database in sync.

## Available Scripts

| Script                       | Description                                         |
|------------------------------|-----------------------------------------------------|
| `npm run start:dev`          | Start in watch mode (hot-reload)                    |
| `npm run start:debug`        | Start in debug mode with watch                      |
| `npm run start:prod`         | Start from compiled `dist/`                         |
| `npm run build`              | Build the project                                   |
| `npm run docker:env`         | Start PostgreSQL and pgAdmin via Docker             |
| `npm run db:push`            | Apply Prisma schema to dev database                 |
| `npm run db:push:tests`      | Apply Prisma schema to test database                |
| `npm run db:seed`            | Seed the dev database                               |
| `npm run db:seed:tests`      | Seed the test database                              |
| `npm run migration:dev`      | Create and apply a new migration (dev)              |
| `npm run migration:deploy`   | Apply pending migrations (production)               |
| `npm run migration:reset`    | Reset the dev database (drop + recreate + migrate)  |
| `npm run migration:reset:tests` | Reset the test database                          |
| `npm run migration:status`   | Check migration status                              |
| `npm run prisma:generate`    | Regenerate Prisma client                            |
| `npm run prisma:studio`      | Open Prisma Studio (visual DB browser)              |
| `npm run test`               | Run unit tests                                      |
| `npm run test:e2e`           | Run end-to-end tests (sequential, uses DB)          |
| `npm run test:cov`           | Run tests with coverage                             |
| `npm run lint`               | Lint and auto-fix source files                      |
| `npm run format`             | Format source files with Prettier                   |
| `npm run deps:validate`      | Validate dependency rules                           |
| `npm run deps:graph`         | Generate dependency graph (SVG)                     |
