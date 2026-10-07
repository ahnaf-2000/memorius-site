import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { PALETTES, THEMES, useTheme } from "@/hooks/use-theme";
import {
  COUNTRIES,
  CURRENCIES,
  countryByCode,
  hasChosenCurrency,
  setActiveCountry,
  setActiveCurrency,
  useActiveCountry,
  useActiveCurrency,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { Check, Moon, Palette, Sun } from "lucide-react";

function MenuRow({
  selected,
  title,
  detail,
  icon,
  onClick,
}: {
  selected: boolean;
  title: string;
  detail?: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors",
        selected ? "bg-accent" : "hover:bg-accent/70",
      )}
    >
      {icon !== undefined && (
        <span className="text-muted-foreground">{icon}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium tracking-[-0.01em]">
          {title}
        </span>
        {detail !== undefined && (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {detail}
          </span>
        )}
      </span>
      {selected && <Check className="size-3.5 shrink-0 text-brand" />}
    </button>
  );
}

/** One click between light and dark, for people who switch often. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={dark ? "Switch to light" : "Switch to dark"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="rounded-full text-muted-foreground hover:text-foreground"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

/**
 * Appearance, palette and market in one place. The country chosen here is what
 * every price on the site is quoted in — and it is remembered on the account
 * when someone is signed in, so their phone and their desk agree.
 */
export function PreferencesMenu() {
  const { theme, setTheme, palette, setPalette } = useTheme();
  const country = useActiveCountry();
  const currency = useActiveCurrency();
  const { isAuthenticated } = useAuth();
  const save = useMutation(api.profiles.save);

  /** Remember the choice on the account as well, whenever there is one. */
  function remember(next: { country: string; currency: string }) {
    if (!isAuthenticated) return;
    void save(next).catch(() => {
      // The display switch still applies even if the write fails.
    });
  }

  function chooseCountry(code: string) {
    const next = countryByCode(code);
    setActiveCountry(code);
    // The region only moves the currency when none was chosen, so save whichever
    // of the two choices is actually in force.
    remember({
      country: next.code,
      currency: hasChosenCurrency() ? currency.code : next.currency,
    });
  }

  /**
   * The currency is chosen on its own here. Somebody in Germany may well prefer
   * to be quoted in dollars, and once they have said so, it stays said — picking
   * a region afterwards will not quietly move it back.
   */
  function chooseCurrency(code: string) {
    setActiveCurrency(code);
    remember({ country: country.code, currency: code });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-full px-2.5 text-[12px] text-muted-foreground hover:text-foreground"
          aria-label="Appearance and region"
        >
          <span aria-hidden="true" className="text-[13px] leading-none">
            {country.flag}
          </span>
          <span className="tabular-nums">{currency.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-2">
        <DropdownMenuLabel className="px-2.5 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Appearance
        </DropdownMenuLabel>
        {THEMES.map((option) => (
          <MenuRow
            key={option.id}
            selected={theme === option.id}
            title={option.name}
            detail={option.blurb}
            icon={
              option.id === "dark" ? (
                <Moon className="size-4" />
              ) : (
                <Sun className="size-4" />
              )
            }
            onClick={() => setTheme(option.id)}
          />
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2.5 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Palette
        </DropdownMenuLabel>
        {PALETTES.map((option) => (
          <MenuRow
            key={option.id}
            selected={palette === option.id}
            title={option.name}
            detail={
              option.id === "colour-blind"
                ? "Blue and orange status colours"
                : "Green and amber status colours"
            }
            icon={<Palette className="size-4" />}
            onClick={() => setPalette(option.id)}
          />
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2.5 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Currency
        </DropdownMenuLabel>
        <div className="max-h-64 overflow-y-auto pr-1">
          {CURRENCIES.map((option) => (
            <MenuRow
              key={option.code}
              selected={currency.code === option.code}
              title={`${option.flag}  ${option.code}`}
              detail={option.name}
              onClick={() => chooseCurrency(option.code)}
            />
          ))}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2.5 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          Region
        </DropdownMenuLabel>
        <div className="max-h-64 overflow-y-auto pr-1">
          {COUNTRIES.map((option) => (
            <MenuRow
              key={option.code}
              selected={country.code === option.code}
              title={`${option.flag}  ${option.name}`}
              detail={`Numbers written as ${option.locale}`}
              onClick={() => chooseCountry(option.code)}
            />
          ))}
        </div>
        <p className="px-2.5 pt-2 text-[11px] leading-5 text-muted-foreground">
          We start with the currency your location points to. Pick one and it is
          kept, whatever you later do with your region — amounts are converted
          from the programme's own currency at an indicative rate.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
