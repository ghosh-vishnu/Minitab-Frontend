# Quick Start Guide - Multi-Tenant SaaS System

## Prerequisites

- Python 3.8+
- Django 4.x
- Django REST Framework
- PostgreSQL (recommended) or SQLite (development)

---

## Step-by-Step Setup

### 1. Apply Database Migrations

```bash
cd backend

# Create all migrations
python manage.py makemigrations companies
python manage.py makemigrations subscriptions
python manage.py makemigrations authentication
python manage.py makemigrations rbac
python manage.py makemigrations spreadsheets

# Apply all migrations
python manage.py migrate
```

**Expected Output:**
```
Running migrations:
  Applying companies.0001_initial... OK
  Applying subscriptions.0001_initial... OK
  Applying authentication.0001_initial... OK
  Applying rbac.0001_initial... OK
  Applying spreadsheets.0001_initial... OK
```

### 2. Create Super Admin

```bash
python manage.py create_super_admin

# Or with arguments
python manage.py create_super_admin --username superadmin --email admin@yourcompany.com --password Admin@123
```

**Expected Output:**
```
Successfully created super admin: superadmin
Email: admin@yourcompany.com
User Type: SUPER_ADMIN
```

### 3. Setup Subscription Plans

```bash
python manage.py setup_plans
```

**Expected Output:**
```
Created plan: Starter
Created plan: Professional
Created plan: Enterprise

Total plans created: 3
```

### 4. Start Development Server

```bash
python manage.py runserver
```

Server will start at: `http://localhost:8000`

---

## Testing the System

### Test 1: Super Admin Login

**Request:**
```http
POST http://localhost:8000/api/auth/login/
Content-Type: application/json

{
  "username": "superadmin",
  "password": "Admin@123"
}
```

**Expected Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "uuid",
    "username": "superadmin",
    "email": "admin@yourcompany.com",
    "user_type": "SUPER_ADMIN",
    "company": null
  }
}
```

**Save the access token for subsequent requests!**

---

### Test 2: View Subscription Plans

**Request:**
```http
GET http://localhost:8000/api/subscriptions/plans/
Authorization: Bearer {access_token}
```

**Expected Response:**
```json
[
  {
    "id": "uuid",
    "name": "Starter",
    "max_users": 5,
    "price": "29.99",
    "billing_cycle": "monthly"
  },
  {
    "id": "uuid",
    "name": "Professional",
    "max_users": 25,
    "price": "99.99",
    "billing_cycle": "monthly"
  },
  {
    "id": "uuid",
    "name": "Enterprise",
    "max_users": 100,
    "price": "299.99",
    "billing_cycle": "monthly"
  }
]
```

---

### Test 3: Create a Company

**Request:**
```http
POST http://localhost:8000/api/companies/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "company_code": "ACME001",
  "email": "contact@acme.com",
  "phone": "+1234567890",
  "industry": "Technology",
  "status": "active",
  "is_active": true,
  "address_line1": "123 Main Street",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "postal_code": "10001"
}
```

**Expected Response:**
```json
{
  "id": "company-uuid",
  "name": "Acme Corporation",
  "company_code": "ACME001",
  "email": "contact@acme.com",
  "status": "active",
  "is_active": true,
  "created_at": "2026-02-07T10:00:00Z"
}
```

**Save the company ID!**

---

### Test 4: Create Subscription for Company

**Request:**
```http
POST http://localhost:8000/api/subscriptions/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "company": "company-uuid",
  "plan": "plan-uuid",  
  "status": "active",
  "start_date": "2026-02-07T00:00:00Z",
  "end_date": "2027-02-07T00:00:00Z",
  "auto_renew": true,
  "amount_paid": "99.99",
  "currency": "USD"
}
```

**Expected Response:**
```json
{
  "id": "subscription-uuid",
  "company": "company-uuid",
  "company_name": "Acme Corporation",
  "plan": "plan-uuid",
  "plan_name": "Professional",
  "status": "active",
  "start_date": "2026-02-07T00:00:00Z",
  "end_date": "2027-02-07T00:00:00Z",
  "days_remaining": 365,
  "is_active_subscription": true
}
```

---

### Test 5: Create Company Admin

**Request:**
```http
POST http://localhost:8000/api/auth/register/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "username": "acme_admin",
  "email": "admin@acme.com",
  "password": "AcmeAdmin@123",
  "user_type": "COMPANY_ADMIN",
  "company": "company-uuid",
  "full_name": "Acme Administrator"
}
```

**Expected Response:**
```json
{
  "id": "user-uuid",
  "username": "acme_admin",
  "email": "admin@acme.com",
  "user_type": "COMPANY_ADMIN",
  "company": "company-uuid",
  "full_name": "Acme Administrator"
}
```

---

### Test 6: Login as Company Admin

**Request:**
```http
POST http://localhost:8000/api/auth/login/
Content-Type: application/json

{
  "username": "acme_admin",
  "password": "AcmeAdmin@123"
}
```

**Expected Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "user-uuid",
    "username": "acme_admin",
    "email": "admin@acme.com",
    "user_type": "COMPANY_ADMIN",
    "company": {
      "id": "company-uuid",
      "name": "Acme Corporation"
    }
  }
}
```

**Use this new token for company admin operations!**

---

### Test 7: Create Company User (as Company Admin)

**Request:**
```http
POST http://localhost:8000/api/auth/register/
Authorization: Bearer {company_admin_access_token}
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@acme.com",
  "password": "User@123",
  "user_type": "COMPANY_USER",
  "company": "company-uuid",
  "full_name": "John Doe",
  "department": "Sales",
  "job_title": "Sales Manager"
}
```

**Expected Response:**
```json
{
  "id": "user-uuid",
  "username": "john_doe",
  "email": "john@acme.com",
  "user_type": "COMPANY_USER",
  "company": "company-uuid",
  "full_name": "John Doe",
  "department": "Sales",
  "job_title": "Sales Manager"
}
```

---

### Test 8: Test User Limit Enforcement

Try creating more users than the subscription allows:

```http
POST http://localhost:8000/api/auth/register/
Authorization: Bearer {company_admin_access_token}
Content-Type: application/json

{
  "username": "extra_user",
  "email": "extra@acme.com",
  "password": "User@123",
  "user_type": "COMPANY_USER",
  "company": "company-uuid",
  "full_name": "Extra User"
}
```

**Expected Response (when limit reached):**
```json
{
  "error": "User limit exceeded. Please upgrade your subscription to add more users.",
  "detail": "The company 'Acme Corporation' has reached its maximum user limit."
}
```

---

### Test 9: View Company Statistics

**Request:**
```http
GET http://localhost:8000/api/companies/{company-uuid}/stats/
Authorization: Bearer {super_admin_access_token}
```

**Expected Response:**
```json
{
  "total_users": 2,
  "active_users": 2,
  "inactive_users": 0,
  "total_spreadsheets": 0,
  "storage_used_mb": 0.0,
  "subscription_days_remaining": 365,
  "user_limit": 25,
  "remaining_slots": 23
}
```

---

### Test 10: Test Data Isolation

1. **Login as User from Company A:**
```http
POST http://localhost:8000/api/auth/login/
{
  "username": "john_doe",
  "password": "User@123"
}
```

2. **Create a Spreadsheet:**
```http
POST http://localhost:8000/api/spreadsheets/
Authorization: Bearer {john_doe_access_token}
{
  "name": "Sales Data 2026",
  "description": "Q1 Sales Report"
}
```

3. **Create Another Company and User (as Super Admin)**

4. **Login as User from Company B**

5. **Try to access spreadsheets:**
```http
GET http://localhost:8000/api/spreadsheets/
Authorization: Bearer {company_b_user_token}
```

**Expected Result:** User from Company B should NOT see Company A's spreadsheets!

---

## Common Operations

### Activate a Company

```http
POST http://localhost:8000/api/companies/{company-uuid}/activate/
Authorization: Bearer {super_admin_token}
```

### Suspend a Company

```http
POST http://localhost:8000/api/companies/{company-uuid}/suspend/
Authorization: Bearer {super_admin_token}
```

### Renew Subscription

```http
POST http://localhost:8000/api/subscriptions/{subscription-uuid}/renew/
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "days": 365
}
```

### Cancel Subscription

```http
POST http://localhost:8000/api/subscriptions/{subscription-uuid}/cancel/
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "reason": "Customer request"
}
```

### View Activity Logs

```http
GET http://localhost:8000/api/rbac/activity-logs/
Authorization: Bearer {access_token}
```

---

## Environment Variables

Create a `.env` file in the backend directory:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (PostgreSQL for production)
USE_POSTGRES=False
DB_NAME=minitab
DB_USER=postgres
DB_PASSWORD=root
DB_HOST=localhost
DB_PORT=5432

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# JWT
JWT_ACCESS_TOKEN_LIFETIME=3600
JWT_REFRESH_TOKEN_LIFETIME=604800
```

---

## Troubleshooting

### Migration Issues

If you encounter migration conflicts:
```bash
# Delete migration files (except __init__.py)
# Delete database file (if using SQLite)
rm db.sqlite3

# Recreate everything
python manage.py makemigrations
python manage.py migrate
```

### Permission Denied Errors

Check:
1. Authentication token is valid
2. User type matches endpoint requirements
3. Subscription is active

### Data Not Isolated

Check:
1. Middleware is enabled in settings
2. Views are filtering by `request.tenant`
3. Company field is set on models

---

## Next Steps

1. ✅ Backend is complete and tested
2. ⏳ Create Frontend dashboards:
   - Super Admin Dashboard
   - Company Admin Dashboard
   - Company User Dashboard
3. ⏳ Implement route guards in React
4. ⏳ Add subscription payment integration
5. ⏳ Deploy to production

---

## URLs for Testing

- **Admin Panel**: http://localhost:8000/admin/
- **API Root**: http://localhost:8000/api/
- **Health Check**: http://localhost:8000/health/
- **Companies API**: http://localhost:8000/api/companies/
- **Subscriptions API**: http://localhost:8000/api/subscriptions/
- **Auth API**: http://localhost:8000/api/auth/

---

## Postman Collection

Import the Postman collection for easier testing:
`backend/Minitab_API.postman_collection.json`

Add these endpoints to the collection:
- Companies CRUD
- Subscriptions CRUD
- Multi-tenant user creation
- Data isolation tests

---

**Happy Testing! 🚀**
