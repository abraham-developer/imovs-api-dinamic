# iMOVS API Dinamic

A powerful workflow automation platform (n8n-inspired) built with modern web technologies. Create, edit, and execute visual workflows with HTTP requests, JavaScript code, webhooks, and more.

## ✨ Features

- **Visual Workflow Editor** — Drag & drop nodes on an interactive canvas using React Flow
- **Node Types** — Manual Trigger, Webhook, Schedule, HTTP Request, JavaScript Code, IF/ELSE, Merge, Set, Respond to Webhook
- **Expression Editor** — Reference output variables from upstream nodes using `{{ nodeLabel.fieldName }}` syntax
- **Webhook Support** — Create unique webhook URLs with configurable response modes (immediate, last node, response node)
- **Code Execution** — Run sandboxed JavaScript with access to input data and environment variables
- **Authentication** — Client-side user management with login/signup

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Workflow Engine**: React Flow (visual editor), custom BFS execution engine
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (lightweight, zero-config)
- **State Management**: Zustand

## 📦 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- npm or bun
- Git

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/abraham-developer/imovs-api-dinamic.git
cd imovs-api-dinamic

# 2. Install dependencies
npm install

# 3. Setup database
npx prisma generate
npx prisma db push

# 4. Start development server
npm run dev
```

The app will be available at **http://localhost:3000**

### First Time
1. Open http://localhost:3000
2. Create an account (Sign Up) with your name, email and password
3. Click "New Workflow" to create your first workflow
4. Drag nodes from the left palette onto the canvas
5. Click a node to configure it in the right panel
6. Click "Execute" to run the workflow

## 🐳 Docker Setup

### Using Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/abraham-developer/imovs-api-dinamic.git
cd imovs-api-dinamic

# 2. Build and start
docker compose up -d

# 3. View logs
docker compose logs -f

# 4. Stop
docker compose down
```

The app will be available at **http://localhost:3000**

### Using Docker directly

```bash
# Build
docker build -t imovs-api .

# Run
docker run -d -p 3000:3000 -v ./data:/app/data --name imovs imovs-api
```

### Docker Data Persistence
SQLite database files are stored in `./data/` directory. This volume ensures your workflows persist across container restarts.

## 📁 Project Structure

```
imovs-api-dinamic/
├── prisma/
│   └── schema.prisma       # Database schema (SQLite)
├── public/                  # Static assets
├── src/
│   ├── app/
│   │   ├── api/             # API routes (workflows, executions, webhooks)
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Entry page with auth gate
│   ├── components/
│   │   ├── flowforge/       # Workflow UI components
│   │   │   ├── workflow-editor.tsx    # Visual editor with React Flow
│   │   │   ├── workflow-dashboard.tsx # Workflow list
│   │   │   ├── custom-nodes.tsx       # Custom node components
│   │   │   ├── node-config-panel.tsx  # Node configuration forms
│   │   │   ├── expression-field.tsx   # Expression editor with fx button
│   │   │   ├── login-page.tsx         # Login/Signup page
│   │   │   └── user-menu.tsx          # User avatar dropdown
│   │   └── ui/              # shadcn/ui components
│   ├── lib/
│   │   ├── engine/
│   │   │   ├── types.ts     # Node type definitions
│   │   │   ├── executor.ts  # Workflow execution engine (BFS)
│   │   │   └── nodes/       # Node executors (http, code, webhook, etc.)
│   │   ├── api.ts           # API service layer
│   │   └── utils.ts         # Utility functions
│   └── store/
│       ├── imovs-store.ts   # Main application store (Zustand)
│       └── auth-store.ts    # Authentication store
├── Dockerfile
├── docker-compose.yml
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workflows` | List all workflows |
| POST | `/api/workflows` | Create a new workflow |
| GET | `/api/workflows/:id` | Get a workflow |
| PUT | `/api/workflows/:id` | Update a workflow |
| DELETE | `/api/workflows/:id` | Delete a workflow |
| POST | `/api/workflows/:id/execute` | Execute a workflow |
| GET | `/api/executions` | List execution history |
| GET/POST/PUT/DELETE | `/api/webhook/:path` | Webhook endpoint |

## 🚀 Available Nodes

| Node | Category | Description |
|------|----------|-------------|
| Manual Trigger | Trigger | Start workflow manually |
| Webhook | Trigger | Trigger via HTTP request |
| Schedule | Trigger | Trigger on cron schedule |
| HTTP Request | Action | Make HTTP API calls |
| Code | Action | Execute JavaScript code |
| IF | Logic | Conditional branching |
| Merge | Logic | Merge data from branches |
| Set | Utility | Set/modify data fields |
| Respond to Webhook | Utility | Define HTTP response |
| No Operation | Utility | Pass-through node |

## 📝 License

MIT
