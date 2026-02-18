import { useState, useEffect } from 'react';
import {
  Bell, CheckCircle, XCircle, MessageCircle, Wrench, LogIn, LogOut,
  Star, DollarSign, Calendar, Check, BellOff
} from 'lucide-react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  Notification,
  NotificationType,
  getNotificationColor,
} from '../lib/notifications';
import { PageType } from '../App';

interface NotificationsPageProps {
  user: any;
  onNavigate: (page: PageType, hostelId?: string) => void;
}

const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  booking_confirmed: CheckCircle,
  booking_cancelled: XCircle,
  new_message: MessageCircle,
  maintenance_update: Wrench,
  check_in_reminder: LogIn,
  check_out_reminder: LogOut,
  review_request: Star,
  payment_received: DollarSign,
  new_booking: Calendar,
};

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export default function NotificationsPage({ user, onNavigate }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  async function loadNotifications() {
    try {
      const data = await getNotifications(user.id);
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } finally {
      setMarkingAll(false);
    }
  }

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.is_read) handleMarkRead(notif.id);
    const data = notif.data as Record<string, string>;
    if (notif.type === 'new_message' && data?.conversation_id) {
      onNavigate('messages');
    } else if (['booking_confirmed', 'booking_cancelled', 'check_in_reminder', 'check_out_reminder', 'review_request'].includes(notif.type)) {
      onNavigate('my-bookings');
    } else if (notif.type === 'maintenance_update') {
      onNavigate('maintenance');
    } else if (notif.type === 'new_booking' && data?.hostel_id) {
      onNavigate('dashboard');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <button onClick={() => onNavigate('auth')} className="px-6 py-2 bg-[#DC143C] text-white font-semibold rounded-lg">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center relative">
                <Bell className="w-6 h-6 text-blue-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#DC143C] text-white rounded-full text-xs font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-gray-500 mt-2">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <Check className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
            <BellOff className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500">No notifications yet. We'll notify you about bookings, messages, and updates.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => {
              const Icon = NOTIFICATION_ICONS[notif.type] || Bell;
              const colorClass = getNotificationColor(notif.type);
              return (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left p-4 rounded-2xl transition-all hover:shadow-sm ${
                    notif.is_read ? 'bg-white' : 'bg-blue-50/40 border border-blue-100'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold ${notif.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notif.title}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400">{timeAgo(notif.created_at)}</span>
                          {!notif.is_read && (
                            <span className="w-2 h-2 bg-[#DC143C] rounded-full flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.body}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
