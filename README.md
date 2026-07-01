# pas

Snap a photo of a receipt, and pas reads the items, splits the tax and tip fairly, and
gives everyone a link to pay you back. No one but you needs an account.

It's a mobile-first web app. You take the photo, tap who had what, and each friend gets a
page with their share and a Venmo or Zelle button. The app never touches money — it just
does the math and hands each person a pre-filled request.

## How it works

1. **Snap or upload a receipt.** Claude reads it into a list of items with tax and tip.
2. **Check the items.** Anything it wasn't sure about is flagged so you can fix it fast.
3. **Assign.** Tap an item, then tap who shared it. Tax and tip are split by what each
   person ordered (or evenly — your call).
4. **Send.** Everyone gets a link with their amount. They pay by Venmo or Zelle and tap
   "mark as paid".
5. **Track.** A board shows who's paid and who still owes, with a one-tap nudge.

There's also a quick "even split" if you just want to divide a total a few ways.

## Why Venmo and Zelle work this way

Neither has a real API for a third-party app, so pas generates the links/QRs the same way
the payment apps do:

- **Venmo** — a pre-filled pay link plus a QR. The link only completes inside the Venmo
  app on a phone, so the pay page always shows the amount and a QR as a backup.
- **Zelle** — there's no pay link at all, but a Zelle QR is just a web URL with the
  recipient encoded in it, so pas can build a real one from your handle. Zelle can't carry
  an amount, so the payer types it in after scanning from their bank app.

## Running it locally

You'll need Node 20+, a [Supabase](https://supabase.com) project, and an
[Anthropic API key](https://console.anthropic.com).

```bash
npm install
cp .env.example .env.local   # then fill in the values
```

Create the database tables by running the migration against your Supabase database:

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
```

Then start it:

```bash
npm run dev
```

Open http://localhost:3000.

### Environment variables

See `.env.example` for the full list with notes. The ones you need:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  — from your Supabase project's API settings.
- `ANTHROPIC_API_KEY` — for reading receipts.
- `APP_SECRET` — any long random string (`openssl rand -base64 32`).
- `DATABASE_URL` — only used to run the migration, not at runtime.
- `RESEND_API_KEY` and `EMAIL_FROM` — only if you turn on the optional sign-in.

There are no Venmo or Zelle keys — those links are built on the fly from a handle.

## Tests

The money math is the part that has to be exactly right, so it's covered by tests:

```bash
npm test
```

This checks that splits always add back up to the total to the penny, that tax and tip
are shared fairly, and that the payment links are built correctly.

## How it's built

- **Next.js** (App Router) and **React**, **TypeScript**, **Tailwind**.
- **Supabase** for the database, file storage (receipt photos), and the optional sign-in.
- **Claude** vision reads the receipts.
- Money is stored in whole cents everywhere; dollars only show up when something is typed
  in or displayed.

### Where things live

- `src/lib/money.ts`, `src/lib/split.ts` — the splitting math.
- `src/lib/payments.ts` — building the Venmo and Zelle links and QRs.
- `src/lib/ocr.ts` — reading a receipt with Claude.
- `src/lib/db.ts`, `src/app/actions.ts` — reading and writing bills.
- `src/components/` — the screens and shared UI.
- `supabase/migrations/` — the database schema.

## A note on privacy

Bills aren't public — each one is reachable only by its own unguessable link, and friends
never sign in or hand over any details. Receipt photos sit in a private bucket.
