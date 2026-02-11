# Database Setup Scripts

## Option 1: Automatic (Recommended)

Run the seed script to create the table AND add test data:

```bash
npm run seed
```

This will:
1. Try to create the `items` table if it doesn't exist
2. Insert 5 test items (text notes and a rectangle)
3. Show success message

**If it works:** Refresh your app to see the test items!

**If it fails:** Try Option 2 below.

---

## Option 2: Manual Setup

If the automatic script fails (due to permissions), create the table manually:

### Step 1: Create the Table

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `scripts/createTable.sql`
6. Paste and click **Run**

You should see: "Success. No rows returned"

### Step 2: Add Test Data

Run the seed script again:
```bash
npm run seed
```

This time it should work since the table exists!

---

## Test Data Included

The seed script creates:

1. **Welcome message** - Text note at (100, 100)
2. **Instructions** - Multi-line text note at (400, 150)
3. **Rectangle divider** - Large white border at (50, 300)
4. **Pan tip** - Text note at (150, 400)
5. **Zoom tip** - Text note at (150, 500)

---

## Clearing Test Data

To delete all items and start fresh:

```sql
-- Run this in Supabase SQL Editor
DELETE FROM items;
```

Or delete specific items:
```sql
DELETE FROM items WHERE type = 'text';
```

---

## Table Schema

```sql
items
├── id              UUID (primary key)
├── type            TEXT ('file' | 'text' | 'rectangle')
├── x               FLOAT (world position x)
├── y               FLOAT (world position y)
├── width           FLOAT
├── height          FLOAT
├── content         TEXT (file URL or text content)
├── file_name       TEXT (original filename for files)
└── created_at      TIMESTAMP
```
