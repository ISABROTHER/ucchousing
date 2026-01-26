import { useEffect, useMemo, useState } from "react";
import { Menu, X, Search, User, LogOut, Calendar, LayoutDashboard } from "lucide-react";
import { PageType } from "../App";

interface NavigationProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  userType?: "student" | "owner";
  userName?: string;
  isLoggedIn: boolean;
  onLogout: () => void;
}

export default function Navigation({
  currentPage,
  onNavigate,
  userType,
  userName,
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

  // Extract first name for the pill display (e.g. "Isa" from "Isa Brother")
  const firstName = useMemo(() => {
    if (!userName) return "";
    return userName.split(" ")[0];
  }, [userName]);

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
      <div className={`mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 ${scrolled ? "pt-2" : "pt-4"}`}>
        {/* Pill container */}
        <div
          className={`flex items-center gap-2 rounded-3xl border border-slate-200 bg-white transition-all duration-300 ${
            scrolled ? "px-3 py-2 shadow-sm" : "px-3 py-3"
          }`}
        >
          {/* Left: Logo */}
          <button
            onClick={() => handleNavClick("home")}
            className="mr-auto flex items-center gap-2 rounded-2xl px-2 py-2 outline-none transition-transform active:scale-95"
            aria-label="Go to home"
          >
            <div className="flex h-9 w-10 items-center justify-center rounded-2xl">
              <span className="text-3xl font-extrabold leading-none tracking-tight text-amber-500">S</span>
            </div>
          </button>

          {/* Middle Group */}
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <button
              onClick={() => handleNavClick("search" as PageType)}
              className="inline-flex min-w-0 items-center gap-2 rounded-2xl px-2 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
              aria-label="Search"
            >
              <Search className="h-5 w-5 shrink-0 text-slate-900" />
              <span className="min-w-0 truncate hidden sm:inline">Search</span>
            </button>

            <button
              onClick={() => handleNavClick(myPageTarget)}
              className="inline-flex min-w-0 items-center gap-2 rounded-2xl px-2 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
              aria-label="My page"
            >
              <User className="h-5 w-5 shrink-0 text-slate-900" />
              <span className="min-w-0 truncate hidden sm:inline">
                {isLoggedIn && firstName ? firstName : "My page"}
              </span>
            </button>
          </div>

          {/* Right: Menu button */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-amber-500 px-4 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-400 active:scale-[0.98]"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="hidden xs:inline">Menu</span>
            <span className="xs:hidden">Menu</span>
          </button>
        </div>
      </div>

      {/* Slide-in menu (mobile-first) */}
      <div
        className={`fixed inset-0 z-40 transform bg-white transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-6 pt-24">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-slate-900">
              {isLoggedIn && firstName ? `Hi, ${firstName}` : "Menu"}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            {menuLinks
              .filter((l) => l.show)
              .map((link) => (
                <button
                  key={link.name}
                  onClick={() => handleNavClick(link.page)}
                  className={`flex w-full items-center gap-4 rounded-2xl p-4 text-left text-base font-bold leading-[1.2] transition-colors ${
                    currentPage === link.page ? "bg-amber-50 text-amber-700" : "text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <link.icon className="h-6 w-6" />
                  {link.name}
                </button>
              ))}

            {/* Quick action for My page (role-aware) */}
            <button
              onClick={() => handleNavClick(myPageTarget)}
              className="flex w-full items-center gap-4 rounded-2xl p-4 text-left text-base font-bold leading-[1.2] text-slate-900 hover:bg-slate-50"
            >
              <User className="h-6 w-6" />
              {isLoggedIn ? "My Profile" : "My page"}
            </button>
          </div>

          <div className="mt-auto border-t border-slate-100 pt-6">
            {isLoggedIn ? (
              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-4 rounded-2xl p-4 text-base font-bold leading-[1.2] text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-6 w-6" />
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => handleNavClick("auth" as PageType)}
                className="flex w-full items-center justify-center rounded-2xl bg-slate-900 py-4 text-base font-bold leading-[1.2] text-white shadow-lg active:scale-[0.98]"
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