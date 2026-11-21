# AskDB frontend

React + TypeScript + Vite landing page and authenticated PostgreSQL platform. See [the project README](../README.md) for setup and deployment details.

Run both services from the project root with `npm run dev`. New users create an account, test their own PostgreSQL credentials, select tables, save the connection, and open their query workspace. There is no sample data mode.

`npm run build` builds the frontend. API keys stay on the backend. Database credentials are entered only in the connection form and are never stored in browser local storage.
