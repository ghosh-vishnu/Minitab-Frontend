# Minitab API - Postman Testing Guide

This guide covers only the APIs included in the current Postman collection (used by the frontend).

## Table of Contents
1. [Setup Instructions](#setup-instructions)
2. [Environment Configuration](#environment-configuration)
3. [Authentication APIs](#authentication-apis)
4. [Spreadsheet APIs](#spreadsheet-apis)
5. [Analysis APIs](#analysis-apis)
6. [RBAC APIs](#rbac-apis)
7. [Companies APIs](#companies-apis)
8. [Subscriptions APIs](#subscriptions-apis)
9. [Health Check APIs](#health-check-apis)

---

## Setup Instructions

### Step 1: Import Postman Collection
1. Open Postman
2. Click on **Import** button (top left)
3. Select **File** tab
4. Choose `Minitab_API.postman_collection.json` from the **Minitab_Frontend** folder
5. Click **Import**

### Step 2: Create Environment
1. Click on **Environments** (left sidebar)
2. Click **Create Environment** or **+** button
3. Name it: `Minitab Local`
4. Add the following variables:

| Variable Name | Initial Value | Current Value |
|--------------|---------------|---------------|
| BASE_URL | http://localhost:8000 | http://localhost:8000 |
| ACCESS_TOKEN | (leave empty) | (leave empty) |
| REFRESH_TOKEN | (leave empty) | (leave empty) |
| SPREADSHEET_ID | (leave empty) | (leave empty) |
| WORKSHEET_ID | (leave empty) | (leave empty) |
| USER_ID | (leave empty) | (leave empty) |
| ROLE_ID | (leave empty) | (leave empty) |
| ANALYSIS_ID | (leave empty) | (leave empty) |
| USER_ROLE_ID | (leave empty) | (leave empty) |
| COMPANY_ID | (leave empty) | (leave empty) |
| SUBSCRIPTION_ID | (leave empty) | (leave empty) |

5. Click **Save**
6. Select this environment from the environment dropdown (top right)

### Step 3: Start Backend Server
```bash
cd backend
python manage.py runserver
```

---

## Environment Configuration

The collection automatically saves tokens and IDs to environment variables:
- **Login** → Saves ACCESS_TOKEN and REFRESH_TOKEN
- **Create Spreadsheet** → Saves SPREADSHEET_ID
- **Create Worksheet** → Saves WORKSHEET_ID
- **Create Company** → Saves COMPANY_ID
- **Create Subscription** → Saves SUBSCRIPTION_ID
- **Refresh Token** → Updates ACCESS_TOKEN

---

## Authentication APIs

### 1. Register User

**Endpoint:** `POST /api/auth/register/`

**Description:** Create a new user account

**Authentication:** None required

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

**Testing Steps:**
1. Open "Authentication" → "Register User"
2. Modify the request body with your desired user details
3. Click **Send**
4. Verify response status: `201 Created`

**Expected Response:**
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

**Validation Rules:**
- Username: 3-150 characters, alphanumeric and @/./+/-/_ only
- Email: Valid email format
- Password: Min 8 characters, must contain uppercase, lowercase, digit, and special character
- Passwords must match

**Error Responses:**
- `400 Bad Request`: Validation errors
  ```json
  {
      "username": ["A user with that username already exists."],
      "email": ["user with this email already exists."]
  }
  ```

---

### 2. Login

**Endpoint:** `POST /api/auth/login/`

**Description:** Authenticate user and receive JWT tokens

**Authentication:** None required

**Request Body (Username):**
```json
{
    "username": "testuser",
    "password": "SecurePass123!"
}
```

**OR Request Body (Email):**
```json
{
    "email": "testuser@example.com",
    "password": "SecurePass123!"
}
```

**Testing Steps:**
1. Open "Authentication" → "Login"
2. Enter your credentials (username/email and password)
3. Click **Send**
4. Verify response status: `200 OK`
5. **ACCESS_TOKEN** and **REFRESH_TOKEN** are automatically saved to environment

**Expected Response:**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
        "id": "uuid-here",
        "username": "testuser",
        "email": "testuser@example.com",
        "full_name": "Test User",
        "user_type": "SUPER"
    }
}
```

**Token Usage:**
- Access Token: Valid for 60 minutes
- Refresh Token: Valid for 7 days
- Access token is automatically used in subsequent requests

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
  ```json
  {
      "detail": "No active account found with the given credentials"
  }
  ```

---

### 3. Get User Profile

**Endpoint:** `GET /api/auth/profile/`

**Description:** Retrieve current authenticated user's profile

**Authentication:** Bearer Token required

**Headers:**
```
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Testing Steps:**
1. First, login to get ACCESS_TOKEN
2. Open "Authentication" → "Get User Profile"
3. Click **Send**
4. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "id": "uuid-here",
    "username": "testuser",
    "email": "testuser@example.com",
    "full_name": "Test User",
    "user_type": "SUPER",
    "is_active": true,
    "created_by": null,
    "created_at": "2026-02-07T10:30:00Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
  ```json
  {
      "detail": "Authentication credentials were not provided."
  }
  ```

---

### 4. Logout

**Endpoint:** `POST /api/auth/logout/`

**Description:** Logout user and blacklist refresh token

**Authentication:** Bearer Token required

**Request Body:**
```json
{
    "refresh": "{{REFRESH_TOKEN}}"
}
```

**Testing Steps:**
1. Open "Authentication" → "Logout"
2. Ensure REFRESH_TOKEN is set in environment
3. Click **Send**
4. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "detail": "Successfully logged out"
}
```

**Note:** After logout, both access and refresh tokens become invalid

---

### 5. Refresh Token

**Endpoint:** `POST /api/auth/token/refresh/`

**Description:** Get a new access token using refresh token

**Authentication:** None required (uses refresh token)

**Request Body:**
```json
{
    "refresh": "{{REFRESH_TOKEN}}"
}
```

**Testing Steps:**
1. Open "Authentication" → "Refresh Token"
2. Click **Send**
3. New ACCESS_TOKEN is automatically saved
4. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Use Case:** When access token expires (after 60 minutes), use this to get a new one

---

## Spreadsheet APIs

### 9. List Spreadsheets

**Endpoint:** `GET /api/spreadsheets/`

**Description:** List all spreadsheets owned by the authenticated user

**Authentication:** Bearer Token required

**Headers:**
```
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Testing Steps:**
1. Login to get ACCESS_TOKEN
2. Open "Spreadsheets" → "List Spreadsheets"
3. Click **Send**
4. Verify response status: `200 OK`

**Expected Response:**
```json
[
    {
        "id": "uuid-here",
        "name": "My Test Spreadsheet",
        "description": "Testing spreadsheet creation",
        "row_count": 100,
        "column_count": 26,
        "is_favorite": false,
        "created_at": "2026-02-07T12:00:00Z",
        "updated_at": "2026-02-07T12:00:00Z"
    }
]
```

**Query Parameters (Optional):**
- `?limit=50` - Limit number of results
- `?offset=0` - Pagination offset
- `?search=keyword` - Search by name or description

---

### 10. Create Spreadsheet

**Endpoint:** `POST /api/spreadsheets/`

**Description:** Create a new spreadsheet (workbook)

**Authentication:** Bearer Token required

**Request Body:**
```json
{
    "name": "My Test Spreadsheet",
    "description": "Testing spreadsheet creation",
    "row_count": 100,
    "column_count": 26
}
```

**Testing Steps:**
1. Open "Spreadsheets" → "Create Spreadsheet"
2. Modify name, description, row_count, column_count
3. Click **Send**
4. SPREADSHEET_ID is automatically saved to environment
5. Verify response status: `201 Created`

**Expected Response:**
```json
{
    "id": "uuid-here",
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
    "created_at": "2026-02-07T12:00:00Z",
    "updated_at": "2026-02-07T12:00:00Z"
}
```

**Validation Rules:**
- name: Required, max 255 characters
- row_count: Default 100, max 100,000
- column_count: Default 26, max 1,000
- A default worksheet "Sheet1" is automatically created

---

### 11. Get Spreadsheet Details

**Endpoint:** `GET /api/spreadsheets/{id}/`

**Description:** Get detailed information about a specific spreadsheet

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: Spreadsheet ID (use {{SPREADSHEET_ID}})

**Testing Steps:**
1. First, create a spreadsheet or get ID from list
2. Open "Spreadsheets" → "Get Spreadsheet Details"
3. Ensure {{SPREADSHEET_ID}} is set
4. Click **Send**
5. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "id": "uuid-here",
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
    "cell_count": 150,
    "created_at": "2026-02-07T12:00:00Z",
    "updated_at": "2026-02-07T12:00:00Z"
}
```

---

### 12. Update Spreadsheet

**Endpoint:** `PUT /api/spreadsheets/{id}/`

**Description:** Update spreadsheet details (name, description, favorite status)

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: Spreadsheet ID (use {{SPREADSHEET_ID}})

**Request Body:**
```json
{
    "name": "Updated Spreadsheet Name",
    "description": "Updated description",
    "is_favorite": true
}
```

**Testing Steps:**
1. Open "Spreadsheets" → "Update Spreadsheet"
2. Modify the fields you want to update
3. Click **Send**
4. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "id": "uuid-here",
    "name": "Updated Spreadsheet Name",
    "description": "Updated description",
    "row_count": 100,
    "column_count": 26,
    "is_favorite": true,
    "updated_at": "2026-02-07T12:30:00Z"
}
```

**Notes:**
- Can partially update (send only fields to update)
- row_count and column_count cannot be changed after creation

---

### 13. Delete Spreadsheet

**Endpoint:** `DELETE /api/spreadsheets/{id}/`

**Description:** Delete a spreadsheet (soft delete)

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: Spreadsheet ID (use {{SPREADSHEET_ID}})

**Testing Steps:**
1. Open "Spreadsheets" → "Delete Spreadsheet"
2. Ensure {{SPREADSHEET_ID}} is set
3. Click **Send**
4. Verify response status: `204 No Content`

**Expected Response:** Empty (No content)

**Notes:**
- Spreadsheet is soft-deleted (marked as deleted, not removed from database)
- All associated worksheets and cells are also deleted
- Deleted spreadsheets can be restored by admin if needed

---

### 14. Get Recent Spreadsheets

**Endpoint:** `GET /api/spreadsheets/recent/`

**Description:** Get recently accessed/modified spreadsheets

**Authentication:** Bearer Token required

**Testing Steps:**
1. Open "Spreadsheets" → "Get Recent Spreadsheets"
2. Click **Send**
3. Verify response status: `200 OK`

**Expected Response:**
```json
[
    {
        "id": "uuid-here",
        "name": "Recent Spreadsheet",
        "description": "Last modified",
        "updated_at": "2026-02-07T14:00:00Z"
    }
]
```

**Notes:**
- Returns last 10 spreadsheets ordered by updated_at (newest first)
- Useful for "Recent Files" feature

---

### 15. Get Favorite Spreadsheets

**Endpoint:** `GET /api/spreadsheets/favorites/`

**Description:** Get all spreadsheets marked as favorites

**Authentication:** Bearer Token required

**Testing Steps:**
1. First, mark some spreadsheets as favorite (is_favorite: true)
2. Open "Spreadsheets" → "Get Favorite Spreadsheets"
3. Click **Send**
4. Verify response status: `200 OK`

**Expected Response:**
```json
[
    {
        "id": "uuid-here",
        "name": "Favorite Spreadsheet",
        "is_favorite": true,
        "created_at": "2026-02-07T12:00:00Z"
    }
]
```

---

### 16. List Worksheets

**Endpoint:** `GET /api/spreadsheets/{id}/worksheets/`

**Description:** List all worksheets in a spreadsheet

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: Spreadsheet ID (use {{SPREADSHEET_ID}})

**Testing Steps:**
1. Open "Spreadsheets" → "List Worksheets"
2. Ensure {{SPREADSHEET_ID}} is set
3. Click **Send**
4. Verify response status: `200 OK`

**Expected Response:**
```json
[
    {
        "id": "worksheet-uuid-1",
        "name": "Sheet1",
        "position": 1,
        "is_active": true,
        "created_at": "2026-02-07T12:00:00Z"
    },
    {
        "id": "worksheet-uuid-2",
        "name": "Sheet2",
        "position": 2,
        "is_active": false,
        "created_at": "2026-02-07T12:10:00Z"
    }
]
```

**Notes:**
- Worksheets are ordered by position
- is_active indicates the currently active/visible sheet

---

### 17. Create Worksheet

**Endpoint:** `POST /api/spreadsheets/{id}/worksheets/`

**Description:** Add a new worksheet to a spreadsheet

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: Spreadsheet ID (use {{SPREADSHEET_ID}})

**Request Body:**
```json
{
    "name": "Sheet2",
    "position": 2,
    "is_active": false
}
```

**Testing Steps:**
1. Open "Spreadsheets" → "Create Worksheet"
2. Modify name and position
3. Click **Send**
4. WORKSHEET_ID is automatically saved to environment
5. Verify response status: `201 Created`

**Expected Response:**
```json
{
    "id": "worksheet-uuid",
    "spreadsheet": "spreadsheet-uuid",
    "name": "Sheet2",
    "position": 2,
    "is_active": false,
    "created_at": "2026-02-07T12:10:00Z"
}
```

**Validation Rules:**
- name: Required, unique within spreadsheet
- position: Auto-incremented if not provided
- Only one worksheet can be active at a time

---

### 18. Update Worksheet

**Endpoint:** `PUT /api/spreadsheets/worksheets/{id}/`

**Description:** Update worksheet properties

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: Worksheet ID (use {{WORKSHEET_ID}})

**Request Body:**
```json
{
    "name": "Updated Sheet Name",
    "is_active": true
}
```

**Testing Steps:**
1. Open "Spreadsheets" → "Update Worksheet"
2. Ensure {{WORKSHEET_ID}} is set
3. Modify fields
4. Click **Send**
5. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "id": "worksheet-uuid",
    "name": "Updated Sheet Name",
    "position": 2,
    "is_active": true,
    "updated_at": "2026-02-07T12:30:00Z"
}
```

**Notes:**
- Setting is_active=true will set all other worksheets to is_active=false
- Cannot rename to an existing worksheet name

---

### 19. Delete Worksheet

**Endpoint:** `DELETE /api/spreadsheets/worksheets/{id}/`

**Description:** Delete a worksheet

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: Worksheet ID (use {{WORKSHEET_ID}})

**Testing Steps:**
1. Open "Spreadsheets" → "Delete Worksheet"
2. Ensure {{WORKSHEET_ID}} is set
3. Click **Send**
4. Verify response status: `204 No Content`

**Expected Response:** Empty

**Notes:**
- Cannot delete the last worksheet in a spreadsheet
- All cells in the worksheet are also deleted
- Positions of remaining worksheets are automatically adjusted

---

### 20. Get Spreadsheet Cells

**Endpoint:** `GET /api/spreadsheets/{id}/cells/`

**Description:** Get all cells data for a spreadsheet

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: Spreadsheet ID (use {{SPREADSHEET_ID}})

**Testing Steps:**
1. Open "Spreadsheets" → "Get Spreadsheet Cells"
2. Ensure {{SPREADSHEET_ID}} is set
3. Click **Send**
4. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "cells": [
        {
            "id": "cell-uuid",
            "worksheet_id": "worksheet-uuid",
            "row_index": 0,
            "column_index": 0,
            "value": "Hello World",
            "formula": null,
            "data_type": "text",
            "style": {}
        },
        {
            "id": "cell-uuid-2",
            "worksheet_id": "worksheet-uuid",
            "row_index": 0,
            "column_index": 1,
            "value": "100",
            "formula": null,
            "data_type": "number",
            "style": {}
        }
    ],
    "total_cells": 2
}
```

**Query Parameters (Optional):**
- `?worksheet_id=uuid` - Filter by specific worksheet
- `?row_index=0` - Filter by row
- `?column_index=0` - Filter by column

---

### 21. Update Single Cell

**Endpoint:** `POST /api/spreadsheets/{id}/update_cell/`

**Description:** Update or create a single cell

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: Spreadsheet ID (use {{SPREADSHEET_ID}})

**Request Body:**
```json
{
    "worksheet_id": "{{WORKSHEET_ID}}",
    "row_index": 0,
    "column_index": 0,
    "value": "Hello World",
    "data_type": "text"
}
```

**Data Types:**
- `text` - Text strings
- `number` - Numeric values
- `date` - Date values (ISO format)
- `formula` - Excel-like formulas

**Testing Steps:**
1. Open "Spreadsheets" → "Update Single Cell"
2. Set worksheet_id, row_index, column_index
3. Set value and data_type
4. Click **Send**
5. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "id": "cell-uuid",
    "worksheet_id": "worksheet-uuid",
    "row_index": 0,
    "column_index": 0,
    "value": "Hello World",
    "formula": null,
    "data_type": "text",
    "style": {},
    "created_at": "2026-02-07T13:00:00Z",
    "updated_at": "2026-02-07T13:00:00Z"
}
```

**Validation Rules:**
- row_index: Must be >= 0 and < row_count
- column_index: Must be >= 0 and < column_count
- value: Max 50,000 characters
- Unique constraint on (worksheet, row_index, column_index)

---

### 22. Bulk Update Cells

**Endpoint:** `POST /api/spreadsheets/{id}/update_cells/`

**Description:** Update multiple cells in one request (more efficient)

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: Spreadsheet ID (use {{SPREADSHEET_ID}})

**Request Body:**
```json
{
    "cells": [
        {
            "worksheet_id": "{{WORKSHEET_ID}}",
            "row_index": 0,
            "column_index": 0,
            "value": "Name",
            "data_type": "text"
        },
        {
            "worksheet_id": "{{WORKSHEET_ID}}",
            "row_index": 0,
            "column_index": 1,
            "value": "Age",
            "data_type": "text"
        },
        {
            "worksheet_id": "{{WORKSHEET_ID}}",
            "row_index": 1,
            "column_index": 0,
            "value": "John",
            "data_type": "text"
        },
        {
            "worksheet_id": "{{WORKSHEET_ID}}",
            "row_index": 1,
            "column_index": 1,
            "value": "25",
            "data_type": "number"
        }
    ]
}
```

**Testing Steps:**
1. Open "Spreadsheets" → "Bulk Update Cells"
2. Ensure {{WORKSHEET_ID}} is set
3. Modify cells array with your data
4. Click **Send**
5. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "message": "Cells updated successfully",
    "updated_count": 4,
    "cells": [
        {
            "row_index": 0,
            "column_index": 0,
            "value": "Name"
        },
        // ... other cells
    ]
}
```

**Use Cases:**
- Importing data from external sources
- Creating tables with headers and data
- Populating large datasets efficiently

**Performance:**
- Much faster than calling update_cell multiple times
- Can handle hundreds of cells in one request
- Uses database bulk operations

---

## Analysis APIs

### 24. List Analyses

**Endpoint:** `GET /api/analysis/`

**Description:** List all analyses performed by the user

**Authentication:** Bearer Token required

**Testing Steps:**
1. Open "Analysis" → "List Analyses"
2. Click **Send**
3. Verify response status: `200 OK`

**Expected Response:**
```json
[
    {
        "id": "analysis-uuid",
        "spreadsheet": {
            "id": "spreadsheet-uuid",
            "name": "My Spreadsheet"
        },
        "analysis_type": "summary_stats",
        "selected_columns": [0, 1, 2],
        "results": {
            "column_0": {
                "mean": 50.5,
                "median": 50,
                "std": 15.2,
                "min": 10,
                "max": 100,
                "count": 50
            }
        },
        "created_at": "2026-02-07T14:00:00Z"
    }
]
```

---

### 25. Summary Statistics

**Endpoint:** `POST /api/analysis/perform_analysis/`

**Description:** Calculate summary statistics (mean, median, std, min, max, count)

**Authentication:** Bearer Token required

**Request Body:**
```json
{
    "spreadsheet_id": "{{SPREADSHEET_ID}}",
    "analysis_type": "summary_stats",
    "selected_columns": [0, 1, 2]
}
```

**Testing Steps:**
1. First, create a spreadsheet with numeric data
2. Open "Analysis" → "Summary Statistics"
3. Set spreadsheet_id and select columns (0-indexed)
4. Click **Send**
5. Verify response status: `201 Created`

**Expected Response:**
```json
{
    "id": "analysis-uuid",
    "spreadsheet_id": "spreadsheet-uuid",
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
        },
        "column_1": {
            "mean": 75.2,
            "median": 72.0,
            "std": 20.1,
            "min": 20,
            "max": 150,
            "count": 50,
            "sum": 3760
        }
    },
    "created_at": "2026-02-07T14:00:00Z"
}
```

**Notes:**
- Only numeric columns are analyzed
- Empty cells are ignored
- Non-numeric values return error

**Data Requirements:**
- At least one selected column must have numeric data
- Column indices must be within spreadsheet bounds

---

### 26. Correlation Analysis

**Endpoint:** `POST /api/analysis/perform_analysis/`

**Description:** Calculate correlation matrix between columns

**Authentication:** Bearer Token required

**Request Body:**
```json
{
    "spreadsheet_id": "{{SPREADSHEET_ID}}",
    "analysis_type": "correlation",
    "selected_columns": [0, 1]
}
```

**Testing Steps:**
1. Ensure spreadsheet has at least 2 numeric columns
2. Open "Analysis" → "Correlation Analysis"
3. Set spreadsheet_id and select at least 2 columns
4. Click **Send**
5. Verify response status: `201 Created`

**Expected Response:**
```json
{
    "id": "analysis-uuid",
    "analysis_type": "correlation",
    "selected_columns": [0, 1],
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
    },
    "created_at": "2026-02-07T14:10:00Z"
}
```

**Correlation Values:**
- `1.0`: Perfect positive correlation
- `0.0`: No correlation
- `-1.0`: Perfect negative correlation
- `0.7 to 1.0`: Strong correlation
- `0.3 to 0.7`: Moderate correlation
- `0.0 to 0.3`: Weak correlation

---

### 27. Linear Regression

**Endpoint:** `POST /api/analysis/perform_analysis/`

**Description:** Perform linear regression analysis

**Authentication:** Bearer Token required

**Request Body:**
```json
{
    "spreadsheet_id": "{{SPREADSHEET_ID}}",
    "analysis_type": "regression",
    "selected_columns": [0, 1],
    "parameters": {
        "x_column": 0,
        "y_column": 1
    }
}
```

**Testing Steps:**
1. Ensure spreadsheet has numeric data in 2 columns
2. Open "Analysis" → "Linear Regression"
3. Set x_column (independent) and y_column (dependent)
4. Click **Send**
5. Verify response status: `201 Created`

**Expected Response:**
```json
{
    "id": "analysis-uuid",
    "analysis_type": "regression",
    "parameters": {
        "x_column": 0,
        "y_column": 1
    },
    "results": {
        "slope": 2.5,
        "intercept": 10.3,
        "r_squared": 0.89,
        "equation": "y = 2.5x + 10.3",
        "residuals": [0.5, -1.2, 0.8, ...],
        "predictions": [12.8, 15.3, 17.8, ...]
    },
    "created_at": "2026-02-07T14:20:00Z"
}
```

**Result Interpretation:**
- **slope**: Rate of change (y per unit x)
- **intercept**: Y value when x = 0
- **r_squared**: Goodness of fit (0 to 1, higher is better)
- **equation**: Linear equation y = mx + b

**Use Cases:**
- Predicting future values
- Understanding relationships between variables
- Trend analysis

---

### 28. Get Analysis Details

**Endpoint:** `GET /api/analysis/{id}/`

**Description:** Get details of a specific analysis

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: Analysis ID (use {{ANALYSIS_ID}})

**Testing Steps:**
1. First perform an analysis or get ID from list
2. Save analysis ID to {{ANALYSIS_ID}}
3. Open "Analysis" → "Get Analysis Details"
4. Click **Send**
5. Verify response status: `200 OK`

**Expected Response:** Same as perform_analysis response

---

## RBAC APIs

### 35. List Roles

**Endpoint:** `GET /api/rbac/roles/`

**Description:** List all roles in the system

**Authentication:** Bearer Token required

**Testing Steps:**
1. Open "RBAC" → "List Roles"
2. Click **Send**
3. Verify response status: `200 OK`

**Expected Response:**
```json
[
    {
        "id": "role-uuid",
        "name": "Admin",
        "description": "Full system access",
        "is_active": true,
        "created_by": {
            "id": "user-uuid",
            "username": "admin"
        },
        "created_at": "2026-02-07T10:00:00Z"
    },
    {
        "id": "role-uuid-2",
        "name": "Editor",
        "description": "Can view and edit",
        "is_active": true,
        "created_at": "2026-02-07T10:05:00Z"
    }
]
```

---

### 36. Create Role

**Endpoint:** `POST /api/rbac/roles/`

**Description:** Create a new role

**Authentication:** Bearer Token required

**Request Body:**
```json
{
    "name": "Editor",
    "description": "Can view and edit spreadsheets",
    "is_active": true
}
```

**Testing Steps:**
1. Open "RBAC" → "Create Role"
2. Set role name and description
3. Click **Send**
4. Verify response status: `201 Created`

**Expected Response:**
```json
{
    "id": "role-uuid",
    "name": "Editor",
    "description": "Can view and edit spreadsheets",
    "is_active": true,
    "created_by": {
        "id": "user-uuid",
        "username": "testuser"
    },
    "created_at": "2026-02-07T16:00:00Z"
}
```

**Validation:**
- name: Required, max 100 characters
- Name must be unique per user

---

### 37. Get Role Details

**Endpoint:** `GET /api/rbac/roles/{id}/`

**Description:** Get details of a specific role

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: Role ID (use {{ROLE_ID}})

**Testing Steps:**
1. Open "RBAC" → "Get Role Details"
2. Ensure {{ROLE_ID}} is set
3. Click **Send**
4. Verify response status: `200 OK`

**Expected Response:** Same as create role response

---

### 38. Update Role

**Endpoint:** `PUT /api/rbac/roles/{id}/`

**Description:** Update role details

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: Role ID (use {{ROLE_ID}})

**Request Body:**
```json
{
    "name": "Senior Editor",
    "description": "Updated description",
    "is_active": true
}
```

**Testing Steps:**
1. Open "RBAC" → "Update Role"
2. Modify fields
3. Click **Send**
4. Verify response status: `200 OK`

---

### 39. Delete Role

**Endpoint:** `DELETE /api/rbac/roles/{id}/`

**Description:** Delete a role

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: Role ID (use {{ROLE_ID}})

**Testing Steps:**
1. Open "RBAC" → "Delete Role"
2. Ensure {{ROLE_ID}} is set
3. Click **Send**
4. Verify response status: `204 No Content`

**Notes:**
- Cannot delete roles that are assigned to users
- Remove user role assignments first

---

### 40. List Permissions

**Endpoint:** `GET /api/rbac/permissions/`

**Description:** List all available permissions in the system

**Authentication:** Bearer Token required

**Testing Steps:**
1. Open "RBAC" → "List Permissions"
2. Click **Send**
3. Verify response status: `200 OK`

**Expected Response:**
```json
[
    {
        "id": "perm-uuid-1",
        "name": "Create Spreadsheet",
        "codename": "create_spreadsheet",
        "description": "Can create new spreadsheets",
        "category": "spreadsheet"
    },
    {
        "id": "perm-uuid-2",
        "name": "View Spreadsheet",
        "codename": "view_spreadsheet",
        "description": "Can view spreadsheets",
        "category": "spreadsheet"
    },
    {
        "id": "perm-uuid-3",
        "name": "Manage Users",
        "codename": "manage_users",
        "description": "Can create and manage users",
        "category": "user"
    }
]
```

**Permission Categories:**
- `spreadsheet` - Spreadsheet operations
- `user` - User management
- `role` - Role management
- `analysis` - Analysis operations
- `chart` - Chart operations
- `system` - System administration

---

### 41. List User Roles

**Endpoint:** `GET /api/rbac/user-roles/`

**Description:** List all user-role assignments

**Authentication:** Bearer Token required

**Testing Steps:**
1. Open "RBAC" → "List User Roles"
2. Click **Send**
3. Verify response status: `200 OK`

**Expected Response:**
```json
[
    {
        "id": "user-role-uuid",
        "user": {
            "id": "user-uuid",
            "username": "testuser",
            "email": "test@example.com"
        },
        "role": {
            "id": "role-uuid",
            "name": "Editor"
        },
        "assigned_by": {
            "id": "admin-uuid",
            "username": "admin"
        },
        "assigned_at": "2026-02-07T16:30:00Z"
    }
]
```

**Query Parameters:**
- `?user_id=uuid` - Filter by user
- `?role_id=uuid` - Filter by role

---

### 42. Assign Role to User

**Endpoint:** `POST /api/rbac/user-roles/assign/`

**Description:** Assign a role to a user

**Authentication:** Bearer Token required

**Request Body:**
```json
{
    "user_id": "{{USER_ID}}",
    "role_id": "{{ROLE_ID}}"
}
```

**Testing Steps:**
1. First, get user ID and role ID
2. Open "RBAC" → "Assign Role to User"
3. Set user_id and role_id in environment variables
4. Click **Send**
5. Verify response status: `201 Created`

**Expected Response:**
```json
{
    "id": "user-role-uuid",
    "user": {
        "id": "user-uuid",
        "username": "testuser"
    },
    "role": {
        "id": "role-uuid",
        "name": "Editor"
    },
    "assigned_by": {
        "id": "admin-uuid",
        "username": "admin"
    },
    "assigned_at": "2026-02-07T16:30:00Z"
}
```

**Notes:**
- User can have multiple roles
- Same user-role combination cannot be assigned twice
- Automatically logs the activity

---

### 43. Remove Role from User

**Endpoint:** `DELETE /api/rbac/user-roles/{id}/`

**Description:** Remove a role assignment from a user

**Authentication:** Bearer Token required

**URL Parameters:**
- `id`: UserRole ID (use {{USER_ROLE_ID}})

**Testing Steps:**
1. First, list user roles to get the user-role assignment ID
2. Save the ID to {{USER_ROLE_ID}}
3. Open "RBAC" → "Remove Role from User"
4. Click **Send**
5. Verify response status: `204 No Content`

**Expected Response:** Empty

---

### 44. List Activity Logs

**Endpoint:** `GET /api/rbac/activity-logs/`

**Description:** View audit trail of all user activities

**Authentication:** Bearer Token required

**Testing Steps:**
1. Open "RBAC" → "List Activity Logs"
2. Click **Send**
3. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "count": 150,
    "next": "http://localhost:8000/api/rbac/activity-logs/?limit=50&offset=50",
    "previous": null,
    "results": [
        {
            "id": "log-uuid",
            "user": {
                "id": "user-uuid",
                "username": "testuser"
            },
            "action_type": "CREATE",
            "model_name": "Spreadsheet",
            "object_id": "spreadsheet-uuid",
            "description": "Created spreadsheet: My Test Spreadsheet",
            "ip_address": "127.0.0.1",
            "user_agent": "PostmanRuntime/7.26.8",
            "timestamp": "2026-02-07T17:00:00Z"
        },
        {
            "id": "log-uuid-2",
            "user": {
                "id": "user-uuid",
                "username": "testuser"
            },
            "action_type": "UPDATE",
            "model_name": "Cell",
            "object_id": "cell-uuid",
            "description": "Updated cell at (0, 0)",
            "ip_address": "127.0.0.1",
            "user_agent": "PostmanRuntime/7.26.8",
            "timestamp": "2026-02-07T17:05:00Z"
        }
    ]
}
```

**Query Parameters:**
- `?limit=50` - Results per page (default: 50)
- `?offset=0` - Pagination offset
- `?user_id=uuid` - Filter by user
- `?action_type=CREATE` - Filter by action (CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT)
- `?model_name=Spreadsheet` - Filter by model
- `?start_date=2026-02-01` - Filter by date range
- `?end_date=2026-02-28`

**Action Types:**
- `CREATE` - Created new resource
- `UPDATE` - Modified existing resource
- `DELETE` - Deleted resource
- `VIEW` - Viewed resource
- `LOGIN` - User login
- `LOGOUT` - User logout
- `ASSIGN_ROLE` - Role assigned to user
- `REMOVE_ROLE` - Role removed from user

**Use Cases:**
- Security auditing
- Compliance reporting
- Troubleshooting user issues
- Tracking data changes

---

## Companies APIs

### 45. List Companies

**Endpoint:** `GET /api/companies/`

**Description:** Retrieve all companies (admin only or user's own company)

**Authentication:** Required (Bearer Token)

**Query Parameters:**
- `name` (optional) - Filter by company name
- `is_active` (optional) - Filter by active status (true/false)
- `page` (optional) - Page number
- `page_size` (optional) - Number of items per page

**Testing Steps:**
1. Ensure you're logged in (ACCESS_TOKEN is set)
2. Open "Companies" → "List Companies"
3. Click **Send**
4. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "count": 2,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
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
            "created_at": "2025-01-15T10:00:00Z",
            "updated_at": "2025-02-01T15:30:00Z"
        }
    ]
}
```

**Error Responses:**
- `401 Unauthorized` - Token missing or invalid
- `403 Forbidden` - Insufficient permissions

---

### 46. Create Company

**Endpoint:** `POST /api/companies/`

**Description:** Create a new company (admin only)

**Authentication:** Required (Bearer Token - Admin only)

**Request Body:**
```json
{
    "name": "Tech Innovators Ltd",
    "description": "Innovative technology solutions",
    "website": "https://techinnovators.com",
    "contact_email": "info@techinnovators.com",
    "contact_phone": "+1987654321",
    "address": "456 Tech Avenue",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "postal_code": "94102",
    "max_users": 25,
    "max_spreadsheets": 50
}
```

**Testing Steps:**
1. Ensure you're logged in as admin
2. Open "Companies" → "Create Company"
3. Update the request body with company details
4. Click **Send**
5. Verify response status: `201 Created`
6. **Save COMPANY_ID** from response (auto-saved to environment)

**Expected Response:**
```json
{
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "name": "Tech Innovators Ltd",
    "slug": "tech-innovators-ltd",
    "description": "Innovative technology solutions",
    "logo": null,
    "website": "https://techinnovators.com",
    "contact_email": "info@techinnovators.com",
    "contact_phone": "+1987654321",
    "address": "456 Tech Avenue",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "postal_code": "94102",
    "is_active": true,
    "max_users": 25,
    "max_spreadsheets": 50,
    "created_at": "2025-02-07T10:00:00Z",
    "updated_at": "2025-02-07T10:00:00Z"
}
```

**Validation Rules:**
- `name` - Required, max 255 characters, must be unique
- `contact_email` - Required, must be valid email
- `max_users` - Required, positive integer
- `max_spreadsheets` - Required, positive integer
- `slug` - Auto-generated from name

**Error Responses:**
- `400 Bad Request` - Invalid data or validation errors
- `401 Unauthorized` - Token missing or invalid
- `403 Forbidden` - Not an admin user
- `409 Conflict` - Company name already exists

---

### 47. Get Company Details

**Endpoint:** `GET /api/companies/{id}/`

**Description:** Retrieve detailed information about a specific company

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `id` - Company UUID (use {{COMPANY_ID}})

**Testing Steps:**
1. Ensure COMPANY_ID is set in environment variables
2. Open "Companies" → "Get Company Details"
3. Click **Send**
4. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "name": "Tech Innovators Ltd",
    "slug": "tech-innovators-ltd",
    "description": "Innovative technology solutions",
    "logo": null,
    "website": "https://techinnovators.com",
    "contact_email": "info@techinnovators.com",
    "contact_phone": "+1987654321",
    "address": "456 Tech Avenue",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "postal_code": "94102",
    "is_active": true,
    "max_users": 25,
    "max_spreadsheets": 50,
    "current_users": 3,
    "current_spreadsheets": 12,
    "created_at": "2025-02-07T10:00:00Z",
    "updated_at": "2025-02-07T10:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Token missing or invalid
- `403 Forbidden` - No access to this company
- `404 Not Found` - Company doesn't exist

---

### 48. Update Company

**Endpoint:** `PUT /api/companies/{id}/` or `PATCH /api/companies/{id}/`

**Description:** Update company information (admin or company manager)

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `id` - Company UUID (use {{COMPANY_ID}})

**Request Body (PATCH - partial update):**
```json
{
    "description": "Leading innovative technology solutions worldwide",
    "website": "https://www.techinnovators.com",
    "max_users": 30
}
```

**Testing Steps:**
1. Ensure COMPANY_ID is set in environment variables
2. Open "Companies" → "Update Company"
3. Modify the fields you want to update
4. Click **Send**
5. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "name": "Tech Innovators Ltd",
    "slug": "tech-innovators-ltd",
    "description": "Leading innovative technology solutions worldwide",
    "logo": null,
    "website": "https://www.techinnovators.com",
    "contact_email": "info@techinnovators.com",
    "contact_phone": "+1987654321",
    "address": "456 Tech Avenue",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "postal_code": "94102",
    "is_active": true,
    "max_users": 30,
    "max_spreadsheets": 50,
    "current_users": 3,
    "current_spreadsheets": 12,
    "created_at": "2025-02-07T10:00:00Z",
    "updated_at": "2025-02-07T14:30:00Z"
}
```

**Updatable Fields:**
- `name`, `description`, `logo`, `website`
- `contact_email`, `contact_phone`, `address`
- `city`, `state`, `country`, `postal_code`
- `is_active`, `max_users`, `max_spreadsheets`

**Error Responses:**
- `400 Bad Request` - Invalid data
- `401 Unauthorized` - Token missing or invalid
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Company doesn't exist

---

### 49. Delete Company

**Endpoint:** `DELETE /api/companies/{id}/`

**Description:** Delete a company (admin only, soft delete)

**Authentication:** Required (Bearer Token - Admin only)

**Path Parameters:**
- `id` - Company UUID (use {{COMPANY_ID}})

**Testing Steps:**
1. Ensure COMPANY_ID is set in environment variables
2. Open "Companies" → "Delete Company"
3. Click **Send**
4. Verify response status: `204 No Content`

**Expected Response:**
- Status: `204 No Content`
- Body: Empty

**Important Notes:**
- This is a soft delete (sets `is_active=false`)
- All associated users are deactivated
- All spreadsheets are archived
- Cannot be undone without database access

**Error Responses:**
- `401 Unauthorized` - Token missing or invalid
- `403 Forbidden` - Not an admin user
- `404 Not Found` - Company doesn't exist

---

## Subscriptions APIs

### 50. List Subscriptions

**Endpoint:** `GET /api/subscriptions/`

**Description:** List all subscriptions (admin sees all, users see their company's subscriptions)

**Authentication:** Required (Bearer Token)

**Query Parameters:**
- `company` (optional) - Filter by company ID
- `plan` (optional) - Filter by plan type (FREE, BASIC, PROFESSIONAL, ENTERPRISE)
- `status` (optional) - Filter by status (ACTIVE, EXPIRED, CANCELLED, TRIAL)
- `page` (optional) - Page number
- `page_size` (optional) - Number of items per page

**Testing Steps:**
1. Ensure you're logged in (ACCESS_TOKEN is set)
2. Open "Subscriptions" → "List Subscriptions"
3. Click **Send**
4. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "count": 1,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": "770e8400-e29b-41d4-a716-446655440222",
            "company": {
                "id": "660e8400-e29b-41d4-a716-446655440111",
                "name": "Tech Innovators Ltd"
            },
            "plan": "PROFESSIONAL",
            "status": "ACTIVE",
            "start_date": "2025-02-01T00:00:00Z",
            "end_date": "2026-02-01T00:00:00Z",
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
            "created_at": "2025-02-01T10:00:00Z",
            "updated_at": "2025-02-01T10:00:00Z"
        }
    ]
}
```

**Error Responses:**
- `401 Unauthorized` - Token missing or invalid
- `403 Forbidden` - Insufficient permissions

---

### 51. Create Subscription

**Endpoint:** `POST /api/subscriptions/`

**Description:** Create a new subscription for a company (admin only)

**Authentication:** Required (Bearer Token - Admin only)

**Request Body:**
```json
{
    "company": "660e8400-e29b-41d4-a716-446655440111",
    "plan": "PROFESSIONAL",
    "start_date": "2025-02-07",
    "billing_cycle": "MONTHLY",
    "auto_renew": true
}
```

**Testing Steps:**
1. Ensure you're logged in as admin
2. Ensure COMPANY_ID is set in environment variables
3. Open "Subscriptions" → "Create Subscription"
4. Update company ID in request body
5. Click **Send**
6. Verify response status: `201 Created`
7. **Save SUBSCRIPTION_ID** from response (auto-saved to environment)

**Expected Response:**
```json
{
    "id": "770e8400-e29b-41d4-a716-446655440222",
    "company": {
        "id": "660e8400-e29b-41d4-a716-446655440111",
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

**Available Plans:**
- `FREE` - Free tier with limited features
- `BASIC` - Basic features for small teams
- `PROFESSIONAL` - Advanced features for growing teams
- `ENTERPRISE` - Full features for large organizations

**Billing Cycles:**
- `MONTHLY` - Billed every month
- `YEARLY` - Billed annually (usually discounted)

**Validation Rules:**
- `company` - Required, must exist
- `plan` - Required, must be valid plan type
- `start_date` - Required, cannot be in the past
- Company can only have one active subscription

**Error Responses:**
- `400 Bad Request` - Invalid data or company already has active subscription
- `401 Unauthorized` - Token missing or invalid
- `403 Forbidden` - Not an admin user
- `404 Not Found` - Company doesn't exist

---

### 52. Get Subscription Details

**Endpoint:** `GET /api/subscriptions/{id}/`

**Description:** Retrieve detailed information about a specific subscription

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `id` - Subscription UUID (use {{SUBSCRIPTION_ID}})

**Testing Steps:**
1. Ensure SUBSCRIPTION_ID is set in environment variables
2. Open "Subscriptions" → "Get Subscription Details"
3. Click **Send**
4. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "id": "770e8400-e29b-41d4-a716-446655440222",
    "company": {
        "id": "660e8400-e29b-41d4-a716-446655440111",
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
        "priority_support": true,
        "white_labeling": false
    },
    "price": "99.00",
    "currency": "USD",
    "billing_cycle": "MONTHLY",
    "auto_renew": true,
    "payment_history": [
        {
            "date": "2025-02-07T10:00:00Z",
            "amount": "99.00",
            "status": "success"
        }
    ],
    "usage": {
        "current_users": 12,
        "current_spreadsheets": 45,
        "storage_used_gb": 23.5
    },
    "created_at": "2025-02-07T10:00:00Z",
    "updated_at": "2025-02-07T10:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Token missing or invalid
- `403 Forbidden` - No access to this subscription
- `404 Not Found` - Subscription doesn't exist

---

### 54. Update Subscription

**Endpoint:** `PUT /api/subscriptions/{id}/` or `PATCH /api/subscriptions/{id}/`

**Description:** Update subscription details (admin or company owner)

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `id` - Subscription UUID (use {{SUBSCRIPTION_ID}})

**Request Body (PATCH - partial update):**
```json
{
    "auto_renew": false,
    "plan": "ENTERPRISE"
}
```

**Testing Steps:**
1. Ensure SUBSCRIPTION_ID is set in environment variables
2. Open "Subscriptions" → "Update Subscription"
3. Modify the fields you want to update
4. Click **Send**
5. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "id": "770e8400-e29b-41d4-a716-446655440222",
    "company": {
        "id": "660e8400-e29b-41d4-a716-446655440111",
        "name": "Tech Innovators Ltd"
    },
    "plan": "ENTERPRISE",
    "status": "ACTIVE",
    "start_date": "2025-02-07T00:00:00Z",
    "end_date": "2025-03-07T00:00:00Z",
    "max_users": 100,
    "max_spreadsheets": 500,
    "max_storage_gb": 500,
    "features": {
        "advanced_analytics": true,
        "custom_charts": true,
        "api_access": true,
        "priority_support": true,
        "white_labeling": true,
        "dedicated_support": true
    },
    "price": "299.00",
    "currency": "USD",
    "billing_cycle": "MONTHLY",
    "auto_renew": false,
    "created_at": "2025-02-07T10:00:00Z",
    "updated_at": "2025-02-07T14:30:00Z"
}
```

**Updatable Fields:**
- `plan` - Upgrade or downgrade subscription
- `auto_renew` - Enable/disable automatic renewal
- `billing_cycle` - Change billing frequency

**Plan Upgrade/Downgrade:**
- Upgrading: Takes effect immediately, prorated charge
- Downgrading: Takes effect at end of current billing period

**Error Responses:**
- `400 Bad Request` - Invalid plan or downgrade not allowed
- `401 Unauthorized` - Token missing or invalid
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Subscription doesn't exist

---

### 55. Cancel Subscription

**Endpoint:** `POST /api/subscriptions/{id}/cancel/`

**Description:** Cancel a subscription (admin or company owner)

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `id` - Subscription UUID (use {{SUBSCRIPTION_ID}})

**Request Body:**
```json
{
    "reason": "Switching to different solution",
    "immediate": false
}
```

**Testing Steps:**
1. Ensure SUBSCRIPTION_ID is set in environment variables
2. Open "Subscriptions" → "Cancel Subscription"
3. Provide cancellation reason
4. Set `immediate` to `true` for immediate cancellation or `false` to cancel at period end
5. Click **Send**
6. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "message": "Subscription cancelled successfully",
    "subscription": {
        "id": "770e8400-e29b-41d4-a716-446655440222",
        "status": "CANCELLED",
        "cancelled_at": "2025-02-07T15:00:00Z",
        "end_date": "2025-03-07T00:00:00Z",
        "access_until": "2025-03-07T00:00:00Z"
    }
}
```

**Cancellation Options:**
- `immediate: false` - Access continues until end of billing period (default)
- `immediate: true` - Access ends immediately, may receive prorated refund

**Post-Cancellation:**
- Data retained for 30 days
- Can reactivate within 30 days
- After 30 days, data may be permanently deleted

**Error Responses:**
- `400 Bad Request` - Subscription already cancelled
- `401 Unauthorized` - Token missing or invalid
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Subscription doesn't exist

---

### 56. Renew Subscription

**Endpoint:** `POST /api/subscriptions/{id}/renew/`

**Description:** Manually renew an expired or cancelled subscription

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `id` - Subscription UUID (use {{SUBSCRIPTION_ID}})

**Request Body:**
```json
{
    "days": 365
}
```

**Testing Steps:**
1. Ensure SUBSCRIPTION_ID is set in environment variables
2. Open "Subscriptions" → "Renew Subscription"
3. Set `days` (e.g. 365 for one year)
4. Click **Send**
5. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "message": "Subscription renewed successfully",
    "subscription": {
        "id": "770e8400-e29b-41d4-a716-446655440222",
        "status": "ACTIVE",
        "start_date": "2025-02-07T15:30:00Z",
        "end_date": "2026-02-07T15:30:00Z",
        "billing_cycle": "YEARLY",
        "price": "999.00",
        "discount": "20%"
    },
    "payment": {
        "amount": "999.00",
        "currency": "USD",
        "method": "card_ending_1234",
        "status": "success"
    }
}
```

**Renewal Benefits:**
- Yearly billing: Usually 15-20% discount
- Reactivates all features immediately
- Restores previous data if within retention period

**Error Responses:**
- `400 Bad Request` - Subscription is already active or payment failed
- `401 Unauthorized` - Token missing or invalid
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Subscription doesn't exist

**Note:** Backend expects `days` in request body (e.g. `{"days": 365}`) for renewal duration.

---

### 58. List Available Plans

**Endpoint:** `GET /api/subscriptions/plans/`

**Description:** Get list of all available subscription plans with features and pricing

**Authentication:** Optional (public endpoint, but returns more details if authenticated)

**Testing Steps:**
1. Open "Subscriptions" → "List Available Plans"
2. Click **Send**
3. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "plans": [
        {
            "id": "FREE",
            "name": "Free Plan",
            "description": "Perfect for trying out Minitab",
            "price_monthly": "0.00",
            "price_yearly": "0.00",
            "currency": "USD",
            "max_users": 3,
            "max_spreadsheets": 10,
            "max_storage_gb": 5,
            "features": {
                "basic_spreadsheets": true,
                "basic_charts": true,
                "data_import": true,
                "advanced_analytics": false,
                "custom_charts": false,
                "api_access": false,
                "priority_support": false
            },
            "trial_days": 0,
            "popular": false
        },
        {
            "id": "BASIC",
            "name": "Basic Plan",
            "description": "For small teams getting started",
            "price_monthly": "29.00",
            "price_yearly": "290.00",
            "yearly_savings": "17%",
            "currency": "USD",
            "max_users": 10,
            "max_spreadsheets": 50,
            "max_storage_gb": 25,
            "features": {
                "basic_spreadsheets": true,
                "basic_charts": true,
                "data_import": true,
                "excel_export": true,
                "advanced_analytics": false,
                "custom_charts": false,
                "api_access": false,
                "email_support": true
            },
            "trial_days": 14,
            "popular": false
        },
        {
            "id": "PROFESSIONAL",
            "name": "Professional Plan",
            "description": "For growing teams with advanced needs",
            "price_monthly": "99.00",
            "price_yearly": "990.00",
            "yearly_savings": "17%",
            "currency": "USD",
            "max_users": 50,
            "max_spreadsheets": 200,
            "max_storage_gb": 100,
            "features": {
                "basic_spreadsheets": true,
                "basic_charts": true,
                "data_import": true,
                "excel_export": true,
                "advanced_analytics": true,
                "custom_charts": true,
                "collaboration": true,
                "api_access": true,
                "priority_support": true,
                "audit_logs": true
            },
            "trial_days": 14,
            "popular": true
        },
        {
            "id": "ENTERPRISE",
            "name": "Enterprise Plan",
            "description": "For large organizations with custom requirements",
            "price_monthly": "299.00",
            "price_yearly": "2990.00",
            "yearly_savings": "17%",
            "currency": "USD",
            "max_users": 100,
            "max_spreadsheets": 500,
            "max_storage_gb": 500,
            "features": {
                "all_features": true,
                "white_labeling": true,
                "dedicated_support": true,
                "sla_guarantee": true,
                "custom_integrations": true,
                "on_premise_option": true,
                "advanced_security": true,
                "compliance_reports": true
            },
            "trial_days": 30,
            "popular": false,
            "contact_sales": true
        }
    ]
}
```

**Use Cases:**
- Displaying pricing page
- Plan comparison
- Upgrade/downgrade decisions
- Sales and marketing

**Error Responses:**
- None (public endpoint always returns data)

---

## Health Check APIs

### 59. Health Check

**Endpoint:** `GET /health/`

**Description:** Full system health check (database, cache, services)

**Authentication:** None required

**Testing Steps:**
1. Open "Health Checks" → "Health Check"
2. Click **Send**
3. Verify response status: `200 OK` or `503 Service Unavailable`

**Expected Response (Healthy):**
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

**Expected Response (Unhealthy):**
```json
{
    "status": "unhealthy",
    "timestamp": "2026-02-07T18:00:00Z",
    "services": {
        "database": "unhealthy",
        "cache": "healthy",
        "disk_space": "healthy"
    },
    "errors": [
        "Database connection failed"
    ]
}
```

**Status Codes:**
- `200 OK` - All services healthy
- `503 Service Unavailable` - One or more services unhealthy

---

### 60. Readiness Check

**Endpoint:** `GET /health/ready/`

**Description:** Check if application is ready to serve traffic

**Authentication:** None required

**Testing Steps:**
1. Open "Health Checks" → "Readiness Check"
2. Click **Send**
3. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "status": "ready",
    "timestamp": "2026-02-07T18:00:00Z"
}
```

**Use Case:** Kubernetes/Docker readiness probe

---

### 61. Liveness Check

**Endpoint:** `GET /health/live/`

**Description:** Check if application is alive

**Authentication:** None required

**Testing Steps:**
1. Open "Health Checks" → "Liveness Check"
2. Click **Send**
3. Verify response status: `200 OK`

**Expected Response:**
```json
{
    "status": "alive",
    "timestamp": "2026-02-07T18:00:00Z"
}
```

**Use Case:** Kubernetes/Docker liveness probe

---

## Common Testing Workflows

### Workflow 1: Complete User Journey

1. **Register User** → Save credentials
2. **Login** → Get ACCESS_TOKEN (auto-saved)
3. **Get User Profile** → Verify authentication
4. **Create Spreadsheet** → Get SPREADSHEET_ID (auto-saved)
5. **Create Worksheet** → Get WORKSHEET_ID (auto-saved)
6. **Bulk Update Cells** → Add data
7. **Summary Statistics** (or **Perform Analysis**) → Analyze data
8. **Get Recent Spreadsheets** → Verify creation
9. **Logout** → Clean session

### Workflow 2: RBAC Configuration

1. **Login as Admin**
2. **Create Role** (e.g., "Editor")
3. **List Permissions** → See available permissions
4. **Assign Role to User** → Grant permissions
5. **List User Roles** → Verify assignment
6. **List Activity Logs** → Check audit trail

### Workflow 3: Data Analysis

1. **Create Spreadsheet with Data**
2. **Bulk Update Cells** → Add numeric data in columns
3. **Summary Statistics** → Get descriptive stats
4. **Correlation Analysis** → Check relationships
5. **Linear Regression** → Build predictive model
6. **Get Analysis Results** → View results
7. **List Analyses** → Review past analyses

---

## Troubleshooting

### Issue: 401 Unauthorized

**Cause:** Missing or expired access token

**Solution:**
1. Check if {{ACCESS_TOKEN}} is set in environment
2. Login again to get new token
3. If token expired, use Refresh Token endpoint

### Issue: 403 Forbidden

**Cause:** Insufficient permissions

**Solution:**
1. Check user type (SUPER vs CHILD)
2. Verify role assignments
3. Ensure user has required permissions

### Issue: 404 Not Found

**Cause:** Resource doesn't exist or wrong ID

**Solution:**
1. Verify ID is correct ({{SPREADSHEET_ID}}, etc.)
2. List resources first to get valid IDs
3. Check if resource was deleted

### Issue: 400 Bad Request - Validation Error

**Cause:** Invalid input data

**Solution:**
1. Check request body matches example format
2. Verify required fields are present
3. Check data types (string, number, boolean)
4. Review validation rules in documentation

### Issue: 500 Internal Server Error

**Cause:** Server-side error

**Solution:**
1. Check Django server logs in terminal
2. Verify database is running
3. Check for missing migrations
4. Review server configuration

---

## Environment Variables Reference

| Variable | Purpose | Set By |
|----------|---------|--------|
| BASE_URL | API base URL | Manual |
| ACCESS_TOKEN | JWT access token | Login (auto) |
| REFRESH_TOKEN | JWT refresh token | Login (auto) |
| SPREADSHEET_ID | Current spreadsheet | Create Spreadsheet (auto) |
| WORKSHEET_ID | Current worksheet | Create Worksheet (auto) |
| USER_ID | User to manage | Manual |
| ROLE_ID | Role to assign | Manual |
| ANALYSIS_ID | Analysis to view | Manual |
| USER_ROLE_ID | Role assignment to remove | Manual |
| COMPANY_ID | Company to manage | Create Company (auto) |
| SUBSCRIPTION_ID | Subscription to manage | Create Subscription (auto) |

---

## Best Practices

### 1. Use Environment Variables
- Store all dynamic values (IDs, tokens) in environment
- Use {{VARIABLE}} syntax in requests
- Keep Initial Value empty for sensitive data

### 2. Test Scripts
- Login endpoint auto-saves tokens
- Create endpoints auto-save IDs
- Reduces manual copying of values

### 3. Request Organization
- Use folders to organize related endpoints
- Name requests descriptively
- Add descriptions for complex requests

### 4. Error Handling
- Always check status codes
- Read error messages carefully
- Refer to validation rules

### 5. Data Cleanup
- Delete test data after testing
- Use meaningful names for test resources
- Don't test on production environment

### 6. Security
- Never commit environment files with tokens
- Use different credentials for testing
- Logout after testing sensitive operations

---

## Additional Resources

- **API Documentation:** `API_DOCS.md`
- **Database Schema:** `DATABASE_SCHEMA.md`
- **Quick Start Guide:** `QUICK_START.md`
- **Deployment Guide:** `DEPLOYMENT.md`
- **Multi-Tenant Guide:** `MULTI_TENANT_GUIDE.md`

---

## Support

For issues or questions:
1. Check this guide first
2. Review error messages
3. Check Django server logs
4. Consult API_DOCS.md for technical details

---

**Last Updated:** February 7, 2026
**API Version:** 1.0.0
**Postman Collection Version:** 2.1.0
