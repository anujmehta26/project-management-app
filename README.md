This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Project Management App - Vercel Deployment Guide

## Deployment Steps

1. **Fix Configuration Files**
   - ✅ Update `next.config.js` to remove deprecated options
   - ✅ Update `eslint.config.mjs` to fix serialization issues

2. **Set Up Environment Variables in Vercel**
   
   You must add the following environment variables in your Vercel project settings:

   - `NEXTAUTH_URL` - Set to your Vercel deployment URL (e.g., https://your-project.vercel.app)
   - `NEXTAUTH_SECRET` - Your NextAuth secret key
   - `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

3. **How to Add Environment Variables in Vercel**
   
   1. Go to your Vercel dashboard
   2. Select your project
   3. Click on "Settings" tab
   4. Navigate to "Environment Variables" section
   5. Add each variable with its corresponding value
   6. Save the changes
   7. Redeploy your application

4. **Troubleshooting Common Errors**

   - **Invalid URL Error**: This occurs when `NEXTAUTH_URL` is not properly set in your Vercel environment
   - **ESLint Serialization Error**: Fixed by updating the ESLint configuration
   - **Next.js Configuration Warnings**: Fixed by updating the Next.js configuration

## Local Development

For local development, ensure your `.env.local` file contains all the necessary environment variables:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Important Notes

- Never commit your `.env.local` file to version control
- Make sure your Google OAuth credentials have the correct redirect URIs configured
- For production, set `NEXTAUTH_URL` to your actual deployment URL
