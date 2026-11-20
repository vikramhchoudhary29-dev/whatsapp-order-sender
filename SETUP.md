# Local setup

This app sends **Template 1 at 10:00 AM** and **Template 2 at 5:00 PM** India time.

## Vercel deployment

Vercel Cron runs the reminders in the cloud, so your PC does not need to be on and the dashboard does not need to be open. The included `vercel.json` schedules the two jobs at 04:30 UTC and 11:30 UTC, which are 10:00 AM and 5:00 PM in India.

Add every variable from `.env` to the **Production** environment in Vercel, including `DATABASE_URL`, all `META_*` variables, and `CRON_SECRET`. Deploy to production; Vercel supplies `CRON_SECRET` as the authorization header when it invokes each cron endpoint.

## 1. Install and configure

```powershell
npm ci
Copy-Item .env.example .env
```

Fill in `.env` with your Neon and Meta values. `META_TEMPLATE_IMAGE_URL` must be a public HTTPS image URL that Meta can access and must match the image header approved for the template.

## 2. Create the Neon tables

```powershell
npx prisma migrate deploy
```

## 3. Start the app

```powershell
npm run build
npm run start
```

Open http://127.0.0.1:3000 and add/import customers, then set the approved Meta template names in Settings. The Windows setup below also creates a 7:00 AM task that starts the local app automatically after the PC is on.

Template 1 is used by the 10:00 AM task. Template 2 is used by the 5:00 PM task.

## 4. Create the two Windows scheduled tasks

Open **PowerShell as Administrator** in the project folder and run:

```powershell
.\scripts\setup-windows-scheduler.ps1
```

The tasks call the app only on `127.0.0.1`; `CRON_SECRET` protects the scheduler endpoint. Each customer can only receive one automatic send for each time slot per day, even if a task is accidentally run twice.

To test without waiting, use Task Scheduler, select one of the two created tasks, and choose **Run**. Do not test with real customers until the template names and image have been verified with a single opted-in test number.
