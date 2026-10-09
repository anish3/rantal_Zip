import React from 'react';
import {
  UserCheck,
  MapPin,
  Calendar,
  Wallet,
  Send,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import { RentalRequirement } from '../../types/client.ts';
import { useApp } from '../../context/AppContext.tsx';

interface RequirementCardProps {
  requirement: RentalRequirement;
}

export const RequirementCard: React.FC<RequirementCardProps> = ({ requirement }) => {
  const { openChatWith, openUserProfile, showToast } = useApp();
  const tenant = requirement.tenant;

  const handleMessageTenant = () => {
    if (!tenant) return;
    openChatWith(tenant.id, {
      type: 'REQUIREMENT',
      id: requirement.id,
      title: requirement.title,
      subtitle: `Budget: ₹${requirement.budgetMin.toLocaleString('en-IN')} - ₹${requirement.budgetMax.toLocaleString('en-IN')}`,
      location: requirement.preferredAreas.join(', '),
    });
  };

  return (
    <div className="bg-gradient-to-br from-zinc-900/90 via-zinc-900 to-zinc-950 border border-zinc-800 hover:border-zinc-700/80 rounded-3xl p-5 mb-6 shadow-xl backdrop-blur-sm transition-all relative overflow-hidden group">
      {/* Top Banner Tag */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Tenant Looking for Home</span>
          </span>
          <span className="text-xs text-zinc-400">Indore</span>
        </div>

        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          Active Requirement
        </span>
      </div>

      {/* Tenant Profile Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div
            onClick={() => tenant && openUserProfile(tenant.username)}
            className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 to-rose-500 cursor-pointer"
          >
            <img
              src={tenant?.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'}
              alt={tenant?.name || 'Tenant'}
              className="w-full h-full rounded-full object-cover border-2 border-zinc-950"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span
                onClick={() => tenant && openUserProfile(tenant.username)}
                className="font-bold text-sm text-zinc-100 hover:text-rose-400 cursor-pointer"
              >
                {tenant?.name || 'Aman Sharma'}
              </span>
              {tenant?.isVerified && (
                <ShieldCheck className="w-4 h-4 text-sky-400 fill-sky-400/20" />
              )}
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
              {requirement.occupation === 'STUDENT' ? (
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Briefcase className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>{tenant?.instituteOrCompany || requirement.occupation}</span>
            </p>
          </div>
        </div>

        {/* Budget Highlight */}
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-zinc-400">Target Budget</p>
          <p className="text-base font-extrabold text-emerald-400">
            ₹{requirement.budgetMin.toLocaleString('en-IN')} - ₹{requirement.budgetMax.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Requirement Title & Description */}
      <div className="space-y-1 mb-3">
        <h4 className="font-bold text-sm text-zinc-100">{requirement.title}</h4>
        <p className="text-xs text-zinc-300 leading-relaxed">{requirement.description}</p>
      </div>

      {/* Key Specifications Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2 text-xs">
        <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-rose-400" />
            Preferred Areas
          </span>
          <p className="font-semibold text-zinc-200 mt-0.5 truncate">
            {requirement.preferredAreas.join(', ')}
          </p>
        </div>

        <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-amber-400" />
            Move-in Date
          </span>
          <p className="font-semibold text-zinc-200 mt-0.5">{requirement.moveInDate}</p>
        </div>

        <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80 col-span-2 sm:col-span-1">
          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-violet-400" />
            Types
          </span>
          <p className="font-semibold text-zinc-200 mt-0.5">
            {requirement.roomTypes.join(' / ')}
          </p>
        </div>
      </div>

      {/* Preferences Chips */}
      {requirement.preferences && requirement.preferences.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {requirement.preferences.map((p, i) => (
            <span
              key={i}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-700/60"
            >
              ✓ {p}
            </span>
          ))}
        </div>
      )}

      {/* Actions: Pitch room / message */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800/80">
        <button
          onClick={handleMessageTenant}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-95 text-white font-bold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Pitch Your Property / Chat</span>
        </button>

        <button
          onClick={() => tenant && openUserProfile(tenant.username)}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          title="View Tenant Profile"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
