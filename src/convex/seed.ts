import { mutation } from "./_generated/server";

/**
 * Showcase catalogue, modelled on the real shape of a student organization:
 * one org running several fests, each fest holding several events.
 *
 * Idempotent — it only runs when the platform is completely empty, so it is
 * safe to call on every visit.
 */
export const ensureSeeded = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("fests").first();
    if (existing !== null) return { seeded: false as const };

    const now = Date.now();

    const fests = [
      {
        organization: "DRMC IT Club",
        name: "9th Tech Carnival 2026",
        slug: "tech-carnival-2026",
        summary:
          "Four days of contests, challenges and late-night builds across the whole campus.",
        description:
          "The flagship festival of the season: a web development contest, a programming contest, a robotics challenge and a gaming tournament, all under one registration flow.",
        venue: "DRMC Campus, Rangpur",
        startDate: new Date(2026, 10, 12, 9, 0).getTime(),
        endDate: new Date(2026, 10, 15, 20, 0).getTime(),
        events: [
          {
            title: "AI Web Development Contest",
            category: "Contest",
            summary:
              "Ship a working web product with an AI feature in six hours, judged on craft and polish.",
            description:
              "Teams of up to three build and deploy a working web application that puts an AI capability to real use. Judging weighs interface craft, clarity of the problem, and how well the product holds up under a live demo. Bring a laptop; power, Wi-Fi and API credits are provided on site.",
            format: "in-person" as const,
            startTime: new Date(2026, 10, 12, 9, 0).getTime(),
            endTime: new Date(2026, 10, 12, 16, 0).getTime(),
            venue: "Lab 301, CSE Building",
            host: "Department of CSE",
            capacity: 60,
            seatsTaken: 41,
            fee: "Free entry",
          },
          {
            title: "Programming Contest",
            category: "Contest",
            summary:
              "Three hours, ten problems, one scoreboard. Individual and team divisions.",
            description:
              "A classic ICPC-style contest with ten algorithmic problems of rising difficulty. Individual and team divisions run on the same scoreboard. Solutions are judged live, with the first correct submission winning each problem outright.",
            format: "in-person" as const,
            startTime: new Date(2026, 10, 13, 10, 0).getTime(),
            endTime: new Date(2026, 10, 13, 14, 0).getTime(),
            venue: "Central Auditorium",
            host: "Competitive Programming Wing",
            capacity: 120,
            seatsTaken: 96,
            fee: "Free entry",
          },
          {
            title: "Robotics Challenge",
            category: "Challenge",
            summary:
              "Autonomous line-following and obstacle navigation on a live arena floor.",
            description:
              "Build a robot that can follow a marked course and clear an obstacle section without human input. Two timed runs, best result counts. Teams keep their hardware, and a pit area with basic tools and spares is open all day.",
            format: "in-person" as const,
            startTime: new Date(2026, 10, 13, 11, 0).getTime(),
            endTime: new Date(2026, 10, 13, 16, 0).getTime(),
            venue: "Engineering Bay, Block B",
            host: "Robotics Society",
            capacity: 40,
            seatsTaken: 28,
            fee: "৳500 per team",
          },
          {
            title: "Gaming Tournament",
            category: "Tournament",
            summary:
              "Single-elimination bracket, double stage setup, crowd on the big screen.",
            description:
              "An eight-hour single-elimination bracket across the fest's headline title. Double stage setup with a crowd screen for the semi-finals and final. Bring your own peripherals; machines are provided.",
            format: "in-person" as const,
            startTime: new Date(2026, 10, 14, 12, 0).getTime(),
            endTime: new Date(2026, 10, 14, 20, 0).getTime(),
            venue: "Esports Arena, Student Centre",
            host: "Gaming Guild",
            capacity: 64,
            seatsTaken: 64,
            fee: "৳300 entry",
          },
        ],
      },
      {
        organization: "DRMC IT Club",
        name: "Winter Tech Fest 2026",
        slug: "winter-tech-fest-2026",
        summary:
          "A three-day build-and-learn festival: one long hackathon, plus workshops and a quiz.",
        description:
          "The winter edition leans practical. A 24-hour hackathon anchors the weekend, supported by hands-on workshops and a fast-paced team quiz to close it out.",
        venue: "Innovation Hub, Level 4",
        startDate: new Date(2026, 11, 18, 9, 0).getTime(),
        endDate: new Date(2026, 11, 20, 18, 0).getTime(),
        events: [
          {
            title: "Hackathon",
            category: "Hackathon",
            summary:
              "Twenty-four hours, open brief, mentors on the floor through the night.",
            description:
              "A single twenty-four hour sprint with an open brief: pick a real problem from a published list, or pitch your own at check-in. Mentors from local product teams rotate through the night, and each team gets a table, power and a whiteboard wall.",
            format: "in-person" as const,
            startTime: new Date(2026, 11, 18, 9, 0).getTime(),
            endTime: new Date(2026, 11, 19, 9, 0).getTime(),
            venue: "Innovation Hub, Level 4",
            host: "DRMC IT Club",
            capacity: 150,
            seatsTaken: 112,
            fee: "Free entry",
          },
          {
            title: "Hands-on Workshop: Design Systems",
            category: "Workshop",
            summary:
              "Build a small design system from tokens to components in one afternoon.",
            description:
              "A practical afternoon session on building a design system that a small team can actually maintain. You will define tokens, wire them into components, and document the result. Laptops required; a starter repository is shared in advance.",
            format: "in-person" as const,
            startTime: new Date(2026, 11, 19, 14, 0).getTime(),
            endTime: new Date(2026, 11, 19, 17, 0).getTime(),
            venue: "Studio 2, Innovation Hub",
            host: "Nusrat Jahan",
            capacity: 45,
            seatsTaken: 39,
            fee: "৳200",
          },
          {
            title: "Tech Quiz",
            category: "Quiz",
            summary:
              "Buzzer rounds on computing history, systems and the year in technology.",
            description:
              "Four rounds of buzzer questions covering computing history, systems fundamentals, and the year in technology. Teams of two. The final round is played on stage in front of the festival crowd.",
            format: "in-person" as const,
            startTime: new Date(2026, 11, 20, 11, 0).getTime(),
            endTime: new Date(2026, 11, 20, 13, 0).getTime(),
            venue: "Central Auditorium",
            host: "Quiz Council",
            capacity: 80,
            seatsTaken: 51,
            fee: "Free entry",
          },
        ],
      },
      {
        organization: "DRMC IT Club",
        name: "Freshers Tech Fest 2027",
        slug: "freshers-tech-fest-2027",
        summary:
          "A gentle on-ramp for the incoming batch: one friendly contest, one AI workshop.",
        description:
          "Designed for the incoming batch: a beginner-friendly coding challenge in the morning and a practical AI workshop in the afternoon. No prior competition experience needed.",
        venue: "Central Auditorium",
        startDate: new Date(2027, 0, 22, 10, 0).getTime(),
        endDate: new Date(2027, 0, 23, 18, 0).getTime(),
        events: [
          {
            title: "Coding Challenge",
            category: "Contest",
            summary:
              "Beginner-friendly problems with hints, live help desk and no penalties.",
            description:
              "A gentle introduction to competitive programming: eight problems that climb slowly in difficulty, hints available on request, and a help desk you can walk up to at any point. There are no penalties for wrong submissions.",
            format: "in-person" as const,
            startTime: new Date(2027, 0, 22, 10, 0).getTime(),
            endTime: new Date(2027, 0, 22, 13, 0).getTime(),
            venue: "Central Auditorium",
            host: "Competitive Programming Wing",
            capacity: 200,
            seatsTaken: 134,
            fee: "Free entry",
          },
          {
            title: "AI Workshop",
            category: "Workshop",
            summary:
              "From prompt to product: build and ship a small AI tool in three hours.",
            description:
              "A hands-on walkthrough of taking an AI idea from prompt to a deployed tool. We cover model choice, evaluation, and the interface decisions that make an AI feature feel trustworthy. Bring a laptop and an idea.",
            format: "in-person" as const,
            startTime: new Date(2027, 0, 23, 15, 0).getTime(),
            endTime: new Date(2027, 0, 23, 18, 0).getTime(),
            venue: "Studio 1, Innovation Hub",
            host: "DRMC IT Club",
            capacity: 60,
            seatsTaken: 52,
            fee: "৳250",
          },
        ],
      },
    ];

    for (const fest of fests) {
      const { events, ...festFields } = fest;
      const festId = await ctx.db.insert("fests", {
        ...festFields,
        status: "published",
        showcase: true,
        createdAt: now,
      });
      for (const event of events) {
        await ctx.db.insert("events", {
          ...event,
          festId,
          slug: event.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, ""),
          showcase: true,
          createdAt: now,
        });
      }
    }

    return { seeded: true as const };
  },
});
