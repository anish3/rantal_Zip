import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  MapPin,
  GraduationCap,
  Briefcase,
  Sparkles,
  Send,
  Calendar,
  Wallet,
  Filter,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { RentalRequirement, User } from '../../types/client.ts';
import { api } from '../../lib/api.ts';
import { useApp } from '../../context/AppContext.tsx';

export const FindTenantView: React.FC = () => {
  const { openChatWith, openUserProfile, showToast } = useApp();

  const [requirements, setRequirements] = useState<RentalRequirement[]>([]);
  const [selectedOccupation, setSelectedOccupation] = useState<string>('ALL');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [maxBudget, setMaxBudget] = useState<number>(20000);
  const [loading, setLoading] = useState(true);

  const indoreAreas = ['Vijay Nagar', 'Scheme 54', 'Scheme 140', 'Bhawarkua', 'Palasia', 'Rau'];

  const loadRequirements = async () => {
    setLoading(true);
    try {
      const data = await api.getRequirements();
      setRequirements(data.requirements);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequirements();
  }, []);

  const filtered = requirements.filter((r) => {
    if (selectedOccupation !== 'ALL' && r.occupation !== selectedOccupation) return false;
    if (
      selectedArea !== 'ALL' &&
      !r.preferredAreas.some((a) => a.toLowerCase().includes(selectedArea.toLowerCase()))
    )
      return false;
    if (r.budgetMin > maxBudget) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
      {/* Title */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-2 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Users className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">Find Active Tenants</h1>
        </div>
        <p className="text-xs text-zinc-400">
          Discover students, tech professionals & verified renters currently looking for rooms & PGs in Indore.
        </p>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {/* Occupation pill */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
            <button
              onClick={() => setSelectedOccupation('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedOccupation === 'ALL'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Tenants
            </button>
            <button
              onClick={() => setSelectedOccupation('STUDENT')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedOccupation === 'STUDENT'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Students
            </button>
            <button
              onClick={() => setSelectedOccupation('WORKING_PROFESSIONAL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                selectedOccupation === 'WORKING_PROFESSIONAL'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Working Techies
            </button>
          </div>

          {/* Area select */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl px-3 py-2 text-xs font-semibold text-zinc-300 focus:outline-none"
          >
            <option value="ALL">All Target Areas</option>
            {indoreAreas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tenant Cards List */}
      <div className="space-y-4">
        {filtered.map((req) => {
          const tenant = req.tenant;
          return (
            <div
              key={req.id}
              className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 rounded-3xl p-5 shadow-xl transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Tenant avatar & credentials */}
                <div className="flex items-start gap-3.5">
                  <div
                    onClick={() => tenant && openUserProfile(tenant.username)}
                    className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-rose-500 to-pink-500 cursor-pointer flex-shrink-0"
                  >
                    <img
                      src={tenant?.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'}
                      alt={tenant?.name}
                      className="w-full h-full rounded-full object-cover border-2 border-zinc-950"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        onClick={() => tenant && openUserProfile(tenant.username)}
                        className="font-bold text-base text-white hover:text-rose-400 cursor-pointer"
                      >
                        {tenant?.name || 'Indore Tenant'}
                      </span>
                      {tenant?.isVerified && (
                        <ShieldCheck className="w-4 h-4 text-sky-400 fill-sky-400/20" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        {req.occupation === 'STUDENT' ? (
                          <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                        )}
                        <span>{tenant?.instituteOrCompany || req.occupation}</span>
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 font-semibold mt-2">{req.title}</p>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{req.description}</p>
                  </div>
                </div>

                {/* Target budget & date */}
                <div className="sm:text-right flex-shrink-0 bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
                  <p className="text-[10px] uppercase font-bold text-zinc-400">Target Budget</p>
                  <p className="text-base font-black text-emerald-400">
                    ₹{req.budgetMin.toLocaleString('en-IN')} - ₹{req.budgetMax.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1 flex items-center sm:justify-end gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    <span>Move-in: {req.moveInDate}</span>
                  </p>
                </div>
              </div>

              {/* Requirement details pills */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-zinc-800 text-xs">
                <span className="px-2.5 py-1 rounded-xl bg-zinc-800 text-zinc-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-400" />
                  {req.preferredAreas.join(', ')}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-zinc-800 text-zinc-300">
                  {req.roomTypes.join(' / ')}
                </span>
                {req.preferences?.map((pref, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 text-[11px]"
                  >
                    ✓ {pref}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() =>
                    tenant &&
                    openChatWith(tenant.id, {
                      type: 'REQUIREMENT',
                      id: req.id,
                      title: req.title,
                      subtitle: `Budget: ₹${req.budgetMin} - ₹${req.budgetMax}`,
                    })
                  }
                  className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Pitch Your Property / Chat</span>
                </button>

                <button
                  onClick={() => tenant && openUserProfile(tenant.username)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs"
                >
                  View Profile
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && !loading && (
          <div className="py-20 text-center">
            <Users className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-300 font-bold">No active tenant requirements found</p>
          </div>
        )}
      </div>
    </div>
  );
};
