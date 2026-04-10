# 🩸 LifeLink Blood Bank System

A full-stack web application connecting blood donors and recipients — fast, reliable, and life-saving.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v14 or higher

### Setup & Run

```bash
# 1. Open terminal in the lifelink folder
cd lifelink

# 2. Install dependencies
cd backend
npm install

# 3. Start the server
node server.js
```

Then open your browser and go to: **http://localhost:3000**

---

## ✨ Features

### 🩸 Donor Interface
- Register as a blood donor with full profile
- Toggle availability status
- Record blood donations and track history
- Earn achievement badges (First Drop, Life Saver, Blood Hero...)
- Respond to blood requests from receivers
- View live blood inventory
- View all active emergency requests

### 🏥 Receiver Interface
- Search donors by blood group, city, availability
- Submit blood requests with urgency levels
- Track responses from donors
- Mark requests as fulfilled
- 🚨 **Emergency SOS** — broadcast critical requests to all matching donors
- View live blood bank inventory

### 📊 System Features
- Real-time blood inventory tracking (8 blood groups)
- Smart donor-recipient compatibility matching
- Live dashboard stats
- Secure JWT authentication
- Beautiful dark UI with responsive design

---

## 🏗️ Project Structure

```
lifelink/
├── backend/
│   ├── server.js          # Express API server
│   └── package.json       # Backend dependencies
├── frontend/
│   ├── index.html         # Single-page application
│   ├── css/
│   │   └── main.css       # Complete stylesheet
│   └── js/
│       ├── api.js         # API helper functions
│       └── app.js         # Full application logic
├── data/                  # JSON database (auto-created)
│   ├── users.json
│   ├── donors.json
│   ├── requests.json
│   ├── donations.json
│   └── inventory.json
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/donors` | List donors (filterable) |
| GET | `/api/donors/:id` | Get donor by ID |
| PUT | `/api/donors/:id` | Update donor profile |
| POST | `/api/donors/:id/donate` | Record a donation |
| GET | `/api/requests` | List blood requests |
| POST | `/api/requests` | Create blood request |
| PUT | `/api/requests/:id` | Update request status |
| POST | `/api/requests/:id/respond` | Donor responds to request |
| GET | `/api/inventory` | Get blood inventory |
| GET | `/api/stats` | Get system statistics |
| GET | `/api/donations` | Get donation records |

---

## 🎯 Demo Accounts

After starting the server, register with:
- **Role: Donor** — to access the donor dashboard
- **Role: I Need Blood** — to access the receiver dashboard

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3 (custom design system), Vanilla JavaScript
- **Backend:** Node.js + Express.js
- **Database:** JSON file storage (no setup required)
- **Auth:** JWT (JSON Web Tokens)
- **Fonts:** Syne + DM Sans (Google Fonts)

---

## 📱 Screenshots

The app features:
- A stunning dark-themed landing page with animated blood drop
- Live inventory bar showing all 8 blood group counts
- Separate dashboards for donors and receivers
- Emergency SOS system for critical situations
- Achievement badge system for donors

---

Built with ❤️ for saving lives.
