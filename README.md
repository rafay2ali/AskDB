# AskDB


The application is deployed using **Vercel** for the frontend, **Render** for the backend, and **Supabase** for cloud-hosted PostgreSQL.

## 🌐 Live Demo

| Service | Deployment |
|---|---|
| **Frontend (Vercel)** | [ask-db-seven.vercel.app](https://ask-db-seven.vercel.app/) |
| **Backend API (Render)** | [askdb-hww5.onrender.com](https://askdb-hww5.onrender.com) |
| **Database** | Supabase PostgreSQL |
| **GitHub Repository** | [AskDB](https://github.com/rafay2ali/AskDB) |

## 🚀 Tech Stack

### Frontend
- React.js
- TypeScript
- Vite
- REST API integration

### Backend
- Node.js
- Express.js
- TypeScript
- PostgreSQL (`pg`)
- Zod for validation
- CORS
- Node SQL Parser

### Database & Deployment
- **PostgreSQL** — Relational database
- **Supabase** — Managed PostgreSQL hosting
- **Vercel** — Frontend hosting
- **Render** — Backend hosting
- **GitHub** — Version control

## 🏗️ System Architecture

```text
              USER
                |
                v
        React Frontend
             Vercel
                |
                | HTTP / REST API
                v
       Node.js + Express
             Render
                |
                | PostgreSQL (pg)
                v
        Supabase Database
            PostgreSQL
```

The frontend communicates with the Express backend through API requests. The backend handles application logic and communicates with the PostgreSQL database hosted on Supabase.

## 📁 Project Structure

```text
AskDB/
├── Backend/
│   ├── src/
│   │   └── server.ts
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
│
├── Frontend/
│   └── ...
│
├── scripts/
├── .gitignore
├── package.json
└── README.md
```

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/rafay2ali/AskDB.git
cd AskDB
```

### 2. Backend setup

Navigate to the backend directory:

```bash
cd Backend
npm install
```

Create a `.env` file and configure the environment variables required by your backend.

Example:

```env
DATABASE_URL=your_postgresql_connection_string
APP_ENCRYPTION_KEY=your_secure_encryption_key
PORT=5000
NODE_ENV=development
```

Start the development server:

```bash
npm run dev
```

For a production build:

```bash
npm run build
npm start
```

### 3. Frontend setup

Open another terminal:

```bash
cd Frontend
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

The frontend will run on the local development URL displayed by Vite.

## 🗄️ Database Configuration

AskDB uses **PostgreSQL**, hosted in production on **Supabase**.

The backend connects to the database using the `pg` Node.js package.

For production deployment:

1. Create a PostgreSQL project on Supabase.
2. Obtain the PostgreSQL connection string.
3. Configure the database connection in the Render environment variables.
4. Set up the required database schema and tables.
5. Verify the connection between the backend and Supabase.

Database credentials must remain on the backend and should never be exposed in frontend code.

## ☁️ Deployment

### Frontend — Vercel

The React frontend is deployed on Vercel.

**Live URL:** https://ask-db-seven.vercel.app/

Configure the frontend API environment variable:

```env
VITE_API_URL=https://askdb-hww5.onrender.com
```

Redeploy the frontend after updating build-time environment variables.

### Backend — Render

The Express backend is deployed as a Render Web Service.

**Live URL:** https://askdb-hww5.onrender.com

Recommended configuration:

| Setting | Value |
|---|---|
| Runtime | Node.js |
| Root Directory | `Backend` |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |
| Node.js Version | 22.x |

Configure the required backend environment variables securely through the Render dashboard.

### Database — Supabase

Supabase provides managed PostgreSQL hosting for the production database.

The backend communicates directly with PostgreSQL using a secure database connection.

## 🔐 Security

- Sensitive environment variables are stored outside the source code.
- Database credentials remain on the backend.
- Application encryption uses a dedicated environment key.
- API input validation uses Zod.
- Cross-origin requests are managed using CORS.
- Production secrets should never be committed to GitHub.

## 🧪 Available Scripts

### Backend

| Command | Description |
|---|---|
| `npm run dev` | Start the TypeScript development server |
| `npm run build` | Compile TypeScript |
| `npm start` | Start the compiled backend |
| `npm test` | Run backend tests |

## 👨‍💻 Author

**Abdur Rafeh**

Full-Stack Developer

GitHub: [@rafay2ali](https://github.com/rafay2ali)

## 📄 License

This project is currently configured with the ISC license in its backend package metadata.
