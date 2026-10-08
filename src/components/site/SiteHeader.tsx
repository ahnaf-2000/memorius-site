import { Brand } from "@/components/site/Brand";
import {
  PreferencesMenu,
  ThemeToggle,
} from "@/components/site/PreferencesMenu";
import { SearchPalette } from "@/components/site/SearchPalette";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";

const PRIMARY_NAV = [
  { to: "/events", label: "Catalogue" },
  { to: "/programmes", label: "Programmes" },
  { to: "/report", label: "Report" },
  { to: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // The header earns its hairline only once the page has moved under it.
  useEffect(() => {
    const read = () => setScrolled(window.scrollY > 8);
    const frame = requestAnimationFrame(read);
    window.addEventListener("scroll", read, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", read);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const name = user?.name ?? user?.email ?? "";

  const navLink = ({ isActive }: { isActive: boolean }) =>
    cn(
      "nav-link text-[13px] tracking-[-0.005em] transition-colors duration-200",
      isActive
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300 ease-soft",
        scrolled
          ? "border-border bg-background/92 shadow-hairline"
          : "border-transparent bg-background/80",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Brand />

        <nav className="hidden items-center gap-7 md:flex">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLink}>
              {item.label}
            </NavLink>
          ))}
          {isAuthenticated && (
            <NavLink to="/admin" className={navLink}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="ml-auto hidden sm:block">
          <SearchPalette />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <PreferencesMenu />
          {isAuthenticated ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden text-[13px] lg:inline-flex"
              >
                <Link to="/dashboard">
                  <LayoutDashboard className="size-3.5" />
                  My bookings
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account"
                    className="grid size-8 place-items-center rounded-full border border-border bg-card text-[11px] font-medium tracking-[0.02em] transition-colors hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                  >
                    {initials(name)}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                    {user?.email ?? "Signed in"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => navigate("/dashboard")}
                  >
                    <LayoutDashboard className="mr-2 size-4" />
                    My bookings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => navigate("/admin")}
                  >
                    <Settings2 className="mr-2 size-4" />
                    Admin console
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={handleSignOut}
                  >
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden text-[13px] sm:inline-flex"
              >
                <Link to="/auth?returnTo=%2Fdashboard">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="h-8 gap-1.5 rounded-full px-4 text-[13px]"
              >
                <Link to="/events">
                  Browse events
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 gap-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="px-6 pt-6">
                <Brand />
              </div>
              <div className="px-6 pt-6 sm:hidden">
                <SearchPalette />
              </div>
              <nav className="mt-6 flex flex-col px-3">
                {PRIMARY_NAV.map((item) => (
                  <SheetClose asChild key={item.to}>
                    <Link
                      to={item.to}
                      className="rounded-md px-3 py-3 text-[15px] tracking-[-0.01em] transition-colors hover:bg-accent"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                {isAuthenticated && (
                  <>
                    <SheetClose asChild>
                      <Link
                        to="/dashboard"
                        className="rounded-md px-3 py-3 text-[15px] tracking-[-0.01em] transition-colors hover:bg-accent"
                      >
                        My bookings
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/admin"
                        className="rounded-md px-3 py-3 text-[15px] tracking-[-0.01em] transition-colors hover:bg-accent"
                      >
                        Admin
                      </Link>
                    </SheetClose>
                  </>
                )}
              </nav>
              <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
                {isAuthenticated ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setMenuOpen(false);
                      void handleSignOut();
                    }}
                  >
                    Sign out
                  </Button>
                ) : (
                  <SheetClose asChild>
                    <Button asChild className="w-full">
                      <Link to="/auth?returnTo=%2Fdashboard">Sign in</Link>
                    </Button>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
