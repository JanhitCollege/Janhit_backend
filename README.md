# Janhit Backend API

A production-ready, clean, secure, and modular REST API backend built with Node.js (ES Modules), Express.js, PostgreSQL, and Prisma ORM.

## Features

- **Database Layer**: Prisma ORM with PostgreSQL.
- **Authentication Module**: Complete flow with Signup, Login, Logout, Forgot Password, Reset Password, Change Password, Refresh Token Rotation, and Profile fetch.
- **Strict Registration Guard**:
  - The very first user registering on `POST /api/auth/signup` is automatically created with the `ADMIN` role.
  - After this first admin is created, the signup endpoint is permanently disabled. Subsequent registration requests return `403 Forbidden`.
- **Session Tokens**: JWT Authentication with 15-day Access Tokens and 30-day Refresh Tokens stored securely.
- **Security Enhancements**: CORS, Helmet security headers, Gzip compression, request rate limiting, and password hashing using `bcrypt`.
- **Validation**: Lightweight request body validator middleware.
- **Centralized Error Handling**: Express middleware that catches custom runtime errors and maps Prisma/JWT errors to client-friendly JSON.

---

## Project Directory Structure

```
backend/
├── prisma/
│   └── schema.prisma         # Prisma Schema containing User model
│
├── src/
│   ├── config/
│   │   └── prisma.js         # Prisma Client configuration instance
│   │
│   ├── controllers/
│   │   └── auth.controller.js # Auth request handlers
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js # Route protection and role authorization guards
│   │   └── error.middleware.js # Centralized error handler
│   │
│   ├── routes/
│   │   └── auth.routes.js     # API Route mapping
│   │
│   ├── services/
│   │   ├── auth.service.js   # Decoupled business logic
│   │   └── email.service.js  # Nodemailer mail transporter service
│   │
│   ├── validations/
│   │   └── auth.validation.js # Schema-level input checks
│   │
│   ├── utils/
│   │   ├── logger.js         # Console logger wrapper
│   │   └── CustomError.js    # Operational Error class wrapper
│   │
│   ├── helpers/
│   ├── constants/
│   │   └── roles.js          # Role configuration constants
│   │
│   ├── app.js                # Express app middleware and pipeline registration
│   └── server.js             # Entrypoint server bootstrap
│
├── .env                      # Local environment configurations (ignored in git)
├── .env.example              # Config template
├── package.json              # Script and module definitions
└── README.md                 # Project guide
```

---

## Environment Variables Configuration

Create a `.env` file in the root folder of the project.

### PostgreSQL Connection URL Structure
The `DATABASE_URL` is parsed by Prisma in this format:
```
DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<database_name>?schema=<schema_name>"
```

- **username**: The user account authorized to connect to PostgreSQL (e.g. `postgres`).
- **password**: The password for the user account (e.g. `your_db_password`).
- **host**: The server host address where the PostgreSQL database is running (e.g. `localhost` or `127.0.0.1`).
- **port**: The port on which PostgreSQL is listening (default is `5432`).
- **database_name**: The name of the target database (`Janhit_backend`).
- **schema_name**: The schema database namespace (usually `public`).

### Example Environment Variables (`.env`)
```env
PORT=5000
DATABASE_URL="postgresql://postgres:mysecurepassword@localhost:5432/Janhit_backend?schema=public"

JWT_ACCESS_SECRET="supersecretaccesstokenkey1234567890"
JWT_REFRESH_SECRET="supersecretrefreshtokenkey1234567890"

ACCESS_TOKEN_EXPIRE="15d"
REFRESH_TOKEN_EXPIRE="30d"

EMAIL_HOST="smtp.mailtrap.io"
EMAIL_PORT=2525
EMAIL_USER="your_smtp_user"
EMAIL_PASS="your_smtp_password"

FRONTEND_URL="http://localhost:5173"
```

---

## Prerequisites & Installation

1. Make sure you have **Node.js (v18+)** and **PostgreSQL** installed and running on your system.
2. Clone this project repository and run the setup commands in sequence:

```bash
# 1. Install dependencies
npm install

# 2. Run migrations to initialize the database
npx prisma migrate dev --name init

# 3. Generate the Prisma Client
npx prisma generate

# 4. Start the server in hot-reload development mode
npm run dev
```

---

## API Documentation & Response Formats

All API responses follow a strict format.

### Success Response
```json
{
  "success": true,
  "message": "Descriptive message.",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error Message details."
}
```

### Endpoints List

| HTTP Method | Route | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/signup` | Registers the very first user (Role = ADMIN). Disabled permanently after one user exists. | No |
| **POST** | `/api/auth/login` | Authenticate using Email and Password. Returns tokens. | No |
| **POST** | `/api/auth/logout` | Revokes the current session and clears cookies/database tokens. | Yes |
| **POST** | `/api/auth/forgot-password` | Requests a password reset link to be sent to user email. | No |
| **POST** | `/api/auth/reset-password` | Resets password using the received token. | No |
| **POST** | `/api/auth/change-password` | Changes the password for the currently logged in user. | Yes |
| **POST** | `/api/auth/refresh-token` | Rotates the access and refresh token. | No |
| **GET** | `/api/auth/profile` | Fetches the profile details of the logged in user. | Yes |

---

## Endpoint Details

### 1. Admin Signup
- **URL**: `/api/auth/signup`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "mobile": "9876543210",
    "password": "strongPassword123"
  }
  ```
- **Special Logic**: If a user exists in the database, this returns:
  - **Status Code**: `403 Forbidden`
  - **Body**:
    ```json
    {
      "success": false,
      "message": "Admin already exists. Signup has been disabled."
    }
    ```

### 2. Login
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "strongPassword123"
  }
  ```
- **Response**: Returns Access Token, Refresh Token, and sets the refresh token in an HTTP-only secure cookie.

### 3. Profile (Get Logged In User)
- **URL**: `/api/auth/profile`
- **Method**: `GET`
- **Header**: `Authorization: Bearer <access_token>`

### 4. Refresh Token
- **URL**: `/api/auth/refresh-token`
- **Method**: `POST`
- **Body** *(or read automatically from cookie)*:
  ```json
  {
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
