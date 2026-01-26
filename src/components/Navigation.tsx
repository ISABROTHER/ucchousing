// src/components/Navigation.tsx
import { useEffect, useMemo, useState } from "react";
import { Menu, X, Search, User, LogOut, Calendar, LayoutDashboard } from "lucide-react";
import { PageType } from "../App";

interface NavigationProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  userType?: "student" | "owner";
  isLoggedIn: boolean;
  onLogout: () => void;
}

export default function Navigation({
  currentPage,
  onNavigate,
  userType,
  isLoggedIn,
  onLogout,
}: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const myPageTarget = useMemo<PageType>(() => {
    if (!isLoggedIn) return "auth" as PageType;
    if (userType === "owner") return "dashboard" as PageType;
    return "my-bookings" as PageType;
  }, [isLoggedIn, userType]);

  const handleNavClick = (page: PageType) => {
    onNavigate(page);
    setIsOpen(false);
  };

  const menuLinks = useMemo(
    () => [
      { name: "Find Hostels", page: "search" as PageType, icon: Search, show: true },
      {
        name: "My Bookings",
        page: "my-bookings" as PageType,
        icon: Calendar,
        show: isLoggedIn && userType === "student",
      },
      {
        name: "Dashboard",
        page: "dashboard" as PageType,
        icon: LayoutDashboard,
        show: isLoggedIn && userType === "owner",
      },
    ],
    [isLoggedIn, userType]
  );

  return (
    <nav className="fixed top-0 z-50 w-full">
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${scrolled ? "pt-3" : "pt-5"}`}>
        {/* Rounded pill container (matches the reference header style) */}
        <div
          className={`flex items-center justify-between rounded-3xl border border-slate-200 bg-white transition-all duration-300 ${
            scrolled ? "px-4 py-3 shadow-sm" : "px-5 py-4"
          }`}
        >
          {/* Left: Logo */}
          <button
            onClick={() => handleNavClick("home")}
            className="flex items-center gap-3 outline-none transition-transform active:scale-95"
            aria-label="Go to home"
          >
            {/* Simple orange mark to mimic the reference logo block */}
            <div className="flex h-10 w-12 items-center justify-center rounded-2xl">
              <span className="text-4xl font-extrabold leading-none tracking-tight text-amber-500">
                S
              </span>
            </div>
          </button>

          {/* Center: Search + My page */}
          <div className="hidden items-center gap-7 sm:flex">
            <button
              onClick={() => handleNavClick("search" as PageType)}
              className="inline-flex items-center gap-2 text-base font-semibold text-slate-900 transition-colors hover:text-slate-700"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-slate-900" />
              <span>Search</span>
            </button>

            <button
              onClick={() => handleNavClick(myPageTarget)}
              className="inline-flex items-center gap-2 text-base font-semibold text-slate-900 transition-colors hover:text-slate-700"
              aria-label="My page"
            >
              <User className="h-5 w-5 text-slate-900" />
              <span>My page</span>
            </button>
          </div>

          {/* Right: Menu button */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-amber-500 px-5 text-base font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-400 active:scale-[0.98]"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span>Menu</span>
          </button>
        </div>

        {/* Mobile center items (shown under the pill on very small screens) */}
        <div className="mt-3 flex items-center justify-center gap-6 sm:hidden">
          <button
            onClick={() => handleNavClick("search" as PageType)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 active:scale-[0.98]"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
          </button>

          <button
            onClick={() => handleNavClick(myPageTarget)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 active:scale-[0.98]"
            aria-label="My page"
          >
            <User className="h-4 w-4" />
            <span>My page</span>
          </button>
        </div>
      </div>

      {/* Mobile/Overlay Menu */}
      <div
        className={`fixed inset-0 z-40 transform bg-white transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-6 pt-28">
          <div className="flex flex-col gap-2">
            {menuLinks
              .filter((l) => l.show)
              .map((link) => (
                <button
                  key={link.name}
                  onClick={() => handleNavClick(link.page)}
                  className={`flex w-full items-center gap-4 rounded-2xl p-4 text-left text-lg font-bold leading-[1.2] transition-colors ${
                    currentPage === link.page ? "bg-amber-50 text-amber-700" : "text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <link.icon className="h-6 w-6" />
                  {link.name}
                </button>
              ))}
          </div>

          <div className="mt-auto border-t border-slate-100 pt-6">
            {isLoggedIn ? (
              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-4 rounded-2xl p-4 text-lg font-bold leading-[1.2] text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-6 w-6" />
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => handleNavClick("auth" as PageType)}
                className="flex w-full items-center justify-center rounded-2xl bg-slate-900 py-4 text-lg font-bold leading-[1.2] text-white shadow-lg active:scale-[0.98]"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
