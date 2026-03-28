# PPHG Customer Service Command Center

### Braze Customer Profile Editor

A three-column **Customer Service Command Center** for Pan Pacific Hotel Group, built on the **Braze REST API**. Agents view and edit guest profiles in real time; the UI is a desktop-first Flowbite dashboard that stacks cleanly on tablets and phones for field use.

---

## Overview

The app gives CS agents a single place to work every hotel guest’s Braze profile. Agents can:

- Read and **live-edit** standard and custom attributes — updates go to Braze via `/users/track` (proxied through Vercel so the REST API key never ships to the browser).
- Persist **agent notes** on the profile using the custom attribute `notes` (Braze array-of-objects), with `$add` for new notes, plus a `cs_note_saved` custom event for analytics.
- Review a **unified 360° timeline** (messaging channels plus saved notes).
- Use **AI insights** and **quick actions** that log additional Braze custom events where configured.

**Why a server proxy:** The Braze REST API key stays in Vercel environment variables; the browser only calls same-origin `/api/braze/*` routes. Demo Mode (no key) serves realistic mock data with a visible header indicator.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **UI** | HTML5, CSS3 (design tokens), [Tailwind CSS](https://tailwindcss.com/) (CDN) |
| **Components** | [Flowbite](https://flowbite.com/) 2.3 |
| **Icons** | FontAwesome Kit `a21f98a3f6` |
| **HTTP** | [Ky](https://github.com/sindresorhus/ky) 1.x (ESM) |
| **Marketing / data** | Braze REST API via Vercel serverless routes under `/api/braze/` |
| **Hosting** | [Vercel — auzani-ridzwans-projects](https://vercel.com/auzani-ridzwans-projects) |

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/auzaniridzwan-oss/pphgdemo-customerservice.git
cd pphgdemo-customerservice
```

Org profile: [auzaniridzwan-oss](https://github.com/auzaniridzwan-oss).

### 2. Configure environment

```bash
cp .env.example .env
# Set BRAZE_API_KEY and BRAZE_REST_ENDPOINT for local Vercel-style runs
```

**Demo Mode:** If the app has no live Braze configuration, it uses seeded mock data. An amber badge in the header shows Demo Mode.

### 3. Run locally

Static preview (no API proxy):

```bash
npx serve .
```

For full API proxy behaviour, deploy to Vercel or run `vercel dev` so `/api/braze/*` is available.

### 4. Deploy to Vercel

```bash
vercel --prod
```

| Variable | Description |
|----------|-------------|
| `BRAZE_API_KEY` | REST API key with `/users` permissions (server-side only) |
| `BRAZE_REST_ENDPOINT` | Instance REST base, e.g. `https://rest.iad-01.braze.com` |

---

## Architecture

State and diagnostics are centralized so the UI stays thin and future storage backends are easy to swap.

| Module | Responsibility |
|--------|----------------|
| `StorageManager` | All persisted preferences; keys prefixed with `ar_app_` |
| `AppLogger` | Buffered `INFO` / `DEBUG` / `WARN` / `ERROR` logs, console styling, `getLogs()` export |
| `Router` | Hash SPA routes (e.g. `#/users/:userId`) |

| Module | Responsibility |
|--------|----------------|
| `BrazeClient` | Ky singleton — auth header, retries on 5xx |
| `UserRepository` | `getProfile`, `findByEmail`, `getNotes`, `addNote`, `setNotes`, `updateAttributes`, `trackEvent` — live or mock |
| `CustomerNote` | Normalise/build Braze `notes` array items and map to timeline rows |
| `UserProfile` | Domain model decoupled from raw export JSON |
| `TimelineEvent` | Unified timeline shape for the 360° view |

---

## Braze Integration Details

### Endpoints (via proxy)

| Action | Path | Method |
|--------|------|--------|
| Read user by `external_id` or email | `/users/export/ids` | POST |
| Update attributes (including `notes` mutations) | `/users/track` | POST |
| Log custom events | `/users/track` | POST |

### Custom events

| Event | Typical trigger | Example properties |
|-------|-----------------|-------------------|
| `cs_note_saved` | NoteComposer persists a note | `internal`, `length`, `note_id` |
| `cs_attribute_updated` | Successful attribute update from CS UI | `changed_fields` |
| `cs_quick_action_triggered` | Quick action / AI CTA | Varies by button |
| `cs_profile_viewed` | User profile route loads | Context props as implemented |

### User attributes (non-exhaustive)

| Attribute | Notes |
|-----------|--------|
| `first_name`, `last_name`, `email`, `phone`, `home_city` | Demographics card |
| `loyalty_tier`, `account_status`, `preferred_language`, `total_stays`, `last_stay_property` | Custom attributes card |
| `notes` | Array of objects: `note_id` (UUID), `created_at` (ISO 8601), `body_text`, `is_internal`, `author`. New notes are appended with Braze `$add` on `notes`. |

**References**

- [Braze REST API home](https://www.braze.com/docs/api/home) — primary API documentation for this app  
- [Braze User Attributes object](https://www.braze.com/docs/api/objects_filters/user_attributes_object/) — nested `custom_attributes`, including array-of-objects patterns  
- [Braze Developer Guide (Web SDK)](https://www.braze.com/docs/developer_guide/sdk_integration/?sdktab=web) — broader platform context (this app uses REST, not the Web SDK for profile CRUD)

---

## Layout reference

`#page-content` uses a three-column flex layout (identity | timeline & composer | AI / session / actions). Below ~1024px width, columns stack for smaller viewports.

```
┌──────────┬─────────────────────────┬──────────┐
│  Left    │       Center            │  Right   │
│  ~25%    │        ~50%             │  ~25%    │
│ Identity │  Tabs, Note Composer    │ AI Panel │
│ Custom   │  Unified Timeline       │ Session  │
└──────────┴─────────────────────────┴──────────┘
```

---

## LocalStorage keys (examples)

| Key | Purpose |
|-----|---------|
| `ar_app_user_session` | Agent session object |
| `ar_app_current_user_id` | Last viewed `external_id` |
| `ar_app_mock_mode` | Manual Demo Mode override |
| `ar_app_debug_mode` | Verbose logging when enabled |

---

## Live documentation

Components log through `AppLogger` on init and on important user actions, so the browser console doubles as lightweight runtime documentation for demos and support.
