import { User, LogOut, Menu, X, Building2, BookOpen, Heart, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import { PageType } from '../App';
import { useAuth } from '../lib/auth';

interface NavigationProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

export default function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const { user, profile, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      onNavigate('home');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navLinks = [
    { id: 'home', label: 'Home', icon: Building2 },
    { id: 'search', label: 'Explore', icon: BookOpen },
    { id: 'bookings', label: 'My Bookings', icon: Heart, hidden: profile?.user_type !== 'student' && !!user },
    { id: 'dashboard', label: 'Owner Panel', icon: LayoutDashboard, hidden: profile?.user_type !== 'owner' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <div 
            className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-90"
            onClick={() => onNavigate('home')}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-lg shadow-emerald-200">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              UCC<span className="text-emerald-700">Housing</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {navLinks.filter(link => !link.hidden).map((link) => (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id as PageType)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  currentPage === link.id
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex md:items-center md:gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {profile?.full_name || 'User'}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 leading-tight">
                      {profile?.user_type || 'Student'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate('auth')}
                  className="text-sm font-bold text-slate-600 hover:text-slate-900"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onNavigate('auth')}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="border-b border-slate-200 bg-white md:hidden">
          <div className="space-y-1 px-4 pb-6 pt-2">
            {navLinks.filter(link => !link.hidden).map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  onNavigate(link.id as PageType);
                  setIsMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-bold transition-colors ${
                  currentPage === link.id
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </button>
            ))}
            <div className="mt-4 border-t border-slate-100 pt-4">
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 px-4 py-3 text-base font-bold text-rose-600"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('auth')}
                  className="flex w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 text-base font-bold text-white"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}