# Klea - Enterprise Real-Time Chat Platform

<p align="center">
  <img src="client/public/logo.png" alt="Klea Logo" width="96" height="96" style="border-radius: 20px;" />
</p>

<p align="center">
  <strong>A secure, modern, enterprise messaging platform inspired by Telegram Web.</strong><br>
  Built with React 19, Vite, TailwindCSS, Node.js, Express, Socket.IO, and Prisma.
</p>

---

## ✨ Features

- **💬 Real-Time Messaging**: Instant bidirectional communication powered by Socket.IO with typing indicators, delivery receipts, message editing, and deletion.
- **🔒 End-to-End Encrypted (E2EE) Secret Chats**: Zero-knowledge private messaging utilizing browser Web Cryptography API (ECDH P-256 + AES-GCM) with visual 4-emoji fingerprint key verification and auto-destruct TTL timers.
- **👥 Company Groups & Invite Links**: Create private workplace groups, manage member roles (Owner, Admin, Member), and share private invite URLs.
- **🔖 Saved Messages Cloud**: Personal cloud notebook for quick note-taking and 1-click message forwarding.
- **📊 Interactive Polls**: Public and anonymous real-time voting with single or multiple-choice options.
- **📰 Instant View Articles**: Compose and read rich workplace memos and announcements in distraction-free Instant View mode.
- **📍 Real-Time Location & Venue Sharing**: Share GPS coordinates or company venues with direct Google Maps links.
- **🎙️ Voice Notes & File Attachments**: Record voice messages directly in the browser and send documents, code snippets, and images.
- **🌓 Authentic Telegram Web Themes**: Seamless day (light) and night (dark) modes matching Telegram Web's exact color palette.
- **🛡️ Segregated Admin Console**: Isolated portal (`/admin`) protected by multi-factor security clearance, user approvals, broadcast announcements, and audit logging.

---

## 🛠️ Tech Stack

### Frontend (`client/`)
- **React 19** + **TypeScript**
- **Vite** (Build tool & dev server)
- **TailwindCSS v4**
- **Zustand** (Global state management)
- **Socket.IO Client** (Real-time events)
- **Lucide React** (Icons)

### Backend (`server/`)
- **Node.js** + **Express**
- **TypeScript** via **tsx**
- **Socket.IO** (WebSockets gateway)
- **Prisma ORM** + **SQLite**
- **JWT** (JSON Web Tokens) & **bcryptjs** (Password hashing)

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)

### 2. Installation

Clone the repository and install dependencies for both the server and client:

```bash
# Clone the repository
git clone https://github.com/d-navanith/klea-chat-platform.git
cd klea-chat-platform

# Install root dependencies
npm install

# Install server dependencies
cd server
npm install
npx prisma db push
npx prisma generate
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Environment Setup

Create `server/.env` with the following variables:

```env
PORT=5001
DATABASE_URL="file:./dev.db"
JWT_SECRET="teleclone_super_secret_jwt_key_2026_x"
CORS_ORIGIN="http://localhost:5173"
```

### 4. Running the Application

Open two terminal windows:

**Terminal 1 (Backend Server):**
```bash
cd server
npm run dev
```
*Server runs on `http://localhost:5001`*

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
```
*Web app runs on `http://localhost:5173`*

---

## 🔑 Demo Accounts

The database is pre-seeded with test accounts for quick testing:

| Username | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| **`alice`** | `password123` | Employee | 1-Click quick login from sign-in screen |
| **`bob`** | `password123` | Employee | 1-Click quick login from sign-in screen |
| **`durov`** | `password123` | Administrator | Full access + Admin Console (`Passkey: KLEA-ADMIN-2026`) |

- **User Messenger**: `http://localhost:5173`
- **Admin Portal**: `http://localhost:5173/admin`

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
