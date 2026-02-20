# 3-LEVEL RBAC ARCHITECTURE - Frontend Implementation

## Overview

The Minitab frontend has been redesigned to support a complete **3-level Role-Based Access Control (RBAC)** system with multi-tenant architecture, subscription management, and strict data isolation.

## Architecture Levels

### LEVEL 1: SUPER ADMIN 🔐
**User Type:** `SUPER`

**Capabilities:**
- Create and manage companies
- Assign subscriptions to companies
- Configure user limits per subscription
- View system-wide statistics
- Suspend/activate companies
- Access all system data (no company isolation)

**Dashboard:** `/super-admin`
- Company list with status, subscription, and admin info
- Create company with admin user
- Assign subscription plans to companies
- Suspend/activate companies
- System-wide statistics

### LEVEL 2: COMPANY ADMIN 👨‍💼
**User Type:** `CHILD`

**Capabilities:**
- Create users within their company (respecting subscription limits)
- Assign roles to company users
- Manage company settings
- View company-specific audit logs
- Cannot see other companies' data

**Dashboard:** `/company-admin`
- User management with limit display (X/Y users)
- Role assignment interface
- Company statistics (users, spreadsheets, storage)
- User creation with subscription limit enforcement

**Key Features:**
- **User Limit Display:** Shows "5/10 users" with visual progress bar
- **Limit Enforcement:** Create button disabled when limit reached
- **Alert System:** 
  - Blue: < 75% capacity
  - Yellow: 75-90% capacity  
  - Red: 90-100% capacity

### LEVEL 3: COMPANY USER 👤
**User Type:** `COMPANY_USER`

**Capabilities:**
- Access product features based on assigned roles/permissions
- View/edit only their company's data
- Use spreadsheets, analysis, charts features
- Cannot create other users

**Dashboard:** `/dashboard`
- Quick action cards based on permissions
- Recent spreadsheets
- Recent analyses
- Profile information

## Key Files

### 1. Authentication Store (`store/authStore.ts`)

Extended with:
```typescript
export type UserType = 'SUPER' | 'CHILD' | 'COMPANY_USER'

interface User {
  user_type?: UserType
  company?: Company | null
  roles?: Role[]
  permissions?: Permission[]
}

// Helper methods
isSuperAdmin(): boolean
isCompanyAdmin(): boolean
isCompanyUser(): boolean
hasPermission(codename: string): boolean
hasRole(roleName: string): boolean
```

### 2. Role-Based Route Protection (`components/RoleProtectedRoute.tsx`)

**Components:**
- `RoleProtectedRoute` - Generic protection with role array
- `SuperAdminRoute` - Super admin only
- `CompanyAdminRoute` - Company admin only  
- `CompanyUserRoute` - Company user only
- `CompanyRoute` - Both admin and user

**Features:**
- Subscription status checking
- Company status validation
- Automatic redirects based on user type
- Beautiful error screens for:
  - No company assigned
  - Company suspended/inactive
  - Subscription expired

### 3. Dashboards

#### SuperAdminDashboard (`pages/SuperAdminDashboard.tsx`)
- **Stats Cards:** Total companies, active companies, users, subscriptions
- **Company Table:** Name, code, status, subscription, admin
- **Actions:** Create company, assign subscription, suspend/activate
- **Modals:**
  - CreateCompanyModal - Company + admin user creation
  - AssignSubscriptionModal - Plan assignment with limits

#### CompanyAdminDashboard (`pages/CompanyAdminDashboard.tsx`)  
- **User Limit Alert:** Visual progress bar with color coding
- **Stats Cards:** Total users, active users, spreadsheets, storage
- **User Table:** Name, email, roles, status, actions
- **Actions:** Create user (with limit check), edit roles, activate/deactivate
- **Modals:**
  - CreateUserModal - User creation with role assignment
  - EditUserModal - Role management

#### UserDashboard (`pages/UserDashboard.tsx`)
- **Quick Actions:** Permission-based action cards
- **Recent Items:** Spreadsheets, analyses (permission-based)
- **Profile Card:** User info, company, roles
- **Empty State:** Helpful getting started message

### 4. API Services

#### Companies API (`api/companies.ts`)
```typescript
listCompanies() - List all (Super Admin only)
getCompany(id)
createCompany(data) - Create with admin user
updateCompany(id, data)
assignSubscription(companyId, data)
getCompanyStats(companyId) - User limits, usage
suspendCompany(companyId)
activateCompany(companyId)
getMyCompany() - Current user's company
```

#### Users API (`api/users.ts`)
```typescript
listCompanyUsers() - Company-filtered list
getUser(id)
createUser(data) - With role assignment
updateUser(id, data)
assignRoles(userId, roleIds)
activateUser(id)
deactivateUser(id)
```

#### RBAC API (`api/rbac.ts`)
```typescript
getRoles() - With scope filtering
getRole(id)
createRole(data)
updateRole(id, data)
getPermissions(category?)
```

### 5. Routing (`App.tsx`)

**Smart Redirect:**
```typescript
function DashboardRedirect() {
  if (isSuperAdmin()) return <Navigate to="/super-admin" />
  if (isCompanyAdmin()) return <Navigate to="/company-admin" />
  if (isCompanyUser()) return <Navigate to="/dashboard" />
}
```

**Route Structure:**
- `/login`, `/register` - Public
- `/super-admin` - Super admin only
- `/company-admin` - Company admin only
- `/dashboard` - Company user
- `/spreadsheet/:id`, `/subscriptions` - Company members
- `/profile` - All authenticated

## Data Isolation

### Company-Level Isolation
1. **Backend Filtering:** All APIs filter by user's company
2. **Frontend Enforcement:** Only display company-specific data
3. **Route Protection:** Subscription status checked on every route

### Super Admin Bypass
- Super admins see all companies' data
- No subscription enforcement
- Full system access

## Subscription Enforcement

### Requirements
1. **Company Status:** Must be `active`
2. **Company Active Flag:** `is_active: true`
3. **Subscription Status:** Checked on every protected route

### Enforcement Points
1. **Route Level:** `RoleProtectedRoute` checks subscription
2. **User Creation:** Frontend shows limit, backend validates
3. **Feature Access:** Permission-based with subscription check

### User Limit Logic
```typescript
// Frontend Display
{stats.total_users} / {stats.user_limit}

// Frontend Validation
isUserLimitReached = stats.total_users >= stats.user_limit

// Backend Validation (on user creation)
- Check current user count
- Reject if at subscription limit
```

## Testing

### 1. Super Admin Flow
```bash
# Login as super admin
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"admin123"}'

# Navigate to /super-admin
# Create company "Acme Corp"
# Assign "Business Plan" subscription
```

### 2. Company Admin Flow  
```bash
# Login as company admin
# Navigate to /company-admin
# Create users (watch limit: X/10)
# Assign roles to users
# Try creating 11th user (should be blocked)
```

### 3. Company User Flow
```bash
# Login as company user
# Navigate to /dashboard
# Access features based on permissions
# Try accessing /company-admin (should redirect)
```

### 4. Subscription Expiry
```bash
# Super admin suspends company
# Company users see "Company Suspended" screen
# Cannot access any features
# Super admin activates - access restored
```

## Environment Setup

### Backend Required
```python
# User model must have:
- user_type: SUPER/CHILD/COMPANY_USER
- company: ForeignKey to Company
- created_by: ForeignKey to User (self)

# Company model must have:
- status: active/inactive/suspended/pending
- is_active: Boolean
- subscription: OneToOne to Subscription

# Subscription model must have:
- max_users: Integer
- status: active/expired/cancelled
- company: OneToOne to Company

# Role model must have:
- scope: global/company
- company: ForeignKey (nullable)
```

### Frontend Required
```bash
npm install react-router-dom zustand
```

## API Endpoints Expected

### Super Admin
- `POST /api/companies/` - Create company
- `GET /api/companies/` - List companies
- `POST /api/companies/{id}/assign-subscription/`
- `POST /api/companies/{id}/suspend/`
- `GET /api/subscriptions/plans/`

### Company Admin
- `GET /api/users/` - Company-filtered
- `POST /api/users/` - With limit check
- `GET /api/companies/{id}/stats/` - Usage stats
- `GET /api/rbac/roles/?scope=company`
- `POST /api/users/{id}/assign-roles/`

### Company User
- All product APIs filtered by company
- `GET /api/auth/profile/` - Returns user with company + roles

## Security Checklist

✅ **Authentication:** JWT with access/refresh tokens  
✅ **Authorization:** Role + permission checking  
✅ **Data Isolation:** Company-level filtering  
✅ **Subscription Enforcement:** Route + API level  
✅ **User Limits:** Frontend + backend validation  
✅ **Audit Logging:** All actions logged with user context  
✅ **Route Protection:** Role-based guards on all routes  
✅ **Error Handling:** Graceful subscription/company status errors  

## Common Issues & Solutions

### Issue: User can access other company's data
**Solution:** Ensure backend APIs filter by `request.user.company`

### Issue: User limit not enforced
**Solution:** 
1. Backend: Check subscription.max_users in user creation API
2. Frontend: Disable create button when at limit

### Issue: Super admin sees subscription errors
**Solution:** Set `requireSubscription={false}` in SuperAdminRoute

### Issue: Wrong dashboard after login
**Solution:** Check `DashboardRedirect` logic in App.tsx

### Issue: Company status not updating
**Solution:** Refresh user profile API call to get latest company data

## Future Enhancements

1. **Audit Log Viewer:** Company admins see their logs
2. **Usage Analytics:** Dashboard charts for usage trends
3. **Bulk User Import:** CSV upload for company admins
4. **Custom Roles:** Company admins create custom roles
5. **Subscription Upgrade:** Self-service plan upgrades
6. **Payment Integration:** Stripe/PayPal for renewals
7. **Email Notifications:** Limit warnings, expiry alerts
8. **API Rate Limiting:** Per-company rate limits

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        SUPER ADMIN                          │
│  - No company isolation                                     │
│  - Create companies                                         │
│  - Assign subscriptions                                     │
│  - System-wide access                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Creates & Manages
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      COMPANY (Tenant)                       │
│  - Isolated data space                                      │
│  - Has subscription with limits                             │
│  - Has one primary admin                                    │
│  - Status: active/inactive/suspended                        │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
          ┌──────────────┐    ┌──────────────┐
          │ COMPANY ADMIN│    │ COMPANY USER │
          │              │    │              │
          │ - Create users    │ - Use product │
          │ - Assign roles    │ - View data   │
          │ - See company data│ - Based on    │
          │ - User limit: 10  │   permissions │
          └──────────────┘    └──────────────┘
```

## Summary

This 3-level RBAC architecture provides:
- **Enterprise Multi-Tenancy:** Complete data isolation between companies
- **Flexible Permissions:** Role-based access control within companies
- **Subscription Management:** Plan limits enforced at all levels
- **User Management:** Company admins control their team
- **Scalability:** Add unlimited companies without interference
- **Security:** Strict access controls and subscription enforcement

The frontend seamlessly integrates with the backend's multi-tenant architecture, providing appropriate dashboards and access controls for each user level.
