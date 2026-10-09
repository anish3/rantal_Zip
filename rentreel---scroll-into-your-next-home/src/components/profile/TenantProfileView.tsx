import React, { useEffect, useState } from 'react';
import {
  MapPin,
  ShieldCheck,
  Send,
  UserPlus,
  UserCheck,
  FileText,
  Bookmark,
  Sparkles,
  GraduationCap,
  Briefcase,
  ChevronLeft,
} from 'lucide-react';
import { User, RentalRequirement, Property, RentalListing } from '../../types/client.ts';
import { api } from '../../lib/api.ts';
import { useApp } from '../../context/AppContext.tsx';
import { RequirementCard } from '../feed/RequirementCard.tsx';

interface TenantProfileProps {
  username: string;
  onBack?: () => void;
}

export const TenantProfileView: React.FC<TenantProfileProps> = ({ username, onBack }) => {
  const { openChatWith, showToast } = useApp();

  const [user, setUser] = useState<User | null>(null);
  const [requirements, setRequirements] = useState<RentalRequirement[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'requirements' | 'preferences'>('requirements');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const data = await api.getUserProfile(username);
        setUser(data.user);
        setRequirements(data.requirements);
        setIsFollowing(data.isFollowing);
      } catch (e) {
        console.error('Failed to load user profile', e);
      } finally {
        setLoading(false);
      }
    };

    if (username) fetchUserData();
  }, [username]);

  const handleToggleFollow = async () => {
    if (!user) return;
    try {
      const res = await api.toggleFollow(user.id);
      setIsFollowing(res.isFollowing);
      showToast(res.isFollowing ? `Following ${user.name}` : `Unfollowed ${user.name}`, 'info');
    } catch (e) {
      setIsFollowing(!isFollowing);
    }
  };

  const handleMessage = () => {
    if (!user) return;
    openChatWith(user.id);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-zinc-400">Loading user profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-400">User not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-24">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      )}

      {/* Header */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 shadow-xl">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full rounded-full object-cover border-4 border-zinc-950"
            />
          </div>

          <div className="flex-1 text-center sm:text-left space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white">{user.name}</h1>
                  {user.isVerified && <ShieldCheck className="w-5 h-5 text-sky-400" />}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">@{user.username}</p>
              </div>

              <div className="flex items-center justify-center sm:justify-end gap-2">
                <button
                  onClick={handleMessage}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-500/20 active:scale-95 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Message Tenant</span>
                </button>
              </div>
            </div>

            {/* Occupation tag */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 font-medium">
                {user.occupation === 'STUDENT' ? (
                  <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                )}
                {user.instituteOrCompany || user.occupation}
              </span>
              <span className="flex items-center gap-1 text-zinc-400">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                {user.locationArea}, {user.city}
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">{user.bio}</p>

            <div className="flex items-center justify-center sm:justify-start gap-6 pt-2 text-xs">
              <div>
                <span className="font-bold text-emerald-400">{requirements.length}</span>
                <span className="text-zinc-400 ml-1">Active Requests</span>
              </div>
              <div>
                <span className="font-bold text-white">{user.locationArea}</span>
                <span className="text-zinc-400 ml-1">Target Area</span>
              </div>
              <div>
                <span className="font-bold text-sky-400">Verified</span>
                <span className="text-zinc-400 ml-1">Profile</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 mb-6">
        <button
          onClick={() => setActiveTab('requirements')}
          className={`flex-1 py-3 text-xs font-bold border-b-2 ${
            activeTab === 'requirements'
              ? 'border-rose-500 text-white'
              : 'border-transparent text-zinc-400'
          }`}
        >
          Rental Requirements ({requirements.length})
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex-1 py-3 text-xs font-bold border-b-2 ${
            activeTab === 'preferences'
              ? 'border-rose-500 text-white'
              : 'border-transparent text-zinc-400'
          }`}
        >
          Lifestyle & Preferences
        </button>
      </div>

      {activeTab === 'requirements' && (
        <div className="space-y-4">
          {requirements.map((req) => (
            <RequirementCard key={req.id} requirement={{ ...req, tenant: user }} />
          ))}
          {requirements.length === 0 && (
            <div className="py-12 text-center text-zinc-400 text-xs">
              No active rental requirements posted yet.
            </div>
          )}
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 text-xs">
          <div>
            <h4 className="font-bold text-zinc-200 mb-2">Preferred Room Types</h4>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-xl bg-zinc-800 text-zinc-300">Single Room</span>
              <span className="px-3 py-1 rounded-xl bg-zinc-800 text-zinc-300">1BHK</span>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-zinc-200 mb-2">House Rules & Lifestyle</h4>
            <div className="space-y-1.5 text-zinc-400">
              <p>• Prefers quiet environment for studying and working</p>
              <p>• High-speed fiber internet is a strict requirement</p>
              <p>• Non-smoker, clean & organized</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
