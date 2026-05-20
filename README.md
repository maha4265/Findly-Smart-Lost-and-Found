# Findly Lost & Found System

Findly is an AI-powered MERN Lost & Found system. It upgrades a basic CRUD project with image similarity, context-aware scoring, claim verification, admin approval, smart notifications, duplicate detection, and a hotspot dashboard.

The original plain HTML prototype is still available at `index.html`. The main project now lives in `client/` and `server/`.

## Run MERN App

1. Install dependencies:

```bash
npm run install:all
```

2. Create server environment:

```bash
copy server\.env.example server\.env
```

3. Make sure MongoDB is running locally, then start both apps:

```bash
npm run dev
```

Client: `http://localhost:5173` (or next available port)

Server: `http://localhost:5000` (or next available port)

## Setup Admin User

To create an admin user for testing the admin features:

```bash
cd server
npm run create-admin admin@university.edu mypassword123 "System Admin"
```

This will create an admin user that can:
- View all claims and reports
- Override claim decisions
- Access the admin-only "Decisions" tab

## Seed Demo Data (Optional)

To populate the database with sample users and reports for testing:

```bash
cd server
npm run seed-demo
```

This creates:
- 2 student users (alice@university.edu, bob@university.edu)
- 1 admin user (admin@university.edu)
- Sample lost/found reports with potential matches

Login credentials after seeding:
- **Student**: alice@university.edu / password123
- **Student**: bob@university.edu / password123  
- **Admin**: admin@university.edu / admin123

## Features

- **Authentication & Authorization**: User registration/login with JWT tokens, role-based access (student/admin)
- Lost and found item reporting with image upload
- React frontend with Express and MongoDB backend
- Server-side AI service abstraction for image fingerprints
- Optional OpenAI embedding provider through environment variables
- Auto-generated item description from image analysis
- Match score using image similarity, category, location proximity, and time relevance
- **AI-Powered Claim Decisions**: Intelligent claim analysis using:
  - Text similarity comparison between lost and found descriptions
  - Verification answer validation
  - Matching scores and temporal/location proximity
  - Confidence-based auto-approval (≥65% confidence)
  - Admin override capability
- **Real-time notifications** via Socket.IO when matches are found
- Duplicate image warning
- Claim verification question and proof note
- Admin approval or rejection flow with AI reasoning
- Campus hotspot heatmap with analytics insights
- Demo data loader

## Interview Pitch

Existing lost and found systems usually stop at manual posting and searching. This project adds an intelligent matching layer that compares uploaded images and ranks possible matches using image similarity, location, time, and category. It also includes claim verification, admin approval, smart alerts, duplicate detection, and a heatmap dashboard, making it closer to a real deployable product.

## AI Provider

By default, `AI_PROVIDER=local` uses a deterministic local image fingerprint so the app works without paid APIs.

To use OpenAI embeddings later:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```
