import { EventDirectory } from "@/components/site/EventDirectory";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { api } from "@/convex/_generated/api";
import { useEnsureSeeded } from "@/hooks/use-seed";
import { useQuery } from "convex/react";

export default function Events() {
  useEnsureSeeded();
  const events = useQuery(api.events.list);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 pt-16 pb-24 sm:px-8 sm:pt-20">
          <header className="max-w-3xl">
            <p className="label-eyebrow">Catalogue</p>
            <h1 className="mt-4 text-[36px] leading-[1.06] font-medium tracking-[-0.035em] text-balance sm:text-[46px]">
              The catalogue.
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-muted-foreground">
              Every event open for booking, across every programme, in date
              order. Filter by category, search by venue, and take a place
              before it goes.
            </p>
          </header>

          <div className="mt-14">
            <EventDirectory items={events} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
