import { Brand } from "@/components/site/Brand";
import { Link } from "react-router";

const COLUMNS = [
  {
    heading: "Customers",
    links: [
      { to: "/events", label: "Catalogue" },
      { to: "/programmes", label: "Programmes" },
      { to: "/dashboard", label: "My bookings" },
    ],
  },
  {
    heading: "Businesses",
    links: [
      { to: "/admin", label: "Admin console" },
      { to: "/auth?returnTo=%2Fadmin", label: "Create an account" },
      { to: "/auth?returnTo=%2Fdashboard", label: "Sign in" },
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
            The event catalogue and booking desk for businesses. Customers
            search, book and pay in one place; the business sees all of it in
            one console.
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
                    className="link-quiet text-[13px] text-muted-foreground hover:text-foreground"
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
          <span>© {new Date().getFullYear()} Memorius</span>
          <span className="uppercase">
            Business · Programme · Event · Booking
          </span>
        </div>
      </div>
    </footer>
  );
}
