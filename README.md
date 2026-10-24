# TDServer

TeleporterDash's backend server. Built on Cloudflare Workers with KV and R2.

## How it works

```text
┌────────────────────────────────────────────┐
│              TDServer Worker               │
│                                            │
│  Routes:                                   │
│  ├─ GET    /levels                         │
│  ├─ GET    /level/:id                      │
│  ├─ POST   /level                          │ 
│  ├─ POST   /level/:id/rating               │
│  ├─ POST   /level/:id/comment              │
│  ├─ GET    /music                          │
│  ├─ GET    /music/:id                      │
│  ├─ POST   /music                          │
│  └─ DELETE /music/:id                      │
│                                            │
│  Storage:                                  │
│  ├─ KV  TELEPORTER_LEVELS -> level data    │
│  ├─ KV  TELEPORTER_MUSIC  -> music catalog │
│  └─ R2  TELEPORTER_AUDIO  -> audio files   │
└────────────────────────────────────────────┘
```

## Setup

### 1. Create KV namespaces

```bash
wrangler kv namespace create TELEPORTER_LEVELS
wrangler kv namespace create TELEPORTER_MUSIC
```

Copy the returned IDs into `wrangler.toml`.

### 2. Create R2 bucket

```bash
wrangler r2 bucket create teleporterdash-audio
```

Update the `bucket_name` in `wrangler.toml`.

### 3. Deploy

```bash
npm install
wrangler deploy
```

Publishes to `https://tdserver.neeljaiswal23.workers.dev`.

## Migration

Import the 65 existing levels from the archived TDLevels repo:

```bash
npx tsx scripts/migrate-levels.ts
```

## Audio

- **Built-in level songs** stay in the game repo (`Sound/Level Soundtracks/`)
- **User-uploaded songs** are stored in R2 (`teleporterdash-audio` bucket)
- **Catalog metadata** is stored in KV (`TELEPORTER_MUSIC`)

Supported formats: OGG (preferred), MP3.

## Security

- **CORS:** Domain-scoped to `teleporterdash.github.io` (configurable via `ALLOWED_ORIGIN`)
- **Reads:** Open
- **Writes:** Open but rate-limited (10 requests/hour per IP)
- **No HTML served** — pure JSON API

## Cost

Free tier covers everything. Cloudflare Workers KV: 100k reads/day, 1k writes/day. R2: 10GB storage, 10M reads/month.