import { ProgrammeCard } from "@/components/site/FestCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useEnsureSeeded } from "@/hooks/use-seed";
import { useQuery } from "convex/react";

export default function Programmes() {
  useEnsureSeeded();
  const programmes = useQuery(api.fests.list);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 pt-16 pb-24 sm:px-8 sm:pt-20">
          <header className="max-w-3xl">
            <p className="label-eyebrow">Programmes</p>
            <h1 className="mt-4 text-[26px] leading-[1.2] font-light tracking-[-0.015em] text-balance sm:text-[34px]">
              Seasons of events, in one place.
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-muted-foreground">
              A programme gathers the events a business runs together, with its
              own dates, venue and booking page. Open one to see what is inside,
              then take your place.
            </p>
          </header>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {programmes === undefined
              ? Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-72 rounded-lg" />
                ))
              : programmes.map((programme) => (
                  <ProgrammeCard key={programme._id} programme={programme} />
                ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
