# Online Marketplace for Handmade & Artisan Products

A simple full-stack web application that connects customers with artisans and sellers for buying handmade and artisan products. The system supports product browsing, cart management, order placement and tracking, seller product and order management, customer complaint handling, and platform administration.

The implementation is based on the project's SRS, use case diagram, class diagram, activity diagram, sequence diagrams, and Gane & Sarson DFDs.

---

## 1. Project Overview

The Online Marketplace for Handmade & Artisan Products provides a common platform where:

- **Customers** can browse products, add products to a cart, place orders, make payments, track orders, and raise complaints.
- **Artisans / Sellers** can manage product listings and handle customer orders.
- **Customer Support Executives** can view and resolve customer complaints.
- **Platform Administrators** can manage users, categories, products, orders, and marketplace activities.

The application is intentionally kept simple so that the implementation remains consistent with the academic SRS and UML diagrams.

---

## 2. User Roles

### Customer

- Register / Login
- Browse and search products
- View product details
- Add products to cart
- View and modify cart
- Check product availability
- Place orders
- Confirm payment
- Track orders
- Raise complaints

### Artisan / Seller

- Register / Login
- Add products
- Update products
- Delete products
- Manage product availability
- View new orders
- Accept and prepare orders
- Ship orders
- Update order status

### Customer Support Executive

- Login
- View customer complaints
- Analyse complaints
- Respond to customers
- Update complaint status
- Resolve complaints

### Platform Administrator

- Login
- Manage users
- Manage categories
- Manage products
- Manage orders
- Monitor marketplace activities
- View reports
- Take administrative actions

---

## 3. Main System Workflow

```text
Customer
   |
   v
Register / Login
   |
   v
Browse Products
   |
   v
View Product Details
   |
   v
Add to Cart
   |
   v
Proceed to Checkout
   |
   v
Check Product Availability
   |
   +---- Not Available ---> Modify Cart
   |
 Available
   |
   v
Place Order
   |
   v
Confirm Payment
   |
   v
Track Order
   |
   v
Receive Order
   |
   v
Raise Complaint (Optional)
```

Seller workflow:

```text
Register / Login
      |
      v
Manage Product Listings
      |
      v
View New Orders
      |
      v
Accept Order
      |
      v
Prepare Order
      |
      v
Ship Order
      |
      v
Update Order Status
```

Complaint workflow:

```text
Customer Raises Complaint
          |
          v
Store Complaint
          |
          v
Customer Support Views Complaint
          |
          v
Analyse / Handle Complaint
          |
          v
Respond to Customer
          |
          v
Update Complaint Status
          |
          v
Resolve Complaint
```

---

## 4. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | CSS |
| Routing | React Router |
| Backend | Node.js + Express.js |
| API | REST API |
| Database | SQLite |
| Authentication | JWT + bcrypt |
| API Testing | Postman |
| Version Control | Git + GitHub |

### Why this stack?

The stack is kept simple for a student-level full-stack project.

- **React** provides a component-based frontend.
- **Express.js** provides a lightweight REST backend.
- **SQLite** provides a simple relational database without requiring a separate database server.
- **JWT + bcrypt** provide basic authentication and password protection.
- **REST APIs** keep the frontend and backend clearly separated.

---

## 5. System Architecture

```text
+-----------------------------+
|        React Frontend       |
|      React + Vite + CSS     |
+--------------+--------------+
               |
               | REST API
               v
+-----------------------------+
|       Node.js Backend       |
|          Express.js         |
+--------------+--------------+
               |
               v
+-----------------------------+
|          SQLite             |
|         Database            |
+-----------------------------+
```

The application follows a simple three-layer structure:

1. Frontend
2. Backend / API
3. Database

---

## 6. Project Modules

```text
Online Marketplace
|
+-- Authentication
|
+-- Customer Module
|   +-- Browse Products
|   +-- Product Details
|   +-- Cart
|   +-- Orders
|   +-- Payment
|   +-- Order Tracking
|   +-- Complaints
|
+-- Artisan / Seller Module
|   +-- Product Listings
|   +-- Product Availability
|   +-- Order Management
|
+-- Customer Support Module
|   +-- View Complaints
|   +-- Handle Complaints
|   +-- Update Complaint Status
|
+-- Administrator Module
    +-- Manage Users
    +-- Manage Categories
    +-- Manage Products
    +-- Manage Orders
    +-- Reports
```

---

## 7. Class Diagram Structure

The main classes are:

```text
                         User
                          ^
                          |
        +-----------------+------------------+
        |                 |                  |
    Customer        ArtisanSeller     SupportExecutive
        |
   Administrator


Customer -------- Cart
Customer -------- Order
Customer -------- Complaint

ArtisanSeller -------- Product
Category ------------- Product

Cart ----------------- Product
Order ---------------- Product
Order ---------------- Payment

SupportExecutive ----- Complaint
```

### Main Classes and Responsibilities

#### User

Attributes:

- userId
- name
- email
- password
- phone

Methods:

- register()
- login()
- logout()

#### Customer

Methods:

- browseProducts()
- addToCart()
- placeOrder()
- trackOrder()
- raiseComplaint()

#### ArtisanSeller

Attributes:

- sellerId
- storeName

Methods:

- addProduct()
- updateProduct()
- deleteProduct()
- manageOrders()

#### CustomerSupportExecutive

Attributes:

- employeeId

Methods:

- viewComplaint()
- handleComplaint()
- updateComplaintStatus()

#### Administrator

Attributes:

- adminId

Methods:

- manageUsers()
- manageProducts()
- manageOrders()
- generateReports()

#### Product

Attributes:

- productId
- name
- description
- price
- quantity
- image

Methods:

- addProduct()
- updateProduct()
- deleteProduct()
- checkAvailability()

#### Category

Attributes:

- categoryId
- categoryName

Methods:

- addCategory()
- updateCategory()

#### Cart

Attributes:

- cartId
- totalAmount

Methods:

- addItem()
- removeItem()
- calculateTotal()
- clearCart()

#### Order

Attributes:

- orderId
- orderDate
- status
- totalAmount

Methods:

- placeOrder()
- cancelOrder()
- trackOrder()
- updateStatus()

#### Payment

Attributes:

- paymentId
- amount
- paymentDate
- paymentMethod
- status

Methods:

- processPayment()
- verifyPayment()

#### Complaint

Attributes:

- complaintId
- description
- date
- status

Methods:

- createComplaint()
- updateStatus()
- resolveComplaint()

---

## 8. Use Case Relationships

The important relationships from the use case model are:

```text
Place Order
     |
     | <<include>>
     v
Check Product Availability
```

```text
Track Order
     ^
     |
  <<extend>>
     |
Raise Complaint
```

The payment gateway is not represented as a separate actor in the use case diagram. Payment is handled as part of the order process.

---

## 9. Activity Diagram

The activity flow is divided into five swimlanes:

- Customer
- System
- Artisan / Seller
- Customer Support Executive
- Platform Administrator

Main flow:

```text
Customer
   |
   v
Register / Login
   |
Browse Products
   |
View Product Details
   |
Add to Cart
   |
Checkout
   |
System Checks Availability
   |
   +---- No ----> Modify Cart
   |
   +---- Yes ---> Create Order
                    |
                    v
              Confirm Payment
                    |
                    v
              Update Order Status
                    |
                    v
               Notify Seller
                    |
                    v
Seller Accepts -> Prepares -> Ships Order
                    |
                    v
              Track / Receive Order
                    |
                    v
             Raise Complaint
                    |
                    v
           Support Handles Complaint
```

The administrator separately manages marketplace activities, users, products, orders, and reports.

---

## 10. Sequence Diagrams

Three main sequence diagrams are used for the system.

### Place Order

```text
Customer
   |
   | placeOrder()
   v
Order
   |
   | checkAvailability()
   v
Product
   |
   | availability
   v
Order
   |
   | processPayment()
   v
Payment
   |
   | paymentStatus
   v
Order
   |
   v
Order Confirmation
```

The availability condition is represented using an `alt` fragment:

```text
[Available]
     |
Create Order -> Process Payment -> Confirm Order

[Not Available]
     |
Show Out of Stock / Modify Cart
```

### Manage Product Listings

```text
Artisan / Seller
       |
       v
Product
       |
       +--> addProduct()
       |
       +--> updateProduct()
       |
       +--> deleteProduct()
```

The three actions are represented using an `alt` fragment.

### Raise Complaint

```text
Customer
    |
    | createComplaint()
    v
Complaint
    ^
    |
Support Executive
    |
    +--> viewComplaint()
    |
    +--> handleComplaint()
    |
    +--> updateStatus()
```

The complaint can move through different statuses until it is resolved.

---

## 11. Data Flow Diagrams

The DFDs use **Gane and Sarson notation**.

### Level 0 DFD

The entire application is represented as one main process:

```text
Customer
    |
    v
+-------------------------+
| Online Marketplace      |
| System                  |
+-------------------------+
    ^
    |
Seller / Support / Admin
```

The main external entities are:

- Customer
- Artisan / Seller
- Customer Support Executive
- Platform Administrator

The system exchanges customer data, product information, order details, payment information, complaint details, updates, and reports with these entities.

### Level 1 DFD

The system is divided into major processes:

```text
Customer --------> Manage Account
Seller ----------> Manage Products
Customer --------> Manage Orders
Customer --------> Manage Complaints
Admin -----------> Reports & Administration
```

Main data stores:

```text
D1 - Users
D2 - Products
D3 - Categories
D4 - Orders
D5 - Payments
D6 - Complaints
D7 - System Logs
```

### Level 2 DFD

The main processes are further decomposed into smaller processes:

```text
Manage Account
   |
   +-- Register / Login
   +-- Verify Account

Manage Products
   |
   +-- Add / Update / Delete Product
   +-- Update Inventory
   +-- Manage Category

Manage Orders
   |
   +-- Create Order
   +-- Process Payment
   +-- Update Order Status

Manage Complaints
   |
   +-- Submit Complaint
   +-- Assign Complaint
   +-- Resolve Complaint

Reports & Administration
   |
   +-- Generate Reports
   +-- Prepare Reports
```

---

## 12. Database Design

The main database tables are:

### Users

```text
user_id
name
email
password
phone
role
```

### Products

```text
product_id
seller_id
category_id
name
description
price
quantity
image
```

### Categories

```text
category_id
category_name
```

### Cart

```text
cart_id
customer_id
total_amount
```

### Orders

```text
order_id
customer_id
order_date
status
total_amount
```

### Payments

```text
payment_id
order_id
amount
payment_date
payment_method
status
```

### Complaints

```text
complaint_id
customer_id
description
date
status
```

---

## 13. REST API Structure

The backend will expose simple REST endpoints.

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
```

### Products

```text
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
```

### Categories

```text
GET  /api/categories
POST /api/categories
PUT  /api/categories/:id
```

### Cart

```text
GET    /api/cart
POST   /api/cart
PUT    /api/cart/:id
DELETE /api/cart/:id
```

### Orders

```text
POST /api/orders
GET  /api/orders
GET  /api/orders/:id
PUT  /api/orders/:id/status
```

### Payments

```text
POST /api/payments
GET  /api/payments/:id
```

### Complaints

```text
POST /api/complaints
GET  /api/complaints
PUT  /api/complaints/:id/status
```

### Admin

```text
GET /api/admin/users
GET /api/admin/orders
GET /api/admin/reports
```

---

## 14. Frontend Pages

The React frontend will contain simple pages based on the user roles.

### Public Pages

```text
Home
Login
Register
Product Listing
Product Details
```

### Customer Pages

```text
Customer Dashboard
Cart
Checkout
My Orders
Track Order
Raise Complaint
My Complaints
```

### Seller Pages

```text
Seller Dashboard
My Products
Add Product
Edit Product
Seller Orders
Update Order Status
```

### Support Pages

```text
Support Dashboard
Complaints
Complaint Details
Update Complaint
```

### Admin Pages

```text
Admin Dashboard
Users
Categories
Products
Orders
Reports
```

---

## 15. Suggested Project Structure

```text
online-marketplace/
|
+-- client/
|   |
|   +-- src/
|       +-- components/
|       +-- pages/
|       +-- layouts/
|       +-- services/
|       +-- context/
|       +-- App.jsx
|       +-- main.jsx
|       +-- styles/
|
+-- server/
|   |
|   +-- controllers/
|   +-- routes/
|   +-- middleware/
|   +-- models/
|   +-- database/
|   +-- server.js
|
+-- README.md
+-- package.json
+-- .gitignore
```

The structure is intentionally simple and can be expanded only when required.

---

## 16. Authentication and Authorization

Users register and log in through the React frontend.

The backend:

1. Receives login details.
2. Checks the user in the database.
3. Verifies the password using bcrypt.
4. Creates a JWT token.
5. Returns the token to the frontend.
6. Uses the user's role to control access.

Example roles:

```text
CUSTOMER
SELLER
SUPPORT
ADMIN
```

Users should only access features available to their role.

---

## 17. Order Status Flow

The order follows a simple status flow:

```text
Pending
   ↓
Accepted
   ↓
Preparing
   ↓
Shipped
   ↓
Delivered
```

The seller updates the order status during order processing, and the customer can view the current status.

---

## 18. Complaint Status Flow

```text
Pending
   ↓
In Progress
   ↓
Responded
   ↓
Resolved
```

The Customer Support Executive manages the complaint until it is resolved.

---

## 19. Payment

For this academic implementation, payment can be implemented as a simple payment confirmation process rather than integrating a real payment gateway.

Supported payment methods can be represented as:

- UPI
- Debit / Credit Card
- Net Banking
- Digital Wallet

The system stores:

- Payment ID
- Amount
- Payment Method
- Payment Date
- Payment Status

---

## 20. Installation

### Prerequisites

Install:

- Node.js
- npm
- Git

Check installation:

```bash
node --version
npm --version
git --version
```

### Clone the Repository

```bash
git clone <repository-url>
cd online-marketplace
```

### Install Frontend

```bash
cd client
npm install
```

### Install Backend

```bash
cd ../server
npm install
```

---

## 21. Environment Variables

Create a `.env` file inside the `server` folder.

Example:

```env
PORT=5000
JWT_SECRET=your_secret_key
DATABASE_PATH=./database/marketplace.db
```

Do not commit `.env` files to GitHub.

---

## 22. Running the Project

### Start Backend

```bash
cd server
npm run dev
```

Backend:

```text
http://localhost:5000
```

### Start Frontend

Open another terminal:

```bash
cd client
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## 23. Testing

Testing will cover:

- Registration
- Login
- Product browsing
- Product management
- Cart operations
- Product availability
- Order placement
- Payment confirmation
- Order tracking
- Complaint submission
- Complaint resolution
- Seller operations
- Administrator operations
- Role-based access

API testing can be performed using Postman.

---

## 24. Project Scope

The project focuses on the core functionality required by the SRS.

### Included

- User authentication
- Role-based access
- Product management
- Category management
- Cart
- Orders
- Payment confirmation
- Order tracking
- Complaint management
- Seller management
- Administrator management
- Basic reports

### Not Included

To keep the project simple, the following are not required:

- Real payment gateway integration
- Microservices
- Advanced recommendation systems
- Real-time chat
- Complex cloud infrastructure
- Delivery partner integration
- Advanced analytics
- Mobile application

---

## 25. Development Approach

The project can be developed in the following order:

```text
1. Project Setup
       ↓
2. Database
       ↓
3. Authentication
       ↓
4. Product & Category Management
       ↓
5. Cart
       ↓
6. Orders & Payment
       ↓
7. Seller Module
       ↓
8. Complaint Module
       ↓
9. Admin Module
       ↓
10. Testing
       ↓
11. Final UI & Documentation
```

---

## 26. Team Responsibilities

The project can be divided between two team members.

### Member 1

- Backend setup
- Database
- Authentication
- Product APIs
- Order APIs
- Payment logic

### Member 2

- React frontend
- Customer pages
- Seller pages
- Support pages
- Admin pages
- UI styling

### Both Members

- Integration
- Testing
- Bug fixing
- Documentation
- Final presentation

---

## 27. Future Enhancements

Possible future improvements include:

- Real payment gateway integration
- Artisan verification
- Product recommendations
- Real-time notifications
- Online chat
- Delivery partner integration
- Advanced analytics
- Mobile application

These features are outside the current project scope and are not required for the initial implementation.

---

## 28. Conclusion

The Online Marketplace for Handmade & Artisan Products is a simple full-stack marketplace designed according to the project's SRS and software engineering models. React provides the user interface, Express and Node.js handle the backend services, and SQLite stores the application data. The system covers the main activities of customers, artisans, customer support executives, and administrators while maintaining consistency with the project's use case, class, activity, sequence, and DFD models.
