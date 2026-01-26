import { Menu, LogOut, Home, Settings } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PageType } from '../App';

interface NavigationProps {
  user: any;
  userProfile: any;
  onNavigate: (page: PageType) => void;
  currentPage: PageType;
}

export default function Navigation({
  user,
  userProfile,
  onNavigate,
  currentPage,
}: NavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onNavigate('home');
    setMenuOpen(false);
  };

  const handleNavigate = (page: PageType) => {
    onNavigate(page);
    setMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleNavigate('home')}
          >
            <div className="w-8 h-8 bg-[#DC143C] rounded flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-black">HostelBooK</span>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu className="w-6 h-6 text-black" />
          </button>

          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => handleNavigate('search')}
              className={`text-sm font-medium transition-colors ${
                currentPage === 'search'
                  ? 'text-[#DC143C]'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Search
            </button>

            {user ? (
              <>
                <button
                  onClick={() => handleNavigate('my-bookings')}
                  className={`text-sm font-medium transition-colors ${
                    currentPage === 'my-bookings'
                      ? 'text-[#DC143C]'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  My Bookings
                </button>

                {userProfile?.user_type === 'owner' && (
                  <button
                    onClick={() => handleNavigate('dashboard')}
                    className={`text-sm font-medium transition-colors ${
                      currentPage === 'dashboard'
                        ? 'text-[#DC143C]'
                        : 'text-gray-600 hover:text-black'
                    }`}
                  >
                    Dashboard
                  </button>
                )}

                <div className="flex items-center gap-3 pl-8 border-l border-gray-200">
                  <div className="text-right">
                    <p className="text-sm font-medium text-black">
                      {userProfile?.full_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {userProfile?.user_type}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-600 hover:text-[#DC143C] transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => handleNavigate('auth')}
                className="px-6 py-2 bg-[#DC143C] text-white font-medium rounded hover:bg-red-700 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
            <button
              onClick={() => handleNavigate('search')}
              className="block w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              Search
            </button>

            {user ? (
              <>
                <button
                  onClick={() => handleNavigate('my-bookings')}
                  className="block w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50"
                >
                  My Bookings
                </button>

                {userProfile?.user_type === 'owner' && (
                  <button
                    onClick={() => handleNavigate('dashboard')}
                    className="block w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-50"
                  >
                    Dashboard
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => handleNavigate('auth')}
                className="block w-full px-4 py-2 bg-[#DC143C] text-white font-medium rounded hover:bg-red-700"
              >
                Sign In
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
