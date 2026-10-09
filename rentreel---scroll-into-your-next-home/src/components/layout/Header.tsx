import React, { useState } from 'react';
import { Search, MapPin, Bell, Plus, Sparkles, Filter, ChevronDown, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { UserRole } from '../../types/client.ts';

export const Header: React.FC<{
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
}> = ({ onOpenSearch, onOpenNotifications }) => {
  const {
    currentUser,
    unreadNotificationsCount,
    openCreateModal,
    switchUserRole,
    setActiveView,
    activeView,
  } = useApp();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Indore');

  const availableRoles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'TENANT', label: 'Tenant Mode', desc: 'Browse PGs, rooms, flats & create requirements' },
    { role: 'OWNER', label: 'Owner Mode', desc: 'Manage properties, 10-day room listings & tenants' },
    { role: 'PG_HOSTEL', label: 'PG / Hostel Mode', desc: 'Multi-room management, mess menus & student inquiries' },
    { role: 'BROKER', label: 'Broker Mode', desc: 'Multiple inventory portfolios & client leads' },
    { role: 'ADMIN', label: 'Admin Mode', desc: 'Marketplace moderation & platform metrics' },
  ];

  return (
    <header className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80 px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
      {/* Search Input Button */}
      <div className="flex-1 max-w-md">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-400 text-sm transition-all text-left shadow-inner group"
        >
          <Search className="w-4 h-4 text-zinc-500 group-hover:text-rose-400 transition-colors" />
          <span className="truncate">Search properties, rooms, PGs, flats in Indore...</span>
          <kbd className="hidden sm:inline-block ml-auto text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">
            Search
          </kbd>
        </button>
      </div>

      {/* Center/Right Actions */}
      <div className="flex items-center gap-3">
        {/* City Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300">
          <MapPin className="w-3.5 h-3.5 text-rose-500" />
          <span>{selectedCity}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1"></span>
        </div>

        {/* Role Capability Switcher */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-bold text-zinc-200 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="hidden sm:inline text-zinc-400 font-normal">Active Role:</span>
              <span className="text-white">{currentUser.activeRole}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-zinc-800 text-xs font-bold text-zinc-400">
                  Switch Role Capability
                </div>
                <div className="py-1 space-y-1">
                  {availableRoles.map((r) => {
                    const isSelected = currentUser.activeRole === r.role;
                    return (
                      <button
                        key={r.role}
                        onClick={() => {
                          switchUserRole(r.role);
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                          isSelected
                            ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                            : 'hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isSelected ? (
                            <Check className="w-4 h-4 text-rose-400" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-zinc-700"></div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-100">{r.label}</p>
                          <p className="text-[11px] text-zinc-400 leading-tight">{r.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notifications Icon */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-zinc-950">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Quick Post Listing Button */}
        <button
          onClick={() => openCreateModal('listing')}
          className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 hover:opacity-95 text-xs font-bold text-white shadow-md shadow-rose-500/20 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Post Listing</span>
        </button>
      </div>
    </header>
  );
};
