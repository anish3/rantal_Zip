import React from 'react';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/react';
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

const AuthScreen: React.FC = () => (
  <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1f2937,#09090b_45%)] text-zinc-100 flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-5xl grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-200">
          RentReel
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">
            Your next home starts with a secure Clerk sign-in.
          </h1>
          <p className="max-w-xl text-base md:text-lg text-zinc-300">
            Create your account, access verified listings, manage owner dashboard workflows, and keep your rental profile tied to a trusted Clerk user account.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 text-sm text-zinc-200">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="font-bold text-white">Verified identity</p>
            <p className="mt-1 text-zinc-400">Clerk-managed authentication</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="font-bold text-white">Secure profile</p>
            <p className="mt-1 text-zinc-400">User session and profile ready</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="font-bold text-white">Marketplace ready</p>
            <p className="mt-1 text-zinc-400">Connect to listings, visits, and leads</p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-zinc-800 bg-zinc-950/80 p-6 md:p-8 shadow-2xl shadow-rose-500/10">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Welcome</p>
          <h2 className="mt-2 text-2xl font-black text-white">Sign in to continue</h2>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <SignInButton mode="modal">
              <button className="w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-zinc-950 transition hover:bg-zinc-200">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition hover:border-rose-500/40 hover:text-rose-200">
                Sign up
              </button>
            </SignUpButton>
          </div>
          <p className="text-xs text-zinc-500 text-center">
            Use Clerk to sign in or create your first account and continue into the marketplace.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { isLoaded, isSignedIn } = useUser();
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

  if (!isLoaded) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">Loading...</div>;
  }

  if (!isSignedIn) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row antialiased selection:bg-rose-500/30 selection:text-rose-200">
      {/* Desktop Left Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <div className="flex items-center justify-end border-b border-zinc-800 bg-zinc-950/80 px-4 py-2 gap-3">
          <UserButton />
        </div>
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
