import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { makeReference } from "./model";

export const TOPICS = [
  "Booking or payment",
  "Running a programme",
  "Sponsorship",
  "Merchandise and snacks",
  "Press or partnership",
  "Something else",
] as const;

const MIN_BODY = 20;
const MAX_BODY = 2000;

/**
 * The contact form. Deliberately open — a person who cannot reach anyone is
 * worse than a message we did not want — but every field is validated and
 * normalised, and the sender gets a reference to quote.
 */
export const send = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    topic: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim().slice(0, 120);
    const email = args.email.trim().toLowerCase().slice(0, 200);
    const topic = args.topic.trim().slice(0, 80) || "Something else";
    const body = args.body.trim().slice(0, MAX_BODY);

    if (name.length < 2) throw new Error("Please add the name we should reply to.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("Please check the email address.");
    }
    if (body.length < MIN_BODY) {
      throw new Error("A sentence or two helps us route it to the right person.");
    }

    const reference = makeReference();
    await ctx.db.insert("messages", {
      name,
      email,
      topic,
      subject: args.subject?.trim().slice(0, 160) || undefined,
      body,
      reference,
      createdAt: Date.now(),
    });

    return { reference, receivedAt: Date.now() };
  },
});
