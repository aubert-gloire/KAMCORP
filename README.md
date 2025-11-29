# 🏢 KAMCORP Accounting & Inventory Management System

A private web application for KAMCORP, a small Tanzanian company, designed to manage accounting and inventory operations with role-based access control.

![Tech Stack](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=flat-square&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [User Roles](#user-roles)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)

---

## 🎯 Overview

KAMCORP is a complete accounting and inventory management system built for **3 internal users** with the following capabilities:

- Product inventory management
- Sales tracking with automated stock updates
- Purchase recording
- Comprehensive reporting and analytics
- Role-based access control
- Audit logging for all operations

**Timezone:** Africa/Dar_es_Salaam  
**Currency:** Tanzanian Shilling (TZS)

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication (1-day token validity)
- Role-based access control (Admin, Sales Manager, Stock Manager)
- Secure password hashing with bcrypt
- No public signup - admin-managed user accounts

### 📦 Product Management
- Full CRUD operations
- SKU and category organization
- Cost price and selling price tracking
- Real-time stock quantity monitoring
- Low-stock alerts (≤5 items)
- Automatic timestamps

### 💰 Sales Tracking
- Record product sales with payment details
- Automatic stock decrement
- Payment method tracking (cash/mobile/card)
- Payment status monitoring (paid/pending)
- Sales history with filtering

### 🛒 Purchase Recording
- Record new stock purchases
- Automatic stock increment
- Supplier tracking (text field)
- Purchase history and reports

### 📊 Reports & Analytics
- **Sales Reports:** Revenue trends, top products, payment breakdown
- **Stock Reports:** Current inventory, valuation, low-stock items
- **Purchase Reports:** Spending trends, supplier analysis
- **Dashboard:** Real-time KPIs and charts
- Export to CSV, XLSX, and PDF
- Date range filtering and grouping (daily/weekly/monthly)

### 🎨 UI/UX
- **Metallic-Chic Dark Theme** with lavender and gold accents
- Responsive mobile-first design
- Dark mode by default (toggle available)
- Smooth animations with Framer Motion
- Real-time toast notifications
- Optimistic UI updates

### 📝 Audit Logging
- Track all CRUD operations
- User activity monitoring
- Timestamps for accountability

---

## 🛠 Tech Stack

### Backend
- **Node.js** with **Express v4**
- **MongoDB Atlas** (M0 free tier)
- **Mongoose** ODM
- **JWT** for authentication
- **bcrypt** for password hashing
- **Helmet** for security
- **Express Rate Limit** for API protection

### Frontend
- **Next.js 14** (React 18)
- **TypeScript**
- **TailwindCSS** (custom metallic theme)
- **React Query** (TanStack Query) for state management
- **Axios** for API calls
- **Zod** for form validation
- **Recharts** for data visualization
- **React Hot Toast** for notifications
- **Framer Motion** for animations

### Deployment
- **Backend:** Render (free tier)
- **Frontend:** Vercel (free tier)
- **Database:** MongoDB Atlas (M0 free tier)

---

## 📁 Project Structure

```
KAMCORP WEB APP/
├── backend/               # Express API
│   ├── src/
│   │   ├── models/       # Mongoose schemas
│   │   ├── controllers/  # Business logic
│   │   ├── routes/       # API routes
│   │   ├── middleware/   # Auth & error handling
│   │   ├── utils/        # Helper functions
│   │   └── server.js     # Entry point
│   ├── package.json
│   ├── .env.sample
│   └── README.md
│
└── frontend/             # Next.js app
    ├── src/
    │   ├── pages/        # Next.js pages
    │   ├── components/   # React components
    │   ├── hooks/        # Custom hooks
    │   ├── utils/        # Utilities
    │   └── styles/       # Global CSS
    ├── package.json
    ├── tailwind.config.js
    ├── .env.local.sample
    └── README.md
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB Atlas** account (free)
- **npm** or **yarn**

### 1. Clone Repository

```bash
cd "c:\Users\evotech\Documents\Aubert's projects\KAMCORP WEB APP"
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.sample .env
# Edit .env with your MongoDB URI and JWT secret

# Seed database with initial users and products
npm run seed

# Start backend server
npm run dev
```

**Backend will run on:** `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.sample .env.local
# Edit .env.local (default: http://localhost:5000/api)

# Start frontend server
npm run dev
```

**Frontend will run on:** `http://localhost:3000`

### 4. Login

Open `http://localhost:3000` and login with seeded credentials:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@kamcorp.co.tz | kamcorp123 |
| **Sales Manager** | sales@kamcorp.co.tz | kamcorp123 |
| **Stock Manager** | stock@kamcorp.co.tz | kamcorp123 |

---

## 👥 User Roles

| Role | Capabilities |
|------|--------------|
| **Admin** | • Full system access<br>• Manage all products, sales, purchases<br>• Reset user passwords<br>• View all reports<br>• Manage users |
| **Sales Manager** | • Record sales<br>• View sales history<br>• View sales reports<br>• Update payment status<br>• View products (read-only) |
| **Stock Manager** | • Add/update/delete products<br>• Record purchases<br>• View stock reports<br>• View purchase history<br>• View products |

---

## 🌐 Deployment

### MongoDB Atlas (Database)

1. Create free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create M0 free cluster
3. Whitelist all IPs: `0.0.0.0/0`
4. Create database user
5. Get connection string
6. Update `MONGO_URI` in backend `.env`

### Render (Backend API)

1. Create account at [render.com](https://render.com)
2. Create new **Web Service**
3. Connect GitHub repository (backend folder)
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Add environment variables:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `CORS_ORIGIN` (your Vercel URL)
   - `TZ=Africa/Dar_es_Salaam`
6. Deploy!

**Note:** Free tier sleeps after 15 minutes of inactivity.

### Vercel (Frontend)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import repository (frontend folder)
4. Configure:
   - **Framework:** Next.js
   - **Build Command:** `npm run build`
5. Add environment variable:
   - `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api`
6. Deploy!

---

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api (development)
https://your-backend.onrender.com/api (production)
```

### Authentication
All protected endpoints require JWT token in header:
```
Authorization: Bearer <your_jwt_token>
```

### Endpoints

#### Authentication
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user
- `GET /auth/users` - Get all users (Admin)
- `POST /auth/reset-password` - Reset password (Admin)

#### Products
- `GET /products` - Get all products
- `GET /products/:id` - Get single product
- `POST /products` - Create product (Admin/Stock)
- `PUT /products/:id` - Update product (Admin/Stock)
- `DELETE /products/:id` - Delete product (Admin/Stock)
- `GET /products/categories` - Get categories

#### Sales
- `GET /sales` - Get all sales
- `GET /sales/:id` - Get single sale
- `POST /sales` - Create sale (Admin/Sales)
- `PATCH /sales/:id/payment-status` - Update payment (Admin/Sales)

#### Purchases
- `GET /purchases` - Get all purchases
- `GET /purchases/:id` - Get single purchase
- `POST /purchases` - Create purchase (Admin/Stock)
- `GET /purchases/suppliers` - Get suppliers

#### Reports
- `GET /reports/sales?startDate=&endDate=&groupBy=` - Sales report
- `GET /reports/stock` - Stock report
- `GET /reports/purchases?startDate=&endDate=&groupBy=` - Purchases report
- `GET /reports/dashboard` - Dashboard summary

For detailed API documentation, see [backend/README.md](backend/README.md)

---

## 🎨 Theme

### Metallic-Chic Dark Palette

```css
Background: #0e0e10
Surface: #1b1b1f
Text Primary: #e5e5e7
Accent Primary: #b08cff (Lavender Metallic)
Accent Secondary: #ffb347 (Soft Gold)
Success: #6ce89e
Error: #ff5c5c
```

---

## 🔒 Security Features

- ✅ JWT authentication with 1-day expiration
- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ Rate limiting (100 requests/15 min, 5 login attempts/15 min)
- ✅ Helmet security headers
- ✅ CORS configuration
- ✅ MongoDB injection prevention
- ✅ Input validation with Zod
- ✅ Role-based access control

---

## ⚡ Performance

- ✅ MongoDB indexes on frequently queried fields
- ✅ Aggregation pipelines for reports
- ✅ React Query caching (5-minute stale time)
- ✅ Optimistic UI updates
- ✅ Code splitting with Next.js
- ✅ Report generation: < 5 seconds for 10,000 sales

---

## 📱 Responsive Design

- **Mobile:** < 640px (drawer navigation)
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px (sidebar navigation)

---

## 🧪 Testing

### Backend
```bash
cd backend
npm run seed  # Test database seeding
curl http://localhost:5000/health  # Test API health
```

### Frontend
```bash
cd frontend
npm run build  # Test production build
npm run lint   # Check for linting errors
```

---

## 📞 Support

For issues or questions, contact the development team.

---

## 📄 License

**ISC** - KAMCORP Internal Use Only

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## 🙏 Credits

**Built with ❤️ for KAMCORP Tanzania**

- **Timezone:** Africa/Dar_es_Salaam (EAT)
- **Currency:** Tanzanian Shilling (TZS)
- **Target Users:** 3 internal employees
- **Deployment:** Free tier (Vercel + Render + MongoDB Atlas)

---

## 📚 Additional Documentation

- [Backend README](backend/README.md) - API documentation and backend setup
- [Frontend README](frontend/README.md) - UI documentation and frontend setup

---

**Version:** 1.0.0  
**Last Updated:** November 2025
