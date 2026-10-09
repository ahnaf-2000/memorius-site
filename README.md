# Memorius — Smart Club Operations

A web platform for a student organization: publish fests, run the events inside
them, and take registrations without a single Google Form. Organizers create and
monitor programmes; students browse, register and manage their own places.

**Organization → Fest → Event → Registration**, end to end.

## Demo credentials

Registration and sign-in both use an email one-time code. To evaluate the
platform quickly, sign in with your own address and you land as a participant
with a dashboard of bookings. The organizer console is open to any signed-in
account at /admin — the programmes you create there are yours.

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

Deployment URL: memorius.freebuff.app
Third-party services/APIs : Resend API
AI tools/features used: freebuff
Known limitations: Payment gateway is not established as it needs trade license.
License: MIT License
