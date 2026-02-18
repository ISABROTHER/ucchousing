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
import RoommatePage from './pages/RoommatePage';
import MessagesPage from './pages/MessagesPage';
import QRCheckInPage from './pages/QRCheckInPage';
import MaintenancePage from './pages/MaintenancePage';
import ExpensesPage from './pages/ExpensesPage';
import NotificationsPage from './pages/NotificationsPage';
import WishlistPage from './pages/WishlistPage';
import LaundryPage from './pages/LaundryPage';
import TenancyPage from './pages/TenancyPage';
import UtilitiesPage from './pages/UtilitiesPage';

export type PageType =
  | 'home' | 'search' | 'detail' | 'auth' | 'booking' | 'dashboard'
  | 'my-bookings' | 'roommates' | 'messages' | 'qr-checkin' | 'maintenance'
  | 'expenses' | 'notifications' | 'wishlist'
  | 'laundry' | 'tenancy' | 'utilities';

interface AppState {
  currentPage: PageType;
  selectedHostelId?: string;
  selectedBookingId?: string;
  selectedConversationId?: string;
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
        (async () => { await fetchUserProfile(session.user.id); })();
      } else {
        setState(prev => ({ ...prev, user: null, userProfile: null }));
      }
    });

    return () => { subscription?.unsubscribe(); };
  }, []);

  async function checkAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setState(prev => ({ ...prev, user }));
        await fetchUserProfile(user.id);
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

  const handleNavigate = (page: PageType, hostelId?: string, conversationId?: string) => {
    setState(prev => ({
      ...prev,
      currentPage: page,
      selectedHostelId: hostelId,
      selectedConversationId: conversationId,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

      <main className="pt-24 w-full">
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
        {state.currentPage === 'roommates' && (
          <RoommatePage
            user={state.user}
            userProfile={state.userProfile}
            onNavigate={handleNavigate}
          />
        )}
        {state.currentPage === 'messages' && (
          <MessagesPage
            user={state.user}
            userProfile={state.userProfile}
            onNavigate={handleNavigate}
            initialConversationId={state.selectedConversationId}
          />
        )}
        {state.currentPage === 'qr-checkin' && (
          <QRCheckInPage
            user={state.user}
            userProfile={state.userProfile}
            onNavigate={handleNavigate}
          />
        )}
        {state.currentPage === 'maintenance' && (
          <MaintenancePage
            user={state.user}
            userProfile={state.userProfile}
            onNavigate={handleNavigate}
          />
        )}
        {state.currentPage === 'expenses' && (
          <ExpensesPage
            user={state.user}
            userProfile={state.userProfile}
            onNavigate={handleNavigate}
          />
        )}
        {state.currentPage === 'notifications' && (
          <NotificationsPage
            user={state.user}
            onNavigate={handleNavigate}
          />
        )}
        {state.currentPage === 'wishlist' && (
          <WishlistPage
            user={state.user}
            onNavigate={handleNavigate}
          />
        )}
        {state.currentPage === 'laundry' && (
          <LaundryPage
            user={state.user}
            userProfile={state.userProfile}
            onNavigate={handleNavigate}
          />
        )}
        {state.currentPage === 'tenancy' && (
          <TenancyPage
            user={state.user}
            userProfile={state.userProfile}
            onNavigate={handleNavigate}
          />
        )}
        {state.currentPage === 'utilities' && (
          <UtilitiesPage
            user={state.user}
            userProfile={state.userProfile}
            onNavigate={handleNavigate}
          />
        )}
      </main>
    </div>
  );
}

export default App;
