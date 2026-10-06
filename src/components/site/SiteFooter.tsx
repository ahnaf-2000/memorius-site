import { Brand } from "@/components/site/Brand";
import { Link } from "react-router";

const COLUMNS = [
  {
    heading: "Attend",
    links: [
      { to: "/events", label: "All events" },
      { to: "/fests", label: "Festivals" },
      { to: "/dashboard", label: "My schedule" },
    ],
  },
  {
    heading: "Organize",
    links: [
      { to: "/dashboard", label: "Organizer studio" },
      { to: "/dashboard", label: "Registration desk" },
      { to: "/auth?returnTo=%2Fdashboard", label: "Create an account" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Brand />
          <p className="mt-5 max-w-xs text-[13px] leading-6 text-muted-foreground">
            Festivals, events and registrations in one calm place. Built for
            people whose calendars are already full.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.heading}>
            <p className="label-eyebrow">{column.heading}</p>
            <ul className="mt-5 space-y-3">
              {column.links.map((link) => (
                <li key={`${column.heading}-${link.label}`}>
                  <Link
                    to={link.to}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-[11px] tracking-[0.04em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} Cadence</span>
          <span className="uppercase">
            Organization · Festival · Event · Registration
          </span>
        </div>
      </div>
    </footer>
  );
}
