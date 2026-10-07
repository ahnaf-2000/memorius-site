import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalQuery, query } from "./_generated/server";

/**
 * The always-available assistant, "Memo".
 *
 * It answers from the live catalogue: whatever is on sale, when it happens,
 * what it costs and how many places are left. When a model key is present
 * (GEMINI_API_KEY, GROQ_API_KEY or OPENAI_API_KEY) the snapshot is handed to
 * that model as grounding context. Without a key it still answers — from the
 * same snapshot, with a rule-based reply — so the assistant is never a dead end.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function shortDate(ts: number) {
  const date = new Date(ts);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function money(minorUnits: number) {
  const whole = minorUnits % 100 === 0;
  return `$${whole ? minorUnits / 100 : (minorUnits / 100).toFixed(2)}`;
}

type Snapshot = {
  programmes: { name: string; organization: string; slug: string }[];
  events: {
    title: string;
    slug: string;
    startTime: number;
    venue: string;
    category: string;
    price: number;
    remaining: number;
    capacity: number;
  }[];
};

/** Fixed grounding snapshot: the catalogue as it stands right now. */
export const snapshot = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const events = await ctx.db
      .query("events")
      .withIndex("by_start", (q) => q.gt("startTime", now))
      .take(40);
    const fests = await ctx.db.query("fests").collect();

    return {
      programmes: fests.map((fest) => ({
        name: fest.name,
        organization: fest.organization,
        slug: fest.slug,
      })),
      events: events.map((event) => ({
        title: event.title,
        slug: event.slug,
        startTime: event.startTime,
        venue: event.venue,
        category: event.category,
        price: event.price,
        remaining: Math.max(0, event.capacity - event.seatsTaken),
        capacity: event.capacity,
      })),
    } satisfies Snapshot;
  },
});

type Provider = { kind: "gemini" | "openai"; key: string; label: string };

function resolveProvider(): Provider | null {
  if (process.env.GEMINI_API_KEY) {
    return { kind: "gemini", key: process.env.GEMINI_API_KEY, label: "Google Gemini" };
  }
  if (process.env.GROQ_API_KEY) {
    return { kind: "openai", key: process.env.GROQ_API_KEY, label: "Groq" };
  }
  if (process.env.OPENAI_API_KEY) {
    return { kind: "openai", key: process.env.OPENAI_API_KEY, label: "OpenAI" };
  }
  return null;
}

/** Whether a model key is present, so the interface can say which mode it is in. */
export const status = query({
  args: {},
  handler: async () => {
    const provider = resolveProvider();
    return { configured: provider !== null, provider: provider?.label ?? null };
  },
});

function systemPrompt(data: Snapshot) {
  const lines = data.events
    .slice(0, 12)
    .map(
      (event) =>
        `- ${event.title} (${event.slug}) on ${shortDate(event.startTime)}, ${event.venue}, ${event.category}, ${event.price === 0 ? "free" : money(event.price)}, ${event.remaining} of ${event.capacity} places left`,
    )
    .join("\n");
  const programmes = data.programmes
    .map((fest) => `- ${fest.name} by ${fest.organization} (/programmes/${fest.slug})`)
    .join("\n");

  return [
    "You are Memo, the assistant inside Memorius, a platform for business events.",
    "Answer only from the catalogue below and from how the product works.",
    "Bookings: open an event and reserve a place; a reference is issued immediately.",
    "The shop on each event sells merchandise and snacks; sponsors can pledge at programme or event level; attendees can leave a review.",
    "Payment methods accepted: bKash, Nagad, Google Pay, PayPal, card, or settle on site.",
    "Prices are quoted in the visitor's local currency; the underlying figure is in US dollars.",
    "Be warm and brief — at most 120 words, plain sentences, no headings or bullet lists longer than four items.",
    "If something is not in the data, say so plainly and point to the catalogue page.",
    "",
    "PROGRAMMES:",
    programmes || "- none published yet",
    "",
    "EVENTS ON SALE:",
    lines || "- nothing on sale right now",
  ].join("\n");
}

function tierOf(question: string) {
  const text = question.toLowerCase();
  if (/(price|cost|fee|how much|cheap|expensive|budget)/.test(text)) return "price";
  if (/(when|date|time|schedule|calendar|soon|today|tomorrow)/.test(text))
    return "when";
  if (/(sponsor|partner|fund|back the)/.test(text)) return "sponsor";
  if (/(merch|shop|snack|food|drink|t-?shirt|tote|buy)/.test(text)) return "shop";
  if (/(review|rating|feedback|worth it)/.test(text)) return "review";
  if (/(book|place|seat|ticket|register|reserve|waiting)/.test(text))
    return "booking";
  if (/(pay|bkash|nagad|paypal|google|card|currency|dollar|taka|currency)/.test(text))
    return "payment";
  return "general";
}

/** Rule-based answer used when no model key is configured. */
function fallbackAnswer(question: string, data: Snapshot) {
  const tier = tierOf(question);
  const next = data.events.slice(0, 3);
  const list = next
    .map(
      (event) =>
        `“${event.title}” on ${shortDate(event.startTime)} at ${event.venue} — ${
          event.price === 0 ? "free" : money(event.price)
        }, ${event.remaining} places left`,
    )
    .join("; ");

  if (data.events.length === 0) {
    return "The catalogue is quiet at the moment — nothing is open for booking. Publish a programme from the admin console and it will appear here.";
  }

  switch (tier) {
    case "when":
      return `The next three events are ${list}. Everything on sale is listed at /events, and each event page carries the full date and time.`;
    case "price":
      return `Prices are per place: ${list}. The figure follows your country — change it from the region menu and the whole site re-quotes in your local currency.`;
    case "booking":
      return `Open any event and choose “Reserve a place”. You keep a reference immediately, and if the room is full you join the waiting list and are promoted automatically. Places left right now: ${list}.`;
    case "shop":
      return `Each event has its own shop — merchandise to take home and snacks for the day. Add what you want to the basket on the event page and pay by bKash, Nagad, Google Pay, PayPal or card. Try it on “${next[0].title}”.`;
    case "sponsor":
      return `Sponsorship runs at programme and event level, in four tiers from Community to Lead partner. Pledge from any event or programme page; the organizer confirms it and it appears in their revenue screen.`;
    case "review":
      return `Anyone signed in can leave a rating and a short review on an event page once it has happened, and the average shows on the event card.`;
    case "payment":
      return `You can pay by bKash, Nagad, Google Pay, PayPal or card, or settle at the desk on the day. Organizers set where their own payouts land in the admin console.`;
    default:
      return `Here is what is on: ${list}. I can help with dates, prices, booking, the merchandise and snack shop, sponsorship, or payments. Ask me any of those, or open /events to browse everything.`;
  }
}

async function callProvider(
  provider: Provider,
  system: string,
  question: string,
  history: { role: "user" | "assistant"; content: string }[],
) {
  const model = process.env.ASSISTANT_MODEL;

  if (provider.kind === "gemini") {
    const name = model ?? "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${name}:generateContent?key=${provider.key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [
            ...history.slice(-6).map((turn) => ({
              role: turn.role === "assistant" ? "model" : "user",
              parts: [{ text: turn.content }],
            })),
            { role: "user", parts: [{ text: question }] },
          ],
          generationConfig: { temperature: 0.4, maxOutputTokens: 700 },
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Gemini replied ${response.status}`);
    }
    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const reply = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("Gemini returned an empty answer");
    return reply.trim();
  }

  const endpoint =
    provider.label === "Groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
  const name =
    model ?? (provider.label === "Groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.key}`,
    },
    body: JSON.stringify({
      model: name,
      temperature: 0.4,
      max_tokens: 700,
      messages: [
        { role: "system", content: system },
        ...history.slice(-6),
        { role: "user", content: question },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`${provider.label} replied ${response.status}`);
  }
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const reply = payload.choices?.[0]?.message?.content;
  if (!reply) throw new Error("The model returned an empty answer");
  return reply.trim();
}

export const ask = action({
  args: {
    question: v.string(),
    history: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const question = args.question.trim().slice(0, 600);
    const data = (await ctx.runQuery(internal.assistant.snapshot, {})) as Snapshot;

    if (question.length < 2) {
      return {
        reply:
          "Ask me about dates, prices, places left, the shop, sponsorship or payments.",
        configured: resolveProvider() !== null,
        provider: resolveProvider()?.label ?? null,
      };
    }

    const provider = resolveProvider();
    if (provider === null) {
      return {
        reply: fallbackAnswer(question, data),
        configured: false,
        provider: null,
      };
    }

    try {
      const reply = await callProvider(
        provider,
        systemPrompt(data),
        question,
        args.history ?? [],
      );
      return { reply, configured: true, provider: provider.label };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      return {
        reply: `${fallbackAnswer(question, data)}\n\n(The model could not be reached — ${reason}. This answer came from the catalogue itself.)`,
        configured: true,
        provider: provider.label,
        degraded: true,
      };
    }
  },
});
