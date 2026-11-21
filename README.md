# AskDB

A PostgreSQL analytics platform: create an account, connect your own read-only database, choose tables, and ask Gemini questions. There is no sample analytics database, seeded result preview, fixed question translator, or shared default customer connection.

## Start locally

Requires Node.js 22.13+ and PostgreSQL reachable from the backend. Node 22 reports an experimental warning for its SQLite module; that module stores application accounts/settings only, not analytics rows.

Install dependencies once:

    npm --prefix Backend install
    npm --prefix Frontend install

Keep your Gemini key in Backend/.env:

    GEMINI_API_KEY=your_private_key
    GEMINI_MODEL=gemini-3.5-flash-lite
    PORT=5000
    FRONTEND_ORIGIN=http://localhost:5173

Then run both services from the project root:

    npm run dev

Open the Vite URL, normally http://localhost:5173. Frontend API calls are proxied to localhost:5000. Restart the backend after changing environment variables.

## First-user procedure

1. Click Launch app or Try it now.
2. Choose Create an account. The AskDB account password is separate from a PostgreSQL password.
3. Click Connect PostgreSQL and enter a connection name, host, port, exact database name, read-only username/password, and TLS setting.
4. Click Test connection. No records are written. Readable base tables and their schemas/columns are discovered dynamically.
5. Select 1 to 20 tables. Tables on which the login has write privileges cannot be selected.
6. Click Save & open workspace. Credentials are encrypted on the backend and the password field is discarded from the browser component.
7. Ask a question. Inspect the executed SQL and calculation, then sort, chart, or export the real returned rows.

For the existing local setup, enter database Ask_db, username askdb_reader, the corresponding private password, localhost, port 5432, and TLS disabled if your local server has no TLS configured. Choose the tables you previously created. Those database records have not been deleted or replaced.

Legacy DATABASE_PROVIDER and PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD entries in your local .env no longer choose a shared database for the web app. Each account must save its own connection through the website. The optional verification script can still use those private entries; the application never imports them as another user's connection.

## Working features

- Registration, login, logout, seven-day server-side sessions, HttpOnly SameSite=Strict cookies, and origin checks for state-changing browser requests.
- Password hashes use salted scrypt. Session tokens are random; only their hashes are stored.
- Per-account connections; explicit ownership checks on schema access, queries, validation, history, table changes, reconnect/disconnect, and deletion.
- AES-256-GCM encryption for saved connection configurations, bound to account and connection IDs. Passwords are never returned by connection APIs or sent to Gemini.
- Dynamic PostgreSQL schemas, selected tables, column types, and foreign-key metadata. No fixed products/orders allowlist.
- Gemini receives only the question and selected schema metadata, not query result rows. Google API data handling follows your account terms.
- SQL parser checks one SELECT, schema-qualified selected tables, allowed built-in functions and casts. CTEs, writes, system tables, external functions, and SELECT INTO are blocked.
- PostgreSQL READ ONLY transactions, 3-second statement timeout, 1-second lock timeout, and 1000-row output cap. Privileged database roles are rejected.
- Persistent private question history, table sorting/pagination, chart label/metric selection, CSV formula-cell escaping, SQL copying, cancellation, and empty/error states.
- Saved connection test/reconnect, disconnect, table selection changes, and removal. Removing a saved connection removes its app history, not any PostgreSQL objects or records.
- Terminal landing design, Three.js background, keyboard shortcuts, reduced-motion support, and animation pause controls.

## Where settings persist

By default, Backend/.data/accounts.sqlite holds accounts, hashed sessions, encrypted connection configurations, selected table names, and question history. Backend/.data/credentials.key holds the local development encryption key. Both are ignored by Git. No database result rows are persisted.

Keep the application database and encryption key together in a private backup. Losing the key makes saved connection credentials unrecoverable. Existing browser-local history from the old prototype is not automatically attached to any account.

## Build and checks

    npm run build
    npm test

The backend now compiles to Backend/dist; after building, it can run with:

    npm --prefix Backend start

Tests use isolated in-memory account storage and mocked PostgreSQL/Gemini responses. They check credentials, session handling, account isolation, connection onboarding, dynamic SQL permissions, safe failures, and provider refusal handling. They do not create analytics fixtures in your database.

Optional browser verification on Windows with Google Chrome installed:

    npm run test:browser

Build first. This starts temporary servers and an isolated account store. If the old PG variables are present locally, it tests your actual PostgreSQL connection and row-count reads; the Gemini response is mocked to avoid API quota. It checks registration/login/logout, connection selection, querying, disconnect/reconnect, removal, landing interactions and mobile overflow. Screenshots are written under ignored .qa/. No PostgreSQL records are changed and test accounts are not persisted.

Optional complete live Gemini + PostgreSQL verification (one AI request, may consume API quota):

    npm --prefix Backend run check:platform

This uses the private PG variables in Backend/.env, creates an ephemeral account, connects, selects one readable table and asks for a count. It prints no credentials and writes no PostgreSQL data.

## Hosting and connection reachability

The backend, not the visitor's browser, connects to PostgreSQL. On a hosted app, localhost refers to the backend computer. A user's laptop database needs a reachable endpoint or a separate secure connector; this version does not include a private-network connector.

Production mode requires a separate private base64-encoded 32-byte APP_ENCRYPTION_KEY, a persistent APP_STORE_PATH, HTTPS, same-origin /api routing, and NODE_ENV=production. The backend then sets Secure cookies, requires verified database TLS, rejects private/link-local/loopback targets, and pins the resolved server address for the connection. Local development allows localhost and private database addresses. Do not publish a development-mode server as a public service.

This implementation is a single-server platform foundation. Email verification/password recovery, shared multi-instance session/storage infrastructure, account billing/quotas, and managed deployment are not included. Public deployment should include those operational choices and a security review.
