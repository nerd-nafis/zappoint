# Medical Management System (MERN)

A modern MERN application for a university clinic to manage **doctors**, **appointments**, and **prescriptions** (PDF).
Supports **Admin** and **Doctor** roles, plus **guest appointment booking** from a public landing page.

---

## 🚀 Features

* **JWT auth** (email + password) with optional **Email OTP** verification.
* **Role-based access**:

  * **Admin**: CRUD doctors, manage all appointments & prescriptions.
  * **Doctor**: manage their own appointments, create prescriptions; **no doctor CRUD**.
* **Guest booking** (students can create appointments without an account).
* **Appointments**: create, list, filter, update, delete.
* **Prescriptions**: multi-medicine (dose like `0/0/1`, timing before/after meal) + **PDF download**.
* Simple, consistent UI (inputs, tables, modals) with dashboard tabs.

---

## 🗂️ Project Structure

```
bracu-medical/
├─ client/                     # React + Vite
│  ├─ src/
│  │  ├─ api/                 # http.ts, endpoints.ts
│  │  ├─ context/             # AuthContext (JWT)
│  │  ├─ pages/               # Login, Dashboard, Doctors, Appointments, Prescription, Landing
│  │  ├─ App.tsx              # routes
│  │  └─ App.css              # base styles
│  └─ index.html
└─ server/                     # Node + Express + Mongoose + TS
   ├─ src/
   │  ├─ controllers/         # auth, doctor, appointment, prescription
   │  ├─ middleware/          # auth (requireAuth/requireRole)
   │  ├─ models/              # User, Doctor, Appointment, Prescription, OtpToken
   │  ├─ routes/              # /api/* routers
   │  ├─ utils/               # env, db, error, mail
   │  └─ seed-admin.ts
   ├─ package.json
   └─ tsconfig.json
```

---

## 🧰 Prerequisites

* **Node.js** 18+ (LTS recommended)
* **MongoDB** URI (Atlas or local)
* (Optional) SMTP credentials if you want real OTP emails; in dev, OTP is logged to console when SMTP is not configured

---

## ⚙️ Environment Variables

Create **`server/.env`** (example):

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/clinic
JWT_SECRET=supersecret
CLIENT_ORIGIN=http://localhost:5173

# SMTP (optional; if blank, OTP codes print to console in dev)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=Clinic <noreply@example.com>

# Seed defaults
ADMIN_EMAIL=admin@example.com
ADMIN_PASS=admin123
```

(If the client needs env values like API base URL, add `client/.env` accordingly.)

---

## 🔧 Setup & Run

```bash
# Clone & enter repo
git clone <your-repo-url> bracu-medical
cd bracu-medical

# Client
cd client
npm i
cd ..

# Server
cd server
npm i
# seed admin user
npm run seed:admin
# run API (http://localhost:5000)
npm run dev

# Client (in another terminal)
cd ../client
# run web app (http://localhost:5173)
npm run dev
```

---

## 🔐 Auth Flow (OTP optional)

* `POST /api/auth/login` with `{ email, password }`

  * If OTP enabled (default): returns `{ status: "OTP_REQUIRED", otpToken }` and sends/prints OTP
  * If OTP disabled in your controller, it returns `{ token, user }` directly
* `POST /api/auth/verify-otp` with `{ otpToken, otp }` → `{ token, user }`
* Include `Authorization: Bearer <token>` on protected routes
* `GET /api/auth/me` returns current user payload

---

## 🔗 API Overview

**Base URL**: `http://localhost:5000/api`

### Auth

* `POST /auth/login`
* `POST /auth/verify-otp`
* `GET /auth/me` (auth)

### Doctors (Admin only)

* `GET /doctors`
* `POST /doctors` — `{ name, email, password, specialization?, phone? }`
* `PUT /doctors/:id`
* `DELETE /doctors/:id`

### Appointments

* `POST /appointments` — public guest booking

  * Required: `{ studentName, email, doctor, scheduledAt }`
  * Optional: `{ contact, problem, studentId }`
* `GET /appointments` (auth) — admin sees all, doctor sees own
* `PUT /appointments/:id` (auth)
* `DELETE /appointments/:id` (auth)

### Prescriptions

* `POST /prescriptions` (admin/doctor)

  * Body: `{ appointmentId, medicines: [{ name, dose, timing }], advice? }`
  * Marks appointment `completed` via atomic update
* `GET /prescriptions/:id/pdf` (admin/doctor) — download PDF

> **PDF styling**: See `server/src/controllers/prescription.controller.ts` THEME block (colors, sizes, rounded table, dividers, full‑width advice). You can externalize into a service if preferred.

---

## 👑 Roles & Permissions

| Resource         | Admin | Doctor |   Guest  |
| ---------------- | :---: | :----: | :------: |
| Auth (login/OTP) |   ✅   |    ✅   |     —    |
| Doctors CRUD     |   ✅   |    ❌   |     —    |
| Appointments     |   ✅   |  ✅ own | ✅ create |
| Prescriptions    |   ✅   |  ✅ own |     —    |
| Prescription PDF |   ✅   |    ✅   |     —    |

---

## 📦 NPM Scripts

**Server** (`/server`):

```bash
npm run dev       # watch mode with tsx
npm run build     # tsc compile to /dist
npm run start     # run compiled server
npm run seed:admin
```

**Client** (`/client`):

```bash
npm run dev       # Vite dev server
npm run build     # production build
npm run preview   # preview built app
```

---

## 🧭 Troubleshooting

* **Login fails**: check `JWT_SECRET`; in dev without SMTP, OTP appears in the server console.
* **OverwriteModelError**: ensure model exports use `models.X || model('X', schema)` or unique import paths during hot reloads.
* **Cast to ObjectId failed (legacy studentId)**: we mark appointment status with an atomic update to avoid revalidating legacy fields; consider a one‑off migration to coerce invalid `studentId` to `null`.
* **CORS**: set `CLIENT_ORIGIN=http://localhost:5173` in `.env`.
* **Route prefixes**: confirm routers are mounted under `/api` and avoid double‑prefixing inside router files.

---

## 📄 License

MIT — feel free to use and adapt.

---

## 🙌 Credits

Built with ❤️ using MERN + PDFKit. Clean UI and clear MVC separation for easy maintenance and future features (reminders, patient portal, analytics).
