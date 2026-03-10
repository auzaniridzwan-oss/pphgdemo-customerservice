# Braze CS Command Center
### A Mobile-First Web Application with iPhone Frame Layout

A three-column Customer Service Command Center built on top of the **Braze REST API**, designed for Pan Pacific Hotel Group CS agents to view, edit, and act on guest profiles in real time.

---

## Overview

The CS Command Center gives customer service agents a single-pane-of-glass view of every hotel guest's Braze profile. Agents can:

- Read and **live-edit** user attributes (name, tier, preferences) — changes sync to Braze via `/users/track`.
- Review a **unified 360° interaction timeline** across WhatsApp, Email, SMS, and Push channels.
- Compose and save **agent notes** with rich text, @mentions, and an AI rewrite helper.
- Consume **AI-generated insights**: sentiment score, churn propensity, and next-best-action recommendations.
- Trigger **quick actions** (send offer, flag for review, escalate) that fire Braze Custom Events.

---

## Tech Stack

| Layer        | Technology                                             |
|--------------|--------------------------------------------------------|
| **UI**       | HTML5, CSS3 (custom design tokens), Tailwind CDN       |
| **Components** | Flowbite 2.3                                         |
| **Icons**    | FontAwesome Kit `a21f98a3f6`                           |
| **HTTP**     | [Ky](https://github.com/sindresorhus/ky) 1.x (ESM)    |
| **Marketing**| Braze REST API (no WebSDK — pure server-side calls)    |
| **Hosting**  | [Vercel](https://vercel.com/auzani-ridzwans-projects)  |

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/auzaniridzwan-oss/app-customerservice-commandcenter.git
cd app-customerservice-commandcenter
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and populate BRAZE_API_KEY and BRAZE_REST_ENDPOINT
```

**Demo Mode (no API key):** If `BRAZE_API_KEY` is left empty, the app automatically switches to Demo Mode using realistic seeded data. A visible amber badge in the header indicates this state.

### 3. Run locally

No build step is required — open `index.html` directly or serve with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

### 4. Deploy to Vercel

```bash
vercel --prod
```

Set the following environment variables in the Vercel dashboard:

| Variable               | Description                                      |
|------------------------|--------------------------------------------------|
| `BRAZE_API_KEY`        | Your Braze REST API key (with `/users` permissions) |
| `BRAZE_REST_ENDPOINT`  | Your instance endpoint, e.g. `https://rest.iad-01.braze.com` |

---

## Architecture

### Core Singletons

| Module               | Responsibility                                                          |
|----------------------|-------------------------------------------------------------------------|
| `StorageManager`     | All `localStorage` I/O, namespaced under `ar_app_` prefix              |
| `AppLogger`          | Centralised `INFO / DEBUG / WARN / ERROR` logging with console styling  |
| `Router`             | Hash-based SPA routing (`#/users/:userId`)                              |

### API Layer

| Module               | Responsibility                                                          |
|----------------------|-------------------------------------------------------------------------|
| `BrazeClient`        | Ky singleton — `Authorization` header, exponential backoff on 5xx      |
| `UserRepository`     | `getProfile()`, `updateAttributes()`, `trackEvent()` — real or mock    |
| `UserProfile` model  | Domain model decoupled from raw Braze API response shape                |
| `TimelineEvent` model| Domain model for unified timeline items                                 |

---

## Braze Integration Details

### Endpoints Used

| Action              | Endpoint                | Method |
|---------------------|-------------------------|--------|
| Read user profile   | `/users/export/ids`     | POST   |
| Update attributes   | `/users/track`          | POST   |
| Log custom event    | `/users/track`          | POST   |

### Custom Events Tracked

| Event Name                   | Trigger                                      |
|------------------------------|----------------------------------------------|
| `cs_note_saved`              | Agent saves a note in the NoteComposer       |
| `cs_attribute_updated`       | Agent edits a user attribute                 |
| `cs_quick_action_triggered`  | Agent clicks a Quick Action button           |
| `cs_profile_viewed`          | Agent opens a user profile page              |

### User Attributes Read/Written

| Attribute              | Type     | Card                          |
|------------------------|----------|-------------------------------|
| `first_name`           | string   | DemographicsEditableCard      |
| `last_name`            | string   | DemographicsEditableCard      |
| `email`                | string   | DemographicsEditableCard      |
| `phone`                | string   | DemographicsEditableCard      |
| `home_city`            | string   | DemographicsEditableCard      |
| `loyalty_tier`         | string   | CustomAttributesEditableCard  |
| `account_status`       | string   | CustomAttributesEditableCard  |
| `preferred_language`   | string   | CustomAttributesEditableCard  |
| `total_stays`          | integer  | CustomAttributesEditableCard  |
| `last_stay_property`   | string   | CustomAttributesEditableCard  |

> **Reference:** [Braze WebSDK / REST API Docs](https://www.braze.com/docs/developer_guide/sdk_integration/?sdktab=web)

---

## Layout Reference

The `#page-content` element hosts a three-column flex layout:

```
┌──────────┬─────────────────────────┬──────────┐
│  Left    │       Center            │  Right   │
│  25%     │        50%              │  25%     │
│          │                         │          │
│ Identity │  Filter Tabs            │ AI Panel │
│ Demo     │  Note Composer          │ Session  │
│ Custom   │  Unified Timeline       │ Device   │
│ Attrs    │                         │ Actions  │
└──────────┴─────────────────────────┴──────────┘
```

On viewports narrower than 1024px, columns stack vertically for mobile usability.

---

## LocalStorage Keys

| Key                       | Value        | Purpose                                 |
|---------------------------|--------------|-----------------------------------------|
| `ar_app_user_session`     | `{}`         | Active agent session object             |
| `ar_app_current_user_id`  | `string`     | Last-viewed customer `external_id`      |
| `ar_app_mock_mode`        | `boolean`    | Manual Demo Mode override               |
| `ar_app_braze_init_status`| `string`     | SDK init state for diagnostics          |
