# Minitab API - Complete Backend Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Models](#database-models)
3. [API Endpoints](#api-endpoints)
4. [Authentication & Authorization](#authentication--authorization)
5. [Request/Response Formats](#requestresponse-formats)
6. [Error Handling](#error-handling)
7. [Data Validation](#data-validation)
8. [Security Features](#security-features)
9. [Performance Optimization](#performance-optimization)

---

## Architecture Overview

This is a Django REST Framework (DRF) application implementing an Excel-like spreadsheet system with advanced features:

### Core Applications

- **authentication** - User management, JWT authentication, parent-child user relationships
- **spreadsheets** - Excel-like workbooks, worksheets, and cell operations
- **analysis** - Statistical analysis (summary stats, correlation, regression)
- **charts** - Data visualization (bar, line, pie, scatter, histogram)
- **rbac** - Role-Based Access Control with granular permissions and audit logging
- **companies** - Multi-tenant organization management with user/spreadsheet limits
- **subscriptions** - Billing and subscription plan management (FREE, BASIC, PROFESSIONAL, ENTERPRISE)

### Technology Stack

- **Framework:** Django 4.2+ with Django REST Framework
- **Database:** SQLite (development) / PostgreSQL (production)
- **Authentication:** JWT (Simple JWT)
- **API Style:** RESTful with JSON payloads
- **Python:** 3.9+

---

## Database Models

### Authentication App

#### User Model (Custom)
Extends Django's AbstractUser with additional fields:

```python
class User(AbstractUser):
    id = UUIDField(primary_key=True)
    email = EmailField(unique=True)
    full_name = CharField(max_length=255)
    user_type = CharField(choices=['SUPER', 'CHILD'])
    created_by = ForeignKey('self', null=True)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

**Features:**
- UUID primary keys for security
- Parent-child user hierarchy (SUPER users can create CHILD users)
- Email and username both can be used for login
- Soft-delete capability via is_active flag

---

### Spreadsheets App

#### Spreadsheet Model (Workbook)
The top-level container for worksheets:

```python
class Spreadsheet(models.Model):
    id = UUIDField(primary_key=True)
    user = ForeignKey(User)
    name = CharField(max_length=255)
    description = TextField(blank=True)
    row_count = IntegerField(default=100)
    column_count = IntegerField(default=26)
    is_favorite = BooleanField(default=False)
    is_deleted = BooleanField(default=False)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

**Constraints:**
- Max 100,000 rows × 1,000 columns
- User-isolated (cannot access other users' spreadsheets)
- Soft-delete for data recovery

#### Worksheet Model
Individual sheets within a spreadsheet:

```python
class Worksheet(models.Model):
    id = UUIDField(primary_key=True)
    spreadsheet = ForeignKey(Spreadsheet, on_delete=CASCADE)
    name = CharField(max_length=100)
    position = IntegerField()
    is_active = BooleanField(default=False)
    created_at = DateTimeField(auto_now_add=True)
```

**Features:**
- Ordered by position (1, 2, 3...)
- Only one worksheet can be active at a time
- Default "Sheet1" created with each spreadsheet
- Cannot delete last worksheet

#### Cell Model
Individual cell data storage:

```python
class Cell(models.Model):
    id = UUIDField(primary_key=True)
    worksheet = ForeignKey(Worksheet, on_delete=CASCADE)
    row_index = IntegerField()
    column_index = IntegerField()
    value = TextField(max_length=50000)
    formula = TextField(blank=True, null=True)
    data_type = CharField(choices=['text', 'number', 'date', 'formula'])
    style = JSONField(default=dict)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['worksheet', 'row_index', 'column_index']]
```

**Features:**
- Zero-indexed coordinates (row 0, column 0)
- Supports text, numbers, dates, and formulas
- JSON style field for formatting (color, font, alignment)
- Only non-empty cells are stored (sparse storage)

---

### Analysis App

#### Analysis Model
Stores statistical analysis results:

```python
class Analysis(models.Model):
    id = UUIDField(primary_key=True)
    user = ForeignKey(User)
    spreadsheet = ForeignKey(Spreadsheet)
    analysis_type = CharField(choices=['summary_stats', 'correlation', 'regression'])
    selected_columns = JSONField()
    parameters = JSONField(default=dict)
    results = JSONField()
    created_at = DateTimeField(auto_now_add=True)
```

**Analysis Types:**
- **summary_stats**: Mean, median, std dev, min, max, count, sum
- **correlation**: Pearson correlation matrix between columns
- **regression**: Linear regression (y = mx + b)

---

### Charts App

#### Chart Model
Visual representations of spreadsheet data:

```python
class Chart(models.Model):
    id = UUIDField(primary_key=True)
    user = ForeignKey(User)
    spreadsheet = ForeignKey(Spreadsheet)
    name = CharField(max_length=255)
    chart_type = CharField(choices=['bar', 'line', 'pie', 'scatter', 'histogram'])
    data_range = JSONField()
    chart_config = JSONField()
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

**Chart Types:**
- **bar**: Bar chart (categorical data)
- **line**: Line chart (time series, trends)
- **pie**: Pie chart (proportions)
- **scatter**: Scatter plot (correlation visualization)
- **histogram**: Distribution visualization

---

### RBAC App

#### Role Model
User roles for access control:

```python
class Role(models.Model):
    id = UUIDField(primary_key=True)
    name = CharField(max_length=100)
    description = TextField()
    is_active = BooleanField(default=True)
    created_by = ForeignKey(User)
    created_at = DateTimeField(auto_now_add=True)
```

#### Permission Model
Granular permissions:

```python
class Permission(models.Model):
    id = UUIDField(primary_key=True)
    name = CharField(max_length=100)
    codename = CharField(max_length=100, unique=True)
    description = TextField()
    category = CharField(choices=['spreadsheet', 'user', 'role', 'analysis', 'chart', 'system'])
```

**Permission Categories:**
- spreadsheet: create_spreadsheet, view_spreadsheet, edit_spreadsheet, delete_spreadsheet
- user: manage_users, view_users
- role: manage_roles, assign_roles
- analysis: perform_analysis, view_analysis
- chart: create_chart, view_chart
- system: system_admin, view_logs

#### UserRole Model
Many-to-many relationship between users and roles:

```python
class UserRole(models.Model):
    id = UUIDField(primary_key=True)
    user = ForeignKey(User)
    role = ForeignKey(Role)
    assigned_by = ForeignKey(User)
    assigned_at = DateTimeField(auto_now_add=True)
```

#### ActivityLog Model
Complete audit trail:

```python
class ActivityLog(models.Model):
    id = UUIDField(primary_key=True)
    user = ForeignKey(User)
    action_type = CharField(choices=['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT'])
    model_name = CharField(max_length=100)
    object_id = CharField(max_length=255)
    description = TextField()
    ip_address = GenericIPAddressField()
    user_agent = TextField()
    timestamp = DateTimeField(auto_now_add=True)
```

---

### Companies App

#### Company Model
Multi-tenant organization management:

```python
class Company(models.Model):
    id = UUIDField(primary_key=True)
    name = CharField(max_length=255, unique=True)
    slug = SlugField(unique=True)
    description = TextField(blank=True)
    logo = URLField(blank=True)
    website = URLField(blank=True)
    contact_email = EmailField()
    contact_phone = CharField(max_length=20, blank=True)
    address = CharField(max_length=255, blank=True)
    city = CharField(max_length=100, blank=True)
    state = CharField(max_length=100, blank=True)
    country = CharField(max_length=100, blank=True)
    postal_code = CharField(max_length=20, blank=True)
    is_active = BooleanField(default=True)
    max_users = PositiveIntegerField(default=10)
    max_spreadsheets = PositiveIntegerField(default=50)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

**Key Features:**
- Automatic slug generation from company name
- User and spreadsheet limits per company
- Soft delete support (is_active flag)
- Complete contact information storage
- Multi-region support with address fields

**Related Models:**
- Users belong to a Company
- Spreadsheets belong to a Company
- Subscriptions tied to Company

---

### Subscriptions App

#### Subscription Model
Billing and plan management:

```python
class Subscription(models.Model):
    id = UUIDField(primary_key=True)
    company = ForeignKey(Company, on_delete=models.CASCADE)
    plan = CharField(choices=['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE'])
    status = CharField(choices=['ACTIVE', 'EXPIRED', 'CANCELLED', 'TRIAL'])
    start_date = DateTimeField()
    end_date = DateTimeField()
    trial_end_date = DateTimeField(null=True, blank=True)
    max_users = PositiveIntegerField()
    max_spreadsheets = PositiveIntegerField()
    max_storage_gb = PositiveIntegerField()
    features = JSONField(default=dict)
    price = DecimalField(max_digits=10, decimal_places=2)
    currency = CharField(max_length=3, default='USD')
    billing_cycle = CharField(choices=['MONTHLY', 'YEARLY'])
    auto_renew = BooleanField(default=True)
    cancelled_at = DateTimeField(null=True, blank=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

**Plan Types:**
- **FREE**: Limited features, 3 users, 10 spreadsheets, 5GB storage
- **BASIC**: Basic features, 10 users, 50 spreadsheets, 25GB storage ($29/month)
- **PROFESSIONAL**: Advanced features, 50 users, 200 spreadsheets, 100GB storage ($99/month)
- **ENTERPRISE**: Full features, 100+ users, 500+ spreadsheets, 500GB+ storage ($299/month)

**Subscription Status:**
- **ACTIVE**: Currently active and valid
- **TRIAL**: In trial period
- **EXPIRED**: Subscription period ended
- **CANCELLED**: Manually cancelled by user/admin

**Features Structure (JSON):**
```json
{
    "advanced_analytics": true,
    "custom_charts": true,
    "api_access": true,
    "priority_support": true,
    "white_labeling": false,
    "dedicated_support": false
}
```

**Business Logic:**
- One active subscription per company
- Auto-renewal processed based on billing_cycle
- Trials automatically convert to paid plans
- Cancelled subscriptions maintain access until end_date
- Grace period handling for payment failures

---

## API Endpoints

### Authentication Endpoints

#### 1. Register User
**POST** `/api/auth/register/`

Register a new user account.

**Request Body:**
```json
{
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "first_name": "Test",
    "last_name": "User"
}
```

**Response (201 Created):**
```json
{
    "id": "uuid-here",
    "username": "testuser",
    "email": "testuser@example.com",
    "full_name": "Test User",
    "user_type": "SUPER",
    "is_active": true,
    "created_at": "2026-02-07T10:30:00Z"
}
```

#### 2. Login
**POST** `/api/auth/login/`

Authenticate and receive JWT tokens.

**Request Body (Username or Email):**
```json
{
    "username": "testuser",
    "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
        "id": "uuid",
        "username": "testuser",
        "email": "testuser@example.com",
        "full_name": "Test User",
        "user_type": "SUPER"
    }
}
```

**Token Validity:**
- Access Token: 60 minutes
- Refresh Token: 7 days

#### 3. Get User Profile
**GET** `/api/auth/profile/`

Get current authenticated user's profile.

**Headers:** `Authorization: Bearer <access_token>`

**Response (200 OK):**
```json
{
    "id": "uuid",
    "username": "testuser",
    "email": "testuser@example.com",
    "full_name": "Test User",
    "user_type": "SUPER",
    "is_active": true,
    "created_at": "2026-02-07T10:30:00Z"
}
```

#### 4. Logout
**POST** `/api/auth/logout/`

Logout and blacklist refresh token.

**Request Body:**
```json
{
    "refresh": "refresh-token-here"
}
```

**Response (200 OK):**
```json
{
    "detail": "Successfully logged out"
}
```

#### 5. Refresh Token
**POST** `/api/auth/token/refresh/`

Get new access token using refresh token.

**Request Body:**
```json
{
    "refresh": "refresh-token-here"
}
```

**Response (200 OK):**
```json
{
    "access": "new-access-token"
}
```

#### 6. List Child Users
**GET** `/api/auth/child-users/`

List all child users created by current SUPER user.

**Authentication:** SUPER user only

**Response (200 OK):**
```json
[
    {
        "id": "uuid",
        "username": "childuser1",
        "email": "child1@example.com",
        "full_name": "Child User One",
        "user_type": "CHILD",
        "is_active": true,
        "created_at": "2026-02-07T11:00:00Z"
    }
]
```

#### 7. Create Child User
**POST** `/api/auth/child-users/`

Create a child user account.

**Authentication:** SUPER user only

**Request Body:**
```json
{
    "username": "childuser1",
    "email": "child1@example.com",
    "password": "ChildPass123!",
    "password_confirm": "ChildPass123!",
    "full_name": "Child User One",
    "is_active": true
}
```

#### 8. Toggle User Status
**PATCH** `/api/auth/users/{id}/toggle/`

Enable or disable a user account.

**Authentication:** SUPER user only

**Request Body:**
```json
{
    "is_active": false
}
```

---

### Spreadsheet Endpoints

#### 9. List Spreadsheets
**GET** `/api/spreadsheets/`

List all spreadsheets owned by authenticated user.

**Query Parameters:**
- `?limit=50` - Results per page
- `?offset=0` - Pagination offset
- `?search=keyword` - Search by name/description

**Response (200 OK):**
```json
[
    {
        "id": "uuid",
        "name": "My Spreadsheet",
        "description": "Test spreadsheet",
        "row_count": 100,
        "column_count": 26,
        "is_favorite": false,
        "created_at": "2026-02-07T12:00:00Z",
        "updated_at": "2026-02-07T12:00:00Z"
    }
]
```

#### 10. Create Spreadsheet
**POST** `/api/spreadsheets/`

Create a new spreadsheet (workbook).

**Request Body:**
```json
{
    "name": "My Test Spreadsheet",
    "description": "Testing spreadsheet creation",
    "row_count": 100,
    "column_count": 26
}
```

**Response (201 Created):**
```json
{
    "id": "uuid",
    "name": "My Test Spreadsheet",
    "description": "Testing spreadsheet creation",
    "row_count": 100,
    "column_count": 26,
    "is_favorite": false,
    "worksheets": [
        {
            "id": "worksheet-uuid",
            "name": "Sheet1",
            "position": 1,
            "is_active": true
        }
    ],
    "created_at": "2026-02-07T12:00:00Z"
}
```

#### 11. Get Spreadsheet Details
**GET** `/api/spreadsheets/{id}/`

Get detailed information about a specific spreadsheet.

#### 12. Update Spreadsheet
**PUT** `/api/spreadsheets/{id}/`

Update spreadsheet details.

**Request Body:**
```json
{
    "name": "Updated Name",
    "description": "Updated description",
    "is_favorite": true
}
```

#### 13. Delete Spreadsheet
**DELETE** `/api/spreadsheets/{id}/`

Soft-delete a spreadsheet.

**Response:** 204 No Content

#### 14. Get Recent Spreadsheets
**GET** `/api/spreadsheets/recent/`

Get last 10 recently modified spreadsheets.

#### 15. Get Favorite Spreadsheets
**GET** `/api/spreadsheets/favorites/`

Get all spreadsheets marked as favorites.

#### 16-19. Worksheet Operations

- **GET** `/api/spreadsheets/{id}/worksheets/` - List worksheets
- **POST** `/api/spreadsheets/{id}/worksheets/` - Create worksheet
- **PUT** `/api/spreadsheets/worksheets/{id}/` - Update worksheet
- **DELETE** `/api/spreadsheets/worksheets/{id}/` - Delete worksheet

#### 20-23. Cell Operations

**20. Get Spreadsheet Cells**
**GET** `/api/spreadsheets/{id}/cells/`

Get all cells in a spreadsheet.

**21. Update Single Cell**
**POST** `/api/spreadsheets/{id}/update_cell/`

```json
{
    "worksheet_id": "uuid",
    "row_index": 0,
    "column_index": 0,
    "value": "Hello World",
    "data_type": "text"
}
```

**22. Bulk Update Cells**
**POST** `/api/spreadsheets/{id}/bulk_update/`

```json
{
    "cells": [
        {
            "worksheet_id": "uuid",
            "row_index": 0,
            "column_index": 0,
            "value": "Name",
            "data_type": "text"
        },
        {
            "worksheet_id": "uuid",
            "row_index": 0,
            "column_index": 1,
            "value": "Age",
            "data_type": "text"
        }
    ]
}
```

**23. Clear Cells**
**DELETE** `/api/spreadsheets/{id}/clear_cells/`

Clear all cells in spreadsheet or specific worksheet.

---

### Analysis Endpoints

#### 24. List Analyses
**GET** `/api/analysis/`

List all analyses performed by user.

#### 25. Summary Statistics
**POST** `/api/analysis/perform_analysis/`

Calculate descriptive statistics.

**Request Body:**
```json
{
    "spreadsheet_id": "uuid",
    "analysis_type": "summary_stats",
    "selected_columns": [0, 1, 2]
}
```

**Response:**
```json
{
    "id": "uuid",
    "analysis_type": "summary_stats",
    "selected_columns": [0, 1, 2],
    "results": {
        "column_0": {
            "mean": 50.5,
            "median": 50.0,
            "std": 15.23,
            "min": 10,
            "max": 100,
            "count": 50,
            "sum": 2525
        }
    },
    "created_at": "2026-02-07T14:00:00Z"
}
```

#### 26. Correlation Analysis
**POST** `/api/analysis/perform_analysis/`

Calculate correlation matrix.

**Request Body:**
```json
{
    "spreadsheet_id": "uuid",
    "analysis_type": "correlation",
    "selected_columns": [0, 1]
}
```

**Response:**
```json
{
    "results": {
        "correlation_matrix": [
            [1.0, 0.85],
            [0.85, 1.0]
        ],
        "column_pairs": [
            {
                "col1": 0,
                "col2": 1,
                "correlation": 0.85,
                "interpretation": "Strong positive correlation"
            }
        ]
    }
}
```

#### 27. Linear Regression
**POST** `/api/analysis/perform_analysis/`

Perform linear regression analysis.

**Request Body:**
```json
{
    "spreadsheet_id": "uuid",
    "analysis_type": "regression",
    "selected_columns": [0, 1],
    "parameters": {
        "x_column": 0,
        "y_column": 1
    }
}
```

**Response:**
```json
{
    "results": {
        "slope": 2.5,
        "intercept": 10.3,
        "r_squared": 0.89,
        "equation": "y = 2.5x + 10.3",
        "residuals": [0.5, -1.2, 0.8],
        "predictions": [12.8, 15.3, 17.8]
    }
}
```

#### 28-29. Analysis Management

- **GET** `/api/analysis/{id}/` - Get analysis details
- **DELETE** `/api/analysis/{id}/` - Delete analysis

---

### Charts Endpoints

#### 30. List Charts
**GET** `/api/charts/`

List all charts created by user.

#### 31. Create Chart
**POST** `/api/charts/`

Create a new chart.

**Request Body:**
```json
{
    "spreadsheet": "uuid",
    "name": "Sales Chart",
    "chart_type": "bar",
    "data_range": {
        "start_row": 0,
        "end_row": 10,
        "start_col": 0,
        "end_col": 2
    },
    "chart_config": {
        "title": "Monthly Sales",
        "x_axis": "Month",
        "y_axis": "Revenue",
        "colors": ["#FF6384", "#36A2EB"],
        "legend": true
    }
}
```

**Chart Types:** bar, line, pie, scatter, histogram

#### 32-34. Chart Management

- **GET** `/api/charts/{id}/` - Get chart details
- **PUT** `/api/charts/{id}/` - Update chart
- **DELETE** `/api/charts/{id}/` - Delete chart

---

### RBAC Endpoints

#### 35-39. Role Management

- **GET** `/api/rbac/roles/` - List roles
- **POST** `/api/rbac/roles/` - Create role
- **GET** `/api/rbac/roles/{id}/` - Get role details  
- **PUT** `/api/rbac/roles/{id}/` - Update role
- **DELETE** `/api/rbac/roles/{id}/` - Delete role

#### 40. List Permissions
**GET** `/api/rbac/permissions/`

List all available permissions.

**Response:**
```json
[
    {
        "id": "uuid",
        "name": "Create Spreadsheet",
        "codename": "create_spreadsheet",
        "description": "Can create new spreadsheets",
        "category": "spreadsheet"
    }
]
```

#### 41-43. User Role Management

- **GET** `/api/rbac/user-roles/` - List user role assignments
- **POST** `/api/rbac/user-roles/assign/` - Assign role to user
- **DELETE** `/api/rbac/user-roles/{id}/` - Remove role from user

#### 44. List Activity Logs
**GET** `/api/rbac/activity-logs/`

View audit trail of all user activities.

**Query Parameters:**
- `?limit=50` - Results per page
- `?user_id=uuid` - Filter by user
- `?action_type=CREATE` - Filter by action
- `?model_name=Spreadsheet` - Filter by model
- `?start_date=2026-02-01` - Date range start
- `?end_date=2026-02-28` - Date range end

**Response:**
```json
{
    "count": 150,
    "results": [
        {
            "id": "uuid",
            "user": {"username": "testuser"},
            "action_type": "CREATE",
            "model_name": "Spreadsheet",
            "object_id": "spreadsheet-uuid",
            "description": "Created spreadsheet: My Test Spreadsheet",
            "ip_address": "127.0.0.1",
            "user_agent": "Mozilla/5.0...",
            "timestamp": "2026-02-07T17:00:00Z"
        }
    ]
}
```

---

### Companies Endpoints

#### 45-49. Company Management

- **GET** `/api/companies/` - List companies
- **POST** `/api/companies/` - Create company (admin only)
- **GET** `/api/companies/{id}/` - Get company details
- **PUT** `/api/companies/{id}/` - Update company
- **DELETE** `/api/companies/{id}/` - Delete company (soft delete)

**Company Object:**
```json
{
    "id": "uuid",
    "name": "Acme Corporation",
    "slug": "acme-corporation",
    "description": "Leading software solutions provider",
    "logo": "https://example.com/logos/acme.png",
    "website": "https://acme.com",
    "contact_email": "contact@acme.com",
    "contact_phone": "+1234567890",
    "address": "123 Business Street",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "postal_code": "10001",
    "is_active": true,
    "max_users": 50,
    "max_spreadsheets": 100,
    "current_users": 12,
    "current_spreadsheets": 45,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-02-01T15:30:00Z"
}
```

**Query Parameters (List):**
- `?name=search` - Filter by company name
- `?is_active=true` - Filter by active status
- `?page=1&page_size=20` - Pagination

**Permissions:**
- Admins: See all companies
- Users: See only their own company

---

### Subscriptions Endpoints

#### 50-58. Subscription Management

- **GET** `/api/subscriptions/` - List subscriptions
- **POST` `/api/subscriptions/` - Create subscription (admin only)
- **GET** `/api/subscriptions/{id}/` - Get subscription details
- **GET** `/api/subscriptions/active/` - Get active subscription for current company
- **PUT** `/api/subscriptions/{id}/` - Update subscription
- **POST** `/api/subscriptions/{id}/cancel/` - Cancel subscription
- **POST** `/api/subscriptions/{id}/renew/` - Renew subscription
- **GET** `/api/subscriptions/{id}/status/` - Check subscription status
- **GET** `/api/subscriptions/plans/` - List available plans (public)

**Subscription Object:**
```json
{
    "id": "uuid",
    "company": {
        "id": "uuid",
        "name": "Tech Innovators Ltd"
    },
    "plan": "PROFESSIONAL",
    "status": "ACTIVE",
    "start_date": "2025-02-07T00:00:00Z",
    "end_date": "2025-03-07T00:00:00Z",
    "trial_end_date": null,
    "max_users": 50,
    "max_spreadsheets": 200,
    "max_storage_gb": 100,
    "features": {
        "advanced_analytics": true,
        "custom_charts": true,
        "api_access": true,
        "priority_support": true
    },
    "price": "99.00",
    "currency": "USD",
    "billing_cycle": "MONTHLY",
    "auto_renew": true,
    "created_at": "2025-02-07T10:00:00Z",
    "updated_at": "2025-02-07T10:00:00Z"
}
```

**Plan Types:**
- `FREE` - Free tier with limited features
- `BASIC` - Basic features for small teams ($29/month)
- `PROFESSIONAL` - Advanced features ($99/month)
- `ENTERPRISE` - Full features for large organizations ($299/month)

**Subscription Status:**
- `ACTIVE` - Subscription is active
- `TRIAL` - In trial period
- `EXPIRED` - Subscription has expired
- `CANCELLED` - Subscription was cancelled

**Billing Cycles:**
- `MONTHLY` - Billed monthly
- `YEARLY` - Billed annually (typically 15-20% discount)

**Query Parameters (List):**
- `?company=uuid` - Filter by company
- `?plan=PROFESSIONAL` - Filter by plan type
- `?status=ACTIVE` - Filter by status
- `?page=1&page_size=20` - Pagination

---

### Health Check Endpoints

#### 59. Health Check
**GET** `/health/`

Full system health check.

**Response (200 OK):**
```json
{
    "status": "healthy",
    "timestamp": "2026-02-07T18:00:00Z",
    "services": {
        "database": "healthy",
        "cache": "healthy",
        "disk_space": "healthy"
    },
    "version": "1.0.0"
}
```

#### 60. Readiness Check
**GET** `/health/ready/`

Check if application is ready to serve traffic.

#### 61. Liveness Check
**GET** `/health/live/`

Check if application is alive.

---

## Authentication & Authorization

### JWT Token Authentication

All protected endpoints require JWT authentication via the Authorization header:

```
Authorization: Bearer <access_token>
```

### Token Lifecycle

1. **Login** → Receive access + refresh tokens
2. **Use Access Token** → Include in Authorization header
3. **Token Expires** (60 min) → Use refresh token to get new access token
4. **Refresh Expires** (7 days) → Re-login required

### User Types

- **SUPER User**: Can create child users, full access to own data
- **CHILD User**: Created by SUPER user, restricted access

### Permission Levels

- **Public**: Health checks (no auth)
- **Authenticated**: All users (access own data)
- **SUPER Only**: Child user management
- **Role-Based**: RBAC-controlled operations

---

## Request/Response Formats

### Request Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
Accept: application/json
```

### Response Format

All responses return JSON with consistent structure:

**Success Response:**
```json
{
    "id": "uuid",
    "field1": "value1",
    "field2": "value2",
    "created_at": "2026-02-07T12:00:00Z"
}
```

**List Response:**
```json
{
    "count": 100,
    "next": "http://api.com/resource/?offset=50",
    "previous": null,
    "results": [...]
}
```

### Date/Time Format

All timestamps use ISO 8601 format:
```
2026-02-07T12:00:00Z
```

---

## Error Handling

### Error Response Format

```json
{
    "error": "Error category",
    "detail": "Detailed error message",
    "field_errors": {
        "field_name": ["Error message"]
    }
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation errors, invalid input |
| 401 | Unauthorized | Missing/invalid/expired token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Service down |

### Common Error Examples

**401 Unauthorized:**
```json
{
    "detail": "Authentication credentials were not provided."
}
```

**400 Validation Error:**
```json
{
    "username": ["A user with that username already exists."],
    "email": ["Enter a valid email address."]
}
```

**403 Forbidden:**
```json
{
    "detail": "You do not have permission to perform this action."
}
```

---

## Data Validation

### Input Validation Rules

#### User Registration
- **username**: 3-150 characters, alphanumeric and @/./+/-/_ only
- **email**: Valid email format, must be unique
- **password**: 
  - Minimum 8 characters
  - Must contain uppercase letter
  - Must contain lowercase letter
  - Must contain digit
  - Must contain special character
- **password_confirm**: Must match password

#### Spreadsheet Creation
- **name**: Required, max 255 characters
- **row_count**: Integer, 1-100,000 (default: 100)
- **column_count**: Integer, 1-1,000 (default: 26)
- **description**: Optional, max 1000 characters

#### Cell Updates
- **row_index**: Integer >= 0, < spreadsheet.row_count
- **column_index**: Integer >= 0, < spreadsheet.column_count
- **value**: Max 50,000 characters
- **data_type**: One of: text, number, date, formula
- **worksheet_id**: Must be valid UUID and belong to spreadsheet

#### Analysis Requests
- **spreadsheet_id**: Must be valid UUID and owned by user
- **analysis_type**: One of: summary_stats, correlation, regression
- **selected_columns**: Array of integers, at least 1 column
- **selected_columns**: All indices must be within spreadsheet bounds

#### Chart Creation
- **name**: Required, max 255 characters
- **chart_type**: One of: bar, line, pie, scatter, histogram
- **data_range**: Object with start_row, end_row, start_col, end_col
- **chart_config**: Optional JSON object with chart settings

---

## Security Features

### 1. Authentication Security

**JWT Tokens:**
- Signed with SECRET_KEY
- Short-lived access tokens (60 min)
- Refresh token rotation
- Token blacklisting on logout

**Password Security:**
- Hashed with PBKDF2-SHA256
- Strong password requirements
- Password confirmation on registration
- No password storage in plain text

### 2. Authorization

**User Isolation:**
- Users can only access their own data
- QuerySet filtering by user
- Object-level permissions

**Parent-Child Hierarchy:**
- SUPER users manage CHILD users
- CHILD users cannot access parent data
- Hierarchical permission inheritance

### 3. Input Validation

**SQL Injection Prevention:**
- ORM parameterized queries
- No raw SQL with user input
- Input sanitization

**XSS Prevention:**
- JSON response format
- HTML escaping on outputs
- Content-Type validation

**Path Traversal Prevention:**
- UUID-based resource identification
- No file path user inputs
- Validated file operations

### 4. Rate Limiting

**Recommended Configuration:**
```python
# In production, use rate limiting middleware
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    }
}
```

### 5. CORS Configuration

```python
# Production settings
CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
]
CORS_ALLOW_CREDENTIALS = True
```

### 6. HTTPS Enforcement

```python
# Production settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
```

### 7. Audit Logging

**All Important Actions Logged:**
- User authentication (login/logout)
- Resource creation/modification/deletion
- Permission changes
- Failed authentication attempts
- Suspicious activities

**Log Fields:**
- User ID and username
- Action type and timestamp
- Resource type and ID
- IP address and user agent
- Action description

---

## Performance Optimization

### 1. Database Optimization

**Indexing:**
```python
# Indexed fields for fast queries
- User: email (unique), username (unique)
- Spreadsheet: user + created_at, user + updated_at
- Cell: (worksheet, row_index, column_index) - unique together
- ActivityLog: user + timestamp, action_type + timestamp
```

**Query Optimization:**
- Select_related() for foreign keys
- Prefetch_related() for many-to-many
- Only()/Defer() for large fields
- Bulk operations for multiple records

**Example:**
```python
# Inefficient
spreadsheets = Spreadsheet.objects.all()
for s in spreadsheets:
    print(s.user.username)  # N+1 queries

# Optimized
spreadsheets = Spreadsheet.objects.select_related('user').all()
for s in spreadsheets:
    print(s.user.username)  # 1 query
```

### 2. Pagination

All list endpoints return paginated results:

```python
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.LimitOffsetPagination',
    'PAGE_SIZE': 50
}
```

**Usage:**
```
GET /api/spreadsheets/?limit=20&offset=40
```

### 3. Caching Strategy

**Recommended Caching:**
```python
# Cache user profile
@method_decorator(cache_page(60 * 15))  # 15 minutes
def get_profile(request):
    ...

# Cache permissions
@lru_cache(maxsize=128)
def get_user_permissions(user_id):
    ...
```

### 4. Bulk Operations

**Bulk Update Cells:**
- Single database transaction
- Batch INSERT/UPDATE operations
- Reduces database round-trips

```python
# Instead of 100 separate updates
for cell_data in cells:
    Cell.objects.create(**cell_data)

# Use bulk_create
Cell.objects.bulk_create([Cell(**data) for data in cells])
```

### 5. Lazy Loading

**Sparse Cell Storage:**
- Only non-empty cells stored
- Reduces storage and query time
- Cells loaded on-demand

### 6. Connection Pooling

**Production Database Configuration:**
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,  # Connection pooling
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}
```

---

## Development Tools

### Management Commands

#### Initialize RBAC System
```bash
python manage.py init_rbac
```
Creates default roles and permissions for the RBAC system.

#### Production Readiness Check
```bash
python manage.py check_production
```
Validates settings and configuration for production deployment.

#### Create Superuser
```bash
python manage.py createsuperuser
```

#### Database Migrations
```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migrations
python manage.py showmigrations
```

#### Run Development Server
```bash
python manage.py runserver
# Access at http://localhost:8000
```

#### Run Tests
```bash
# All tests
python manage.py test

# Specific app
python manage.py test apps.authentication

# With coverage
coverage run manage.py test
coverage report
```

#### Shell Access
```bash
# Django shell
python manage.py shell

# Django shell with IPython
python manage.py shell -i ipython
```

#### Database Shell
```bash
python manage.py dbshell
```

---

## API Testing

### Using Postman

1. **Import Collection:**
   - Import `Minitab_API.postman_collection.json`
   - Contains all 47 API endpoints

2. **Set Environment:**
   - Create environment: "Minitab Local"
   - Set BASE_URL: `http://localhost:8000`

3. **Test Flow:**
   - Register → Login (tokens auto-saved)
   - Create Spreadsheet (ID auto-saved)
   - Perform operations
   - View activity logs

**Complete Guide:** See `POSTMAN_TESTING_GUIDE.md`

### Using cURL

**Register User:**
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "first_name": "Test",
    "last_name": "User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "SecurePass123!"
  }'
```

**Create Spreadsheet:**
```bash
curl -X POST http://localhost:8000/api/spreadsheets/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Test Spreadsheet",
    "description": "Testing API",
    "row_count": 100,
    "column_count": 26
  }'
```

### Using Python Requests

```python
import requests

BASE_URL = "http://localhost:8000"

# Register
response = requests.post(f"{BASE_URL}/api/auth/register/", json={
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "password_confirm": "SecurePass123!",
    "first_name": "Test",
    "last_name": "User"
})
print(response.json())

# Login
response = requests.post(f"{BASE_URL}/api/auth/login/", json={
    "username": "testuser",
    "password": "SecurePass123!"
})
tokens = response.json()
access_token = tokens['access']

# Create Spreadsheet
headers = {"Authorization": f"Bearer {access_token}"}
response = requests.post(
    f"{BASE_URL}/api/spreadsheets/",
    headers=headers,
    json={
        "name": "Test Spreadsheet",
        "description": "Via Python",
        "row_count": 100,
        "column_count": 26
    }
)
spreadsheet = response.json()
print(f"Created: {spreadsheet['id']}")
```

---

## Deployment Guide

### Production Checklist

- [ ] Set `DEBUG = False`
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Use PostgreSQL database
- [ ] Set strong `SECRET_KEY`
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up static files serving
- [ ] Configure email backend
- [ ] Enable rate limiting
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy
- [ ] Run security checks

### Environment Variables

```bash
# Required
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-password

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput
RUN python manage.py migrate

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=minitab
      - POSTGRES_USER=minitab
      - POSTGRES_PASSWORD=secure_password

  web:
    build: .
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    depends_on:
      - db
    environment:
      - DATABASE_URL=postgresql://minitab:secure_password@db:5432/minitab

volumes:
  postgres_data:
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /static/ {
        alias /path/to/static/;
    }
    
    location /media/ {
        alias /path/to/media/;
    }
}
```

---

## Monitoring & Logging

### Log Files

```
logs/
├── django.log          # General application logs
├── error.log           # Error logs
├── access.log          # API access logs
└── security.log        # Security-related events
```

### Log Configuration

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/django.log',
            'maxBytes': 1024 * 1024 * 15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['file'],
        'level': 'INFO',
    },
}
```

### Health Monitoring

**Endpoints for Monitoring Tools:**
- `/health/` - Full health check
- `/health/ready/` - Readiness probe (Kubernetes)
- `/health/live/` - Liveness probe (Kubernetes)

**Recommended Tools:**
- **Sentry** - Error tracking
- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **ELK Stack** - Log aggregation

---

## Troubleshooting

### Common Issues

#### 1. Token Authentication Failed

**Error:** `401 Unauthorized - Authentication credentials were not provided`

**Solutions:**
- Check Authorization header: `Bearer <token>`
- Verify token is not expired (60 min for access token)
- Use refresh token to get new access token
- Re-login if refresh token expired

#### 2. Validation Errors

**Error:** `400 Bad Request - Validation error`

**Solutions:**
- Check required fields are present
- Verify data types match expected format
- Review validation rules in documentation
- Check for unique constraints (username, email)

#### 3. Permission Denied

**Error:** `403 Forbidden - You do not have permission`

**Solutions:**
- Verify user type (SUPER vs CHILD)
- Check role assignments
- Ensure user owns the resource
- Review RBAC permissions

#### 4. Resource Not Found

**Error:** `404 Not Found`

**Solutions:**
- Verify UUID is correct
- Check if resource was deleted
- Ensure resource belongs to authenticated user
- List resources first to get valid IDs

#### 5. Database Connection Error

**Error:** `OperationalError: unable to open database file`

**Solutions:**
- Check database file permissions
- Verify DATABASE_URL configuration
- Ensure migrations are applied
- Check disk space

---

## API Versioning

Current API version: **v1** (implicit)

Future versioning strategy:
```
/api/v1/spreadsheets/
/api/v2/spreadsheets/
```

Version will be included in URL path when breaking changes are introduced.

---

## Rate Limiting

**Recommended Limits:**
- Anonymous users: 100 requests/hour
- Authenticated users: 1000 requests/hour
- Bulk operations: 50 requests/hour

**Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1612345678
```

---

## Webhooks (Future Feature)

**Planned Events:**
- spreadsheet.created
- spreadsheet.updated
- spreadsheet.deleted
- analysis.completed
- chart.created

---

## Additional Resources

### Documentation Files

- **POSTMAN_TESTING_GUIDE.md** - Complete Postman testing guide with 47 API examples
- **DATABASE_SCHEMA.md** - Detailed database schema and relationships
- **QUICK_START.md** - Quick start guide for developers
- **DEPLOYMENT.md** - Production deployment guide
- **MULTI_TENANT_GUIDE.md** - Multi-tenancy implementation guide
- **IMPLEMENTATION_SUMMARY.md** - Feature implementation summary

### External Resources

- [Django REST Framework Documentation](https://www. django-rest-framework.org/)
- [Simple JWT Documentation](https://django-rest-framework-simplejwt.readthedocs.io/)
- [Django Documentation](https://docs.djangoproject.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## Support & Contact

For issues, questions, or contributions:
1. Check this documentation first
2. Review POSTMAN_TESTING_GUIDE.md for API testing
3. Consult TROUBLESHOOTING section above
4. Check Django server logs in `logs/` directory

---

## Changelog

### Version 1.0.0 (2026-02-07)
- Initial release
- 47 API endpoints implemented
- JWT authentication
- Multi-tenant support
- RBAC system
- Statistical analysis
- Chart visualization
- Complete audit logging

---

**Last Updated:** February 7, 2026  
**API Version:** 1.0.0  
**Django Version:** 4.2+  
**Python Version:** 3.9+
