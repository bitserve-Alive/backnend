# 🔐 PakAuction Authentication System

Complete authentication system with JWT tokens, email verification, password reset, and modern security features.

## 🚀 Features

- ✅ **User Registration** with email verification
- ✅ **Login/Logout** with JWT tokens
- ✅ **Refresh Token** system for secure sessions
- ✅ **Password Reset** via email
- ✅ **Email Verification** with welcome emails
- ✅ **Change Password** for logged-in users
- ✅ **Rate Limiting** to prevent abuse
- ✅ **Input Validation** with detailed error messages
- ✅ **Secure Cookies** for token storage
- ✅ **MongoDB** integration with Prisma ORM

## 📋 Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Database Setup
```bash
# Copy environment template
cp env.template .env

# Edit .env file with your MongoDB URL and email settings
# DATABASE_URL="mongodb://localhost:27017/auction_site"
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Push Database Schema
```bash
npx prisma db push
```

### 5. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="mongodb://localhost:27017/auction_site"

# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@pakauction.com

# Frontend
FRONTEND_URL=http://localhost:3000
```

## 📡 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | ❌ |
| POST | `/login` | Login user | ❌ |
| POST | `/logout` | Logout user | ✅ |
| POST | `/refresh-token` | Refresh access token | ✅ |
| GET | `/verify-email?token=xxx` | Verify email address | ❌ |
| POST | `/resend-verification` | Resend verification email | ❌ |
| POST | `/forgot-password` | Request password reset | ❌ |
| POST | `/reset-password` | Reset password with token | ❌ |
| POST | `/change-password` | Change password (logged in) | ✅ |
| GET | `/profile` | Get user profile | ✅ |

## 📝 API Usage Examples

### Register User
```javascript
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "marketingEmails": true
}
```

### Login User
```javascript
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "rememberMe": true
}
```

### Forgot Password
```javascript
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Reset Password
```javascript
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```

## 🔒 Security Features

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### Rate Limiting
- **Auth endpoints**: 5 requests per 15 minutes per IP
- **Password reset**: 3 requests per hour per IP
- **General API**: 100 requests per 15 minutes per IP

### Token Security
- **Access tokens**: 15 minutes expiry
- **Refresh tokens**: 7 days expiry
- **HTTP-only cookies** for secure storage
- **CSRF protection** with SameSite cookies

## 📧 Email Templates

The system includes beautiful HTML email templates for:
- **Welcome email** after registration
- **Email verification** with branded design
- **Password reset** with security warnings

## 🎨 Frontend Integration

The authentication system is fully integrated with the existing HTML design:

### Features
- **No design changes** to existing HTML
- **Automatic UI updates** based on auth status
- **Form handling** for login/register
- **Error/success messages** with notifications
- **User dropdown menu** when logged in

### Usage
```html
<!-- Include in your HTML pages -->
<script src="js/auth.js"></script>
```

The system automatically:
- Binds to existing forms (`#login-form`, `#register-form`)
- Updates navigation buttons based on login status
- Handles form submissions and API calls
- Shows user-friendly messages

## 🛠️ Database Schema

### User Model
```prisma
model User {
  id                    String    @id @default(auto()) @map("_id") @db.ObjectId
  email                 String    @unique
  username              String    @unique
  firstName             String
  lastName              String
  phone                 String?
  dateOfBirth           DateTime?
  password              String
  isEmailVerified       Boolean   @default(false)
  emailVerificationToken String?
  passwordResetToken    String?
  passwordResetExpires  DateTime?
  refreshToken          String?
  role                  Role      @default(USER)
  isActive              Boolean   @default(true)
  lastLogin             DateTime?
  marketingEmails       Boolean   @default(false)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

## 🚨 Error Handling

The system provides detailed error responses:

```javascript
// Validation Error
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Password must be at least 8 characters long",
      "param": "password",
      "location": "body"
    }
  ]
}

// Authentication Error
{
  "success": false,
  "message": "Invalid email or password"
}

// Rate Limit Error
{
  "success": false,
  "message": "Too many authentication attempts, please try again later."
}
```

## 🔄 Token Refresh Flow

1. **Access token expires** (15 minutes)
2. **Frontend detects** 401 error
3. **Automatically calls** `/refresh-token` endpoint
4. **New tokens issued** and stored
5. **Original request retried** with new token

## 📱 Mobile Support

- **Responsive design** works on all devices
- **Touch-friendly** forms and buttons
- **Mobile-optimized** email templates

## 🧪 Testing

Test the authentication system:

1. **Register** a new account
2. **Check email** for verification link
3. **Verify email** and receive welcome message
4. **Login** with credentials
5. **Test password reset** flow
6. **Try invalid credentials** to see error handling

## 🔧 Troubleshooting

### Common Issues

**Email not sending:**
- Check EMAIL_USER and EMAIL_PASS in .env
- Use App Password for Gmail (not regular password)
- Verify SMTP settings

**Database connection:**
- Ensure MongoDB is running
- Check DATABASE_URL format
- Run `npx prisma db push` to sync schema

**CORS errors:**
- Update CORS_ORIGIN in .env
- Ensure frontend URL matches

**Token issues:**
- Check JWT_SECRET is set
- Clear browser cookies and localStorage
- Verify token expiry times

## 🚀 Production Deployment

### Security Checklist
- [ ] Change all JWT secrets
- [ ] Use strong database passwords
- [ ] Enable HTTPS
- [ ] Set secure cookie flags
- [ ] Configure proper CORS origins
- [ ] Set up email service (SendGrid, etc.)
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/auction_site"
JWT_SECRET="super_secure_random_string_256_bits"
JWT_REFRESH_SECRET="another_super_secure_random_string_256_bits"
CORS_ORIGIN="https://yourdomain.com"
FRONTEND_URL="https://yourdomain.com"
```

---

## 🎉 You're All Set!

Your authentication system is now ready with:
- ✅ Complete user management
- ✅ Secure token handling
- ✅ Email verification
- ✅ Password reset
- ✅ Modern security practices
- ✅ Beautiful email templates
- ✅ Frontend integration

The system maintains the original design while adding powerful authentication features! 🚀 