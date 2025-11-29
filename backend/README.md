# KAMCORP Backend API

Backend API for KAMCORP Accounting & Inventory Management System built with Node.js, Express, and MongoDB.

## 🔹 Tech Stack

- **Node.js** with **Express v4**
- **MongoDB** with **Mongoose**
- **JWT** authentication
- **bcrypt** for password hashing
- **RBAC** (Role-Based Access Control)

## 🔹 Features

- ✅ JWT-based authentication (1-day token validity)
- ✅ Role-based access control (Admin, Sales Manager, Stock Manager)
- ✅ Product management with low-stock detection
- ✅ Sales tracking with automatic stock decrement
- ✅ Purchase recording with automatic stock increment
- ✅ Comprehensive reports (Sales, Stock, Purchases, Dashboard)
- ✅ Audit logging for all actions
- ✅ Rate limiting and security headers
- ✅ Optimized aggregation queries for reports (< 5s for 10,000 sales)

## 🔹 Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.sample .env
   ```

3. **Edit `.env` file:**
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key_at_least_32_chars
   PORT=5000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   TZ=Africa/Dar_es_Salaam
   ```

4. **Seed database with initial data:**
   ```bash
   npm run seed
   ```

   This creates 3 users and 10 sample products:
   - **Admin:** admin@kamcorp.co.tz / kamcorp123
   - **Sales:** sales@kamcorp.co.tz / kamcorp123
   - **Stock:** stock@kamcorp.co.tz / kamcorp123

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Start production server:**
   ```bash
   npm start
   ```

## 🔹 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/login` | Public | Login user |
| GET | `/me` | Private | Get current user |
| GET | `/users` | Admin | Get all users |
| POST | `/reset-password` | Admin | Reset user password |

### Products (`/api/products`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | All | Get all products |
| GET | `/categories` | All | Get product categories |
| GET | `/:id` | All | Get single product |
| POST | `/` | Admin, Stock | Create product |
| PUT | `/:id` | Admin, Stock | Update product |
| DELETE | `/:id` | Admin, Stock | Delete product |

### Sales (`/api/sales`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | All | Get all sales |
| GET | `/:id` | All | Get single sale |
| POST | `/` | Admin, Sales | Create sale |
| PATCH | `/:id/payment-status` | Admin, Sales | Update payment status |

### Purchases (`/api/purchases`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | All | Get all purchases |
| GET | `/suppliers` | All | Get supplier list |
| GET | `/:id` | All | Get single purchase |
| POST | `/` | Admin, Stock | Create purchase |

### Reports (`/api/reports`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/sales` | All | Sales report with timeline |
| GET | `/stock` | All | Stock report with valuation |
| GET | `/purchases` | All | Purchases report |
| GET | `/dashboard` | All | Dashboard KPIs |

#### Query Parameters for Reports

**Sales & Purchases Reports:**
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)
- `groupBy` - Group by: `day`, `week`, or `month`

**Example:**
```
GET /api/reports/sales?startDate=2024-01-01&endDate=2024-12-31&groupBy=month
```

## 🔹 Authentication

Include JWT token in Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 🔹 Error Responses

All errors return:

```json
{
  "ok": false,
  "error": "Error message"
}
```

## 🔹 Database Models

### User
```javascript
{
  email: String (unique),
  fullName: String,
  passwordHash: String,
  role: 'admin' | 'sales' | 'stock',
  lastLoginAt: Date
}
```

### Product
```javascript
{
  name: String,
  sku: String (unique),
  category: String,
  unitPriceTZS: Number,
  costPriceTZS: Number,
  stockQuantity: Number
}
```

### Sale
```javascript
{
  productId: ObjectId,
  productSnapshot: { name, sku },
  quantitySold: Number,
  unitPriceAtSaleTZS: Number,
  totalPriceTZS: Number,
  paymentMethod: 'cash' | 'mobile' | 'card',
  paymentStatus: 'paid' | 'pending',
  soldBy: ObjectId,
  date: Date
}
```

### Purchase
```javascript
{
  productId: ObjectId,
  quantityPurchased: Number,
  unitCostTZS: Number,
  totalCostTZS: Number,
  supplierText: String,
  purchasedBy: ObjectId,
  date: Date
}
```

## 🔹 Deployment

### Deploy to Render (Free Tier)

1. Create account at [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Add environment variables in Render dashboard
6. Deploy!

**Note:** Free tier sleeps after 15 minutes of inactivity.

### MongoDB Atlas Setup

1. Create cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Choose M0 Free tier
3. Whitelist IP: `0.0.0.0/0` (all IPs)
4. Create database user
5. Get connection string
6. Update `MONGO_URI` in `.env`

## 🔹 Performance Optimization

- ✅ Database indexes on frequently queried fields
- ✅ Aggregation pipelines for reports
- ✅ Compound indexes for complex queries
- ✅ Query result limiting
- ✅ Lean queries for read-only operations
- ✅ Transaction support for critical operations

## 🔹 Security Features

- ✅ Helmet for security headers
- ✅ Rate limiting (100 requests/15 min)
- ✅ Login rate limiting (5 attempts/15 min)
- ✅ CORS configuration
- ✅ Password hashing with bcrypt
- ✅ JWT token expiration
- ✅ Input validation
- ✅ MongoDB injection prevention

## 🔹 Development

```bash
# Run in development mode with auto-reload
npm run dev

# Seed database
npm run seed

# Check API health
curl http://localhost:5000/health
```

## 🔹 License

ISC - KAMCORP Internal Use Only

---

**Built with ❤️ for KAMCORP Tanzania**
