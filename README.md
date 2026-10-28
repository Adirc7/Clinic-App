<div align="center">

<img src="frontend/assets/images/icon.png" width="84" alt="MediCare logo" />

# MediCare Clinic App

**A full-stack clinic management app for patients, doctors and admins.**
Book doctors, run the day's appointments, write prescriptions, keep medical records and handle billing. One React Native app runs on Android, iOS and the web, backed by a Node.js + MongoDB API.

![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-orange?logo=jsonwebtokens)
![Vercel](https://img.shields.io/badge/API%20on-Vercel-black?logo=vercel)

<img src="docs/screenshots/patient-home.jpg" width="200" alt="Patient home" />
<img src="docs/screenshots/doctor-detail.jpg" width="200" alt="Doctor profile" />
<img src="docs/screenshots/doctor-dashboard.jpg" width="200" alt="Doctor dashboard" />
<img src="docs/screenshots/admin-dashboard.jpg" width="200" alt="Admin dashboard" />

</div>

---

## Contents

1. [Features by role](#1-features-by-role)
2. [Tech stack](#2-tech-stack)
3. [System architecture](#3-system-architecture)
4. [Backend: how a request flows](#4-backend-how-a-request-flows)
5. [Frontend: how the app flows](#5-frontend-how-the-app-flows)
6. [Core workflows, step by step](#6-core-workflows-step-by-step)
7. [Data model](#7-data-model)
8. [REST API reference](#8-rest-api-reference)
9. [Screenshots](#9-screenshots)
10. [Project structure](#10-project-structure)
11. [Run it locally](#11-run-it-locally)
12. [Deploy the backend](#12-deploy-the-backend)
13. [Security and business rules](#13-security-and-business-rules)

---

## 1. Features by role

| 👤 Patient | 🩺 Doctor | 🛡️ Admin |
|---|---|---|
| Register and sign in | Dashboard with today's patients and stats | Clinic dashboard (today's bookings, doctors, patients, pending) |
| Search and filter doctors by specialty | Toggle "Accepting new bookings" | Add, edit or deactivate doctors (photo, schedule, **consultation fee**) |
| Doctor profile: rating, fee, experience, weekly hours | Confirm, complete or cancel appointments | Approve or reject doctors' reschedule requests |
| Calendar + time-slot booking | Request a reschedule (sent to admin) | Manage patients (deactivating one blocks their login) |
| Edit or cancel own bookings | Write and edit prescriptions | View all appointments, prescriptions and medical records |
| Bills: outstanding vs paid, **Pay now** | View a patient's medical records | Create and manage invoices, mark them paid |
| Prescriptions and medical records (upload) | Calendar view of the schedule | Clinic settings: booking window, holidays |
| Rate a doctor after a visit | | |

All messages (success, errors, confirmations) appear as **in-app pop-up cards** on every platform.

---

## 2. Tech stack

| Layer | Technology | Why it's used |
|---|---|---|
| **Mobile / web app** | Expo SDK 54, React Native 0.81, React 19 | One codebase for Android, iOS and the web |
| Navigation | React Navigation 7 (native stack + bottom tabs) | A separate navigator per role, with nested stacks for each tab |
| HTTP client | Axios with interceptors | Adds the JWT, refreshes it on 401, gives friendly error messages |
| Local storage | AsyncStorage | Access/refresh tokens and the cached user for instant start-up |
| Forms | Formik + Yup, custom validators | Live validation (password strength, phone, DOB) |
| UI | expo-linear-gradient, @expo/vector-icons, react-native-calendars | Gradient headers, icons, booking calendar |
| Files | expo-image-picker, expo-document-picker | Profile photos and medical-record uploads |
| **API server** | Node.js ≥ 20, Express 5 | REST API |
| Database | MongoDB Atlas with Mongoose 9 | Documents for users, doctors, appointments, bills and more |
| Auth | jsonwebtoken + bcryptjs | 1 h access token, 7 d refresh token, hashed passwords |
| Validation | express-validator | Request-body rules per route (returns 422 with field errors) |
| Uploads | multer (memory) → Cloudinary (or local disk in dev) | Works on serverless hosts that have no disk |
| Hosting | Vercel (serverless function, `sin1` region) or Render | Free tiers. Database on MongoDB Atlas M0 |

---

## 3. System architecture

```mermaid
flowchart LR
    subgraph Client["📱 Client — Expo app (Android · iOS · Web)"]
        UI["Screens<br/>(auth · patient · doctor · admin)"]
        NAV["AppNavigator<br/>role-based stacks + tabs"]
        AX["axiosInstance<br/>JWT · refresh · errors"]
        AS[("AsyncStorage<br/>tokens + cached user")]
        AH["AlertHost<br/>pop-up cards"]
        UI --> NAV
        UI --> AX
        AX <--> AS
        UI -. "Alert.alert()" .-> AH
    end

    subgraph Server["⚙️ API — Node.js + Express 5 (Vercel function)"]
        MW["Middleware<br/>CORS · JSON · connectDB · protect · authorize · validate · multer"]
        RT["Routes<br/>/api/auth · doctors · appointments · billing · …"]
        CT["Controllers<br/>business rules"]
        UT["utils<br/>clinicTime · fileStorage"]
        MD["Mongoose models"]
        MW --> RT --> CT --> MD
        CT --> UT
    end

    DB[("🍃 MongoDB Atlas<br/>clinicdb")]
    CL[("☁️ Cloudinary<br/>photos + records")]

    AX -- "HTTPS JSON / multipart<br/>Authorization: Bearer &lt;JWT&gt;" --> MW
    MD <--> DB
    UT -- uploads --> CL
    UI -- "image / file URLs" --> CL
```

**Three tiers:**

1. **Presentation (Expo app).** Screens only talk to the API through one Axios instance. The signed-in user's role decides which navigator is mounted.
2. **Application (Express API).** Stateless. Every request carries a JWT, so the same code runs as a long-lived server (local or Render) or as a serverless function (Vercel).
3. **Data (MongoDB Atlas + Cloudinary).** Structured data is in MongoDB. Binary files are in Cloudinary, and only their URLs are stored in MongoDB.

---

## 4. Backend: how a request flows

Every API call passes through the same pipeline in `backend/server.js`:

```mermaid
flowchart TD
    A["Incoming request<br/>e.g. POST /api/appointments"] --> B["cors()<br/>allowed origins from CORS_ORIGIN"]
    B --> C["express.json() · urlencoded()"]
    C --> D{"connectDB()<br/>cached Mongo connection"}
    D -- "fails" --> D1["503 Database unavailable"]
    D -- "ok" --> E["Router match<br/>/api/appointments"]
    E --> F{"protect<br/>verify JWT · load user<br/>isActive?"}
    F -- "no / bad token" --> F1["401 Not authorized"]
    F -- "deactivated" --> F2["403 Account deactivated"]
    F -- "ok" --> G{"authorize('patient')<br/>role check"}
    G -- "wrong role" --> G1["403 Access denied"]
    G -- "ok" --> H{"express-validator rules<br/>+ validate()"}
    H -- "invalid" --> H1["422 field errors"]
    H -- "ok" --> I["Controller<br/>createAppointment"]
    I --> J["Business rules<br/>validateSlot(): past? window? holiday?<br/>doctor works that weekday? slot taken?"]
    J -- "rule broken" --> J1["400 / 409 clear message"]
    J -- "ok" --> K["Mongoose model → MongoDB"]
    K --> L["201 JSON response"]
    I -. "throws" .-> M["errorMiddleware<br/>multer limits · 500"]
```

### Startup sequence

| Step | What happens | Where |
|---|---|---|
| 1 | Load `.env` and check `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET` | `server.js` |
| 2 | Build the Express app (CORS, body parsers, `/uploads` static) | `server.js` |
| 3 | First `/api` request → `connectDB()` opens one Mongo connection and reuses it across serverless calls | `server.js` |
| 4 | `ensureDefaultAdmin()` creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if missing | `server.js` |
| 5 | Locally: `app.listen(PORT)`. On Vercel: the exported `app` is the function handler | `server.js` |

### Backend layers

| Layer | Folder | Responsibility |
|---|---|---|
| Routes | `routes/` | URL + HTTP verb → middleware chain → controller |
| Middleware | `middleware/` | `protect` (JWT + active account), `authorize(...roles)`, `validate` + `validators/`, `uploadMiddleware` (multer, size and type limits), `errorMiddleware` |
| Controllers | `controllers/` | Business logic: slot validation, access scoping (patients see only their own data), auto-billing, soft deletes |
| Models | `models/` | Mongoose schemas with validation and indexes |
| Utils | `utils/clinicTime.js` | All "today / weekday / holiday" maths in **clinic time (UTC+05:30)**, independent of the server's timezone |
| | `utils/fileStorage.js` | Saves an upload to Cloudinary (if keys are set) or to `uploads/` locally |

---

## 5. Frontend: how the app flows

### App start-up and role routing

```mermaid
flowchart TD
    S(["App launch"]) --> A["App.js<br/>&lt;AppNavigator/&gt; + &lt;AlertHost/&gt;"]
    A --> B{"accessToken in<br/>AsyncStorage?"}
    B -- "no" --> P["Public stack<br/>Welcome · Contact · Login · Register"]
    B -- "yes" --> C["Show cached user instantly<br/>then GET /auth/me in background"]
    C -- "401/403/404" --> P
    C -- "ok" --> R{"user.role"}
    R -- "patient" --> PT["MainTabs<br/>Home · Doctors · Bookings · Bills · Profile"]
    R -- "doctor" --> DS["Doctor stack<br/>Dashboard · AllAppointments · AddPrescription · PatientRecords"]
    R -- "admin" --> AD["Admin stack<br/>Dashboard · Doctors · Patients · Appointments ·<br/>Billing · Prescriptions · Records · Reschedules · Settings"]
    P -- "login success" --> R
    PT & DS & AD -- "logout / refresh fails /<br/>account deactivated" --> P
```

### Navigation map (patient)

```mermaid
flowchart LR
    T["Bottom tabs"] --> H["Home stack"]
    T --> D["Doctors stack"]
    T --> B["Bookings stack"]
    T --> BL["Bills"]
    T --> PR["Profile stack"]
    H --> H1["DoctorDetail"] & H2["Contact"] & H3["MedicalRecords → AddMedicalRecord"] & H4["PatientPrescriptions → PrescriptionDetail"] & H5["Ratings / Rating"]
    D --> D1["DoctorList → DoctorDetail → booking form"]
    B --> B1["PatientAppointments → edit (DoctorDetail) / prescription / bill / rate"]
    PR --> P1["MyProfile → EditProfile · MedicalRecords · Prescriptions"]
```

### Frontend building blocks

| File | Role |
|---|---|
| `App.js` | Root: mounts the navigator and the global `AlertHost` |
| `src/navigation/AppNavigator.js` | Auth check, role-based stacks and tabs, login/logout handlers |
| `src/api/axiosInstance.js` | Base URL from `EXPO_PUBLIC_API_URL`. Attaches the token, retries once after refreshing on **401**, signs out on refresh failure or a deactivated account. `getErrorMessage()` and `buildServerUrl()` |
| `src/components/AlertHost.js` | Replaces `Alert.alert` with styled pop-up cards (success, error, warning, question, info), picked from the message wording |
| `src/components/ui.js` | Design system: `GradientHeader`, `Card`, `Button`, `StatusBadge`, `EmptyState`, `InfoRow`, … |
| `src/components/DateField.js` | Date picker that uses the native dialog on phones and `<input type="date">` on the web |
| `src/theme.js` | Colours, gradients, radius, shadows, status colours, helpers |
| `src/utils/date.js` | Local date keys and helpers shared by screens |

### Token lifecycle (client side)

```mermaid
sequenceDiagram
    participant S as Screen
    participant AX as axiosInstance
    participant API as Express API
    participant ST as AsyncStorage
    S->>AX: GET /appointments/my-appointments/patient
    AX->>ST: read accessToken
    AX->>API: request + Bearer accessToken
    API-->>AX: 401 (token expired after 1 h)
    AX->>ST: read refreshToken
    AX->>API: POST /auth/refresh {refreshToken}
    alt refresh valid (≤ 7 days, account active)
        API-->>AX: new accessToken + refreshToken
        AX->>ST: save both
        AX->>API: retry original request
        API-->>AX: 200 data
        AX-->>S: data
    else refresh invalid
        API-->>AX: 401
        AX->>ST: clear tokens + cached user
        AX-->>S: onSessionExpired → back to Login
    end
```

---

## 6. Core workflows, step by step

### 6.1 Register → Sign in

```mermaid
sequenceDiagram
    actor U as Patient
    participant R as RegisterScreen
    participant API as /api/auth
    participant DB as MongoDB
    U->>R: name, email, password ×2
    R->>R: live checks (8+ chars, upper, lower, number, symbol, match)
    R->>API: POST /register {role: patient}
    API->>API: express-validator + duplicate-email check
    API->>DB: User.create (bcrypt hash)
    API-->>R: 201 Created
    R-->>U: ✅ "Account Created" card
    U->>R: tap Sign In
    R->>U: Login screen, email pre-filled
    U->>API: POST /login
    API-->>U: accessToken (1 h) + refreshToken (7 d) + user
```

### 6.2 Booking an appointment

1. **Doctors tab** → search or filter by specialty → open a doctor (rating, **fee**, experience, weekly hours).
2. **Choose a date** on the calendar. Days the doctor doesn't work, holidays and days outside the booking window are greyed out.
3. **Choose a time** slot → **Book now** → the booking form opens, pre-filled from the patient's profile (name, DOB, gender, address).
4. **Confirm booking** → `POST /api/appointments`.
5. The server runs `validateSlot()`:

```mermaid
flowchart LR
    A["POST /appointments"] --> B{"date in past?"}
    B -- yes --> X1["400"]
    B -- no --> C{"inside booking window?<br/>(minBookingDays / allowAnytimeBooking)"}
    C -- no --> X2["400"]
    C -- yes --> D{"clinic holiday?"}
    D -- yes --> X3["400"]
    D -- no --> E{"doctor works<br/>that weekday?"}
    E -- no --> X4["400"]
    E -- yes --> F{"same doctor + date + time<br/>already booked?"}
    F -- yes --> X5["409 slot taken"]
    F -- no --> G["Appointment.create<br/>status = Pending → 201"]
```

6. The patient sees a **Booking Confirmed** card, and the visit appears under **Bookings → Upcoming**.

### 6.3 Appointment lifecycle and auto-billing

```mermaid
stateDiagram-v2
    [*] --> Pending : patient books
    Pending --> Confirmed : doctor / admin confirms
    Pending --> Cancelled : patient / doctor cancels
    Confirmed --> Completed : doctor marks completed
    Confirmed --> Cancelled : cancel
    Confirmed --> Pending : patient moves the date (needs re-confirmation)
    Completed --> [*] : invoice auto-created (doctor's consultation fee) · patient asked to rate
    Cancelled --> [*]
```

- Patients and doctors can only **cancel** (a soft delete). Only an admin can permanently delete.
- When an appointment becomes **Completed**, the server creates a **Pending invoice** for the doctor's own `consultationFee`. The patient sees it under **Bills** and can tap **Pay now**. An admin can also mark it paid (cash).

### 6.4 Reschedule request (doctor → admin)

```mermaid
sequenceDiagram
    actor Doc as Doctor
    participant API as Express API
    actor Adm as Admin
    Doc->>API: POST /appointments/:id/request-reschedule {date, time, reason}
    API->>API: validateSlot(new date/time)
    API-->>Doc: "Reschedule request submitted to Admin"
    Adm->>API: GET /appointments/reschedule-requests
    API-->>Adm: original vs requested schedule + reason
    alt Approve
        Adm->>API: POST /:id/approve-reschedule
        API->>API: validateSlot again (slot may have been taken since)
        API-->>Adm: 200 moved · or 409 slot now taken
    else Reject
        Adm->>API: POST /:id/reject-reschedule
        API-->>Adm: 200 request cleared
    end
```

### 6.5 Prescriptions, records and reviews

| Flow | Steps |
|---|---|
| **Prescription** | Doctor opens a completed or confirmed visit → *Add prescription* (diagnosis, medications × dosage, frequency, duration, instructions) → `POST /prescriptions` → patient sees it in *Prescriptions* and on the visit |
| **Medical record** | Patient (or doctor) picks a file → multipart `POST /medical-records` → multer (memory) → `fileStorage.saveFile()` → Cloudinary URL saved → listed under *Medical records* |
| **Review** | After a completed visit the home screen asks *"How was your visit?"* → star ratings for the doctor and the clinic, plus a comment → `POST /reviews` → doctor's average rating updates on the list and profile |
| **Deactivate patient** | Admin deletes a patient → `User.isActive = false` → their next request gets **403** → the app signs them out, and they can't log in or book |

---

## 7. Data model

```mermaid
erDiagram
    USER ||--o| PATIENT : "has profile"
    USER ||--o| DOCTOR : "linked account"
    USER ||--o{ APPOINTMENT : "books (patientId)"
    DOCTOR ||--o{ APPOINTMENT : "attends"
    APPOINTMENT ||--o| BILLING : "invoiced by"
    APPOINTMENT ||--o| PRESCRIPTION : "results in"
    USER ||--o{ MEDICAL_RECORD : "owns"
    USER ||--o{ REVIEW : "writes"
    DOCTOR ||--o{ REVIEW : "receives"

    USER {
        string name
        string email UK
        string password "bcrypt hash"
        enum role "patient | doctor | admin"
        bool isActive
    }
    PATIENT {
        ObjectId userId FK
        date dateOfBirth
        enum gender
        string address
        string bloodGroup
        object emergencyContact
        string profilePhoto
    }
    DOCTOR {
        ObjectId userId FK
        string name
        string specialization
        string experience
        string qualifications
        number consultationFee
        array schedule_days "day, startTime, endTime"
        string profilePhoto
        bool isActive
    }
    APPOINTMENT {
        ObjectId doctorId FK
        ObjectId patientId FK
        date date
        string time
        enum status "Pending | Confirmed | Completed | Cancelled"
        string description
        bool rescheduleRequested
        date rescheduleRequestedDate
    }
    BILLING {
        ObjectId appointmentId FK
        ObjectId patientId FK
        ObjectId doctorId FK
        number amount
        number consultationFee
        array items
        enum status "Pending | Paid | Overdue | Cancelled"
        string paymentMethod
    }
    PRESCRIPTION {
        ObjectId appointmentId FK
        ObjectId doctorId FK
        ObjectId patientId FK
        string diagnosis
        array medications
        string instructions
    }
    MEDICAL_RECORD {
        ObjectId patientId FK
        string title
        date recordDate
        string fileUrl
        string fileType
    }
    REVIEW {
        ObjectId patientId FK
        ObjectId doctorId FK
        number overallRating
        object doctorRatings
        object clinicRatings
        string comment
    }
```

Two more standalone collections: **GlobalSetting** (`allowAnytimeBooking`, `minBookingDays`, default 3) and **Holiday** (`date` YYYY-MM-DD, `name`, `type`).

---

## 8. REST API reference

Base URL: `https://<your-host>/api` · 🔓 public · 🔐 any signed-in user · **P** patient · **D** doctor · **A** admin

<details>
<summary><b>Auth</b> — <code>/api/auth</code></summary>

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/register` | 🔓 | Create a patient account |
| POST | `/login` | 🔓 | Returns `accessToken`, `refreshToken`, `user` |
| POST | `/refresh` | 🔓 | Swap a refresh token for new tokens |
| GET | `/me` | 🔐 | Current user |
| POST | `/create-doctor` | A | Create a doctor login |
</details>

<details>
<summary><b>Doctors</b> — <code>/api/doctors</code></summary>

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/` | 🔓 | Active doctors with ratings |
| GET | `/:id` | 🔓 | One doctor |
| POST | `/` | A | Create (multipart, `profilePhoto`) |
| PUT | `/:id` | A | Update (incl. `consultationFee`, schedule) |
| DELETE | `/:id` | A | Remove |
| GET | `/admin/stats` | A | Dashboard counters |
| GET | `/admin/all` | A | All doctors incl. inactive |
| GET | `/my-profile` | D | Own doctor profile |
| PUT | `/my-profile/status` | D | Accepting bookings on/off |
</details>

<details>
<summary><b>Appointments</b> — <code>/api/appointments</code></summary>

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/` | P | Book (runs `validateSlot`) |
| GET | `/my-appointments/patient` | P | Own bookings |
| GET | `/my-appointments/doctor` | D | Doctor's bookings |
| GET | `/` | 🔐 | Scoped to the caller (admin sees all) |
| GET | `/:id` | 🔐 | One appointment (owner / doctor / admin) |
| PUT | `/:id` | 🔐 | Edit / move (re-validated) |
| PUT | `/:id/status` | D, A | Confirm / complete / cancel (Completed → auto invoice) |
| POST | `/:id/request-reschedule` | D | Ask admin to move it |
| GET | `/reschedule-requests` | A | Pending requests |
| POST | `/:id/approve-reschedule` | A | Approve (re-checks the slot) |
| POST | `/:id/reject-reschedule` | A | Reject |
| DELETE | `/:id` | 🔐 | Patient/doctor → cancel · admin → delete |
</details>

<details>
<summary><b>Patients · Billing · Prescriptions · Records · Reviews · Settings · Holidays</b></summary>

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET/POST/PUT | `/patients/profile` | P | Own profile (multipart photo) |
| GET | `/patients`, `/patients/:id` | D, A | Patient list / details |
| DELETE | `/patients/:id` | A | Deactivate patient |
| GET | `/billing/my-billing` | P | Own invoices |
| GET | `/billing/by-appointment/:id` | 🔐 | Invoice for a visit |
| POST · GET · DELETE | `/billing`, `/billing/:id` | A | Create / list / delete invoices |
| PUT | `/billing/:id/status` | P (own, pay) · A | Mark paid |
| POST | `/prescriptions` | D | Write a prescription |
| GET | `/prescriptions/my-prescriptions` | P | Own prescriptions |
| GET | `/prescriptions/appointment/:id` | 🔐 | For one visit |
| GET · PUT · DELETE | `/prescriptions/:id` | D, A | Manage |
| POST | `/medical-records` | P, D | Upload (multipart `file`) |
| GET | `/medical-records/my-records` | P | Own records |
| GET | `/medical-records/patient/:id` | D, A | A patient's records |
| GET | `/reviews`, `/reviews/doctor/:id` | 🔓 | Ratings |
| POST | `/reviews` | P | Rate a doctor |
| GET · PUT | `/settings` | 🔓 · A | Booking window |
| GET · POST · DELETE | `/holidays` | 🔓 · A | Clinic holidays |
| GET | `/health` | 🔓 | API + DB status, file storage mode |
</details>

**Error format:** `{ "message": "…" }`, or `{ "success": false, "errors": [{ "field", "message" }] }` for validation errors (422).

---

## 9. Screenshots

> Captured from the running app (web build) with demo data.

### Getting started

<table>
<tr>
<td align="center"><img src="docs/screenshots/welcome.jpg" width="200"/><br/><sub>Welcome (public)</sub></td>
<td align="center"><img src="docs/screenshots/login.jpg" width="200"/><br/><sub>Sign in</sub></td>
<td align="center"><img src="docs/screenshots/register.jpg" width="200"/><br/><sub>Register with live password checks</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/screenshots/card-success.jpg" width="200"/><br/><sub>Success card → back to Sign in</sub></td>
<td align="center"><img src="docs/screenshots/card-error.jpg" width="200"/><br/><sub>Error card (wrong password)</sub></td>
<td align="center"><img src="docs/screenshots/rating-prompt.jpg" width="200"/><br/><sub>"How was your visit?" prompt</sub></td>
</tr>
</table>

### Patient: find a doctor and book

<table>
<tr>
<td align="center"><img src="docs/screenshots/patient-home.jpg" width="200"/><br/><sub>1 · Home</sub></td>
<td align="center"><img src="docs/screenshots/doctor-list.jpg" width="200"/><br/><sub>2 · Find a doctor (fee + rating)</sub></td>
<td align="center"><img src="docs/screenshots/doctor-detail.jpg" width="200"/><br/><sub>3 · Doctor profile</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/screenshots/pick-slot.jpg" width="200"/><br/><sub>4 · Choose date + time</sub></td>
<td align="center"><img src="docs/screenshots/booking-form.jpg" width="200"/><br/><sub>5 · Details (pre-filled)</sub></td>
<td align="center"><img src="docs/screenshots/booking-confirmed.jpg" width="200"/><br/><sub>6 · Booking confirmed</sub></td>
</tr>
</table>

### Patient: bookings, bills and profile

<table>
<tr>
<td align="center"><img src="docs/screenshots/my-bookings.jpg" width="200"/><br/><sub>My bookings</sub></td>
<td align="center"><img src="docs/screenshots/bills.jpg" width="200"/><br/><sub>Bills and Pay now</sub></td>
<td align="center"><img src="docs/screenshots/profile.jpg" width="200"/><br/><sub>Profile</sub></td>
</tr>
</table>

### Doctor and admin

<table>
<tr>
<td align="center"><img src="docs/screenshots/doctor-dashboard.jpg" width="200"/><br/><sub>Doctor dashboard</sub></td>
<td align="center"><img src="docs/screenshots/admin-dashboard.jpg" width="200"/><br/><sub>Admin dashboard</sub></td>
<td align="center"><img src="docs/screenshots/admin-reschedules.jpg" width="200"/><br/><sub>Reschedule requests</sub></td>
</tr>
</table>

---

## 10. Project structure

```
clinic-app/
├── backend/
│   ├── server.js                 Express app · DB connection · health route · exports app (Vercel)
│   ├── vercel.json               Region sin1
│   ├── config/cloudinary.js
│   ├── controllers/              auth · doctor · appointment · billing · patient ·
│   │                             prescription · medicalRecord · review · setting · holiday
│   ├── middleware/
│   │   ├── authMiddleware.js     protect (JWT + isActive) · authorize(roles)
│   │   ├── uploadMiddleware.js   multer memory storage, size and type limits
│   │   ├── errorMiddleware.js    404 + error handler
│   │   ├── validate.js           express-validator result → 422
│   │   └── validators/           per-resource rules
│   ├── models/                   User · Patient · Doctor · Appointment · Billing ·
│   │                             Prescription · MedicalRecord · Review · GlobalSetting · Holiday
│   ├── routes/                   one router per resource
│   ├── utils/clinicTime.js       clinic-timezone date maths
│   ├── utils/fileStorage.js      Cloudinary or local uploads
│   └── scripts/fixDatabase.js    one-off data repair
├── frontend/
│   ├── App.js                    AppNavigator + AlertHost
│   ├── app.json                  Expo config
│   └── src/
│       ├── api/axiosInstance.js
│       ├── navigation/AppNavigator.js
│       ├── components/           ui · AlertHost · DateField · Avatar · BrandLogo · Form*
│       ├── screens/
│       │   ├── auth/             Login · Register
│       │   ├── home/             Home · PatientAppointments · PatientBilling · Contact · Rating(s)
│       │   ├── doctors/          DoctorList · DoctorDetail (booking) · AddDoctor
│       │   ├── patients/         MyProfile · EditProfile · MedicalRecords · AddMedicalRecord · Prescriptions
│       │   ├── doctor/           DoctorDashboard · AllAppointments · DoctorPatientRecords
│       │   ├── prescriptions/    AddPrescription · PrescriptionDetail
│       │   └── admin/            Dashboard · Doctors · Patients · Appointments · Billing ·
│       │                         Prescriptions · Records · Reschedules · Settings · EditDoctor
│       ├── theme.js
│       └── utils/                date · validationSchemas
├── docs/screenshots/             images used in this README
└── render.yaml                   Render blueprint (optional)
```

---

## 11. Run it locally

**Requirements:** Node.js 20+, a MongoDB Atlas cluster (free M0), and Expo Go on your phone (SDK 54).

### Backend

```bash
cd backend
cp .env.example .env      # fill in MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run dev               # http://localhost:5000 → open /api/health
```

The admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` is created on first start.

| Variable | Required | Example / note |
|---|---|---|
| `MONGO_URI` | ✅ | `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/clinicdb` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | ✅ | Long random strings, different from each other |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | ✅ first run | Bootstrap admin login |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | on Vercel | Persistent uploads |
| `CORS_ORIGIN` | optional | Comma-separated web origins (default `*`) |
| `CLINIC_UTC_OFFSET_MINUTES` | optional | Default `330` (Sri Lanka) |

### App

```bash
cd frontend
cp .env.example .env      # EXPO_PUBLIC_API_URL=...
npm install
npx expo start            # scan the QR with Expo Go · press w for web
```

`EXPO_PUBLIC_API_URL` must end in `/api`:

- **Hosted:** `https://<project>.vercel.app/api`
- **Local:** `http://<your PC's IPv4>:5000/api` (phone and PC on the same Wi-Fi; find the IP with `ipconfig`)

Restart with `npx expo start -c` after changing `.env`. If Expo Go can't download the bundle on your network, try `npx expo start --tunnel`.

---

## 12. Deploy the backend

### Option A: Vercel (free, no card)

1. [vercel.com](https://vercel.com) → **Add New → Project** → import this repo.
2. **Root Directory:** `backend` · **Framework preset:** Express. Leave the build settings empty.
3. **Environment Variables:** same as `.env` (`MONGO_URI`, `JWT_*`, `ADMIN_*`) **plus the three `CLOUDINARY_*` keys**. Vercel has no disk, so uploads need Cloudinary.
4. Deploy → open `https://<project>.vercel.app/api/health` → expect `"database": "connected"`.
5. In MongoDB Atlas → **Network Access**, allow `0.0.0.0/0` (serverless IPs change).
6. Set `EXPO_PUBLIC_API_URL=https://<project>.vercel.app/api` in `frontend/.env`.

Notes: don't set `TZ` (Vercel reserves it; the API already uses clinic time). Uploads are limited to **4 MB** each on Vercel. The Hobby plan is for non-commercial use.

### Option B: Render

1. **New + → Blueprint** → select this repo (reads `render.yaml`).
2. Fill in `MONGO_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (JWT secrets are generated for you), plus the Cloudinary keys for persistent uploads.
3. A free service sleeps after about 15 minutes idle, and the first request then takes 30–50 s. The app waits up to 60 s.

### Build an installable APK (optional)

```bash
npm i -g eas-cli && eas login
cd frontend && eas build -p android --profile preview   # needs an eas.json "preview" profile with buildType "apk"
```

---

## 13. Security and business rules

- **Passwords** are hashed with bcrypt. Registration requires 8+ characters with an uppercase letter, a lowercase letter, a number and a symbol.
- **JWT:** access token valid for 1 h, refresh token for 7 d. Refresh is refused for deactivated accounts.
- **Role-based access** on every route (`protect` + `authorize`). Controllers also **scope data to the caller**: patients only see their own appointments, bills, prescriptions and records.
- **Deactivated accounts** (patient removed by admin) get 403 on every request and can't log in.
- **Bookings** can't be in the past, outside the booking window, on holidays, on the doctor's days off, or on a slot that's already taken. All of this is enforced on the server, not only in the UI.
- **Soft deletes:** patients and doctors cancel appointments; only admins hard-delete.
- **Fees:** each doctor has their own `consultationFee`, which is used for auto-invoices.
- **Uploads:** type and size limits (images 5 MB, documents 10 MB; 4 MB on Vercel), stored on Cloudinary.
- **Secrets:** `.env` files are git-ignored. Use the `.env.example` templates and never commit real credentials. If a secret leaks, rotate it (Atlas → Database Access → edit the user's password) and update `MONGO_URI` everywhere.

---

<div align="center"><sub>Built with Expo, Express and MongoDB · © Adithya Bandara</sub></div>
