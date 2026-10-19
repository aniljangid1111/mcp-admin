# Cleanergy Admin API Documentation

Base URL: `http://localhost:3000` (Local) / `https://mcp-admin-7pwd.vercel.app` (Live)

> **Authentication Header (for Protected APIs):**
> `Authorization: Bearer <YOUR_TOKEN>` (or browser cookies)

---

## 1. Authentication APIs

### 1.1 Login
* **Method:** `POST /api/auth/login`
* **Body:**
  ```json
  {
    "email": "admin@example.com",
    "password": "YOUR_PASSWORD"
  }
  ```
* **Response:** Returns `token` and admin details.

### 1.2 Change Password `[Protected]`
* **Method:** `POST /api/auth/change-password`
* **Headers:** `Authorization: Bearer <TOKEN>`
* **Body:**
  ```json
  {
    "currentPassword": "YOUR_CURRENT_PASSWORD",
    "newPassword": "YOUR_NEW_PASSWORD"
  }
  ```

### 1.3 Get Current Admin `[Protected]`
* **Method:** `GET /api/auth/me`

### 1.4 Logout
* **Method:** `POST /api/auth/logout`

---

## 2. Product APIs

### 2.1 Get All Products `[Public]`
* **Method:** `GET /api/products`

### 2.2 Get Single Product `[Public]`
* **Method:** `GET /api/products/:id`

### 2.3 Create Product `[Protected]`
* **Method:** `POST /api/products`
* **Body:**
  ```json
  {
    "name": "Dakota Lithium 12V 100Ah",
    "price": 499,
    "content": "Deep cycle LiFePO4 battery...",
    "specifications": "Voltage: 12V\nCapacity: 100Ah",
    "imageUrl": "https://...",
    "documentUrl": "https://..."
  }
  ```

### 2.4 Update Product `[Protected]`
* **Method:** `PUT /api/products/:id`

### 2.5 Delete Product `[Protected]`
* **Method:** `DELETE /api/products/:id`

---

## 3. Cart APIs (Public / Storefront / MCP)

### 3.1 Add Item to Cart
* **Method:** `POST /api/cart`
* **Body:**
  ```json
  {
    "productId": "PRODUCT_ID",
    "quantity": 1,
    "cartId": "OPTIONAL_EXISTING_CART_ID"
  }
  ```

### 3.2 Get Cart Details
* **Method:** `GET /api/cart/:cartId`

### 3.3 Update Cart Item Quantity
* **Method:** `PATCH /api/cart/:cartId/items/:lineId`
* **Body:** `{ "quantity": 2 }`

### 3.4 Delete Cart Item
* **Method:** `DELETE /api/cart/:cartId/items/:lineId`

---

## 4. Payment & Checkout APIs

### 4.1 Create Stripe Checkout Session
* **Method:** `POST /api/stripe/checkout`
* **Body:**
  ```json
  {
    "cartId": "CART_ID"
  }
  ```
* **Response:** `{ "success": true, "url": "https://checkout.stripe.com/..." }`

### 4.2 Verify Payment (Post-Checkout)
* **Method:** `GET /api/orders/verify?orderId=ORDER_ID&session_id=CHECKOUT_SESSION_ID`
* **Response:** `{ "success": true, "status": "PAID", "order": { ... } }`

### 4.3 Stripe Webhook
* **Method:** `POST /api/stripe/webhook`
* **Description:** Handled automatically by Stripe with signature verification.

---

## 5. Orders Management APIs `[Protected]`

### 5.1 List Orders (Pagination, Search, Stats)
* **Method:** `GET /api/orders?page=1&limit=10&status=ALL&search=`

### 5.2 Get Order by ID
* **Method:** `GET /api/orders/:id`

### 5.3 Update Order Status
* **Method:** `PATCH /api/orders/:id`
* **Body:**
  ```json
  {
    "status": "PAID" // PENDING | PAID | CANCELLED | FAILED
  }
  ```

### 5.4 Delete Order
* **Method:** `DELETE /api/orders/:id`

---

## 6. Media & PDF Upload `[Protected]`

### 6.1 Upload Image / Catalog PDF
* **Method:** `POST /api/upload`
* **Body (form-data):** `file`: `(Select image or PDF)`
* **Description:** Uploads to Cloudinary; for PDFs, auto-extracts technical specs and returns analysis.
