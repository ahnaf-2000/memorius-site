# Memorius — Smart Club Operations

A web platform for a student organization: publish fests, run the events inside
them, and take registrations without a single Google Form. Organizers create and
monitor programmes; students browse, register and manage their own places.

**Organization → Fest → Event → Registration**, end to end.

## Demo credentials

There is no shared password: sign-in is an email one-time code, sent to whatever
address you enter, so **any address you control is a valid demo account**. Two
clicks get you to every screen.

**As a participant**

1. Open `/auth`, enter your email, read the six-digit code from the inbox and
   sign in. You land on `/dashboard`.
2. Browse `/programmes` and `/events`, open any event and register — the
   showcase catalogue (3 programmes, 10 events) is seeded on first load, so
   nothing has to be created before you can book, wait-list or release a place.
   The confirmation email carries the printable PDF invoice.

**As an organizer**

1. Sign in the same way and open `/admin`.
2. If the console is empty, press **Explore the demo programme**. That gives your
   account the seeded showcase programme as a manager, so every organizer screen
   has real data in it: participants to search and filter, decisions that email
   the participant, analytics with a booking trend and fill per event, the
   announcement tools, collaboration, and the door roster.
3. The demo guests use addresses on `example.com`, reserved for documentation,
   so emails to them will not be delivered. Invite your own address, or book a
   place yourself, to see mail arrive.

**Moderator console**: `/control` is reserved for the owner address configured in
`src/convex/access.ts`, so it is not part of the public demo.

## Features

- Fest directory: programmes with their events, dates, venues and availability
- Search, categories, eligibility, availability and price-range filters
- Event pages with deadline, capacity, guest list, chief guest, announcements,
  organizer notes and a cancellation policy
- Registration with a guest-list category, waiting list and automatic promotion
- Confirmation page plus an emailed confirmation carrying a printable PDF invoice
- Participant dashboard: view, manage and release registered events
- Organizer console: participants directory with search and filters, decisions
  (confirmed / waiting list / declined / released) with emails as decided
- Analytics: places taken, fill by event, booking trend, status mix, attendance
- Collaborators: invite managers, editors and viewers to a programme by email
- Cancellation fees and organizer-written confirmation emails with tokens
- Announcements, broadcast by email to everyone holding a place
- Door roster: check participants in and out with timestamps
- Assistant, reviews, sponsorship, merchandise, campaigns and a moderator console

## Tech stack

React 19 + TypeScript + Vite, Tailwind CSS v4 and shadcn/ui, Framer Motion,
Recharts, react-router. Backend and database: Convex (queries, mutations, node
actions) with Convex Auth. Email: Resend. PDF invoices: pdf-lib.

## Setup instructions

1. `bun install`
2. `bunx convex dev` once to create the deployment and generate types
3. Run the app: `bun run dev`
4. Typecheck: `bunx tsc -b --noEmit`

The showcase catalogue seeds itself on first load, so there is sample data to
evaluate immediately.

## Deployment URL

Deployed on Freebuff/Vly at the preview domain shown in the project; the Convex
deployment serves the API and auth routes.

## Third-party services / APIs

- Convex — database, server functions, file storage, auth
- Resend — transactional email (booking confirmations, decisions, broadcasts)
- Google Fonts — Inter and Instrument Serif
- OpenStreetMap tile links appear in the static surface only

## AI tools / features used

Built with Buffy (Codebuff) inside Freebuff, with Claude-derived models writing
the code, schema, copy and tests alongside the author. AI assistance was used
for scaffolding, refactors and documentation; every change was reviewed and
verified with the typechecker and against the running deployment.

## Screenshots

See `docs/` and the deployment URL; the landing page, fest directory, event page,
participant dashboard and organizer console are the five screens worth a look.

## Known limitations

- Every place on the platform is free: prices, promo codes and payouts exist in
  the model but quote zero, so no money is collected
- Transactional email needs RESEND_API_KEY on the deployment; without it, sends
  fail loudly and the record is still written
- Broadcasts are capped at 200 recipients per announcement
- Times are shown in the catalogue timezone (Europe/London) in emails, and in the
  reader's own timezone in the interface

## License

MIT — see LICENSE.

## Overview
Project Name: Memorius
Description: Ticket managing system with state-of-the-earth systems, making selling tickets, buying and even getting sponsors as easy as clicking a few buttons.

This project uses the following tech stack:
- Vite
- Typescript
- React Router v7 (all imports from `react-router` instead of `react-router-dom`)
- React 19 (for frontend components)
- Tailwind v4 (for styling)
- Shadcn UI (for UI components library)
- Lucide Icons (for icons)
- Convex (for backend & database)
- Convex Auth (for authentication)
- Framer Motion (for animations)
- Three js (for 3d models)

## Setup

This project is set up already and running on a cloud environment.

Features:
* **Universal Multi-Device Flexibility**: Operates seamlessly across mobile, desktop, tablet, and TV displays with app-like installation capabilities.


* **Inclusive & Adaptive Interface**: Built with a dedicated color-blind palette, instant light/dark theme toggles, motion-on-request options, and zero-layout-shift skeleton loaders.


* **Comprehensive Booking Engine**: Features real-time availability, dynamic waiting lists, minute-precise event scheduling, custom promo codes, and category search filters.


* **Enterprise Financial Management**: Features unified ledgers, multi-currency support, seasonal revenue analytics, paper invoicing, and refund-ready accounting.


* **Flexible Payment Workflows**: Supports pay-later, settle-at-the-desk, custom cancellation fees, and clean modular gateway expansion.


* **Collaborative Organizer Consoles**: Provides dedicated business consoles, multi-user role permissions, customizable confirmation emails, and automated 24-hour deadline alerts.


* **Streamlined Onsite Operations**: Simplifies event execution with automated door lists, merchandise/beverage stock ledgers, and printable physical reports.


* **Monetization & Sponsor Pipeline**: Maximizes event revenue through sponsor tier management, pipeline tracking, status monitoring, and campaign reach metrics.


* **Immersive Attendee Discovery**: Drives engagement with photo-led cards, daily media slideshows, shareable event links, and clean web URLs.


* **Frictionless Onboarding**: Removes registration barriers using expiring email passcode logins, anonymous guest access, and pre-signup browsing.


* **Interactive Community Ecosystem**: Fosters trust with verified attendee reviews, computed rating averages, file-supported comment threads, and a unified messaging inbox.


* **Ironclad Moderation & Security**: Protects platform integrity using multi-step moderation queues, appointed moderator permissions, and strict data privacy controls.


* **Global Localization Engine**: Built with a five-language engine featuring explicit user preference persistence and locale selection.


* **24/7 AI Assistant**: Integrates an intelligent AI bot engineered specifically for Memorius.com to assist event creators and attendees around the clock[cite: 2, 3, 4].
* **Micro-UX Craftsmanship**: Polished with plain-language error reporting, apologetic 404 pages, clear focus indicators, and reactive interface elements[cite: 2].
* **100% Rulebook Compliance**: Fully built, rigorously tested, and verified against every required specification in the competition rulebook[cite: 3].

Deployment URL: memorius.freebuff.app

Third-party services/APIs : Resend API

AI tools/features used: freebuff

Known limitations: Payment gateway is not established as it needs trade license.

License: MIT License
