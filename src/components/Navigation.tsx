import { useEffect, useMemo, useRef, useState } from "react";
import {
  Menu, X, Search, User, LogOut, Calendar, LayoutDashboard, Users,
  MessageCircle, QrCode, Wrench, DollarSign, Bell, Heart,
  Shirt, FileText, Zap, Home
} from "lucide-react";
import { PageType } from "../App";
import { signOut } from "../lib/auth";
import { getUnreadCount } from "../lib/messaging";
import { getUnreadNotificationCount } from "../lib/notifications";

interface NavigationProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  user: any;
  userProfile: any;
}

export default function Navigation({
  currentPage,
  onNavigate,
  user,
  userProfile,
}: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const isLoggedIn = !!user;
  const userType = userProfile?.user_type as "student" | "owner" | undefined;
  const userName = userProfile?.full_name as string | undefined;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      return;
    }
    const load = async () => {
      const [msgCount, notifCount] = await Promise.all([
        getUnreadCount(user.id).catch(() => 0),
        getUnreadNotificationCount(user.id).catch(() => 0),
      ]);
      setUnreadMessages(msgCount);
      setUnreadNotifications(notifCount);
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const myPageTarget = useMemo<PageType>(() => {
    if (!isLoggedIn) return "auth" as PageType;
    if (userType === "owner") return "dashboard" as PageType;
    return "my-bookings" as PageType;
  }, [isLoggedIn, userType]);

  const firstName = useMemo(() => {
    if (!userName) return "";
    return userName.split(" ")[0];
  }, [userName]);

  const handleNavClick = (page: PageType) => {
    onNavigate(page);
    setIsOpen(false);
  };

  const totalBadge = unreadMessages + unreadNotifications;

  const quickLinks = useMemo(() => {
    const base = [
      { label: 'Home', page: 'home' as PageType, icon: Home },
      { label: 'Search', page: 'search' as PageType, icon: Search },
    ];
    if (!isLoggedIn) return base;
    if (userType === 'owner') return [
      ...base,
      { label: 'Dashboard', page: 'dashboard' as PageType, icon: LayoutDashboard },
      { label: 'Messages', page: 'messages' as PageType, icon: MessageCircle },
    ];
    return [
      ...base,
      { label: 'My Bookings', page: 'my-bookings' as PageType, icon: Calendar },
      { label: 'Laundry', page: 'laundry' as PageType, icon: Shirt },
      { label: 'Maintenance', page: 'maintenance' as PageType, icon: Wrench },
      { label: 'Messages', page: 'messages' as PageType, icon: MessageCircle },
      { label: 'Saved', page: 'wishlist' as PageType, icon: Heart },
      { label: 'Roommates', page: 'roommates' as PageType, icon: Users },
      { label: 'Tenancy', page: 'tenancy' as PageType, icon: FileText },
      { label: 'Utilities', page: 'utilities' as PageType, icon: Zap },
      { label: 'Expenses', page: 'expenses' as PageType, icon: DollarSign },
    ];
  }, [isLoggedIn, userType]);

  const studentLinks = [
    { name: "Find Hostels", page: "search" as PageType, icon: Search },
    { name: "My Bookings", page: "my-bookings" as PageType, icon: Calendar },
    { name: "Messages", page: "messages" as PageType, icon: MessageCircle, badge: unreadMessages },
    { name: "Check-In QR", page: "qr-checkin" as PageType, icon: QrCode },
    { name: "Maintenance", page: "maintenance" as PageType, icon: Wrench },
    { name: "Expenses", page: "expenses" as PageType, icon: DollarSign },
    { name: "Saved Hostels", page: "wishlist" as PageType, icon: Heart },
    { name: "Find Roommates", page: "roommates" as PageType, icon: Users },
    { name: "Laundry Hub", page: "laundry" as PageType, icon: Shirt },
    { name: "Tenancy & Rent", page: "tenancy" as PageType, icon: FileText },
    { name: "Utilities", page: "utilities" as PageType, icon: Zap },
    { name: "Notifications", page: "notifications" as PageType, icon: Bell, badge: unreadNotifications },
  ];

  const ownerLinks = [
    { name: "Dashboard", page: "dashboard" as PageType, icon: LayoutDashboard },
    { name: "Messages", page: "messages" as PageType, icon: MessageCircle, badge: unreadMessages },
    { name: "Notifications", page: "notifications" as PageType, icon: Bell, badge: unreadNotifications },
    { name: "Find Hostels", page: "search" as PageType, icon: Search },
  ];

  const guestLinks = [
    { name: "Find Hostels", page: "search" as PageType, icon: Search },
  ];

  const menuLinks = useMemo(() => {
    if (!isLoggedIn) return guestLinks;
    if (userType === "owner") return ownerLinks;
    return studentLinks;
  }, [isLoggedIn, userType, unreadMessages, unreadNotifications]);

  return (
    <nav className="fixed top-0 z-50 w-full">
      <div className={`mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 ${scrolled ? "pt-2" : "pt-4"}`}>
        <div
          className={`flex items-center gap-2 rounded-3xl border border-slate-200 bg-white transition-all duration-300 ${
            scrolled ? "px-3 py-2 shadow-sm" : "px-3 py-3"
          }`}
        >
          <button
            onClick={() => handleNavClick("home")}
            className="mr-auto flex items-center gap-2 rounded-2xl px-2 py-2 outline-none transition-transform active:scale-95"
            aria-label="Go to home"
          >
            <div className="flex h-9 w-10 items-center justify-center rounded-2xl">
              <span className="text-3xl font-extrabold leading-none tracking-tight text-amber-500">S</span>
            </div>
          </button>

          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => handleNavClick("search" as PageType)}
              className="inline-flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
              aria-label="Search"
            >
              <Search className="h-5 w-5 shrink-0 text-slate-900" />
              <span className="min-w-0 truncate hidden sm:inline">Search</span>
            </button>

            {isLoggedIn && (
              <button
                onClick={() => handleNavClick("notifications")}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#DC143C] text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => handleNavClick(myPageTarget)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-amber-500 px-5 text-sm font-bold text-slate-900 shadow-sm transition-colors hover:bg-amber-400 active:scale-[0.98] relative"
              aria-label="My Page"
            >
              <User className="h-5 w-5" />
              <span>{isLoggedIn && firstName ? firstName : "My Page"}</span>
              {totalBadge > 0 && !unreadNotifications && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#DC143C] text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {totalBadge > 9 ? '9+' : totalBadge}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsOpen((v) => !v)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-900 transition-colors hover:bg-slate-100 active:scale-[0.98]"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 mt-2">
        <div className="relative">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {quickLinks.map((link) => {
              const Icon = link.icon;
              const active = currentPage === link.page;
              return (
                <button
                  key={link.page}
                  onClick={() => handleNavClick(link.page)}
                  className={`group relative flex shrink-0 items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                    active
                      ? 'border-amber-300 bg-amber-400 text-slate-900 shadow-sm shadow-amber-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`} />
                  <span>{link.label}</span>
                  {active && (
                    <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-amber-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-40 transform bg-white transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-6 pt-24 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
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

          <div className="flex flex-col gap-1">
            {menuLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link.page)}
                className={`flex w-full items-center gap-4 rounded-2xl p-4 text-left text-base font-bold leading-[1.2] transition-colors ${
                  currentPage === link.page ? "bg-amber-50 text-amber-700" : "text-slate-900 hover:bg-slate-50"
                }`}
              >
                <link.icon className="h-6 w-6 flex-shrink-0" />
                <span className="flex-1">{link.name}</span>
                {'badge' in link && link.badge > 0 && (
                  <span className="bg-[#DC143C] text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {link.badge}
                  </span>
                )}
              </button>
            ))}

            {isLoggedIn && (
              <button
                onClick={() => handleNavClick(myPageTarget)}
                className="flex w-full items-center gap-4 rounded-2xl p-4 text-left text-base font-bold leading-[1.2] text-slate-900 hover:bg-slate-50"
              >
                <User className="h-6 w-6" />
                My Profile
              </button>
            )}
          </div>

          <div className="mt-auto border-t border-slate-100 pt-6">
            {isLoggedIn ? (
              <button
                onClick={async () => {
                  try {
                    await signOut();
                    setIsOpen(false);
                    onNavigate("home");
                  } catch { }
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
