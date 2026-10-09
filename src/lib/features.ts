import {
  Accessibility,
  AppWindow,
  Ban,
  Banknote,
  BarChart3,
  Bell,
  Boxes,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coffee,
  Coins,
  Compass,
  CreditCard,
  Download,
  Eye,
  FileDown,
  FileText,
  Filter,
  Fingerprint,
  Focus,
  Gauge,
  Gift,
  Globe,
  Handshake,
  HeartHandshake,
  Image,
  Images,
  Info,
  Keyboard,
  KeyRound,
  Landmark,
  Languages,
  Layers,
  LayoutGrid,
  LineChart,
  ListChecks,
  LockKeyhole,
  Mail,
  MailCheck,
  MapPin,
  Megaphone,
  MessagesSquare,
  Moon,
  MousePointerClick,
  Package,
  Palette,
  Paperclip,
  Percent,
  PieChart,
  Pin,
  Printer,
  Receipt,
  RefreshCw,
  ScrollText,
  Search,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  StickyNote,
  Sun,
  Tag,
  Ticket,
  Timer,
  TrendingUp,
  UserCheck,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * The hundred reasons, as data.
 *
 * Every square on the wall is one thing this product does that the calmer,
 * plainer event sites do not: the fifth seat state that becomes a waiting list,
 * the promo code that cannot be over-redeemed, the moderator who can outrank a
 * review its own organiser refuses to touch. Each entry carries a two-word
 * label for the square and one sentence for the explanation behind it.
 *
 * Written by hand and checked against the code, not generated from adjectives:
 * if a square claims it, the product does it.
 */
export type FeatureTone = "booking" | "programmes" | "control" | "craft";

export interface Feature {
  label: string;
  detail: string;
  tone: FeatureTone;
  icon: LucideIcon;
}

export const FEATURE_TONES: {
  id: FeatureTone;
  name: string;
  blurb: string;
}[] = [
  {
    id: "booking",
    name: "Booking and money",
    blurb: "From the first seat to the last payout.",
  },
  {
    id: "programmes",
    name: "Programmes and events",
    blurb: "Seasons, line-ups and everything said about them.",
  },
  {
    id: "control",
    name: "Control and staff",
    blurb: "Who may do what, and how it is enforced.",
  },
  {
    id: "craft",
    name: "Craft and access",
    blurb: "The parts you only notice when they are missing.",
  },
];

export const FEATURES: Feature[] = [
  // ---- Booking and money -------------------------------------------------
  {
    label: "One ledger",
    detail:
      "Bookings, payments and payouts share a single record, so nothing is reconciled twice.",
    tone: "booking",
    icon: Receipt,
  },
  {
    label: "Pay now or collect",
    detail:
      "Take the card for a shop order up front, or settle it at the desk when it is collected.",
    tone: "booking",
    icon: CreditCard,
  },
  {
    label: "Honest availability",
    detail:
      "Seats left are derived live from capacity and confirmed bookings, never a stored counter.",
    tone: "booking",
    icon: Gauge,
  },
  {
    label: "Waiting list",
    detail:
      "When a room fills, latecomers are told it is a waiting list instead of hitting a wall.",
    tone: "booking",
    icon: Clock,
  },
  {
    label: "Promo codes",
    detail:
      "Time-boxed campaigns that discount a shop order without anyone editing a price list.",
    tone: "booking",
    icon: Percent,
  },
  {
    label: "Coded limits",
    detail:
      "Cap a campaign by the number of times it may be used, so one leaked code cannot drain a season.",
    tone: "booking",
    icon: Tag,
  },
  {
    label: "Short references",
    detail:
      "Every booking gets a six-character reference that is quotable over the phone.",
    tone: "booking",
    icon: Ticket,
  },
  {
    label: "Business bookings",
    detail:
      "A company can book on behalf of a team, with the organisation kept on the record.",
    tone: "booking",
    icon: Briefcase,
  },
  {
    label: "Guest details",
    detail:
      "Name, email, phone and notes travel with the booking all the way to the door.",
    tone: "booking",
    icon: UserRound,
  },
  {
    label: "Cancel and release",
    detail:
      "A cancelled booking puts its seat back in the room the moment it is cancelled.",
    tone: "booking",
    icon: Ban,
  },
  {
    label: "Settle at the desk",
    detail:
      "Mark a shop order as collected and paid in one tap, with the method recorded.",
    tone: "booking",
    icon: Banknote,
  },
  {
    label: "Currency by choice",
    detail:
      "Shop prices and sponsorship are quoted in the currency the reader picked, at an indicative rate.",
    tone: "booking",
    icon: Coins,
  },
  {
    label: "Regional numbers",
    detail:
      "Amounts and dates are written the way the reader’s own country writes them.",
    tone: "booking",
    icon: Globe,
  },
  {
    label: "Merchandise",
    detail:
      "Caps, programmes and tote bags are sold straight from the event page, in one basket.",
    tone: "booking",
    icon: ShoppingBag,
  },
  {
    label: "Snacks and drinks",
    detail:
      "The day’s food and drink are ordered the same way as everything else on the shelf.",
    tone: "booking",
    icon: Coffee,
  },
  {
    label: "Stock that counts",
    detail:
      "Only what remains is offered, and a sold-out line withdraws itself from the shop.",
    tone: "booking",
    icon: Boxes,
  },
  {
    label: "Sponsor tiers",
    detail:
      "Sell packages with a price, the perks included and a place in the programme.",
    tone: "booking",
    icon: Handshake,
  },
  {
    label: "Sponsor pipeline",
    detail:
      "Follow a sponsor from first approach to confirmed to paid on one board.",
    tone: "booking",
    icon: HeartHandshake,
  },
  {
    label: "Payout details",
    detail:
      "Where the money should land, stored once on the business account and reused.",
    tone: "booking",
    icon: Landmark,
  },
  {
    label: "Revenue overview",
    detail:
      "Shop takings and sponsorship by programme, event and payment method, without opening a spreadsheet.",
    tone: "booking",
    icon: TrendingUp,
  },
  {
    label: "Payment at a glance",
    detail:
      "Paid, part-paid and due-at-desk each read differently, at every size they appear.",
    tone: "booking",
    icon: Coins,
  },
  {
    label: "Invoices as paper",
    detail:
      "Print a confirmation laid out for A4, or save the same sheet as a PDF.",
    tone: "booking",
    icon: Printer,
  },
  {
    label: "Notes on orders",
    detail:
      "A booking can carry the caveat the desk needs to see before the guest arrives.",
    tone: "booking",
    icon: StickyNote,
  },
  {
    label: "Capacity, changed",
    detail:
      "Change the size of a room and availability follows in the same breath.",
    tone: "booking",
    icon: BarChart3,
  },
  {
    label: "Close early",
    detail:
      "Shut a registration window without cancelling the event behind it.",
    tone: "booking",
    icon: Timer,
  },
  {
    label: "Free places",
    detail:
      "Every event is free to attend, whoever runs it — no price to set and none to pay.",
    tone: "booking",
    icon: Wallet,
  },
  {
    label: "No surprise fees",
    detail:
      "The number on the card is the price, the discount and the total — nothing else is added.",
    tone: "booking",
    icon: CheckCircle2,
  },
  {
    label: "Refund-ready records",
    detail:
      "Every change keeps the reference, the amount and the moment it happened.",
    tone: "booking",
    icon: ListChecks,
  },

  // ---- Programmes and events --------------------------------------------
  {
    label: "Programmes as seasons",
    detail:
      "Group events into a named programme with a start date and an end date.",
    tone: "programmes",
    icon: Layers,
  },
  {
    label: "A page per season",
    detail:
      "Every programme has its own address that can be linked, shared and bookmarked.",
    tone: "programmes",
    icon: FileText,
  },
  {
    label: "Events inside",
    detail:
      "One season, many events, and a single place to run all of them from.",
    tone: "programmes",
    icon: LayoutGrid,
  },
  {
    label: "Shareable events",
    detail:
      "Each event page has a readable address of its own, not a query string.",
    tone: "programmes",
    icon: Pin,
  },
  {
    label: "Venue and host",
    detail: "Say where it is and who runs it, in the same place, every time.",
    tone: "programmes",
    icon: MapPin,
  },
  {
    label: "Dates to the minute",
    detail:
      "Start and end are stored absolutely, so no timezone guess can move them.",
    tone: "programmes",
    icon: CalendarClock,
  },
  {
    label: "Category filters",
    detail:
      "Find the talks among the workshops, or the workshops among the talks.",
    tone: "programmes",
    icon: Filter,
  },
  {
    label: "One palette to search",
    detail:
      "A single command palette reaches any event, programme or page by name.",
    tone: "programmes",
    icon: Search,
  },
  {
    label: "What is on next",
    detail:
      "The catalogue leads with what is happening soonest, not with what is newest.",
    tone: "programmes",
    icon: CalendarDays,
  },
  {
    label: "Finished stays readable",
    detail:
      "A season that has ended keeps its page; it simply stops accepting bookings.",
    tone: "programmes",
    icon: ScrollText,
  },
  {
    label: "Draft before publish",
    detail:
      "A programme can exist and be worked on before it is announced to anyone.",
    tone: "programmes",
    icon: FileDown,
  },
  {
    label: "Readable web addresses",
    detail:
      "Addresses look like /programmes/operations-summit rather than ?id=8172.",
    tone: "programmes",
    icon: Compass,
  },
  {
    label: "Showcase to explore",
    detail:
      "A furnished example catalogue, so the product can be judged before it is filled.",
    tone: "programmes",
    icon: Sparkles,
  },
  {
    label: "Photo-led cards",
    detail:
      "An image carries the card and the text explains it, in that order.",
    tone: "programmes",
    icon: Image,
  },
  {
    label: "A slideshow of the day",
    detail:
      "Event pages show photographs from the room rather than generic decoration.",
    tone: "programmes",
    icon: Images,
  },
  {
    label: "Reviews from attendees",
    detail:
      "A star rating and a written review, left by people who were actually there.",
    tone: "programmes",
    icon: Star,
  },
  {
    label: "A computed average",
    detail:
      "The score on a card is calculated from its reviews, never typed in by hand.",
    tone: "programmes",
    icon: LineChart,
  },
  {
    label: "Reviews you can edit",
    detail:
      "Replace the review you already left instead of leaving three and hoping.",
    tone: "programmes",
    icon: RefreshCw,
  },
  {
    label: "Comments with files",
    detail:
      "Discuss an event and attach the photograph that settles the question.",
    tone: "programmes",
    icon: Paperclip,
  },
  {
    label: "Everything in one inbox",
    detail:
      "Every review left across your programmes arrives in one list, newest first.",
    tone: "programmes",
    icon: MessagesSquare,
  },
  {
    label: "Messages with references",
    detail:
      "An inquiry is recorded with a reference, so it cannot dissolve into an inbox.",
    tone: "programmes",
    icon: Mail,
  },
  {
    label: "The programme archive",
    detail:
      "Past seasons stay on the record for next year’s pitch and next year’s prices.",
    tone: "programmes",
    icon: Layers,
  },

  // ---- Control and staff -------------------------------------------------
  {
    label: "One owner",
    detail: "A single named address holds full control of the whole platform.",
    tone: "control",
    icon: ShieldCheck,
  },
  {
    label: "Moderators you appoint",
    detail:
      "Hand moderation rights to anyone you trust, and take them back just as fast.",
    tone: "control",
    icon: UserCog,
  },
  {
    label: "Checked twice",
    detail:
      "Every privileged action is re-checked on the server, not trusted from the browser.",
    tone: "control",
    icon: ServerCog,
  },
  {
    label: "A moderation queue",
    detail:
      "Everything published anywhere on the platform, in one list, newest first.",
    tone: "control",
    icon: MessagesSquare,
  },
  {
    label: "Remove anything",
    detail:
      "A moderator can take down a comment or review its author refuses to touch.",
    tone: "control",
    icon: ShieldAlert,
  },
  {
    label: "Account directory",
    detail:
      "Who is here, what their address is and precisely what they may do.",
    tone: "control",
    icon: Users,
  },
  {
    label: "Ownership you cannot take",
    detail:
      "The owner is a constant in the code, not a row anyone with a write can change.",
    tone: "control",
    icon: Fingerprint,
  },
  {
    label: "Ledgers behind the gate",
    detail:
      "Counts of accounts, programmes, events and bookings are staff-only reads.",
    tone: "control",
    icon: PieChart,
  },
  {
    label: "A console per business",
    detail:
      "Organisers create their own programmes and events, without asking anyone.",
    tone: "control",
    icon: Building2,
  },
  {
    label: "Your data stays yours",
    detail:
      "A business reads its own programmes and bookings, and nobody else’s.",
    tone: "control",
    icon: LockKeyhole,
  },
  {
    label: "Door lists",
    detail:
      "The list for one event, in the order people are expected, ready to print.",
    tone: "control",
    icon: ListChecks,
  },
  {
    label: "Revenue per season",
    detail:
      "See which programme paid for itself and which one quietly cost money.",
    tone: "control",
    icon: TrendingUp,
  },
  {
    label: "Campaign reach",
    detail:
      "Watch which promotional code was used how many times, while it runs.",
    tone: "control",
    icon: Percent,
  },
  {
    label: "Stock ledgers",
    detail:
      "What sold and what is left, per event and per line, without counting boxes.",
    tone: "control",
    icon: Package,
  },
  {
    label: "Sponsor statuses",
    detail:
      "Pipeline, confirmed and settled, visible at a glance to whoever is chasing it.",
    tone: "control",
    icon: Handshake,
  },
  {
    label: "Routes that refuse",
    detail:
      "A console page opened by the wrong account explains itself instead of leaking.",
    tone: "control",
    icon: Ban,
  },
  {
    label: "By-invitation console",
    detail:
      "No directory and no role controls exist for an ordinary account, by query design.",
    tone: "control",
    icon: KeyRound,
  },
  {
    label: "Claim on first sign-in",
    detail:
      "The owner’s role is written onto their own account the first time they arrive.",
    tone: "control",
    icon: UserCheck,
  },
  {
    label: "Browse before signing up",
    detail:
      "The whole catalogue and the discussion are readable without an account.",
    tone: "control",
    icon: Eye,
  },
  {
    label: "Codes instead of passwords",
    detail:
      "Sign in with a six-digit code by email, and never store a password at all.",
    tone: "control",
    icon: MailCheck,
  },
  {
    label: "Codes that expire",
    detail:
      "A sign-in code is good for fifteen minutes and is useless afterwards.",
    tone: "control",
    icon: Timer,
  },
  {
    label: "One person, many roles",
    detail:
      "An organiser is also an attendee and a sponsor, all on the same identity.",
    tone: "control",
    icon: UserPlus,
  },
  {
    label: "Anonymous guests",
    detail:
      "A guest can hold a seat and keep browsing before committing to an account.",
    tone: "control",
    icon: UserRound,
  },

  // ---- Craft and access --------------------------------------------------
  {
    label: "Five languages",
    detail:
      "English, Spanish, French, German and Bengali, chosen by the reader.",
    tone: "craft",
    icon: Languages,
  },
  {
    label: "Language never guessed",
    detail:
      "Where you are changes the prices and never the words; only you change those.",
    tone: "craft",
    icon: Globe,
  },
  {
    label: "A choice that sticks",
    detail:
      "Pick a language once and it is remembered on the next visit and the one after.",
    tone: "craft",
    icon: RefreshCw,
  },
  {
    label: "Language declared",
    detail:
      "The page tells screen readers which language it is actually written in.",
    tone: "craft",
    icon: Accessibility,
  },
  {
    label: "Dark and light",
    detail:
      "A designed dark theme with its own contrast, not an inverted stylesheet.",
    tone: "craft",
    icon: Moon,
  },
  {
    label: "Theme in one tap",
    detail:
      "Switch between light and dark straight from the header, without a menu.",
    tone: "craft",
    icon: Sun,
  },
  {
    label: "Colour-blind palette",
    detail:
      "Status colours that stay distinguishable when red and green look alike.",
    tone: "craft",
    icon: Palette,
  },
  {
    label: "Motion, on request",
    detail:
      "Ask your system for less movement and the drifting, sliding and zooming all stop.",
    tone: "craft",
    icon: Focus,
  },
  {
    label: "Escape always closes",
    detail:
      "Every dialog closes on Escape, keeps Tab inside itself and returns your focus.",
    tone: "craft",
    icon: Keyboard,
  },
  {
    label: "Focus you can see",
    detail:
      "Every control shows a visible ring the moment it is reached by keyboard.",
    tone: "craft",
    icon: MousePointerClick,
  },
  {
    label: "A hint on everything",
    detail:
      "Anything abbreviated on the page carries its full meaning on hover or focus.",
    tone: "craft",
    icon: Info,
  },
  {
    label: "Print that behaves",
    detail:
      "Printing leaves out the header, the dock and every decoration — only the page.",
    tone: "craft",
    icon: Printer,
  },
  {
    label: "A report you can hand over",
    detail:
      "Build a season report and print it or save it as a PDF in one step.",
    tone: "craft",
    icon: FileText,
  },
  {
    label: "Keepsakes",
    detail:
      "Turn a booking or a programme into something the guest can keep or send on.",
    tone: "craft",
    icon: Gift,
  },
  {
    label: "Built for a phone",
    detail:
      "The whole catalogue works one-handed, with nothing hidden behind a pinch.",
    tone: "craft",
    icon: AppWindow,
  },
  {
    label: "Installs like an app",
    detail:
      "A manifest, icons and a standalone window, so it can live on a home screen.",
    tone: "craft",
    icon: Download,
  },
  {
    label: "Chrome that matches",
    detail:
      "The browser’s own colour follows light and dark along with the page.",
    tone: "craft",
    icon: Palette,
  },
  {
    label: "No layout shift",
    detail:
      "Space is reserved before the data arrives, so the page never jumps under you.",
    tone: "craft",
    icon: LayoutGrid,
  },
  {
    label: "Skeletons, not spinners",
    detail:
      "While something loads it takes the shape of the thing it is becoming.",
    tone: "craft",
    icon: BarChart3,
  },
  {
    label: "Toasts that report",
    detail:
      "Every write says what it did, then leaves — nothing succeeds in silence.",
    tone: "craft",
    icon: Bell,
  },
  {
    label: "Plain-language errors",
    detail:
      "A failure explains its cause in a sentence instead of printing a stack trace.",
    tone: "craft",
    icon: ShieldAlert,
  },
  {
    label: "Empty states that help",
    detail:
      "A nothing-here-yet screen suggests the next move instead of staring back.",
    tone: "craft",
    icon: Sparkles,
  },
  {
    label: "A 404 that apologises",
    detail:
      "A missing page blames us, offers the way onwards, and returns you in three seconds.",
    tone: "craft",
    icon: Compass,
  },
  {
    label: "An assistant that knows",
    detail:
      "Ask in plain sentences and get the programme that fits, not a list of links.",
    tone: "craft",
    icon: Sparkles,
  },
  {
    label: "Uploads that belong",
    detail:
      "A file attached to a comment lives in the deployment’s own storage and leaves with the post.",
    tone: "craft",
    icon: Images,
  },
  {
    label: "Reactive by default",
    detail:
      "A booking made on one screen appears on every other screen already open.",
    tone: "craft",
    icon: RefreshCw,
  },
  {
    label: "Landmarks in order",
    detail:
      "Headings, regions and labels are structured, so a screen reader can navigate by section.",
    tone: "craft",
    icon: ListChecks,
  },

  // ---- The hundred and first and second, for the people running the day ----
  {
    label: "A door roster",
    detail:
      "Mark a guest in as they arrive — with the time and who marked them — and the attendance rate finally means something.",
    tone: "programmes",
    icon: UserCheck,
  },
  {
    label: "News to guests",
    detail:
      "An announcement posted on the event can be emailed to everyone holding a place, once, and it remembers that it went.",
    tone: "programmes",
    icon: Megaphone,
  },
];

/** Exported for the wall: the count is derived, never typed twice. */
export const FEATURE_COUNT = FEATURES.length;
