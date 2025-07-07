# TimeTool by Firebase Studio

This is a Next.js application built with Firebase Studio. It's a time tracking and management tool designed for teams.

To get started, take a look at src/app/page.tsx.

## Running Locally

You can run this application on your local machine. Here's how:

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 20 or later recommended)
-   npm (comes with Node.js)
-   [PostgreSQL](https://www.postgresql.org/download/)

### 1. Install Dependencies

Open your terminal in the project's root directory and run the following command to install all the necessary packages:

```bash
npm install
```

### 2. Set Up PostgreSQL Database

This application requires a PostgreSQL database.

1.  **Create the Database**: Create a new database named `timetool_db`.
2.  **Run the Schema Script**: Use a tool like `psql` or pgAdmin to execute the `docs/db.sql` script on your new database. This will create all the necessary tables and populate them with mock data.
    ```bash
    psql -U your_postgres_user -d timetool_db -f docs/db.sql
    ```

### 3. Set Up Environment Variables

This application uses environment variables for configuration. Create a new file named `.env.local` in the root of the project and add the following content.

**Database Connection:**
Update the connection string with your PostgreSQL username, password, and host.

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/timetool_db"
```

**Admin User:**
The system uses these credentials for the Super Admin user. The default password for all other demo users in the database is `password`.

```env
# Admin User Credentials
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
NEXT_PUBLIC_ADMIN_PASSWORD=password
```

**Email Notifications:**
The application uses `nodemailer` to send password change notifications via email.

```env
# SMTP Configuration for Nodemailer
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM="TimeTool <no-reply@yourdomain.com>"
```

**Note:** The email sending feature will fail without the SMTP variables, but the rest of the application will still function.

### 4. Run the Development Server

Once the dependencies are installed and environment variables are set, start the Next.js development server:

```bash
npm run dev
```

The application should now be running and accessible at [http://localhost:3000](http://localhost:3000).

---

## Data Persistence

This application uses a PostgreSQL database for data persistence. All data (users, time entries, projects, etc.) is stored in the `timetool_db` database you configured.

### Database Schema

The complete database schema is defined in the following files:
-   **Schema Documentation**: `docs/db_schema.md`
-   **PostgreSQL Script**: `docs/db.sql`
