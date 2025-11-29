# KAMCORP Frontend

Frontend application for KAMCORP Accounting & Inventory Management System built with Next.js, React 18, and TailwindCSS.

## 🔹 Tech Stack

- **Next.js 14** (React 18)
- **TypeScript**
- **TailwindCSS** (Metallic-Chic Dark Theme)
- **React Query** (TanStack Query)
- **Axios** for API calls
- **Zod** for validation
- **Recharts** for data visualization
- **React Hot Toast** for notifications
- **Framer Motion** for animations

## 🔹 Features

- ✅ JWT-based authentication with auto-redirect
- ✅ Role-based UI (Admin, Sales Manager, Stock Manager)
- ✅ Dark mode by default (toggle available)
- ✅ Responsive mobile-first design
- ✅ Real-time dashboard with KPIs
- ✅ Product management with low-stock alerts
- ✅ Sales tracking with payment status
- ✅ Purchase recording
- ✅ Comprehensive reports with charts
- ✅ Export to CSV, XLSX, PDF
- ✅ Smooth animations with Framer Motion
- ✅ Form validation with Zod
- ✅ Optimistic UI updates

## 🔹 Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Backend API running (see backend README)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.local.sample .env.local
   ```

3. **Edit `.env.local` file:**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open browser:**
   ```
   http://localhost:3000
   ```

6. **Login with seeded credentials:**
   - **Admin:** admin@kamcorp.co.tz / kamcorp123
   - **Sales:** sales@kamcorp.co.tz / kamcorp123
   - **Stock:** stock@kamcorp.co.tz / kamcorp123

## 🔹 Project Structure

```
frontend/
├── src/
│   ├── pages/             # Next.js pages
│   │   ├── _app.tsx       # App wrapper with providers
│   │   ├── index.tsx      # Landing page (redirects)
│   │   ├── login.tsx      # Login page
│   │   ├── dashboard.tsx  # Dashboard with KPIs
│   │   ├── products.tsx   # Product management
│   │   ├── sales.tsx      # Sales module
│   │   ├── purchases.tsx  # Purchases module
│   │   └── reports.tsx    # Reports with charts
│   ├── components/        # Reusable components
│   │   ├── Layout.tsx     # Main layout with sidebar
│   │   ├── Navbar.tsx     # Top navigation
│   │   ├── Sidebar.tsx    # Sidebar navigation
│   │   ├── Card.tsx       # Card component
│   │   ├── Button.tsx     # Button component
│   │   ├── Input.tsx      # Input component
│   │   ├── Modal.tsx      # Modal component
│   │   └── charts/        # Chart components
│   ├── hooks/             # Custom React hooks
│   │   ├── useAuth.tsx    # Authentication hook
│   │   └── useTheme.tsx   # Theme management hook
│   ├── utils/             # Utility functions
│   │   ├── api.ts         # Axios instance with interceptors
│   │   ├── export.ts      # CSV/XLSX/PDF export helpers
│   │   └── validation.ts  # Zod schemas
│   └── styles/            # Global styles
│       └── globals.css    # Tailwind + custom styles
├── public/                # Static files
├── tailwind.config.js     # Tailwind configuration
├── tsconfig.json          # TypeScript configuration
├── next.config.js         # Next.js configuration
└── package.json
```

## 🔹 Available Pages

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Redirects to dashboard or login |
| `/login` | Public | Login page |
| `/dashboard` | Private | Dashboard with KPIs and charts |
| `/products` | Private | Product management (CRUD) |
| `/sales` | Private | Sales tracking |
| `/purchases` | Private | Purchase recording |
| `/reports` | Private | Comprehensive reports |

## 🔹 Theme System

### Metallic-Chic Dark Palette

```css
Background: #0e0e10
Surface: #1b1b1f
Text Primary: #e5e5e7
Text Secondary: #a3a3a6
Accent Primary: #b08cff (Lavender)
Accent Secondary: #ffb347 (Soft Gold)
Success: #6ce89e
Error: #ff5c5c
```

### Custom CSS Classes

```css
.card                  /* Metallic card with shadow */
.btn-primary          /* Primary accent button */
.btn-secondary        /* Secondary accent button */
.input                /* Styled input field */
.label                /* Form label */
.loading-shimmer      /* Loading skeleton */
```

## 🔹 State Management

### Authentication State (useAuth)

```typescript
const {
  user,              // Current user object
  token,             // JWT token
  login,             // Login function
  logout,            // Logout function
  isAuthenticated,   // Boolean auth status
  isAdmin,           // Check if admin
  isSales,           // Check if sales
  isStock,           // Check if stock
  authHeader,        // Get auth header for API calls
} = useAuth();
```

### Theme State (useTheme)

```typescript
const {
  theme,        // 'dark' | 'light'
  toggleTheme,  // Toggle theme
  setTheme,     // Set specific theme
} = useTheme();
```

### React Query Keys

```typescript
['products']              // All products
['products', id]          // Single product
['sales']                 // All sales
['purchases']             // All purchases
['reports', 'sales']      // Sales report
['reports', 'stock']      // Stock report
['reports', 'dashboard']  // Dashboard data
```

## 🔹 API Integration

All API calls use the configured axios instance (`src/utils/api.ts`):

```typescript
import api from '@/utils/api';

// GET request
const response = await api.get('/products');

// POST request
const response = await api.post('/sales', { productId, quantity });

// PUT request
const response = await api.put(`/products/${id}`, data);

// DELETE request
const response = await api.delete(`/products/${id}`);
```

Token is automatically added to headers via interceptor.

## 🔹 Form Validation

All forms use Zod schemas for validation:

```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Use in forms
const result = loginSchema.safeParse(formData);
if (!result.success) {
  // Handle validation errors
}
```

## 🔹 Animations

Using Framer Motion for all animations:

```typescript
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {/* Content */}
</motion.div>
```

## 🔹 Deployment

### Deploy to Vercel (Free Tier)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import repository
4. Configure:
   - **Framework:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
5. Add environment variable:
   - `NEXT_PUBLIC_API_URL=https://your-backend-api.onrender.com/api`
6. Deploy!

### Environment Variables for Production

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api
```

## 🔹 Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## 🔹 Code Organization Best Practices

1. **Components:** Keep components small and focused
2. **Hooks:** Extract reusable logic into custom hooks
3. **Utils:** Place helper functions in utils/
4. **Types:** Define TypeScript interfaces/types at the top
5. **Styling:** Use Tailwind utility classes, avoid inline styles
6. **Queries:** Use React Query for all API calls
7. **Forms:** Always validate with Zod before submission

## 🔹 Performance Optimizations

- ✅ React Query caching (5-minute stale time)
- ✅ Code splitting with Next.js dynamic imports
- ✅ Image optimization with next/image
- ✅ Lazy loading for charts and heavy components
- ✅ Debounced search inputs
- ✅ Optimistic UI updates
- ✅ Server-side rendering disabled for authenticated pages

## 🔹 Responsive Design

- **Mobile:** < 640px
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px

Sidebar collapses to drawer on mobile.

## 🔹 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🔹 Troubleshooting

### CORS Issues
Ensure backend CORS_ORIGIN includes frontend URL.

### Token Expired
Logout and login again. Tokens are valid for 1 day.

### API Connection Failed
Check that backend is running and NEXT_PUBLIC_API_URL is correct.

### Build Errors
Run `npm install` to ensure all dependencies are installed.

## 🔹 License

ISC - KAMCORP Internal Use Only

---

**Built with ❤️ for KAMCORP Tanzania**
