# TimeTool by Firebase Studio

This is a Next.js application built with Firebase Studio. It's a time tracking and management tool designed for teams.

To get started, take a look at src/app/page.tsx.

## Running Locally

You can run this application on your local machine. Here's how:

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 20 or later recommended)
-   npm (comes with Node.js)

### 1. Install Dependencies

Open your terminal in the project's root directory and run the following command to install all the necessary packages:

```bash
npm install
```

### 2. Set Up Environment Variables

This application uses `nodemailer` to send password change notifications via email. For this to work, you need to provide SMTP server credentials.

Create a new file named `.env.local` in the root of the project and add the following content. Replace the placeholder values with your actual SMTP credentials.

```env
# SMTP Configuration for Nodemailer
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM="TimeTool <no-reply@yourdomain.com>"
```

**Note:** The email sending feature will fail without these variables, but the rest of the application will still function.

### 3. Run the Development Server

Once the dependencies are installed and environment variables are set, start the Next.js development server:

```bash
npm run dev
```

The application should now be running and accessible at [http://localhost:3000](http://localhost:3000).

---

## Data Persistence

**Important:** The current version of this application is a high-fidelity prototype. **It uses your browser's `localStorage` to store all data.** This means:
-   All data (users, time entries, projects, etc.) is stored directly in your browser.
-   The data will persist as long as you use the same browser and don't clear your site data.
-   The data is not shared between different browsers or computers.

### Database Schema (For Future Development)

To prepare for a full backend implementation, a complete PostgreSQL database schema has been defined. You can find the schema documentation and a runnable SQL script here:
-   **Schema Documentation**: `docs/db_schema.md`
-   **PostgreSQL Script**: `docs/db.sql`

To use this, you would need a local PostgreSQL server. You could then run the `db.sql` script to create and populate the database, which would serve as a starting point for connecting a real backend. However, the current application code **does not** connect to this database.
