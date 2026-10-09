import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation } from "./_generated/server";
import { makeReference } from "./model";

const MIN_BODY = 15;
const MAX_BODY = 2000;

/**
 * Customer support.
 *
 * A request is written down first and emailed second, which is the order that
 * matters: the record survives a mail provider having a bad afternoon, and the
 * moderator's inbox gets the message with the customer's address as the reply
 * target. Anything that cannot be emailed is still in the table.
 */
export const open = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    topic: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim().slice(0, 120);
    const email = args.email.trim().toLowerCase().slice(0, 200);
    const topic = args.topic.trim().slice(0, 80) || "Support";
    const body = args.body.trim().slice(0, MAX_BODY);

    if (name.length < 2) {
      throw new Error("Please add the name we should reply to.");
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("Please check the email address.");
    }
    if (body.length < MIN_BODY) {
      throw new Error("A sentence or two helps us answer properly.");
    }

    const reference = makeReference();
    const createdAt = Date.now();

    await ctx.db.insert("messages", {
      name,
      email,
      topic: `Support · ${topic}`,
      body,
      reference,
      createdAt,
    });

    // The inbox the moderator actually reads, sent from the server so the
    // address is never exposed to the browser.
    await ctx.scheduler.runAfter(0, internal.mail.sendSupportMessage, {
      name,
      email,
      topic,
      body,
      reference,
    });

    return { reference, receivedAt: createdAt };
  },
});
