"use node";

import { v } from "convex/values";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { internalAction } from "./_generated/server";

/**
 * Everything the product sends by email.
 *
 * Two messages exist: the confirmation a customer gets the moment a place is
 * taken — with the invoice as a printable PDF attached — and a support request,
 * which is delivered to the moderator's own inbox so a reply can be sent from
 * the mail client they already use.
 *
 * Delivery runs through Resend, which needs one secret: RESEND_API_KEY. The
 * `from` address and the support inbox are environment values with working
 * defaults, so the feature works the moment the key exists and can be pointed
 * at a verified domain afterwards:
 *
 *   RESEND_API_KEY   required — the sending key
 *   MAIL_FROM        optional — e.g. "Memorius <events@your-own-domain>"
 *   SUPPORT_INBOX    optional — overrides the moderator's address
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function fromAddress(): string {
  return process.env.MAIL_FROM ?? "Memorius <onboarding@resend.dev>";
}

/**
 * The site owner's address: the moderator this deployment was handed to. It is
 * the same allowlist `convex/access.ts` decides ownership from, repeated here so
 * a support request never depends on the database being up.
 */
const OWNER_INBOX = "ahnaf2010muhtasim@gmail.com";

/**
 * Where support lands: the moderator's own inbox, never a shared black hole.
 * SUPPORT_INBOX overrides it once an organizer wants a domain address.
 */
export function moderatorInbox(): string {
  return (
    process.env.SUPPORT_INBOX ??
    process.env.MODERATOR_EMAIL ??
    process.env.CONTACT_INBOX ??
    OWNER_INBOX
  );
}

interface Attachment {
  filename: string;
  content: string; // base64
}

async function deliver({
  to,
  subject,
  html,
  text,
  replyTo,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: Attachment[];
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set on this Convex deployment, so nothing can be emailed.",
    );
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [to],
      subject,
      html,
      text,
      ...(replyTo === undefined ? {} : { reply_to: replyTo }),
      ...(attachments === undefined ? {} : { attachments }),
    }),
  });

  if (!response.ok) {
    // The body explains the refusal (an unverified domain, a bad recipient);
    // it never contains the key, so it is safe to surface.
    const detail = await response.text();
    throw new Error(
      `Could not send the email (HTTP ${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  return (await response.json()) as { id?: string };
}

/* --------------------------------------------------------------- the invoice */

export interface InvoiceRow {
  label: string;
  value: string;
}

/**
 * A one-page A4 invoice, drawn rather than printed.
 *
 * Written by hand with pdf-lib so the attachment is a real file that opens in
 * any reader — and so an invoice can be re-issued from the record without a
 * browser in the loop.
 */
async function invoicePdf({
  reference,
  issuedTo,
  rows,
  note,
  lines,
}: {
  reference: string;
  issuedTo: string;
  rows: InvoiceRow[];
  note: string;
  lines: { name: string; quantity: number; total: string }[];
}): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${reference}`);
  pdf.setProducer("Memorius");
  pdf.setCreator("Memorius");

  const page = pdf.addPage([595.28, 841.89]); // A4, portrait
  const width = page.getWidth();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.12, 0.12, 0.13);
  const muted = rgb(0.45, 0.45, 0.48);
  const hairline = rgb(0.85, 0.85, 0.86);
  const margin = 56;
  let y = page.getHeight() - margin;

  const text = (value: string, options: { size?: number; bold?: boolean }) =>
    page.drawText(value, {
      x: margin,
      y,
      size: options.size ?? 10.5,
      font: options.bold === true ? bold : regular,
      color: ink,
    });

  // Masthead
  page.drawText("Memorius", {
    x: margin,
    y: y - 4,
    size: 20,
    font: bold,
    color: ink,
  });
  page.drawText("Invoice and booking confirmation", {
    x: margin,
    y: y - 24,
    size: 10.5,
    font: regular,
    color: muted,
  });
  // A mark of the product's own, drawn rather than shipped as an asset.
  page.drawRectangle({
    x: width - margin - 46,
    y: y - 30,
    width: 46,
    height: 34,
    color: rgb(0.14, 0.3, 0.38),
  });
  page.drawRectangle({
    x: width - margin - 38,
    y: y - 12,
    width: 30,
    height: 4,
    color: rgb(1, 1, 1),
  });
  page.drawRectangle({
    x: width - margin - 38,
    y: y - 21,
    width: 18,
    height: 4,
    color: rgb(0.94, 0.71, 0.5),
  });

  y -= 62;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.7,
    color: hairline,
  });

  y -= 26;
  page.drawText(`Reference ${reference}`, {
    x: margin,
    y,
    size: 12,
    font: bold,
    color: ink,
  });
  page.drawText(issuedTo, {
    x: width - margin - bold.widthOfTextAtSize(issuedTo, 10.5),
    y,
    size: 10.5,
    font: regular,
    color: muted,
  });

  y -= 28;
  const labelWidth = 190;
  for (const row of rows) {
    const wrapped = wrap(row.value, regular, 10.5, width - margin * 2 - labelWidth);
    page.drawText(row.label, {
      x: margin,
      y,
      size: 9.5,
      font: regular,
      color: muted,
    });
    wrapped.forEach((line, index) => {
      page.drawText(line, {
        x: margin + labelWidth,
        y: y - index * 14,
        size: 10.5,
        font: regular,
        color: ink,
      });
    });
    y -= 14 * Math.max(1, wrapped.length) + 9;
    page.drawLine({
      start: { x: margin, y: y + 4 },
      end: { x: width - margin, y: y + 4 },
      thickness: 0.4,
      color: hairline,
    });
  }

  if (lines.length > 0) {
    y -= 10;
    text("Shop order", { size: 9.5, bold: true });
    y -= 18;
    for (const line of lines) {
      page.drawText(`${line.quantity} × ${line.name}`, {
        x: margin,
        y,
        size: 10.5,
        font: regular,
        color: ink,
      });
      page.drawText(line.total, {
        x: width - margin - regular.widthOfTextAtSize(line.total, 10.5),
        y,
        size: 10.5,
        font: regular,
        color: ink,
      });
      y -= 16;
    }
  }

  y -= 6;
  const total = "No charge — every place is free";
  page.drawText("Total", { x: margin, y, size: 11, font: bold, color: ink });
  page.drawText(total, {
    x: width - margin - bold.widthOfTextAtSize(total, 11),
    y,
    size: 11,
    font: bold,
    color: ink,
  });

  y -= 34;
  for (const paragraph of wrap(note, regular, 9.5, width - margin * 2)) {
    page.drawText(paragraph, {
      x: margin,
      y,
      size: 9.5,
      font: regular,
      color: muted,
    });
    y -= 13;
  }

  page.drawText("This document prints to A4 and needs no colour ink.", {
    x: margin,
    y: margin - 14,
    size: 8.5,
    font: regular,
    color: muted,
  });

  const bytes = await pdf.save();
  return Buffer.from(bytes).toString("base64");
}

/** Break a sentence into lines that fit a width, on word boundaries. */
function wrap(
  value: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number,
): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line.length === 0 ? word : `${line} ${word}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line.length > 0) lines.push(line);
      line = word;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines.length === 0 ? [""] : lines;
}

/** Shared shell so both emails look like the same product wrote them. */
function shell(heading: string, body: string): string {
  return `<!doctype html>
<html lang="en"><body style="margin:0;background:#fdfdfb;padding:32px 16px;font-family:Inter,Helvetica,Arial,sans-serif;color:#1b1b1c">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;border-collapse:collapse;background:#ffffff;border:1px solid #e6e4e0;border-radius:12px">
    <tr><td style="padding:28px 32px 8px">
      <p style="margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7a7a7e">Memorius</p>
      <h1 style="margin:10px 0 0;font-size:21px;font-weight:500;line-height:1.3">${heading}</h1>
    </td></tr>
    <tr><td style="padding:8px 32px 28px">${body}</td></tr>
    <tr><td style="padding:18px 32px;border-top:1px solid #e6e4e0">
      <p style="margin:0;font-size:12px;color:#7a7a7e">Every place on Memorius is free to book. The invoice attached to this message is your record of it.</p>
    </td></tr>
  </table>
</body></html>`;
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ------------------------------------------------------------------ booking */

/**
 * The confirmation a customer gets the moment a place is taken, carrying every
 * credential they need at the door and the invoice as a PDF.
 */
export const sendBookingConfirmation = internalAction({
  args: {
    to: v.string(),
    fullName: v.string(),
    reference: v.string(),
    status: v.string(),
    eventTitle: v.string(),
    programmeName: v.string(),
    organization: v.string(),
    when: v.string(),
    time: v.string(),
    venue: v.string(),
    category: v.string(),
    eligibility: v.string(),
    deadline: v.string(),
    chiefGuest: v.string(),
    specialGuests: v.array(v.string()),
    organizerNotes: v.string(),
    announcements: v.array(
      v.object({ title: v.string(), body: v.string(), at: v.string() }),
    ),
    invoiceUrl: v.string(),
    eventUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const rows: InvoiceRow[] = [
      { label: "Attendee", value: args.fullName },
      { label: "Status", value: args.status },
      { label: "Event", value: args.eventTitle },
      { label: "Programme", value: `${args.organization} · ${args.programmeName}` },
      { label: "Date", value: args.when },
      { label: "Time", value: args.time },
      { label: "Venue", value: args.venue },
      { label: "Category", value: args.category },
      { label: "Who may attend", value: args.eligibility },
      { label: "Booking deadline", value: args.deadline },
      { label: "Chief guest", value: args.chiefGuest },
      {
        label: "Special guests",
        value: args.specialGuests.length === 0 ? "None" : args.specialGuests.join(", "),
      },
      { label: "Special notes from the organizer", value: args.organizerNotes },
      { label: "Price per place", value: "No charge" },
    ];

    const note =
      args.announcements.length === 0
        ? "Nothing has been announced since this event was published. Keep the reference above: it is your place on the guest list."
        : `Announcements so far:\n${args.announcements
            .map((note) => `· ${note.title} (${note.at}) — ${note.body}`)
            .join("\n")}`;

    const attachment = await invoicePdf({
      reference: args.reference,
      issuedTo: args.fullName,
      rows,
      note,
      lines: [],
    });

    const details = rows
      .map(
        (row) =>
          `<tr><td style="padding:7px 0;font-size:12px;color:#7a7a7e;vertical-align:top">${escape(
            row.label,
          )}</td><td style="padding:7px 0;font-size:13px;text-align:right">${escape(
            row.value,
          )}</td></tr>`,
      )
      .join("");

    const announcements =
      args.announcements.length === 0
        ? ""
        : `<h2 style="margin:26px 0 8px;font-size:13px;font-weight:600">Announcements</h2>${args.announcements
            .map(
              (note) =>
                `<div style="border:1px solid #e6e4e0;border-radius:10px;padding:12px 14px;margin-bottom:8px"><p style="margin:0;font-size:13px;font-weight:600">${escape(
                  note.title,
                )}</p><p style="margin:6px 0 0;font-size:12px;color:#5c5c60;line-height:1.6">${escape(
                  note.body,
                )}</p><p style="margin:6px 0 0;font-size:11px;color:#7a7a7e">${escape(
                  note.at,
                )}</p></div>`,
            )
            .join("")}`;

    await deliver({
      to: args.to,
      subject: `Your place is confirmed — ${args.eventTitle} (${args.reference})`,
      html: shell(
        args.status === "waitlisted"
          ? "You are on the waiting list"
          : "Your place is confirmed",
        `<p style="margin:0 0 18px;font-size:14px;line-height:1.7">Hello ${escape(
          args.fullName,
        )}, </p>
         <p style="margin:0 0 18px;font-size:14px;line-height:1.7">${
           args.status === "waitlisted"
             ? "The room is full, so your name is on the waiting list and moves up automatically the moment a place is released."
             : "Your place is held. Everything you need at the door is below, and the invoice is attached as a printable PDF."
         }</p>
         <div style="border:1px dashed #d8d5d0;border-radius:10px;padding:14px 16px;margin-bottom:20px">
           <p style="margin:0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#7a7a7e">Reference</p>
           <p style="margin:6px 0 0;font-size:19px;letter-spacing:.06em">${escape(
             args.reference,
           )}</p>
         </div>
         <table role="presentation" width="100%" style="border-collapse:collapse">${details}</table>
         ${announcements}
         <p style="margin:24px 0 0"><a href="${args.eventUrl}" style="display:inline-block;background:#1b1b1c;color:#ffffff;text-decoration:none;border-radius:999px;padding:11px 20px;font-size:13px">Open the event page</a></p>
         <p style="margin:14px 0 0;font-size:12px;color:#7a7a7e">The attached invoice prints as it is. Your bookings, and this reference, live at <a href="${args.invoiceUrl}" style="color:#1b1b1c">${args.invoiceUrl}</a></p>`,
      ),
      text: [
        args.status === "waitlisted"
          ? "You are on the waiting list."
          : "Your place is confirmed.",
        `Reference: ${args.reference}`,
        ...rows.map((row) => `${row.label}: ${row.value}`),
        `Your bookings: ${args.invoiceUrl}`,
        `Event: ${args.eventUrl}`,
      ].join("\n"),
      attachments: [
        {
          filename: `invoice-${args.reference}.pdf`,
          content: attachment,
        },
      ],
    });

    return { sent: true as const, reference: args.reference };
  },
});

/* ------------------------------------------------------------------ support */

/** A support request, delivered to the moderator's own inbox. */
export const sendSupportMessage = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    topic: v.string(),
    body: v.string(),
    reference: v.string(),
  },
  handler: async (_ctx, args) => {
    const inbox = moderatorInbox();
    await deliver({
      to: inbox,
      replyTo: args.email,
      subject: `[Support ${args.reference}] ${args.topic}`,
      html: shell(
        `Support request ${args.reference}`,
        `<table role="presentation" width="100%" style="border-collapse:collapse">
           <tr><td style="padding:6px 0;font-size:12px;color:#7a7a7e">From</td><td style="padding:6px 0;font-size:13px;text-align:right">${escape(
             args.name,
           )} · ${escape(args.email)}</td></tr>
           <tr><td style="padding:6px 0;font-size:12px;color:#7a7a7e">Topic</td><td style="padding:6px 0;font-size:13px;text-align:right">${escape(
             args.topic,
           )}</td></tr>
           <tr><td style="padding:6px 0;font-size:12px;color:#7a7a7e">Reference</td><td style="padding:6px 0;font-size:13px;text-align:right">${escape(
             args.reference,
           )}</td></tr>
         </table>
         <div style="margin-top:16px;border-left:3px solid #e6e4e0;padding-left:14px">
           <p style="margin:0;font-size:14px;line-height:1.7;white-space:pre-wrap">${escape(
             args.body,
           )}</p>
         </div>
         <p style="margin:18px 0 0;font-size:12px;color:#7a7a7e">Replying to this message answers ${escape(
           args.email,
         )} directly.</p>`,
      ),
      text: `Support ${args.reference}\nFrom: ${args.name} <${args.email}>\nTopic: ${args.topic}\n\n${args.body}`,
    });

    return { deliveredTo: inbox };
  },
});
