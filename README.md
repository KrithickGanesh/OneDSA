# OneDSA — Unified Competitive Programming Operating System 🚀

> **One Platform. All Problems. Zero Excuses.**

[![Next.js](https://img.shields.io/badge/Next.js-16.3.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-emerald?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/Google%20Gemini-Flash%203.6-purple?style=for-the-badge&logo=google)](https://deepmind.google/technologies/gemini/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-cyan?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

---

## 🌟 Overview

**OneDSA** is a next-generation competitive programming aggregator and mastery engine. Instead of context-switching between LeetCode, Codeforces, CodeChef, HackerRank, and GeeksforGeeks, OneDSA unites all platforms into a single interface with:

1. **AI Natural Language & Voice Search** — Query problems in plain English (*"Give me 5 medium tree problems I haven't solved"*) powered by Google Gemini.
2. **Universal Cross-Platform Syncing** — Parallel synchronization across **LeetCode**, **Codeforces**, **CodeChef**, **HackerRank**, and **GeeksforGeeks**.
3. **SM-2 Spaced Repetition Revision Scheduler** — Never forget an algorithmic pattern again with automated review cycles based on confidence ratings.
4. **Saved Collections** — Curate interview sheets, company decks, and topic lists with custom colors and notes.
5. **Live Analytics & Progress Dashboard** — Visual difficulty distributions, topic mastery bars, day streaks, and sync history.
6. **Friends & Global Leaderboard** — Compete on global rankings and private friends leaderboards with podium medals 🥇🥈🥉.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Next.js 16 App Router)              │
│  ┌────────────┐  ┌───────────┐  ┌─────────────┐  ┌───────────┐  ┌─────┐ │
│  │ Dashboard  │  │  Explore  │  │ Collections │  │ Revision  │  │ ... │ │
│  └─────┬──────┘  └─────┬─────┘  └──────┬──────┘  └─────┬─────┘  └─────┘ │
│        └───────────────┼───────────────┼───────────────┘                │
│                        ▼               ▼                                │
│       AIPromptBar (Voice) | ProblemTable | StatsCards | SaveModal       │
└────────────────────────┬────────────────────────────────────────────────┘
                         │ JSON API Requests
┌────────────────────────▼────────────────────────────────────────────────┐
│                             API Route Layer                             │
│  /api/search/ai        → Gemini NLP Parser ➔ Unified Query Builder      │
│  /api/search/filter    → Filter Search ➔ Unified Query Builder          │
│  /api/sync/all         → Parallel Platform Sync Orchestrator            │
│  /api/sync/[platform]  → Per-Platform GraphQL / REST / Scraper Sync     │
│  /api/collections      → Collections CRUD & Problem Associator          │
│  /api/revision         → SM-2 Spaced Repetition Scheduler               │
│  /api/leaderboard      → Dynamic User & Friend Rankings                 │
│  /api/dashboard/stats  → Live Supabase Analytics Aggregator             │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────────────┐
│                           Supabase Database                             │
│  Tables: problems, user_problem_status, user_platform_handles,          │
│          user_api_keys, sync_history, collections, collection_problems, │
│          revision_schedule, friendships                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Core Features

### 1. 🤖 AI Natural Language & Voice Search
- Parse queries into structured PostgREST filters (*difficulty, topic, platforms, unsolved only, limits*).
- Integrated Web Speech API microphone input.
- Zero-latency in-memory cache for repeated prompts.

### 2. 🔄 Universal Multi-Platform Sync
- **LeetCode**: Official GraphQL endpoint syncing problems, accepted submissions, tags, and difficulty.
- **Codeforces**: REST API syncing problem sets and verdict=OK submissions.
- **CodeChef**: Server-side profile parsing for fully solved problems.
- **HackerRank**: Submission history endpoint tracking solved challenge slugs.
- **GeeksforGeeks**: Curated 120+ top practice catalog + user profile scraping.
- Single **"Sync All"** button runs all 5 synchronizers in parallel.

### 3. 🧠 Spaced Repetition (SM-2) Revision Engine
- Automatically computes review intervals:
  - **Hard / Failed (1)**: Interval reset to 1 day.
  - **Good (3)**: Advances interval (1d ➔ 3d ➔ 7d ...).
  - **Easy (5)**: Multiplies interval by Ease Factor ($EF \ge 1.3$).
- "Due Today" queue and upcoming review schedule.

### 4. 📁 Saved Problem Collections
- Create custom decks with descriptions and accent colors.
- Quick bookmark button directly from problem tables and cards.
- Add problem-specific notes for future reference.

### 5. 🏆 Friends & Global Leaderboard
- Podium view with champion crowns and rank badges.
- Difficulty breakdown ($E / M / H$) and platform participation pills.
- Private friend connections and global coder rankings.

---

## 🗄️ Supabase Database Schema

Run the following SQL in your **Supabase SQL Editor** to initialize all tables:

```sql
-- 1. Sync History Table
CREATE TABLE IF NOT EXISTS sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  synced_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Collections Tables
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#06b6d4',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(collection_id, problem_id)
);

-- 3. Revision Scheduler Table (SM-2)
CREATE TABLE IF NOT EXISTS revision_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  interval_days INTEGER DEFAULT 1,
  ease_factor REAL DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, problem_id)
);

-- 4. Friendships Table
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'accepted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ & npm
- A free [Supabase](https://supabase.com) project
- A free [Google Gemini API Key](https://aistudio.google.com/)

### 1. Clone the repository
```bash
git clone https://github.com/KrithickGanesh/OneDSA.git
cd onedsa
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SYSTEM_GEMINI_API_KEY=your-gemini-api-key
ENCRYPTION_SECRET=your-32-byte-hex-secret
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm run start
```

---

## 🛡️ Security & Privacy
- **AES-256-GCM Encryption**: User-provided Gemini API keys are encrypted at rest with unique initialization vectors (IV) and authentication tags before database persistence.
- **Row Level Security (RLS)**: Enforced across all user data tables in Supabase.
- **Strict Server Authentication**: All sync, revision, and collection operations authenticate the session token server-side.

---

## 📜 License
MIT License. Built with ❤️ for competitive programmers.
