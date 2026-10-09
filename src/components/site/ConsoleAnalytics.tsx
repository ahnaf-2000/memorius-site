import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { relativeDay } from "@/lib/format";
import type { AnalyticsOverview, ParticipantCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  BarChart3,
  CalendarCheck,
  Gauge,
  Megaphone,
  TrendingDown,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * The organizer's numbers, drawn.
 *
 * Four questions, in the order an organizer asks them: how many people are
 * coming, how full is the room, where did they come from, and what is at risk.
 * Every figure is counted on the server from the rows themselves, so a chart
 * cannot disagree with the guest list beside it.
 *
 * Colours are the page's own tokens rather than fixed hex, which is what keeps
 * the charts legible in dark mode without a second palette.
 */

const CATEGORY_NAME: Record<string, string> = {
  delegate: "Delegates",
  student: "Students",
  speaker: "Speakers",
  press: "Press",
  volunteer: "Volunteers",
  guest: "Guests",
  staff: "Staff",
  unspecified: "Not stated",
};

const STATUS_COLOURS = ["var(--brand)", "var(--warm)", "var(--plum)", "var(--border)"];

function Panel({
  title,
  note,
  children,
  icon,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-eyebrow">{title}</p>
          {note !== undefined && (
            <p className="mt-1.5 text-[11.5px] leading-5 text-muted-foreground">
              {note}
            </p>
          )}
        </div>
        <span className="icon-chip size-8">{icon}</span>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Kpi({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="font-display mt-4 text-[24px] leading-none tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

/** The chart tooltip, styled like the rest of the product's surfaces. */
function ChartTip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { value?: number | string; name?: string }[];
  label?: string | number;
  format?: (value: number) => string;
}) {
  if (active !== true || payload === undefined || payload.length === 0) {
    return null;
  }
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-hairline">
      {label !== undefined && (
        <p className="text-[11px] text-muted-foreground">{label}</p>
      )}
      <p className="text-[13px] tabular-nums">
        {format === undefined ? value : format(value)}
      </p>
    </div>
  );
}

export function ConsoleAnalytics() {
  const [scope, setScope] = useState<string>("all");
  const data = useQuery(api.analytics.overview, {
    festId: scope === "all" ? undefined : (scope as Id<"fests">),
  }) as AnalyticsOverview | null | undefined;

  if (data === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (data === null) {
    return (
      <p className="py-12 text-[13px] text-muted-foreground">
        Create a programme and the numbers start here.
      </p>
    );
  }

  const { totals } = data;
  const statusSplit = [
    { name: "Confirmed", value: totals.confirmed },
    { name: "Waiting list", value: totals.waitlisted },
    { name: "Declined", value: totals.declined },
    { name: "Released", value: totals.cancelled },
  ].filter((row) => row.value > 0);

  const byEvent = data.events.map((row) => ({
    name: row.title.length > 22 ? `${row.title.slice(0, 21)}…` : row.title,
    fill: row.fill,
    confirmed: row.confirmed,
  }));

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] leading-6 text-muted-foreground">
          Counted from the bookings themselves, across{" "}
          {totals.programmes === 1
            ? "1 programme"
            : `${totals.programmes} programmes`}
          .
        </p>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger
            aria-label="Scope the analytics"
            className="h-9 w-[15rem] bg-background shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Every programme</SelectItem>
            {data.programmes.map((programme) => (
              <SelectItem key={programme._id} value={programme._id}>
                {programme.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Places taken"
          value={`${totals.seatsTaken}`}
          detail={`${totals.confirmed} confirmed of ${totals.capacity} places across ${totals.events} events.`}
        />
        <Kpi
          label="Awaiting a decision"
          value={`${totals.awaitingDecision}`}
          detail="Held on the waiting list until the desk confirms or declines them."
        />
        <Kpi
          label="Attendance"
          value={`${totals.attendanceRate}%`}
          detail={`${totals.checkedIn} of ${totals.confirmed} confirmed guests checked in at the door.`}
        />
        <Kpi
          label="Released"
          value={`${totals.releaseRate}%`}
          detail={`${totals.cancelled} releases, ${totals.declined} declined by the desk.`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Bookings, last fourteen days"
          note="One bar per day, taken from when each booking was made."
          icon={<BarChart3 className="size-4" />}
        >
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.series.map((point) => ({
                  label: new Date(point.at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  }),
                  count: point.count,
                }))}
                margin={{ top: 4, right: 8, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="bookingFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--brand)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--brand)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={40}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <Tooltip
                  content={<ChartTip format={(value) => `${value} bookings`} />}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  fill="url(#bookingFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Registration status"
          note="Where every booking stands right now."
          icon={<Users className="size-4" />}
        >
          {statusSplit.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              No bookings yet.
            </p>
          ) : (
            <div className="flex items-center gap-6">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusSplit}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={2}
                      stroke="var(--card)"
                    >
                      {statusSplit.map((row, index) => (
                        <Cell
                          key={row.name}
                          fill={STATUS_COLOURS[index % STATUS_COLOURS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2.5">
                {statusSplit.map((row, index) => (
                  <li key={row.name} className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full"
                      style={{
                        background: STATUS_COLOURS[index % STATUS_COLOURS.length],
                      }}
                    />
                    <span className="text-[12.5px] text-muted-foreground">
                      {row.name}
                    </span>
                    <span className="text-[12.5px] tabular-nums">
                      {row.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Fill by event"
          note="Places taken against capacity, as it stands today."
          icon={<Gauge className="size-4" />}
        >
          {byEvent.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              No events yet.
            </p>
          ) : (
            <div
              className="w-full"
              style={{ height: Math.max(160, byEvent.length * 34) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={byEvent}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  />
                  <Tooltip
                    content={<ChartTip format={(value) => `${value}% full`} />}
                  />
                  <Bar
                    dataKey="fill"
                    fill="var(--warm)"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          title="Who is coming"
          note="The guest list categories, as chosen when booking and corrected at the desk."
          icon={<CalendarCheck className="size-4" />}
        >
          {data.byParticipantCategory.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              No bookings yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.byParticipantCategory.map((row) => {
                const share =
                  totals.bookings === 0
                    ? 0
                    : Math.round((row.count / totals.bookings) * 100);
                return (
                  <li key={row.category}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12.5px]">
                        {CATEGORY_NAME[row.category] ?? row.category}
                      </span>
                      <span className="text-[12px] tabular-nums text-muted-foreground">
                        {row.count} · {share}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-border">
                      <div
                        className="h-1.5 rounded-full bg-plum transition-[width] duration-700 ease-quint"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-3">
          <p className="label-eyebrow">Event by event</p>
          <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Megaphone className="size-3.5" />
            {totals.announcements} announcements,{" "}
            {totals.emailedAnnouncements} emailed to guests
          </span>
        </div>

        {data.events.length === 0 ? (
          <p className="py-10 text-[13px] text-muted-foreground">
            Add an event and its numbers appear here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-left">
              <thead>
                <tr className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 text-right font-medium">When</th>
                  <th className="pb-2 text-right font-medium">Confirmed</th>
                  <th className="pb-2 text-right font-medium">Waiting</th>
                  <th className="pb-2 text-right font-medium">Fill</th>
                  <th className="pb-2 text-right font-medium">Checked in</th>
                  <th className="pb-2 text-right font-medium">Released</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((row) => (
                  <tr
                    key={row.eventId}
                    className="border-b border-border text-[12.5px] last:border-b-0"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        to={`/events/${row.slug}`}
                        className="link-quiet font-medium"
                      >
                        {row.title}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {row.category}
                        {row.upcoming ? "" : " · finished"}
                      </p>
                    </td>
                    <td className="py-3 text-right text-muted-foreground tabular-nums">
                      {relativeDay(row.startTime)}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {row.confirmed}
                      <span className="text-muted-foreground">
                        {" "}
                        / {row.capacity}
                      </span>
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {row.waitlisted}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {row.fill}%
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {row.checkedIn}
                    </td>
                    <td
                      className={cn(
                        "py-3 text-right tabular-nums",
                        row.cancelled > 0 && "text-foreground",
                      )}
                    >
                      {row.cancelled}
                      {row.lateReleases > 0 && (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <TrendingDown className="size-3" />
                          {row.lateReleases}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.busiest !== null && (
          <p className="mt-6 text-[12.5px] leading-6 text-muted-foreground">
            The next event filling fastest is{" "}
            <Link
              to={`/events/${data.busiest.slug}`}
              className="link-quiet text-foreground"
            >
              {data.busiest.title}
            </Link>{" "}
            at {data.busiest.fill}% — {data.busiest.remaining} places left.
          </p>
        )}
      </section>
    </div>
  );
}

/** One label for a participant category, exported for the console's filters. */
export function participantCategoryName(
  category: ParticipantCategory | null,
): string {
  return CATEGORY_NAME[category ?? "unspecified"] ?? "Guest";
}
