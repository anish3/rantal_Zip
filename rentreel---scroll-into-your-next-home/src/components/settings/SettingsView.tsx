import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  MapPin,
  Shield,
  Briefcase,
  Sparkles,
  Check,
  CheckCircle2,
  Lock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { UserRole, OccupationType } from '../../types/client.ts';
import { api } from '../../lib/api.ts';

export const SettingsView: React.FC = () => {
  const {
    currentUser,
    switchUserRole,
    switchDemoUser,
    allDemoUsers,
    showToast,
    refreshUserData,
    setActiveView,
  } = useApp();

  const [notificationPreferences, setNotificationPreferences] = useState({
    emailInquiries: true,
    whatsappAlerts: true,
    expiryReminders: true,
    priceDrops: false,
    newMatchingTenants: true,
  });

  const [preferredArea, setPreferredArea] = useState(currentUser?.locationArea || 'Vijay Nagar');
  const [budgetRange, setBudgetRange] = useState('₹8,000 - ₹15,000');
  const [selectedOccupation, setSelectedOccupation] = useState<OccupationType>(
    currentUser?.occupation || 'WORKING_PROFESSIONAL'
  );

  const availableRoles: { role: UserRole; label: string; desc: string; badge: string }[] = [
    {
      role: 'TENANT',
      label: 'Tenant Mode',
      desc: 'Discover rooms, PGs, flats, schedule visits, and submit rental requirements.',
      badge: 'Discovery',
    },
    {
      role: 'OWNER',
      label: 'Owner / Landlord Mode',
      desc: 'List rooms, manage 10-day verified listings, receive inquiries, and find tenants.',
      badge: 'Landlord',
    },
    {
      role: 'PG_HOSTEL',
      label: 'PG & Hostel Host Mode',
      desc: 'Manage room inventories, meal plans, security rules, and student bookings.',
      badge: 'Hostel Manager',
    },
    {
      role: 'BROKER',
      label: 'Broker / Real Estate Partner',
      desc: 'Manage multi-property portfolios and client rental requests.',
      badge: 'Agent',
    },
    {
      role: 'ADMIN',
      label: 'Platform Administration',
      desc: 'Review listings, verify owners, moderate reports, and view platform metrics.',
      badge: 'Admin',
    },
  ];

  const indoreAreas = [
    'Vijay Nagar',
    'Scheme 54',
    'Scheme 140',
    'Bhawarkua',
    'Palasia',
    'Rau',
    'Geeta Bhawan',
    'Bengali Square',
  ];

  const handleSavePreferences = () => {
    showToast('Platform preferences saved successfully', 'success');
  };

  const toggleNotif = (key: keyof typeof notificationPreferences) => {
    setNotificationPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
    showToast('Notification preference updated', 'info');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Platform Settings</h1>
            <p className="text-xs text-zinc-400">
              Manage your marketplace preferences, role capabilities, and account alerts.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* User Account Overview */}
        {currentUser && (
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-zinc-700 ring-4 ring-rose-500/20"
                  />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-zinc-900 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-zinc-950 stroke-[3]" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-white">{currentUser.name}</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{currentUser.email}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    City: <span className="text-zinc-300 font-medium">{currentUser.city || 'Indore'}</span> •{' '}
                    Current Area: <span className="text-zinc-300 font-medium">{currentUser.locationArea}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveView('user-profile')}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors"
                >
                  View Public Profile
                </button>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center">
                <p className="text-[11px] text-zinc-400 font-medium">Active Mode</p>
                <p className="text-sm font-black text-rose-400 mt-0.5">{currentUser.activeRole}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center">
                <p className="text-[11px] text-zinc-400 font-medium">Market Hub</p>
                <p className="text-sm font-black text-white mt-0.5">Indore (MP)</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center">
                <p className="text-[11px] text-zinc-400 font-medium">Account Status</p>
                <p className="text-sm font-black text-emerald-400 mt-0.5">Active</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-center">
                <p className="text-[11px] text-zinc-400 font-medium">Listing Freshness</p>
                <p className="text-sm font-black text-amber-400 mt-0.5">10-Day Cycle</p>
              </div>
            </div>
          </div>
        )}

        {/* Role Capability Management */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <Layers className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-extrabold text-white">Active Marketplace Role</h3>
          </div>
          <p className="text-xs text-zinc-400 mb-5">
            Switching your role updates your sidebar tools, navigation options, and dashboard capabilities.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableRoles.map((r) => {
              const isSelected = currentUser?.activeRole === r.role;
              return (
                <button
                  key={r.role}
                  onClick={() => switchUserRole(r.role)}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    isSelected
                      ? 'bg-rose-500/10 border-rose-500/40 text-white shadow-lg shadow-rose-500/5 ring-1 ring-rose-500/30'
                      : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-white">{r.label}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-rose-500 text-white'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {r.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{r.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Location & Search Preferences */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-white">Indore Locality Preferences</h3>
          </div>
          <p className="text-xs text-zinc-400 mb-5">
            Set your primary area to prioritize nearby rooms, PGs, and tenant enquiries on your Home dashboard.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-2">Primary Neighborhood</label>
              <select
                value={preferredArea}
                onChange={(e) => setPreferredArea(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                {indoreAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}, Indore
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-2">Monthly Budget Range</label>
              <input
                type="text"
                value={budgetRange}
                onChange={(e) => setBudgetRange(e.target.value)}
                placeholder="e.g. ₹7,000 - ₹12,000"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSavePreferences}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 hover:opacity-95 transition-opacity"
            >
              Save Locality Preferences
            </button>
          </div>
        </div>

        {/* Notification & Communication Alerts */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <Bell className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-extrabold text-white">Notifications & Alerts</h3>
          </div>
          <p className="text-xs text-zinc-400 mb-5">
            Configure how you wish to be alerted about tenant bookings, listing renewals, and new inquiries.
          </p>

          <div className="space-y-3">
            {[
              {
                key: 'whatsappAlerts' as const,
                title: 'WhatsApp & SMS Alerts for Inquiries',
                desc: 'Get pinged when a tenant books a walkthrough or sends a direct message.',
              },
              {
                key: 'expiryReminders' as const,
                title: '10-Day Listing Expiry Reminder',
                desc: 'Receive alerts 24 hours before your room listing expires so you can renew in 1-click.',
              },
              {
                key: 'emailInquiries' as const,
                title: 'Email Summary Reports',
                desc: 'Daily digest of property views, inquiries, and matching requirements.',
              },
              {
                key: 'newMatchingTenants' as const,
                title: 'New Matching Tenant Requests',
                desc: 'Instant notifications when a tenant posts a requirement matching your property locality.',
              },
            ].map((item) => {
              const enabled = notificationPreferences[item.key];
              return (
                <div
                  key={item.key}
                  onClick={() => toggleNotif(item.key)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-zinc-100">{item.title}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{item.desc}</p>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full transition-colors relative p-1 ${
                      enabled ? 'bg-rose-500' : 'bg-zinc-800'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Demo Persona Switcher */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-extrabold text-white">Switch Test Persona</h3>
                <p className="text-xs text-zinc-400">
                  Quickly switch between pre-configured owners, tenants, and hostel managers to test flows.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {allDemoUsers.map((u) => {
              const isCurrent = currentUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => switchDemoUser(u.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                    isCurrent
                      ? 'bg-rose-500/10 border-rose-500/40 ring-1 ring-rose-500/20'
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="w-10 h-10 rounded-xl object-cover border border-zinc-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1 truncate">
                    <p className="text-xs font-bold text-white truncate">{u.name}</p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      <span className="text-rose-400 font-semibold">{u.activeRole}</span> • {u.locationArea}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
