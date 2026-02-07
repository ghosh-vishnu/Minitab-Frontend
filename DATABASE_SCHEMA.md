# Database Schema Diagram

## Entity Relationship Overview

```
┌─────────────────────┐
│   SUPER ADMIN       │
│  (Your Company)     │
│                     │
│  - Manages all      │
│  - No company link  │
└──────────┬──────────┘
           │
           │ creates & manages
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│                        COMPANY                          │
│─────────────────────────────────────────────────────────│
│ • id (UUID, PK)                                         │
│ • name, slug, company_code                              │
│ • email, phone, website                                 │
│ • address fields                                        │
│ • status (active/inactive/suspended/pending)            │
│ • primary_admin (FK → User)                             │
│ • created_by (FK → User - Super Admin)                  │
└────────────┬────────────────────────────┬───────────────┘
             │                            │
             │ has ONE                    │ has MANY
             │                            │
             ▼                            ▼
┌─────────────────────────┐    ┌──────────────────────┐
│     SUBSCRIPTION        │    │       USERS          │
│─────────────────────────│    │──────────────────────│
│ • id (UUID, PK)         │    │ • id (UUID, PK)      │
│ • company (1:1)         │    │ • username, email    │
│ • plan (FK)             │    │ • user_type:         │
│ • status                │    │   - COMPANY_ADMIN    │
│ • start_date            │    │   - COMPANY_USER     │
│ • end_date              │    │ • company (FK)       │
│ • max_users (limit)     │    │ • created_by (FK)    │
│ • max_spreadsheets      │    └──────────┬───────────┘
│ • max_storage_mb        │               │
└────────┬────────────────┘               │ creates
         │                                 │
         │ references                      ▼
         │                    ┌────────────────────────┐
         ▼                    │     SPREADSHEETS       │
┌──────────────────────┐     │────────────────────────│
│  SUBSCRIPTION PLAN   │     │ • id (UUID, PK)        │
│──────────────────────│     │ • user (FK → User)     │
│ • id (UUID, PK)      │     │ • company (FK)         │
│ • name, description  │     │ • name                 │
│ • max_users          │     │ • worksheets (1:M)     │
│ • max_spreadsheets   │     │ • created_at           │
│ • max_storage_mb     │     └────────────────────────┘
│ • price, currency    │
│ • features (JSON)    │
└──────────────────────┘
```

---

## Detailed Relationships

### 1. Company → Subscription (One-to-One)
```
Company
  └─┬─ has ONE active Subscription
    └── Subscription.company (OneToOneField)
```

**Business Rule:**
- Each company has exactly ONE subscription
- Subscription defines max_users, max_spreadsheets, max_storage_mb
- If subscription expires, all company users are blocked

---

### 2. Company → Users (One-to-Many)
```
Company
  └─┬─ has MANY Users
    ├── Company Admin (user_type = COMPANY_ADMIN)
    └── Company Users (user_type = COMPANY_USER)
```

**Business Rules:**
- Company admin manages users within their company
- Cannot create more users than subscription.max_users
- All users inherit company context

---

### 3. Company → Spreadsheets (One-to-Many via Users)
```
Company
  └─┬─ has MANY Spreadsheets
    └── Spreadsheet.company (ForeignKey, auto-set from user.company)
```

**Business Rule:**
- All spreadsheets are company-scoped
- Users can only see their company's spreadsheets
- Data isolation enforced at query level

---

### 4. User → Roles (Many-to-Many)
```
User
  └─┬─ has MANY Roles
    └── UserRole (junction table)
         ├── user (FK)
         ├── role (FK)
         └── assigned_by (FK)

Role
  ├── scope: 'global' (for super admins)
  └── scope: 'company' (for company users)
      └── company (FK, nullable)
```

**Business Rules:**
- Global roles: No company link, system-wide permissions
- Company roles: Scoped to specific company
- Role names must be unique within a company

---

### 5. Activity Logs (Audit Trail)
```
ActivityLog
  ├── user (FK → User)
  ├── company (FK → Company)  ← NEW for tenant isolation
  ├── action_type
  ├── model_name, object_id
  └── metadata (JSON)
```

**Business Rule:**
- All actions are logged with company context
- Company admins see only their company's logs
- Super admins see all logs

---

## Key Indexes

### Performance Optimization

```sql
-- User queries
CREATE INDEX idx_user_company_active ON users(company_id, is_active);
CREATE INDEX idx_user_type_active ON users(user_type, is_active);

-- Company queries
CREATE INDEX idx_company_status_created ON companies(status, created_at DESC);
CREATE INDEX idx_company_active ON companies(is_active, created_at DESC);

-- Subscription queries
CREATE INDEX idx_subscription_status_dates ON subscriptions(status, start_date, end_date);
CREATE INDEX idx_subscription_company ON subscriptions(company_id);

-- Spreadsheet queries (tenant isolation)
CREATE INDEX idx_spreadsheet_company_updated ON spreadsheets(company_id, updated_at DESC);
CREATE INDEX idx_spreadsheet_company_user ON spreadsheets(company_id, user_id, updated_at DESC);

-- Activity logs (audit trail)
CREATE INDEX idx_log_user_company_date ON activity_logs(user_id, company_id, created_at DESC);
CREATE INDEX idx_log_company_date ON activity_logs(company_id, created_at DESC);

-- Role queries
CREATE INDEX idx_role_scope_company ON roles(scope, company_id);
CREATE INDEX idx_role_company_active ON roles(company_id, is_active);
```

---

## Data Flow

### User Creation Flow

```
1. Super Admin creates Company
   ↓
2. Super Admin creates Subscription for Company
   ↓
3. Super Admin creates Company Admin
   ↓
4. Company Admin logs in
   ↓
5. Company Admin creates Company Users
   ↓
6. System validates:
   - Is subscription active?
   - Is user count < max_users?
   ↓
7. User created with company context
   ↓
8. ActivityLog records the action
```

### Spreadsheet Creation Flow

```
1. Company User logs in
   ↓
2. Middleware sets request.tenant = user.company
   ↓
3. User creates Spreadsheet
   ↓
4. Model auto-sets spreadsheet.company = user.company
   ↓
5. Spreadsheet saved with company context
   ↓
6. ActivityLog records the action
```

### Data Access Flow

```
1. Company User requests spreadsheets list
   ↓
2. Middleware sets request.tenant
   ↓
3. View filters queryset:
   - If super_admin: show ALL
   - Else: filter by company = request.tenant
   ↓
4. Only company's data returned
```

---

## Constraints & Validations

### Database Constraints

```sql
-- User constraints
ALTER TABLE users ADD CONSTRAINT check_super_admin_no_company
    CHECK (user_type != 'SUPER_ADMIN' OR company_id IS NULL);

ALTER TABLE users ADD CONSTRAINT check_company_user_has_company
    CHECK (user_type = 'SUPER_ADMIN' OR company_id IS NOT NULL);

-- Company constraints
ALTER TABLE companies ADD CONSTRAINT unique_company_code
    UNIQUE (company_code);

ALTER TABLE companies ADD CONSTRAINT unique_company_email
    UNIQUE (email);

-- Subscription constraints
ALTER TABLE subscriptions ADD CONSTRAINT one_subscription_per_company
    UNIQUE (company_id);

ALTER TABLE subscriptions ADD CONSTRAINT check_end_date_after_start
    CHECK (end_date > start_date);

-- Role constraints
ALTER TABLE roles ADD CONSTRAINT unique_role_per_company
    UNIQUE (name, company_id);
```

### Application-Level Validations

```python
# User creation validation
def validate_user_creation(company_id, user_type):
    if user_type in ['COMPANY_ADMIN', 'COMPANY_USER']:
        company = Company.objects.get(id=company_id)
        
        # Check subscription is active
        if not company.is_subscription_active():
            raise ValidationError("Subscription inactive")
        
        # Check user limit
        if not company.can_add_user():
            raise ValidationError("User limit exceeded")
    
    return True
```

---

## Storage Considerations

### Data Retention

```
Companies:          Retain forever (soft delete)
Users:              Retain forever (soft delete with is_active flag)
Subscriptions:      Retain forever (for billing history)
Spreadsheets:       Retain based on company subscription
Activity Logs:      Retain 2 years (compliance)
```

### Backup Strategy

```
DATABASE BACKUPS:
- Full backup:   Daily at 2 AM UTC
- Incremental:   Every 6 hours
- Retention:     30 days

COMPANY DATA:
- Per-tenant backups available
- Point-in-time recovery
- Deleted data recovery window: 30 days
```

---

## Scaling Considerations

### Horizontal Scaling

```
When companies > 1000:
- Consider database sharding by company_id
- Partition logs table by created_at (monthly)
- Implement read replicas for reporting

When users > 10,000:
- Cache user permissions in Redis
- Implement connection pooling
- Use database query optimization
```

### Query Optimization

```sql
-- Instead of:
SELECT * FROM spreadsheets WHERE user_id = ?;

-- Use:
SELECT * FROM spreadsheets 
WHERE company_id = ? AND user_id = ?;
-- (Compound index: company_id + user_id)

-- For activity logs:
SELECT * FROM activity_logs 
WHERE company_id = ? 
AND created_at >= ?
ORDER BY created_at DESC
LIMIT 100;
-- (Index: company_id + created_at DESC)
```

---

## Migration Path

### From Existing Database to Multi-Tenant

```sql
-- Step 1: Add company field to existing tables
ALTER TABLE spreadsheets ADD COLUMN company_id UUID NULL;
ALTER TABLE activity_logs ADD COLUMN company_id UUID NULL;

-- Step 2: Create default company for existing data
INSERT INTO companies (id, name, company_code, email, status)
VALUES (uuid_generate_v4(), 'Legacy Company', 'LEG001', 'legacy@company.com', 'active');

-- Step 3: Migrate existing users to default company
UPDATE users SET company_id = (SELECT id FROM companies WHERE company_code = 'LEG001')
WHERE user_type != 'SUPER_ADMIN';

-- Step 4: Migrate existing spreadsheets
UPDATE spreadsheets s
SET company_id = (SELECT company_id FROM users WHERE id = s.user_id);

-- Step 5: Make fields NOT NULL after migration
ALTER TABLE spreadsheets ALTER COLUMN company_id SET NOT NULL;
```

---

## Summary

### Tables Created
1. ✅ companies (Company management)
2. ✅ subscription_plans (Plan definitions)
3. ✅ subscriptions (Company subscriptions)
4. ✅ subscription_history (Audit trail)
5. ✅ users (Extended with company field)
6. ✅ roles (Extended with company scope)
7. ✅ activity_logs (Extended with company field)
8. ✅ spreadsheets (Extended with company field)

### Relationships Implemented
- ✅ Company ↔ Subscription (1:1)
- ✅ Company → Users (1:M)
- ✅ Company → Spreadsheets (1:M)
- ✅ Company → Roles (1:M)
- ✅ Company → ActivityLogs (1:M)
- ✅ Subscription → SubscriptionPlan (M:1)
- ✅ User → Roles (M:M through UserRole)

### Constraints Enforced
- ✅ Super admins have no company
- ✅ Company users must have company
- ✅ One subscription per company
- ✅ Role names unique per company
- ✅ User limits enforced
- ✅ Subscription expiry validated

---

**Database Schema Status**: ✅ Complete and Production-Ready
