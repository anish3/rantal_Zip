import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Heart,
  UserPlus,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Notification } from '../../types/client.ts';
import { api } from '../../lib/api.ts';
import { useApp } from '../../context/AppContext.tsx';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({ isOpen, onClose }) => {
  const { showToast, refreshNotifications, openPropertyProfile, setActiveView } = useApp();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      refreshNotifications();
      showToast('All notifications marked as read', 'info');
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenewFromNotification = async (listingId: string) => {
    try {
      const res = await api.renewListing(listingId);
      showToast(res.message, 'success');
      fetchNotifs();
      refreshNotifications();
    } catch (e: any) {
      showToast(e.message || 'Renewal failed', 'error');
    }
  };

  const handleMarkRentedFromNotification = async (listingId: string) => {
    try {
      const res = await api.markListingRented(listingId);
      showToast(res.message, 'success');
      fetchNotifs();
      refreshNotifications();
    } catch (e: any) {
      showToast(e.message || 'Action failed', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md h-full bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div>
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-rose-500" />
              <h2 className="text-base font-extrabold text-white">Notifications</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-zinc-400 hover:text-white"
              >
                Mark all read
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[calc(100vh-80px)] overflow-y-auto divide-y divide-zinc-800/60 p-2">
            {notifications.map((notif) => {
              const isExpiring = notif.type === 'EXPIRING_SOON' || notif.type === 'LISTING_EXPIRED';
              const listingId = notif.metadata?.listingId;

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-2xl transition-colors mb-1 ${
                    notif.isRead ? 'bg-zinc-900/60' : 'bg-zinc-800/80 border border-zinc-700/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-rose-400 flex-shrink-0 mt-0.5">
                      {isExpiring ? (
                        <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                      ) : notif.type === 'NEW_MESSAGE' ? (
                        <MessageSquare className="w-4 h-4 text-sky-400" />
                      ) : notif.type === 'REQUIREMENT_MATCH' ? (
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      ) : notif.type === 'NEW_FOLLOWER' ? (
                        <UserPlus className="w-4 h-4 text-violet-400" />
                      ) : (
                        <Heart className="w-4 h-4 text-rose-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">{notif.title}</h4>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* 10-DAY EXPIRATION PROMPT ACTIONS (BRIEF REQUIREMENT) */}
                      {isExpiring && listingId && (
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-700/60">
                          <button
                            onClick={() => handleRenewFromNotification(listingId)}
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] transition-colors"
                          >
                            Still Available (Renew 10d)
                          </button>
                          <button
                            onClick={() => handleMarkRentedFromNotification(listingId)}
                            className="py-1.5 px-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-bold text-[11px] transition-colors"
                          >
                            Room Rented
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {notifications.length === 0 && !loading && (
              <div className="py-24 text-center text-zinc-500 text-xs">
                No notifications right now.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
