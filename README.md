# SocialPulse V10

> Production-ready TikTok-level social video platform — Vue 3 + Appwrite

---

## CMD Quick Start (Windows / Mac / Linux)

```
git clone <repo-url>
cd socialpulse-v10-final
npm install
copy .env.example .env.local       ← Windows
cp  .env.example  .env.local       ← Mac/Linux
```

Edit `.env.local` — add your Appwrite credentials (see below), then:

```
npm run setup
npm run dev
```

Open http://localhost:5173 — done.

---

## Step 1 — Get Appwrite Credentials

### Option A: Appwrite Cloud (free, fastest)

1. Go to https://cloud.appwrite.io
2. Sign up → Create Project → copy **Project ID**
3. Settings → API Keys → Create Key → select all → copy **API Key**

### Option B: Self-host with Docker

```
docker run -d --name appwrite \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v appwrite_storage:/storage \
  -p 80:80 -p 443:443 \
  appwrite/appwrite:latest
```

Access at http://localhost — create project there.

---

## Step 2 — Configure .env.local

Open `.env.local` and fill in:

```
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id_here
VITE_APPWRITE_DATABASE_ID=socialpulse_db
APPWRITE_API_KEY=your_server_api_key_here
```

> `APPWRITE_API_KEY` (no VITE_ prefix) is only used by the setup script.
> The rest are used by the browser app.

---

## Step 3 — Create Database (one time only)

```
npm run setup
```

This auto-creates all 14 collections, indexes, and 5 storage buckets.
Takes ~30 seconds. Output ends with ✅ Setup complete!

---

## Step 4 — Run

```
npm run dev         # development
npm run build       # production build
npm run preview     # preview production build locally
```

---

## Deploy

### Vercel (recommended)

```
npm i -g vercel
vercel login
vercel
```

Set environment variables in Vercel dashboard → Settings → Environment Variables.

### Netlify

```
npm i -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

### Firebase

```
npm i -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

### Docker

```
docker build -t socialpulse .
docker run -p 3000:3000 socialpulse
```

---

## Project Structure

```
src/
├── pages/
│   ├── auth/        Login.vue  Register.vue
│   ├── Home.vue     VideoDetail.vue  Upload.vue
│   ├── Profile.vue  Search.vue       Settings.vue
│   ├── Messages.vue Conversation.vue Notifications.vue
│   └── NotFound.vue
├── components/
│   ├── VideoCard.vue
│   └── CommentItem.vue
├── services/
│   ├── auth.js          notifications.js
│   ├── users.js         messaging.js
│   ├── videos.js        social.js
│   ├── feed.js          admin.js
│   └── comments.js
├── stores/
│   ├── auth.js
│   └── feed.js
├── router/index.js
├── config/appwrite.js
├── styles/main.css
├── App.vue
└── main.js
appwrite/
├── schema/collections.js   ← all 14 schemas
└── setup/setup-collections.js
```

---

## Collections Created

| # | Collection     | Purpose                        |
|---|----------------|--------------------------------|
| 1 | users          | Profiles, follow counts        |
| 2 | videos         | Video metadata, analytics      |
| 3 | comments       | Nested comments + replies      |
| 4 | likes          | Video and comment likes        |
| 5 | follows        | Follow relationships           |
| 6 | saves          | Saved / bookmarked videos      |
| 7 | notifications  | Real-time alerts               |
| 8 | conversations  | DM threads                     |
| 9 | messages       | Direct messages                |
|10 | video_views    | View tracking                  |
|11 | hashtags       | Trending hashtag counts        |
|12 | reports        | Content moderation reports     |
|13 | blocked_users  | User blocks                    |
|14 | admin_logs     | Admin audit trail              |

## Storage Buckets Created

| Bucket         | Max Size | Purpose               |
|----------------|----------|-----------------------|
| videos         | 5 GB     | Video files           |
| thumbnails     | 10 MB    | Video thumbnails      |
| avatars        | 5 MB     | Profile photos        |
| covers         | 10 MB    | Cover/banner images   |
| messages_media | 50 MB    | DM attachments        |

---

## Features

- Authentication (register, login, logout, password reset)
- User profiles with avatar, cover, bio, website, verification badge
- Follow / unfollow / block / report users
- Video upload with thumbnail, hashtags, visibility settings, draft mode
- For You, Following, Trending, Hashtag feeds with infinite scroll
- Like, save, share, comment on videos
- Nested comment replies with likes
- Real-time direct messaging with media attachments
- Real-time notifications (like, comment, follow, mention, message)
- User + video + hashtag search
- Admin dashboard: user management, content moderation, reports
- Settings page: profile editor, password change, privacy, blocked users

---

## Troubleshooting

**npm install fails**
```
node --version   # must be 18+
npm cache clean --force
npm install
```

**npm run setup fails — "Missing required environment variables"**
- Make sure `.env.local` exists in the project root
- Check `APPWRITE_PROJECT_ID` and `APPWRITE_API_KEY` are filled in

**npm run setup fails — 401 Unauthorized**
- Regenerate API key in Appwrite Console → API Keys
- Make sure the key has **all** scopes enabled

**White screen after npm run dev**
- Open browser DevTools → Console — check for errors
- Most common: wrong `VITE_APPWRITE_PROJECT_ID`

**Videos not uploading**
- Check the `videos` bucket exists in Appwrite Storage
- Re-run `npm run setup` if missing

**Real-time not working**
- Appwrite Realtime requires WebSocket; check firewall / proxy settings
- On Appwrite Cloud this works out of the box

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| VITE_APPWRITE_ENDPOINT | ✅ | Appwrite API URL |
| VITE_APPWRITE_PROJECT_ID | ✅ | Your project ID |
| VITE_APPWRITE_DATABASE_ID | ✅ | Database ID (default: socialpulse_db) |
| APPWRITE_API_KEY | Setup only | Server API key (not exposed to browser) |
| VITE_APPWRITE_*_COLLECTION | Optional | Override collection IDs |
| VITE_BUCKET_* | Optional | Override bucket IDs |
