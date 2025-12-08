# Medi-Mart Backend API

A complete REST API backend for the Medi-Mart pharmacy e-commerce platform.

## Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)
- npm or yarn

## Installation

```bash
cd backend
npm install
```

## Setup

1. Create `.env` file in backend folder (use `.env.example` as template)
2. Update MongoDB URI if needed
3. Update FRONTEND_URL for CORS

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/medi-mart
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Run Server

### Development (with nodemon)
```bash
npm run dev
```

### Production
```bash
npm start
```

Server will run on `http://localhost:5000`

## API Endpoints

### Users
- `GET /users` - Get all users
- `GET /users/:email` - Get user by email
- `POST /users` - Create user
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Categories
- `GET /categories` - Get all categories
- `GET /categories/:id` - Get category by ID
- `POST /categories` - Create category
- `PATCH /categories/:id` - Update category
- `DELETE /categories/:id` - Delete category

### Products/Medicines
- `GET /medicines` - Get all products
- `GET /medicines/:id` - Get product by ID
- `GET /medicines/seller/:email` - Get seller's products
- `POST /medicines` - Create product
- `PATCH /medicines/:id` - Update product
- `DELETE /medicines/:id` - Delete product

### Orders
- `GET /orders` - Get all orders
- `GET /orders/buyer/:email` - Get user's orders
- `GET /orders/seller/:email` - Get seller's orders
- `POST /orders` - Create order
- `PATCH /orders/:id` - Update order status
- `GET /orders/stats/admin-dashboard` - Admin stats
- `GET /orders/stats/:email` - Seller stats

### Reviews
- `GET /reviews/product/:productId` - Get product reviews
- `POST /reviews` - Create review
- `DELETE /reviews/:id` - Delete review

### Ads
- `GET /ads` - Get active ads
- `GET /ads/seller/:email` - Get seller's ads
- `POST /ads` - Request ad
- `PATCH /ads/:id/approve` - Approve ad (admin)
- `PATCH /ads/:id/reject` - Reject ad (admin)
- `DELETE /ads/:id` - Delete ad

## Features

✅ User Management (Role-based: user, seller, admin)
✅ Product Catalog with search & filters
✅ Order Management (Cash on Delivery)
✅ Review & Rating System
✅ Advertisement Management
✅ Dashboard Statistics
✅ Category Management
✅ Stock Management

## Database Models

- **User** - User accounts with roles
- **Category** - Product categories
- **Product** - Medicine/product listings
- **Order** - Customer orders (COD)
- **Review** - Product reviews
- **Ad** - Promotional advertisements

## Notes

- Payment is via Cash on Delivery (COD)
- All endpoints return JSON
- No authentication middleware currently (add Firebase Admin SDK if needed)
