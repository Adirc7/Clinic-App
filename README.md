# MediCare Clinic App

A clinic management mobile app with three roles — **patients** book doctors, view bills, prescriptions and medical records; **doctors** manage their schedule, appointments and prescriptions; **admins** manage doctors, patients, billing, reschedule requests and clinic settings.

| Part | Stack |
|---|---|
| `frontend/` | Expo SDK 54, React Native 0.81, React Navigation 7 |
| `backend/` | Node.js, Express 5, MongoDB Atlas (Mongoose 9), JWT auth |

---

## 1. Run the backend locally

```bash
cd backend
cp .env.example .env      # then fill in MONGO_URI, JWT secrets, admin login
npm install
npm run dev               # http://localhost:5000  — check /api/health
```

On first start the admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` is created automatically.

## 2. Run the app with Expo Go

```bash
cd frontend
cp .env.example .env      # set EXPO_PUBLIC_API_URL (see below)
npm install
npx expo start            # scan the QR code with Expo Go
```

`EXPO_PUBLIC_API_URL` must end in `/api`:
- **Hosted backend:** `https://<your-service>.onrender.com/api`
- **Local backend:** `http://<your PC's IPv4 address>:5000/api` (phone and PC on the same Wi-Fi; find the IP with `ipconfig`)

Restart Expo with `npx expo start -c` after changing `.env`.

## 3. Host the backend on Render (free)

1. Push this repo to GitHub.
2. In **MongoDB Atlas → Network Access**, make sure `0.0.0.0/0` is allowed (Render's IPs change).
3. On [render.com](https://render.com): **New + → Blueprint** → select this repo. It reads `render.yaml`.
4. Fill in the secret values it asks for: `MONGO_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (JWT secrets are generated for you).
5. After deploy, open `https://<your-service>.onrender.com/api/health` — it should say `"database": "connected"`.
6. Put that URL (plus `/api`) in `frontend/.env` as `EXPO_PUBLIC_API_URL`.

**Uploaded photos & records:** Render's free disk is wiped on every deploy/restart. For uploads that persist, create a free [Cloudinary](https://cloudinary.com) account and set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in Render. The backend switches to Cloudinary automatically when these are set (`/api/health` shows `"fileStorage": "cloudinary"`).

**Free-tier sleep:** a free Render service sleeps after ~15 minutes idle; the first request then takes ~30–50 s. The app waits up to 60 s for this.

## 3b. Or host the backend on Vercel (free, no card)

The backend also runs as a Vercel Function (it connects to MongoDB on the first request).

1. On [vercel.com](https://vercel.com): **Add New → Project** → import this repo.
2. **Root Directory:** `backend` · **Application Preset:** Express. Leave the build settings empty.
3. **Environment Variables:** paste the same values as `.env` (`MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_*`) **plus the three `CLOUDINARY_*` keys** — Vercel has no disk, so uploads need Cloudinary.
4. **Deploy**, then open `https://<project>.vercel.app/api/health` — it should show `"database": "connected"` and `"fileStorage": "cloudinary"`.
5. Set `EXPO_PUBLIC_API_URL=https://<project>.vercel.app/api` in `frontend/.env`.

Don't add `TZ` (Vercel reserves it) — the backend already uses Sri Lanka time for bookings and holidays. Limits on Vercel: uploads up to **4 MB** each; the free Hobby plan is for non-commercial use. `vercel.json` runs the function in Singapore (`sin1`).

## Project structure

```
backend/
  server.js              Express app, health route, DB connection
  controllers/ models/ routes/ middleware/
  utils/fileStorage.js   Cloudinary-or-local upload storage
frontend/
  App.js → src/navigation/AppNavigator.js
  src/api/axiosInstance.js   API client (token refresh, error messages, file URLs)
  src/screens/{auth,home,doctors,patients,doctor,admin,prescriptions}
  src/components/        Avatar, BrandLogo, FormInput, FormButton
  src/theme.js           Shared colours / helpers
render.yaml              Render deployment blueprint
```

## Security notes

- `.env` files are git-ignored — never commit real credentials. Use the `.env.example` files as templates.
- If a real password or secret was ever shared or committed, change it (Atlas → Database Access → Edit user → password) and update `MONGO_URI` everywhere.
