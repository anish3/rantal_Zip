import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { MobileNav } from './components/layout/MobileNav.tsx';
import { Header } from './components/layout/Header.tsx';
import { HomeView } from './components/home/HomeView.tsx';
import { FindPropertyView } from './components/marketplace/FindPropertyView.tsx';
import { FindTenantView } from './components/marketplace/FindTenantView.tsx';
import { PropertyProfileView } from './components/profile/PropertyProfileView.tsx';
import { TenantProfileView } from './components/profile/TenantProfileView.tsx';
import { MessagesView } from './components/messages/MessagesView.tsx';
import { OwnerDashboard } from './components/dashboard/OwnerDashboard.tsx';
import { AdminDashboard } from './components/dashboard/AdminDashboard.tsx';
import { SavedView } from './components/saved/SavedView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { CreateModal } from './components/create/CreateModal.tsx';
import { NotificationsDrawer } from './components/notifications/NotificationsDrawer.tsx';
import { SearchModal } from './components/search/SearchModal.tsx';
import { VisitScheduleModal } from './components/modals/VisitScheduleModal.tsx';

const AppContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
    viewParams,
    toasts,
    isNotificationsOpen,
    openNotifications,
    closeNotifications,
    isSearchOpen,
    openSearch,
    closeSearch,
  } = useApp();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row antialiased selection:bg-rose-500/30 selection:text-rose-200">
      {/* Desktop Left Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <Header
          onOpenSearch={openSearch}
          onOpenNotifications={openNotifications}
        />

        {/* View Routing */}
        <main className="flex-1 overflow-x-hidden">
          {activeView === 'home' && <HomeView />}
          {(activeView === 'find-property' || activeView === 'explore') && <FindPropertyView />}
          {activeView === 'find-tenants' && <FindTenantView />}
          {activeView === 'messages' && (
            <MessagesView
              initialConversationId={viewParams.conversationId}
              initialContext={viewParams.context}
            />
          )}
          {activeView === 'saved' && <SavedView />}
          {activeView === 'settings' && <SettingsView />}
          {activeView === 'property-profile' && (
            <PropertyProfileView
              propertyId={viewParams.propertyId}
              onBack={() => setActiveView('home')}
            />
          )}
          {activeView === 'user-profile' && (
            <TenantProfileView
              username={viewParams.username}
              onBack={() => setActiveView('home')}
            />
          )}
          {activeView === 'owner-dashboard' && <OwnerDashboard />}
          {activeView === 'admin-dashboard' && <AdminDashboard />}
          {/* Legacy fallback */}
          {activeView === 'reels' && <HomeView />}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>

      {/* Global Modals & Drawers */}
      <CreateModal />
      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={closeNotifications} />
      <SearchModal isOpen={isSearchOpen} onClose={closeSearch} />
      <VisitScheduleModal />

      {/* Lightweight Floating Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 space-y-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl backdrop-blur-md border animate-in slide-in-from-bottom-2 ${
                toast.type === 'success'
                  ? 'bg-zinc-900/95 text-emerald-300 border-emerald-500/30'
                  : toast.type === 'error'
                  ? 'bg-zinc-900/95 text-rose-300 border-rose-500/30'
                  : toast.type === 'warning'
                  ? 'bg-zinc-900/95 text-amber-300 border-amber-500/30'
                  : 'bg-zinc-900/95 text-white border-zinc-700'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
