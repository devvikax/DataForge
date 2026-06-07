---
phase: 1
plan: 1
wave: 1
depends_on: []
---

# Plan 1.1: Monorepo Structure & Docker Compose

## Objective
Establish the project's physical monorepo layout and a fully working `docker-compose.yml` that brings up PostgreSQL, the FastAPI backend, and the Next.js frontend as linked services. After this plan, `docker-compose up` starts all three containers, PostgreSQL is healthy, and the backend container is reachable.

## Context
- .gsd/SPEC.md
- .gsd/phases/1/RESEARCH.md

## Tasks

<task type="auto">
  <name>Create monorepo directory structure and environment files</name>
  <files>
    /backend/.env.example
    /frontend/.env.example
    /.env.example
    /.gitignore
    /README.md
  </files>
  <action>
    Create the following directory tree in the project root (C:\Users\vikas\OneDrive\Desktop\Project_06):

    ```
    Project_06/
    ├── backend/              # FastAPI application (to be populated in Plan 1.2)
    ├── frontend/             # Next.js application (to be populated in Plan 1.4)
    ├── docker/
    │   └── postgres/
    │       └── init.sql      # Empty placeholder (schema managed by Alembic)
    ├── .env.example          # Root-level env for docker-compose variable substitution
    ├── .gitignore
    └── README.md
    ```

    ROOT `.env.example` content (this file is used by docker-compose for variable substitution):
    ```
    # PostgreSQL
    POSTGRES_USER=dataforge
    POSTGRES_PASSWORD=dataforge_secret
    POSTGRES_DB=dataforge

    # Backend
    SECRET_KEY=CHANGE_THIS_TO_A_RANDOM_64_CHAR_HEX_STRING
    ADMIN_USERNAME=admin
    ADMIN_PASSWORD=adminpassword123
    ACCESS_TOKEN_EXPIRE_MINUTES=1440
    ALLOWED_ORIGINS=http://localhost:3000

    # Cloudinary (Phase 3 — fill in later)
    CLOUDINARY_CLOUD_NAME=
    CLOUDINARY_API_KEY=
    CLOUDINARY_API_SECRET=

    # Frontend
    NEXT_PUBLIC_API_URL=http://localhost:8000
    ```

    BACKEND `.env.example` (same keys, used when running backend outside Docker):
    ```
    DATABASE_URL=postgresql+asyncpg://dataforge:dataforge_secret@localhost:5432/dataforge
    SECRET_KEY=CHANGE_THIS_TO_A_RANDOM_64_CHAR_HEX_STRING
    ADMIN_USERNAME=admin
    ADMIN_PASSWORD=adminpassword123
    ACCESS_TOKEN_EXPIRE_MINUTES=1440
    ALLOWED_ORIGINS=http://localhost:3000
    CLOUDINARY_CLOUD_NAME=
    CLOUDINARY_API_KEY=
    CLOUDINARY_API_SECRET=
    ```

    FRONTEND `.env.example`:
    ```
    NEXT_PUBLIC_API_URL=http://localhost:8000
    ```

    `.gitignore` must include:
    ```
    # Environment
    .env
    .env.local
    *.env

    # Python
    __pycache__/
    *.pyc
    .venv/
    venv/

    # Node
    node_modules/
    .next/
    out/

    # Docker
    postgres_data/

    # IDE
    .idea/
    .vscode/
    *.swp

    # OS
    .DS_Store
    Thumbs.db
    ```

    `docker/postgres/init.sql`:
    ```sql
    -- Placeholder: schema is managed by Alembic migrations
    -- This file exists to satisfy Docker's initdb directory mounting
    ```

    `README.md` — top-level project readme:
    ```markdown
    # DataForge

    Personal form creation, data collection, and spreadsheet automation platform.

    ## Stack
    - **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN UI
    - **Backend**: Python FastAPI, SQLAlchemy 2.0 (async), Alembic
    - **Database**: PostgreSQL 17
    - **File Storage**: Cloudinary
    - **Deployment**: Docker Compose

    ## Quick Start

    1. Copy env files:
       ```bash
       cp .env.example .env
       cp backend/.env.example backend/.env
       cp frontend/.env.example frontend/.env.local
       ```
    2. Edit `.env` with your values (especially SECRET_KEY)
    3. Start all services:
       ```bash
       docker-compose up --build
       ```
    4. Access:
       - Frontend: http://localhost:3000
       - Backend API: http://localhost:8000
       - API Docs: http://localhost:8000/docs

    ## Development

    See `backend/README.md` and `frontend/README.md` for individual service setup.
    ```
  </action>
  <verify>
    PowerShell: `Test-Path "backend" -and (Test-Path "frontend") -and (Test-Path ".env.example") -and (Test-Path ".gitignore") -and (Test-Path "docker/postgres/init.sql")`
    Expected output: True
  </verify>
  <done>
    - All directories exist: backend/, frontend/, docker/postgres/
    - .env.example exists at root with all required keys
    - backend/.env.example and frontend/.env.example exist
    - .gitignore covers Python, Node, Docker, env files
    - README.md exists at root
  </done>
</task>

<task type="auto">
  <name>Create docker-compose.yml with postgres, backend, and frontend services</name>
  <files>
    /docker-compose.yml
    /backend/Dockerfile
    /frontend/Dockerfile
  </files>
  <action>
    Create `docker-compose.yml` at project root:
    ```yaml
    version: '3.9'

    services:
      postgres:
        image: postgres:17-alpine
        container_name: dataforge_postgres
        environment:
          POSTGRES_USER: ${POSTGRES_USER}
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
          POSTGRES_DB: ${POSTGRES_DB}
        volumes:
          - postgres_data:/var/lib/postgresql/data
          - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
        ports:
          - "5432:5432"
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
          interval: 5s
          timeout: 5s
          retries: 10
          start_period: 15s
        networks:
          - dataforge_net

      backend:
        build:
          context: ./backend
          dockerfile: Dockerfile
        container_name: dataforge_backend
        environment:
          DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
          SECRET_KEY: ${SECRET_KEY}
          ADMIN_USERNAME: ${ADMIN_USERNAME}
          ADMIN_PASSWORD: ${ADMIN_PASSWORD}
          ACCESS_TOKEN_EXPIRE_MINUTES: ${ACCESS_TOKEN_EXPIRE_MINUTES}
          ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
          CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
          CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
          CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
        volumes:
          - ./backend:/app
        ports:
          - "8000:8000"
        depends_on:
          postgres:
            condition: service_healthy
        networks:
          - dataforge_net
        command: >
          sh -c "alembic upgrade head &&
                 uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

      frontend:
        build:
          context: ./frontend
          dockerfile: Dockerfile
        container_name: dataforge_frontend
        environment:
          NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:8000}
        volumes:
          - ./frontend:/app
          - /app/node_modules
          - /app/.next
        ports:
          - "3000:3000"
        depends_on:
          - backend
        networks:
          - dataforge_net
        command: npm run dev

    volumes:
      postgres_data:
        name: dataforge_postgres_data

    networks:
      dataforge_net:
        name: dataforge_network
    ```

    Create `backend/Dockerfile` (development-mode):
    ```dockerfile
    FROM python:3.12-slim

    WORKDIR /app

    # Install system dependencies
    RUN apt-get update && apt-get install -y \
        gcc \
        libpq-dev \
        && rm -rf /var/lib/apt/lists/*

    # Install Python dependencies
    COPY requirements.txt .
    RUN pip install --no-cache-dir -r requirements.txt

    # Copy application code
    COPY . .

    EXPOSE 8000

    # Default command (overridden by docker-compose)
    CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    ```

    Create `frontend/Dockerfile` (development-mode):
    ```dockerfile
    FROM node:20-alpine

    WORKDIR /app

    # Install dependencies first (layer caching)
    COPY package*.json ./
    RUN npm ci

    # Copy application code
    COPY . .

    EXPOSE 3000

    CMD ["npm", "run", "dev"]
    ```
  </action>
  <verify>
    PowerShell: `Test-Path "docker-compose.yml" -and (Test-Path "backend/Dockerfile") -and (Test-Path "frontend/Dockerfile")`
    Content check: `Select-String -Path "docker-compose.yml" -Pattern "service_healthy"` should return a match.
  </verify>
  <done>
    - docker-compose.yml exists with 3 services: postgres, backend, frontend
    - postgres service has healthcheck using pg_isready
    - backend depends_on postgres with condition: service_healthy
    - backend command runs alembic upgrade head before uvicorn
    - Source volume mounts enable hot reload for both services
    - Both Dockerfiles exist (Python 3.12, Node 20)
  </done>
</task>

## Success Criteria
- [ ] Directory structure exists: backend/, frontend/, docker/, .gsd/
- [ ] docker-compose.yml defines all 3 services with proper healthchecks and dependency ordering
- [ ] backend/Dockerfile and frontend/Dockerfile exist and are syntactically valid
- [ ] .env.example files exist at root, backend/, and frontend/ with all required keys documented
- [ ] .gitignore properly excludes .env files, __pycache__, node_modules, .next, postgres_data
