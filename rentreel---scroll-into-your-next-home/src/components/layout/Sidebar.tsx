import React, { useState } from 'react';
import {
  Home,
  Search,
  Users,
  MessageSquare,
  Bell,
  Bookmark,
  PlusCircle,
  Settings,
  User as UserIcon,
  Shield,
  Layers,
  Sparkles,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { ActiveView } from '../../types/client.ts';

export const Sidebar: React.FC = () => {
  const {
    currentUser,
    activeView,
    setActiveView,
    openCreateModal,
    unreadNotificationsCount,
    unreadMessagesCount,
    allDemoUsers,
    switchDemoUser,
    openUserProfile,
    openNotifications,
  } = useApp();

  const [isPersonaOpen, setIsPersonaOpen] = useState(false);

  // Role detection: Owner / Landlord / PG Host / Broker / Admin
  const isOwnerOrLandlord =
    currentUser?.activeRole === 'OWNER' ||
    currentUser?.activeRole === 'PG_HOSTEL' ||
    currentUser?.activeRole === 'BROKER' ||
    currentUser?.activeRole === 'ADMIN';

  // Primary navigation items according to requirements:
  // 🏠 Home
  // 🔎 Find Property
  // 👥 Find Tenants [only for Owner/Landlord role]
  // 💬 Messages
  // 🔔 Notifications
  // ♡ Saved
  const primaryNavItems: {
    id: ActiveView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    badge?: string;
  }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'find-property', label: 'Find Property', icon: Search },
    ...(isOwnerOrLandlord
      ? [
          {
            id: 'find-tenants' as ActiveView,
            label: 'Find Tenants',
            icon: Users,
            badge: 'Owners',
          },
        ]
      : []),
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      count: unreadMessagesCount,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      count: unreadNotificationsCount,
    },
    { id: 'saved', label: 'Saved', icon: Bookmark },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 h-screen sticky top-0 bg-zinc-950 border-r border-zinc-800/80 p-4 select-none z-30 justify-between">
      {/* Top Branding & Main Navigation */}
      <div>
        {/* Brand Header */}
        <div
          onClick={() => setActiveView('home')}
          className="flex items-center gap-3 px-3 py-3 cursor-pointer group rounded-2xl hover:bg-zinc-900/40 transition-colors"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform shrink-0">
            <Building2 className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                RentReel
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Indore
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium truncate">
              Rental & PropTech Marketplace
            </p>
          </div>
        </div>

        {/* Primary Navigation List */}
        <nav className="mt-4 space-y-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'notifications') {
                    openNotifications();
                  } else {
                    setActiveView(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-zinc-800/95 text-white font-bold shadow-inner'
                    : 'text-zinc-300 hover:bg-zinc-900/90 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-rose-400 stroke-[2.5]' : 'text-zinc-400 stroke-[2]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm shadow-rose-500/40">
                      {item.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {/* Post Listing Action Button */}
          <button
            onClick={() => openCreateModal('listing')}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-extrabold text-white bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:opacity-95 shadow-lg shadow-rose-600/25 transition-all active:scale-[0.98] mt-3 group"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5] group-hover:rotate-90 transition-transform" />
            <span>Post Listing</span>
          </button>
        </nav>

        {/* Management Hubs for Owners / Admins */}
        {isOwnerOrLandlord && (
          <div className="mt-5 pt-3 border-t border-zinc-800/60 space-y-1">
            <p className="px-3.5 text-[10px] font-extrabold tracking-wider text-zinc-400 uppercase">
              Management
            </p>
            <button
              onClick={() => setActiveView('owner-dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeView === 'owner-dashboard'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Owner Dashboard</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                10d Expiry
              </span>
            </button>

            {currentUser?.activeRole === 'ADMIN' && (
              <button
                onClick={() => setActiveView('admin-dashboard')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeView === 'admin-dashboard'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-violet-400" />
                  <span>Admin Panel</span>
                </div>
                <span className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20 font-bold">
                  Ops
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: Settings, Profile & User Switcher */}
      <div className="pt-3 border-t border-zinc-800/80 space-y-1 relative">
        {/* Settings Link */}
        <button
          onClick={() => setActiveView('settings')}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
            activeView === 'settings'
              ? 'bg-zinc-800/90 text-white font-bold shadow-inner'
              : 'text-zinc-300 hover:bg-zinc-900/90 hover:text-white'
          }`}
        >
          <Settings
            className={`w-5 h-5 transition-transform group-hover:rotate-45 ${
              activeView === 'settings' ? 'text-rose-400 stroke-[2.5]' : 'text-zinc-400 stroke-[2]'
            }`}
          />
          <span>Settings</span>
        </button>

        {/* Profile Link */}
        <button
          onClick={() => {
            if (currentUser) openUserProfile(currentUser.username);
          }}
          className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
            activeView === 'user-profile'
              ? 'bg-zinc-800/90 text-white font-bold shadow-inner'
              : 'text-zinc-300 hover:bg-zinc-900/90 hover:text-white'
          }`}
        >
          <UserIcon
            className={`w-5 h-5 transition-transform group-hover:scale-110 ${
              activeView === 'user-profile' ? 'text-rose-400 stroke-[2.5]' : 'text-zinc-400 stroke-[2]'
            }`}
          />
          <span>Profile</span>
        </button>

        {/* Persona Switcher Dropdown (Floating above bottom profile card) */}
        {isPersonaOpen && (
          <div className="absolute bottom-24 left-2 right-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2">
            <div className="px-3 py-1.5 border-b border-zinc-800 text-[11px] font-bold text-zinc-400 flex justify-between items-center">
              <span>Switch Marketplace Persona</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="max-h-56 overflow-y-auto py-1 space-y-1">
              {allDemoUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    switchDemoUser(u.id);
                    setIsPersonaOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                    currentUser?.id === u.id
                      ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                      : 'hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="w-7 h-7 rounded-full object-cover border border-zinc-700"
                  />
                  <div className="truncate flex-1">
                    <p className="font-semibold text-zinc-100 truncate">{u.name}</p>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      {u.activeRole} • {u.locationArea}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Current User Card */}
        {currentUser && (
          <div className="pt-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:bg-zinc-900 transition-colors">
              <div
                onClick={() => openUserProfile(currentUser.username)}
                className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
              >
                <div className="relative shrink-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-zinc-700"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                </div>
                <div className="truncate min-w-0">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                    <span className="text-rose-400 font-semibold">{currentUser.activeRole}</span> •{' '}
                    {currentUser.locationArea}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPersonaOpen(!isPersonaOpen)}
                title="Switch test persona"
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
