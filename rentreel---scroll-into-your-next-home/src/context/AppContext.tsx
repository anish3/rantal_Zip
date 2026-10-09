import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, ActiveView, UserRole, MessageContext, Notification } from '../types/client.ts';
import { api } from '../lib/api.ts';

interface ToastInfo {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

interface AppContextType {
  currentUser: User | null;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  viewParams: Record<string, any>;
  setViewParams: (params: Record<string, any>) => void;
  allDemoUsers: User[];
  isCreateModalOpen: boolean;
  createModalTab: 'listing' | 'property' | 'reel' | 'requirement';
  openCreateModal: (tab?: 'listing' | 'property' | 'reel' | 'requirement') => void;
  closeCreateModal: () => void;
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  openChatWith: (targetUserId: string, context?: MessageContext) => Promise<void>;
  openPropertyProfile: (propertyId: string) => void;
  openUserProfile: (username: string) => void;
  openListingDetail: (listingId: string) => void;
  switchDemoUser: (userId: string) => Promise<void>;
  switchUserRole: (role: UserRole) => Promise<void>;
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  refreshUserData: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  logout: () => Promise<void>;
  // Visit schedule modal state
  scheduleVisitData: { isOpen: boolean; propertyId?: string; propertyTitle?: string; ownerId?: string };
  openScheduleVisit: (propertyId: string, propertyTitle: string, ownerId: string) => void;
  closeScheduleVisit: () => void;
  // Notifications & Search controls
  isNotificationsOpen: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [viewParams, setViewParams] = useState<Record<string, any>>({});
  const [allDemoUsers, setAllDemoUsers] = useState<User[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalTab, setCreateModalTab] = useState<'listing' | 'property' | 'reel' | 'requirement'>('listing');
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(1);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scheduleVisitData, setScheduleVisitData] = useState<{
    isOpen: boolean;
    propertyId?: string;
    propertyTitle?: string;
    ownerId?: string;
  }>({ isOpen: false });

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const refreshUserData = async () => {
    try {
      const data = await api.getSessionUser();
      setCurrentUser(data.user);
      const demoData = await api.getDemoUsers();
      setAllDemoUsers(demoData.users);
    } catch (err) {
      setCurrentUser(null);
      try {
        const demoData = await api.getDemoUsers();
        setAllDemoUsers(demoData.users);
      } catch {
        setAllDemoUsers([]);
      }
    }
  };

  const refreshNotifications = async () => {
    try {
      const notifs = await api.getNotifications();
      setUnreadNotificationsCount(notifs.unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    refreshUserData();
    refreshNotifications();

    const interval = setInterval(() => {
      refreshNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const openCreateModal = (tab: 'listing' | 'property' | 'reel' | 'requirement' = 'listing') => {
    setCreateModalTab(tab);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const openChatWith = async (targetUserId: string, context?: MessageContext) => {
    try {
      const result = await api.startConversation(targetUserId, context);
      setViewParams({ conversationId: result.conversation.id, context });
      setActiveView('messages');
      showToast('Chat opened with property details attached!', 'info');
    } catch (err: any) {
      showToast(err.message || 'Could not start chat', 'error');
    }
  };

  const openPropertyProfile = (propertyId: string) => {
    setViewParams({ propertyId });
    setActiveView('property-profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openUserProfile = (username: string) => {
    setViewParams({ username });
    setActiveView('user-profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openListingDetail = (listingId: string) => {
    setViewParams({ listingId });
    setActiveView('home'); // or opens property profile with listing highlighted
  };

  const switchDemoUser = async (userId: string) => {
    try {
      const res = await api.switchUser(userId);
      setCurrentUser(res.user);
      showToast(`Switched persona to ${res.user.name} (${res.user.activeRole})`, 'success');
      await refreshNotifications();
    } catch (err: any) {
      showToast('Failed to switch user', 'error');
    }
  };

  const switchUserRole = async (role: UserRole) => {
    try {
      const res = await api.switchRole(role);
      setCurrentUser(res.user);
      showToast(`Switched active mode to ${role}`, 'info');
    } catch (err: any) {
      showToast('Failed to change role', 'error');
    }
  };

  const logout = async () => {
    try {
      await api.logout();
      setCurrentUser(null);
      showToast('Signed out successfully', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to sign out', 'error');
    }
  };

  const openScheduleVisit = (propertyId: string, propertyTitle: string, ownerId: string) => {
    setScheduleVisitData({ isOpen: true, propertyId, propertyTitle, ownerId });
  };

  const closeScheduleVisit = () => {
    setScheduleVisitData({ isOpen: false });
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        activeView,
        setActiveView,
        viewParams,
        setViewParams,
        allDemoUsers,
        isCreateModalOpen,
        createModalTab,
        openCreateModal,
        closeCreateModal,
        unreadNotificationsCount,
        unreadMessagesCount,
        openChatWith,
        openPropertyProfile,
        openUserProfile,
        openListingDetail,
        switchDemoUser,
        switchUserRole,
        toasts,
        showToast,
        refreshUserData,
        refreshNotifications,
        logout,
        scheduleVisitData,
        openScheduleVisit,
        closeScheduleVisit,
        isNotificationsOpen,
        openNotifications: () => setIsNotificationsOpen(true),
        closeNotifications: () => setIsNotificationsOpen(false),
        isSearchOpen,
        openSearch: () => setIsSearchOpen(true),
        closeSearch: () => setIsSearchOpen(false),
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
