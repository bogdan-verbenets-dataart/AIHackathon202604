# AIHackathon202604

A classic web-based real-time chat application.

The requirements are described at [requirements.md](requirements.md).

## Running

```bash
docker compose up
```

The application will be available at **http://localhost**

The API is also directly accessible at http://localhost:4000

## Development

### Backend

```bash
cd server
npm install
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

## Architecture

- **Frontend**: React 18 + TypeScript SPA (Vite), served by nginx
- **Backend**: Node.js + TypeScript (Express + Socket.io), Prisma ORM
- **Database**: PostgreSQL 16
- **Cache / Pub-Sub**: Redis 7
- **File storage**: Docker named volume (`uploads`)

## Features (Phases 1–3)

- Registration, login, multi-session management, password reset/change
- Public and private rooms with owner/admin roles, ban list, invites
- Real-time messaging with reply threading, edit/delete
- Contacts / friend requests, personal chats, user blocks
- File attachments (upload/download, access-controlled)
- Live presence (online / AFK / offline) across multiple browser tabs
- Unread message counters with real-time updates
- Session management UI (view and revoke active sessions)