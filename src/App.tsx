import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import HostelDetailPage from './pages/HostelDetailPage';
import AuthPage from './pages/AuthPage';
import BookingPage from './pages/BookingPage';
import DashboardPage from './pages/DashboardPage';
import MyBookingsPage from './pages/MyBookingsPage';

export type PageType = 'home' | 'search' | 'detail' | 'auth' | 'booking' | 'dashboard' | 'my-bookings';

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

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setState(prev => ({ ...prev, user: session.user }));
        fetchUserProfile(session.user.id);
      } else {
        setState(prev => ({ ...prev, user: null, userProfile: null }));
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
      } else {
        await autoSignIn();
      }
    } finally {
      setLoading(false);
    }
  }

  async function autoSignIn() {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'demo@hostelbook.com',
        password: 'DemoPassword123!',
      });

      if (!error && data.user) {
        setState(prev => ({ ...prev, user: data.user }));
        await fetchUserProfile(data.user.id);
      }
    } catch {
      // Silent fail, user can sign in manually
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
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
    <div className="min-h-screen bg-white">
      <Navigation
        user={state.user}
        userProfile={state.userProfile}
        onNavigate={handleNavigate}
        currentPage={state.currentPage}
      />

      <main className="pt-16">
        {state.currentPage === 'home' && (
          <HomePage onNavigate={handleNavigate} />
        )}
        {state.currentPage === 'search' && (
          <SearchPage onNavigate={handleNavigate} />
        )}
        {state.currentPage === 'detail' && state.selectedHostelId && (
          <HostelDetailPage
            hostelId={state.selectedHostelId}
            user={state.user}
            userProfile={state.userProfile}
            onNavigate={handleNavigate}
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
      </main>
    </div>
  );
}

export default App;
