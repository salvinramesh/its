# Simple IT Inventory Management

This is a small full-stack sample app:
- Backend: Node.js + Express + SQLite
- Frontend: Vanilla HTML/CSS/JS served from Express static files

Features:
- Asset: asset_number (unique), serial_number, type, assigned_to (employee)
- Employee: employee_id (unique), name, email
- Search by asset number, serial, type, employee name or employee id
- Easy to run locally.

## Run locally

1. Install Node.js (>=14)
2. Extract the zip and in the project folder run:
   ```
   npm install
   npm start
   ```
3. Open http://localhost:3000

## Switch to MySQL

If you prefer MySQL, replace `db.js` with a MySQL client (e.g. `mysql2` or `knex`) and run the CREATE TABLE statements on your MySQL server. The REST API endpoints remain the same.



## Fix for missing 'sqlite' module
If you get `Cannot find module 'sqlite'` when starting the app, run:

```
npm install sqlite
```

Or run `npm install` again after extracting the updated project.
