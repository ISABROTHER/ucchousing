import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import HostelDetailPage from './pages/HostelDetailPage';
import AuthPage from './pages/AuthPage';
import BookingPage from './pages/BookingPage';
import DashboardPage from './pages/DashboardPage';
import MyBookingsPage from './pages/MyBookingsPage';
import RoommatePage from './pages/RoommatePage';
import ComparePage from './pages/ComparePage';
import { getWishlist } from './lib/wishlist';
import { getCompareList, addToCompare, removeFromCompare, clearCompare } from './lib/compare';

export type PageType = 'home' | 'search' | 'detail' | 'auth' | 'booking' | 'dashboard' | 'my-bookings' | 'roommates' | 'compare';

interface AppState {
  currentPage: PageType;
  selectedHostelId?: string;
  selectedBookingId?: string;
  user: any;
  userProfile: any;
}

function App() {
  const [state, setState] = useState<AppState>({
    currentPage: 'home',
    user: null,
    userProfile: null,
  });
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>(getCompareList());

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setState(prev => ({ ...prev, user: session.user }));
        (async () => { await fetchUserProfile(session.user.id); })();
        (async () => {
          try { const ids = await getWishlist(session.user.id); setWishlistIds(ids); } catch { /* silent */ }
        })();
      } else {
        setState(prev => ({ ...prev, user: null, userProfile: null }));
        setWishlistIds([]);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  async function checkAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setState(prev => ({ ...prev, user }));
        await fetchUserProfile(user.id);
        try { const ids = await getWishlist(user.id); setWishlistIds(ids); } catch { /* silent */ }
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserProfile(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setState(prev => ({ ...prev, userProfile: data }));
    }
  }

  const handleNavigate = (page: PageType, hostelId?: string) => {
    setState(prev => ({
      ...prev,
      currentPage: page,
      selectedHostelId: hostelId,
    }));
    window.scrollTo(0, 0);
  };

  const handleWishlistToggle = useCallback((hostelId: string, newState: boolean) => {
    setWishlistIds(prev =>
      newState ? [...prev, hostelId] : prev.filter(id => id !== hostelId)
    );
  }, []);

  const handleCompareToggle = useCallback((hostelId: string) => {
    setCompareIds(prev => {
      if (prev.includes(hostelId)) {
        return removeFromCompare(hostelId);
      }
      if (prev.length >= 3) return prev;
      return addToCompare(hostelId);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#DC143C] rounded-full animate-pulse"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <Navigation
        user={state.user}
        userProfile={state.userProfile}
        onNavigate={handleNavigate}
        currentPage={state.currentPage}
      />

      <main className="pt-16 w-full">
        {state.currentPage === 'home' && (
          <HomePage onNavigate={handleNavigate} />
        )}
        {state.currentPage === 'search' && (
          <SearchPage
            onNavigate={handleNavigate}
          />
        )}
        {state.currentPage === 'detail' && state.selectedHostelId && (
          <HostelDetailPage
            hostelId={state.selectedHostelId}
            user={state.user}
            userProfile={state.userProfile}
            onNavigate={handleNavigate}
            wishlistIds={wishlistIds}
            onWishlistToggle={handleWishlistToggle}
            compareIds={compareIds}
            onCompareToggle={handleCompareToggle}
          />
        )}
        {state.currentPage === 'auth' && (
          <AuthPage onNavigate={handleNavigate} />
        )}
        {state.currentPage === 'booking' && state.selectedHostelId && (
          <BookingPage
            hostelId={state.selectedHostelId}
            user={state.user}
            onNavigate={handleNavigate}
          />
        )}
        {state.currentPage === 'dashboard' && state.user && (
          <DashboardPage
            user={state.user}
            userProfile={state.userProfile}
            onNavigate={handleNavigate}
          />
        )}
        {state.currentPage === 'my-bookings' && state.user && (
          <MyBookingsPage onNavigate={handleNavigate} />
        )}
        {state.currentPage === 'roommates' && (
          <RoommatePage
            user={state.user}
            userProfile={state.userProfile}
            onNavigate={handleNavigate}
          />
        )}
        {state.currentPage === 'compare' && (
          <ComparePage
            compareIds={compareIds}
            onCompareChange={setCompareIds}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {compareIds.length > 0 && state.currentPage !== 'compare' && (
        <CompareFloatingBar
          count={compareIds.length}
          onView={() => handleNavigate('compare')}
          onClear={() => {
            clearCompare();
            setCompareIds([]);
          }}
        />
      )}
    </div>
  );
}

function CompareFloatingBar({ count, onView, onClear }: { count: number; onView: () => void; onClear: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[slideUp_0.3s_ease-out]">
      <div className="flex items-center gap-3 bg-gray-900 text-white rounded-2xl px-5 py-3 shadow-2xl shadow-gray-900/30">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-sky-500 text-sm font-bold">
          {count}
        </span>
        <span className="text-sm font-semibold">
          hostel{count > 1 ? "s" : ""} to compare
        </span>
        <button
          onClick={onView}
          className="bg-white text-gray-900 px-4 py-1.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
        >
          Compare Now
        </button>
        <button
          onClick={onClear}
          className="text-gray-400 hover:text-white text-xs font-medium transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export default App;
