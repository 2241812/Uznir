# Skill: uznir-i18n

Add or update internationalization (i18n) strings in Uznir, supporting Filipino (Tagalog/Taglish) and English.

## Trigger

Use this skill when the user asks to add translations, change UI text, support a new language, or fix translation-related issues.

## Architecture

- Strings live in `lib/i18n/strings/{en.ts, fil.ts}`.
- A `t()` helper function in `lib/i18n/index.ts` resolves the correct string for the current locale.
- Locale is determined from: (1) user preference in `profiles`, (2) browser `Accept-Language` header, (3) default `en`.
- No external i18n library at MVP — a simple key-value dictionary is sufficient and avoids bundle bloat.

## String file format

```ts
// lib/i18n/strings/en.ts
const en = {
  common: {
    appName: "Uznir",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    loading: "Loading...",
    error: "Something went wrong",
    search: "Search",
    filter: "Filter",
  },
  auth: {
    login: "Log in",
    signup: "Sign up",
    logout: "Log out",
    emailPlaceholder: "Enter your email",
    passwordPlaceholder: "Enter your password",
    loginWithGoogle: "Continue with Google",
    sendOtp: "Send code to email",
  },
  nav: {
    dashboard: "Dashboard",
    nearby: "Who's near?",
    postJob: "Post a job",
    myJobs: "My jobs",
    myBids: "My bids",
    chat: "Messages",
    profile: "Profile",
  },
  jobs: {
    postJob: "Post a job",
    title: "Job title",
    description: "Describe what you need",
    budget: "Budget (₱)",
    trade: "What kind of work?",
    location: "Where is this?",
    submit: "Post job",
    bids: "bids",
    open: "Open",
    awarded: "Awarded",
    inProgress: "In progress",
    done: "Done",
    cancelled: "Cancelled",
  },
  workers: {
    nearby: "Workers near you",
    available: "Available now",
    rating: "Rating",
    hourlyRate: "Per hour",
    distance: "away",
    noWorkers: "No workers found in your area",
    trades: {
      driver: "Driver",
      carpenter: "Carpenter",
      plumber: "Plumber",
      electrician: "Electrician",
      courier: "Courier / Errand",
      cleaner: "Cleaner",
      handyman: "Handyman",
      painter: "Painter",
      gardener: "Gardener",
      welder: "Welder",
      mover: "Mover",
      acTech: "AC Technician",
    },
  },
  chat: {
    placeholder: "Type a message...",
    online: "Online",
    offline: "Offline",
    typing: "typing...",
  },
  booking: {
    status: "Booking status",
    scheduled: "Scheduled",
    inProgress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
    disputed: "Disputed",
    pay: "Pay now",
    complete: "Mark as completed",
    cancel: "Cancel booking",
  },
  payments: {
    payWithGcash: "Pay with GCash",
    payWithMaya: "Pay with Maya",
    payWithCard: "Pay with card",
    processing: "Processing payment...",
    success: "Payment successful!",
    failed: "Payment failed",
  },
} as const;

export default en;
```

```ts
// lib/i18n/strings/fil.ts
const fil = {
  common: {
    appName: "Uznir",
    save: "I-save",
    cancel: "Kanselahin",
    delete: "I-delete",
    loading: "Naglo-load...",
    error: "May nangyari na mali",
    search: "Hananap",
    filter: "I-filter",
  },
  auth: {
    login: "Mag-login",
    signup: "Mag-sign up",
    logout: "Mag-logout",
    emailPlaceholder: "Ilagay ang email mo",
    passwordPlaceholder: "Ilagay ang password mo",
    loginWithGoogle: "Magpatuloy gamit Google",
    sendOtp: "I-send ang code sa email",
  },
  nav: {
    dashboard: "Dashboard",
    nearby: "Sino ang malapit?",
    postJob: "Mag-post ng trabaho",
    myJobs: "Mga trabaho ko",
    myBids: "Mga bid ko",
    chat: "Mensahe",
    profile: "Profile",
  },
  jobs: {
    postJob: "Mag-post ng trabaho",
    title: "Pamagat ng trabaho",
    description: "I-describe kung ano ang kailangan mo",
    budget: "Budget (₱)",
    trade: "Anong klaseng trabaho?",
    location: "Saan ito?",
    submit: "I-post ang trabaho",
    bids: "bids",
    open: "Bukas",
    awarded: "Na-award",
    inProgress: "Ginagawa",
    done: "Tapos na",
    cancelled: "Kanselado",
  },
  workers: {
    nearby: "Mga worker malapit sa'yo",
    available: "Available ngayon",
    rating: "Rating",
    hourlyRate: "Kada oras",
    distance: "ang layo",
    noWorkers: "Walang nahanap na worker sa area mo",
    trades: {
      driver: "Driver",
      carpenter: "Carpenter / Karpintero",
      plumber: "Plumber / Tubero",
      electrician: "Electrician / Elektrisyan",
      courier: "Courier / Padala",
      cleaner: "Cleaner / Linis",
      handyman: "Handyman / All-around",
      painter: "Painter / Pintor",
      gardener: "Gardener / Hardinero",
      welder: "Welder / Panday",
      mover: "Mover / Taga-lipat",
      acTech: "AC Technician / Aircon",
    },
  },
  chat: {
    placeholder: "Mag-type ng mensahe...",
    online: "Online",
    offline: "Offline",
    typing: "nagta-type...",
  },
  booking: {
    status: "Status ng booking",
    scheduled: "Naka-schedule",
    inProgress: "Ginagawa pa",
    completed: "Tapos na",
    cancelled: "Kanselado",
    disputed: "Naka-dispute",
    pay: "Magbayad na",
    complete: "I-mark na tapos",
    cancel: "Kanselahin ang booking",
  },
  payments: {
    payWithGcash: "Magbayad gamit GCash",
    payWithMaya: "Magbayad gamit Maya",
    payWithCard: "Magbayad gamit card",
    processing: "Nagpro-process ang payment...",
    success: "Matagumpay ang payment!",
    failed: "Bagal ang payment",
  },
} as const;

export default fil;
```

## Guidelines

1. **Taglish is acceptable** — Filipinos naturally mix English and Filipino. If a Filipino string feels unnatural in pure Tagalog, use the commonly-spoken Taglish form.
2. **Context matters** — Formal contexts (privacy policy, legal) use more formal Filipino. UI strings match everyday speech.
3. **Short strings preferred** — Mobile screens are small. Keep Filipino strings concise.
4. **Trade names** — Many trade names are English loanwords in Filipino (driver, carpenter, plumber). Include both the English and the common Filipino term when they differ (e.g. "Carpenter / Karpintero").
5. **Currency formatting** — Never put ₱ or $ in the string. Use `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })` at the display layer.
6. **Nested keys** — Use nested objects (e.g. `workers.trades.plumber`) for organization. Dot-notation access: `t('workers.trades.plumber')`.
7. **Fallback** — If a key is missing in Filipino, fall back to English. Never show the raw key to the user.

## Adding a new string

1. Add the key to `lib/i18n/strings/en.ts` (English first — it's the fallback).
2. Add the same key to `lib/i18n/strings/fil.ts`.
3. Use `t('section.key')` in the component.
4. Do NOT import the string file directly — always use the `t()` helper.
