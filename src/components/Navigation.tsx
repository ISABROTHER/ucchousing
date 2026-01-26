// src/components/Navigation.tsx
import { useState, useEffect } from 'react';
import { Menu, X, Building2, User, LogOut, LayoutDashboard, Calendar, Search } from 'lucide-react';
import { PageType } from '../App';

interface NavigationProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  userType?: 'student' | 'owner';
  isLoggedIn: boolean;
  onLogout: () => void;
}

export default function Navigation({ 
  currentPage, 
  onNavigate, 
  userType, 
  isLoggedIn, 
  onLogout 
}: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for header background
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Define navigation links based on user role
  const navLinks = [
    { 
      name: 'Find Hostels', 
      page: 'search' as PageType, 
      icon: Search, 
      show: true 
    },
    { 
      name: 'My Bookings', 
      page: 'my-bookings' as PageType, 
      icon: Calendar, 
      show: isLoggedIn && userType === 'student' 
    },
    { 
      name: 'Dashboard', 
      page: 'dashboard' as PageType, 
      icon: LayoutDashboard, 
      show: isLoggedIn && userType === 'owner' 
    },
  ];

  const handleNavClick = (page: PageType) => {
    onNavigate(page);
    setIsOpen(false);
  };

  return (
    <nav 
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled 
          ? 'border-b border-slate-200 bg-white/90 backdrop-blur-md py-3 shadow-sm' 
          : 'bg-transparent py-6'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button 
            onClick={() => handleNavClick('home')}
            className="group flex items-center gap-2 outline-none transition-transform active:scale-95"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-lg shadow-emerald-700/20 transition-colors group-hover:bg-emerald-800">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold leading-[1.2] tracking-tight text-slate-900">
              UCC<span className="text-emerald-700">Housing</span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.filter(link => link.show).map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link.page)}
                className={`flex items-center gap-2 text-sm font-semibold leading-[1.5] transition-colors hover:text-emerald-700 ${
                  currentPage === link.page ? 'text-emerald-700' : 'text-slate-600'
                }`}
              >
                {link.name}
              </button>
            ))}

            <div className="flex items-center gap-3 border-l border-slate-200 pl-8">
              {isLoggedIn ? (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={onLogout}
                    className="flex items-center gap-2 text-sm font-semibold leading-[1.5] text-slate-600 transition-colors hover:text-rose-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                    <User className="h-5 w-5" />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleNavClick('auth')}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-bold leading-[1.5] text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg active:scale-95"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 md:hidden"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 z-40 transform bg-white transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col p-6 pt-28">
          <div className="flex flex-col gap-2">
            {navLinks.filter(link => link.show).map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link.page)}
                className={`flex w-full items-center gap-4 rounded-2xl p-4 text-left text-lg font-bold leading-[1.2] transition-colors ${
                  currentPage === link.page 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'text-slate-900 hover:bg-slate-50'
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
                onClick={() => handleNavClick('auth')}
                className="flex w-full items-center justify-center rounded-2xl bg-emerald-700 py-4 text-lg font-bold leading-[1.2] text-white shadow-lg shadow-emerald-700/20 active:scale-[0.98]"
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