import { FestCard } from "@/components/site/FestCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useEnsureSeeded } from "@/hooks/use-seed";
import { useQuery } from "convex/react";

export default function Fests() {
  useEnsureSeeded();
  const fests = useQuery(api.fests.list);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 pt-16 pb-24 sm:px-8 sm:pt-20">
          <header className="max-w-3xl">
            <p className="label-eyebrow">Festivals</p>
            <h1 className="mt-4 text-[36px] leading-[1.06] font-medium tracking-[-0.035em] text-balance sm:text-[46px]">
              Programmes worth clearing a day for.
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-muted-foreground">
              Each festival collects its events, dates and venues in one place.
              Open a programme to see everything inside it, then take a seat.
            </p>
          </header>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {fests === undefined
              ? Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-72 rounded-lg" />
                ))
              : fests.map((fest) => (
                  <FestCard key={fest._id} fest={fest} />
                ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
