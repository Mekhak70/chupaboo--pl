This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Chupaboo Poland admin

The admin is available under `/pl/admin` and uses a dedicated Supabase project. Install the locked dependencies with `npm ci`.

Set these variables in the deployment environment or `.env.local`:

```dotenv
NEXT_PUBLIC_POLAND_SUPABASE_URL=https://your-polish-project.supabase.co
NEXT_PUBLIC_POLAND_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_POLAND_MANAGED_CATALOG=false
```

Apply the migration in `supabase/migrations` to the Polish project. Create the administrator in Supabase Auth and set their server-managed `app_metadata.site_admin` to the JSON boolean `true`. The user's editable metadata does not grant permissions. Leave the existing site's Supabase variables in place for its legacy integration.

The admin can prepare catalog entries, banners and FAQs while the shop still uses its current catalog. After populating the new catalog and verifying product links, set `NEXT_PUBLIC_POLAND_MANAGED_CATALOG=true` and rebuild to publish the managed catalog and homepage content. Catalog base prices use AMD to match the existing checkout price conversion. Expenses and recorded sales use PLN.
