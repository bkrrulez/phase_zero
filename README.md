# PhaseZero by Bikramjit Chowdhury

This is a Next.js application built for civil engineers and building planners.

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

This application uses environment variables for configuration. Create a new file named `.env.local` in the root of the project and add the following content.

**Admin User:**
The system uses these credentials for the Super Admin user. The default password for all other demo users is `password`.

```env
# Admin User Credentials
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
NEXT_PUBLIC_ADMIN_PASSWORD=password
```

**Email Notifications (Optional):**
The application uses `nodemailer` to send password change notifications via email. This feature is optional and the app will function without it.

```env
# SMTP Configuration for Nodemailer
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM="PhaseZero <no-reply@yourdomain.com>"
```

### 3. Run the Development Server

Once the dependencies are installed and environment variables are set, start the Next.js development server:

```bash
npm run dev
```

The application should now be running and accessible at [http://localhost:3000](http://localhost:3000).

---

## Data Persistence

For rapid prototyping and ease of use, I use Postgresql online DB and access it via the env file. This means:
- Changes you make are saved globally and not only in your local system.
- The data is not shared between different browsers or users.
- Using the DATABASE_URL parameter, multiple frontends hosted in different systems can connect to the same DB (Not Advisable for Production)
