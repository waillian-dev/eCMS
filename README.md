# eCMS (Electronic Complaint Management System)

## Overview

eCMS is a modern, full‑stack complaint management system built with **React** (admin portal), **React Native** (mobile app), and a **Node.js/Express** backend. The application allows citizens to file complaints, track their status, and communicate with municipal services. Administrators can manage complaints, view analytics, and configure system settings.

The recent updates introduced a **clean, light‑theme UI** across both the admin portal and mobile app for a brighter, more user‑friendly experience.

---

## Project Structure
```
eCMS/
├─ backend/               # Node/Express API server
├─ admin-portal/          # React admin dashboard (Vite)
├─ mobile-app/            # React Native Expo app
└─ README.md              # This file
```

## Prerequisites
- **Node.js** (>=18)
- **npm** (or **yarn**)
- **Expo CLI** (`npm i -g expo-cli`)
- **Docker** (optional, for running MongoDB locally)

## Setup & Installation
```bash
# Clone the repository (if not already)
git clone <repo-url>
cd eCMS

# Install backend dependencies
cd backend
npm install

# Install admin portal dependencies
cd ../admin-portal
npm install

# Install mobile app dependencies
cd ../mobile-app
npm install
```

## Running the Application
### Backend
```bash
cd backend
npm run dev   # Starts API on http://localhost:3000
```
### Admin Portal
```bash
cd admin-portal
npm run dev   # Vite dev server at http://localhost:5173
```
### Mobile App (Expo)
```bash
cd mobile-app
expo start    # Opens Expo dev tools; run on iOS/Android simulators or web
```

## Light Theme UI
The UI now uses a light, clean palette:
- Background: `#F8FAFC`
- Cards: white with subtle borders (`#E2E8F0`)
- Primary text: `#0F172A`
- Secondary text: `#475569`
- Accent (buttons/links): `#2563EB`

All screens (dashboard, complaints list, profile, login, etc.) have been updated to reflect these colors and improved spacing.

## Environment Variables
Create a `.env` file in the **backend** directory with:
```
MONGODB_URI=mongodb://localhost:27017/ecms
JWT_SECRET=your_secret_key
PORT=3000
```
The admin portal and mobile app read the API URL from `src/services/api.ts` – update it if your backend runs on a different host.

## Testing
```bash
# Backend tests (if any)
cd backend && npm test

# Admin portal unit tests
cd admin-portal && npm test
```

## Deploying
- **Admin portal** can be built with `npm run build` and served via any static host.
- **Mobile app** can be published to the App Store / Play Store using Expo's build services.
- **Backend** can be containerised with Docker (see `Dockerfile` in `backend/`).

---

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome‑ui`).
3. Make your changes and ensure the UI follows the light‑theme design guidelines.
4. Submit a pull request describing the changes.

## License
MIT License – see `LICENSE` file.
