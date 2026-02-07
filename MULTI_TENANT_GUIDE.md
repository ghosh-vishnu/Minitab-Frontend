# Multi-Tenant SaaS System Implementation Guide

## Overview

This document describes the complete multi-tenant SaaS system implementation for your Excel-like application. The system supports **three levels of access** with **company-based subscriptions**, **RBAC**, and **data isolation**.

---

## System Architecture

### Three Levels of Access

#### **LEVEL 1: Super Admin (Your Company)**
- Has a master admin/subscription panel
- Can create and manage client companies
- Can assign subscriptions to companies
- Can define max users per company
- Can activate/deactivate companies
- Can view usage and audit logs
- **User Type**: `SUPER_ADMIN`
- **Company**: `null` (not assigned to any company)

#### **LEVEL 2: Company Admin (Client Company)**
- Gets a separate admin panel
- Logs in using UserID and Password
- Can create users ONLY within their company
- Cannot create more users than subscription limit
- Has dashboard, settings, audit logs
- Can manage roles and permissions for users
- **User Type**: `COMPANY_ADMIN`
- **Company**: Assigned to a specific company

#### **LEVEL 3: Company Users**
- Created by Company Admin
- Log in using UserID and Password
- Can access the Excel-like product
- Feature access depends on assigned role
- **User Type**: `COMPANY_USER`
- **Company**: Assigned to a specific company

---

## Database Schema

### Core Models

#### 1. **Company**
```python
- id (UUID, PK)
- name (CharField, unique)
- slug (SlugField, unique)
- company_code (CharField, unique)
- email (EmailField, unique)
- phone, website
- address fields (address_line1, line2, city, state, country, postal_code)
- status (choices: active, inactive, suspended, pending)
- is_active (Boolean)
- industry, tax_id
- primary_admin (FK to User, nullable)
- settings (JSONField)
- created_by (FK to User)
- notes (TextField)
- created_at, updated_at, activated_at
```

**Relationships**:
- One company -> Many users
- One company -> One subscription
- One company -> Many spreadsheets
- One company -> Many roles

#### 2. **SubscriptionPlan**
```python
- id (UUID, PK)
- name, slug, description
- max_users (IntegerField)
- max_spreadsheets (IntegerField, -1 = unlimited)
- max_storage_mb (IntegerField, -1 = unlimited)
- features (JSONField)
- price, currency, billing_cycle
- is_active, is_public
- display_order
- created_at, updated_at
```

#### 3. **Subscription**
```python
- id (UUID, PK)
- company (OneToOne with Company)
- plan (FK to SubscriptionPlan)
- status (choices: active, expired, cancelled, suspended, trial)
- start_date, end_date, trial_end_date
- max_users (nullable, overrides plan)
- max_spreadsheets (nullable, overrides plan)
- max_storage_mb (nullable, overrides plan)
- custom_features (JSONField)
- amount_paid, currency, payment_reference
- auto_renew (Boolean)
- notes
- created_by (FK to User)
- created_at, updated_at, activated_at, cancelled_at
```

**Methods**:
- `is_active()`: Check if subscription is currently active
- `days_remaining()`: Calculate days until expiry
- `get_max_users()`: Get effective user limit
- `cancel()`, `suspend()`, `activate()`

#### 4. **User (Extended)**
```python
- id (UUID, PK)
- username, email, password (from AbstractUser)
- full_name
- user_type (choices: SUPER_ADMIN, COMPANY_ADMIN, COMPANY_USER)
- company (FK to Company, nullable for super admins)
- created_by (FK to User)
- phone, avatar, department, job_title
- is_email_verified
- last_login_ip, last_activity
- created_at, updated_at
```

**Methods**:
- `is_super_admin()`, `is_company_admin()`, `is_company_user()`
- `can_access_system()`: Check subscription status
- `has_permission(codename)`: Check RBAC permissions
- `get_permissions()`: Get all user permissions

#### 5. **Role (Extended)**
```python
- id (UUID, PK)
- name
- description
- scope (choices: global, company)
- company (FK to Company, nullable for global roles)
- is_active
- created_by (FK to User)
- created_at, updated_at
```

#### 6. **ActivityLog (Extended)**
```python
- id (UUID, PK)
- user (FK to User)
- company (FK to Company) -- NEW for tenant isolation
- action_type (choices: create, read, update, delete, login, logout, etc.)
- model_name, object_id
- description
- ip_address, user_agent
- metadata (JSONField)
- created_at
```

#### 7. **Spreadsheet (Extended)**
```python
- id (UUID, PK)
- user (FK to User)
- company (FK to Company) -- NEW for tenant isolation
- name, description
- row_count, column_count
- is_public, is_favorite
- worksheet_names (JSONField)
- created_at, updated_at
```

---

## API Endpoints

### Authentication Endpoints

```
POST   /api/auth/register/          - Register new user
POST   /api/auth/login/             - Login (returns JWT tokens)
POST   /api/auth/refresh/           - Refresh access token
POST   /api/auth/logout/            - Logout
GET    /api/auth/profile/           - Get current user profile
PATCH  /api/auth/profile/           - Update profile
```

### Company Management Endpoints (Super Admin Only)

```
GET    /api/companies/                       - List all companies
POST   /api/companies/                       - Create new company
GET    /api/companies/{id}/                  - Get company details
PATCH  /api/companies/{id}/                  - Update company
DELETE /api/companies/{id}/                  - Delete company
POST   /api/companies/{id}/activate/         - Activate company
POST   /api/companies/{id}/deactivate/       - Deactivate company
POST   /api/companies/{id}/suspend/          - Suspend company
GET    /api/companies/{id}/users/            - Get company users
GET    /api/companies/{id}/stats/            - Get company statistics
GET    /api/companies/dashboard/             - Get dashboard stats
```

### Subscription Management Endpoints (Super Admin Only)

```
# Subscription Plans
GET    /api/subscriptions/plans/             - List all plans
POST   /api/subscriptions/plans/             - Create new plan
GET    /api/subscriptions/plans/{id}/        - Get plan details
PATCH  /api/subscriptions/plans/{id}/        - Update plan
DELETE /api/subscriptions/plans/{id}/        - Delete plan
GET    /api/subscriptions/plans/public/      - Get public plans

# Subscriptions
GET    /api/subscriptions/                   - List all subscriptions
POST   /api/subscriptions/                   - Create new subscription
GET    /api/subscriptions/{id}/              - Get subscription details
PATCH  /api/subscriptions/{id}/              - Update subscription
DELETE /api/subscriptions/{id}/              - Delete subscription
POST   /api/subscriptions/{id}/activate/     - Activate subscription
POST   /api/subscriptions/{id}/cancel/       - Cancel subscription
POST   /api/subscriptions/{id}/suspend/      - Suspend subscription
POST   /api/subscriptions/{id}/renew/        - Renew subscription
GET    /api/subscriptions/{id}/history/      - Get subscription history
GET    /api/subscriptions/dashboard/         - Get dashboard stats
```

### RBAC Endpoints

```
GET    /api/rbac/roles/                      - List roles
POST   /api/rbac/roles/                      - Create role
GET    /api/rbac/roles/{id}/                 - Get role details
PATCH  /api/rbac/roles/{id}/                 - Update role
DELETE /api/rbac/roles/{id}/                 - Delete role

GET    /api/rbac/permissions/                - List permissions
GET    /api/rbac/activity-logs/              - List activity logs
```

### Spreadsheet Endpoints (with tenant isolation)

```
GET    /api/spreadsheets/                    - List spreadsheets (filtered by company)
POST   /api/spreadsheets/                    - Create spreadsheet
GET    /api/spreadsheets/{id}/               - Get spreadsheet details
PATCH  /api/spreadsheets/{id}/               - Update spreadsheet
DELETE /api/spreadsheets/{id}/               - Delete spreadsheet
```

---

## Middleware

### 1. **TenantIsolationMiddleware**
- Adds `request.tenant` (user's company)
- Adds `request.is_super_admin` flag
- Enables easy tenant filtering in views

### 2. **SubscriptionValidationMiddleware**
- Validates subscription status before allowing access
- Blocks access if subscription is expired/inactive
- Exempt paths: `/admin/`, `/api/auth/login/`, `/health/`, etc.

### 3. **RequestLoggingMiddleware**
- Logs all API requests
- Logs response status for errors

### 4. **ErrorHandlingMiddleware**
- Catches exceptions and returns proper JSON responses
- Logs exceptions with IP address

---

## Permission Classes

### 1. **IsSuperAdmin**
- Only Super Admins can access

### 2. **IsCompanyAdmin**
- Only Company Admins can access

### 3. **IsCompanyAdminOrSuperAdmin**
- Either Company Admin or Super Admin

### 4. **IsCompanyUser**
- Any user belonging to a company

### 5. **HasActiveSubscription**
- User's company must have active subscription

### 6. **BelongsToSameCompany**
- Object-level permission
- Ensures user can only access their company's data

### 7. **CanManageCompanyUsers**
- Can manage users within their company
- Super admins can manage any users

### 8. **HasCustomPermission**
- Check RBAC permissions from roles
- Super admins have all permissions

### 9. **CanCreateUsersWithinLimit**
- Validates user creation against subscription limit
- Backend enforcement of user limits

---

## Data Isolation Strategy

### Automatic Filtering
All queries for company-specific data should filter by `company`:

```python
# In views
def get_queryset(self):
    queryset = Spreadsheet.objects.all()
    
    # Filter by user's company (unless super admin)
    if not self.request.is_super_admin:
        queryset = queryset.filter(company=self.request.tenant)
    
    return queryset
```

### Model-Level Isolation
The `Spreadsheet` model automatically sets company from user:

```python
def save(self, *args, **kwargs):
    if not self.company and self.user and hasattr(self.user, 'company'):
        self.company = self.user.company
    super().save(*args, **kwargs)
```

### Activity Logs
All activity logs include `company` field for tenant-specific audit trails.

---

## Implementation Steps (Development Order)

### Step 1: Database Migration
```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate
```

### Step 2: Create Super Admin
```bash
# Create your first super admin user
python manage.py create_super_admin --username admin --email admin@yourcompany.com --password secure123
```

### Step 3: Setup Subscription Plans
```bash
# Create default subscription plans
python manage.py setup_plans
```

### Step 4: Test Super Admin Login
```bash
# Start server
python manage.py runserver

# Test login
POST /api/auth/login/
{
  "username": "admin",
  "password": "secure123"
}
```

### Step 5: Create a Test Company
```bash
# Use super admin token
POST /api/companies/
{
  "name": "Test Company Inc",
  "slug": "test-company",
  "company_code": "TC001",
  "email": "contact@testcompany.com",
  "status": "active",
  "is_active": true
}
```

### Step 6: Create Subscription for Company
```bash
POST /api/subscriptions/
{
  "company": "<company_id>",
  "plan": "<plan_id>",
  "status": "active",
  "start_date": "2026-02-07T00:00:00Z",
  "end_date": "2027-02-07T00:00:00Z",
  "max_users": 10
}
```

### Step 7: Create Company Admin
```bash
POST /api/auth/register/
{
  "username": "companyadmin",
  "email": "admin@testcompany.com",
  "password": "secure123",
  "user_type": "COMPANY_ADMIN",
  "company": "<company_id>",
  "full_name": "Company Admin"
}
```

### Step 8: Login as Company Admin
```bash
POST /api/auth/login/
{
  "username": "companyadmin",
  "password": "secure123"
}
```

### Step 9: Create Company Users
```bash
# As company admin
POST /api/auth/register/
{
  "username": "user1",
  "email": "user1@testcompany.com",
  "password": "secure123",
  "user_type": "COMPANY_USER",
  "company": "<company_id>",
  "full_name": "User One"
}
```

### Step 10: Test Data Isolation
- Login as different company users
- Create spreadsheets
- Verify they can only see their company's data

---

## Key Features Implemented

### ✅ Multi-Tenancy
- Company-based data isolation
- Separate data for each tenant
- Automatic tenant filtering

### ✅ Subscription Management
- Flexible subscription plans
- Custom limits per company
- Expiry tracking and enforcement
- Subscription history

### ✅ User Limits
- Backend enforcement
- Subscription-based limits
- Cannot exceed max_users

### ✅ RBAC
- Role-based permissions
- Company-specific roles
- Global roles for super admins
- Permission assignment

### ✅ Audit Logs
- Track all important actions
- Company-specific logs
- IP address and user agent tracking
- Metadata support

### ✅ Middleware
- Tenant isolation
- Subscription validation
- Error handling
- Request logging

### ✅ Permission Classes
- Super admin checks
- Company admin checks
- Subscription validation
- User limit validation
- Object-level permissions

---

## Security Considerations

### 1. Data Isolation
- Every query filters by company
- Middleware adds tenant context
- Models auto-set company from user

### 2. Subscription Enforcement
- Middleware blocks expired subscriptions
- Cannot create users beyond limit
- Backend validation (not frontend only)

### 3. Role-Based Access
- Permission checking on every action
- Super admins have all permissions
- Company admins limited to their company

### 4. Audit Trail
- All actions logged
- IP address tracking
- Cannot be modified by users

---

## Testing Strategy

### 1. Unit Tests
- Test model methods (is_active, can_add_user)
- Test permission classes
- Test validators

### 2. Integration Tests
- Test company creation flow
- Test user creation with limits
- Test data isolation

### 3. API Tests
- Test all endpoints
- Test permission enforcement
- Test subscription validation

### 4. Load Tests
- Test with multiple companies
- Test with many users per company
- Test data isolation at scale

---

## Maintenance Tasks

### Daily
- Check subscription expiries
- Monitor user creation

### Weekly
- Review activity logs
- Check for suspended accounts

### Monthly
- Generate usage reports
- Review subscription renewals

---

## Troubleshooting

### Issue: User can't access system
**Check**:
1. Is user active? (`is_active=True`)
2. Is company active? (`company.is_active=True`)
3. Is subscription active? (`subscription.is_active()`)
4. Is subscription expired? (`subscription.end_date > now`)

### Issue: Can't create more users
**Check**:
1. Get current user count: `company.get_active_users_count()`
2. Get subscription limit: `subscription.get_max_users()`
3. Compare: `current_users < max_users`

### Issue: Users see data from other companies
**Check**:
1. Verify middleware is enabled
2. Check queryset filtering in views
3. Verify company field on models

---

## Next Steps (Frontend Integration)

Once backend is tested and working:

1. Create separate dashboards for:
   - Super Admin (company management, subscriptions)
   - Company Admin (user management, settings)
   - Company Users (product access)

2. Implement route guards based on:
   - Authentication status
   - User type
   - Subscription status

3. Display appropriate UI based on:
   - User permissions
   - Subscription features
   - User limits

---

## Support

For issues or questions:
1. Check activity logs: `/api/rbac/activity-logs/`
2. Check subscription status: `/api/subscriptions/{id}/`
3. Check company stats: `/api/companies/{id}/stats/`
4. Review this documentation

---

**System Status**: ✅ Backend Implementation Complete
**Ready for**: Testing & Frontend Integration
