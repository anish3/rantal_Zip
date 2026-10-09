import React, { useState } from 'react';
import {
  X,
  Clock,
  Building,
  Film,
  UserCheck,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  Wand2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../lib/api.ts';
import { PropertyType, RoomType, GenderPreference } from '../../types/client.ts';

export const CreateModal: React.FC = () => {
  const { isCreateModalOpen, closeCreateModal, createModalTab, showToast, refreshUserData, setActiveView, openPropertyProfile } = useApp();

  const [activeTab, setActiveTab] = useState<'listing' | 'property' | 'reel' | 'requirement'>(
    createModalTab || 'listing'
  );

  React.useEffect(() => {
    if (createModalTab) {
      setActiveTab(createModalTab);
    }
  }, [createModalTab]);

  // Listing Form State
  const [listingTitle, setListingTitle] = useState('');
  const [listingDescription, setListingDescription] = useState('');
  const [listingRent, setListingRent] = useState('9500');
  const [listingDeposit, setListingDeposit] = useState('9500');
  const [listingArea, setListingArea] = useState('Vijay Nagar');
  const [listingPropType, setListingPropType] = useState<PropertyType>('PG');
  const [listingRoomType, setListingRoomType] = useState<RoomType>('SINGLE');
  const [listingGender, setListingGender] = useState<GenderPreference>('ANY');
  const [listingPhotoUrl, setListingPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&auto=format&fit=crop&q=80'
  );
  const [listingAmenities, setListingAmenities] = useState<string[]>(['WiFi', 'Food', 'AC', 'Attached Bath']);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Property Form State
  const [propTitle, setPropTitle] = useState('');
  const [propType, setPropType] = useState<PropertyType>('PG');
  const [propArea, setPropArea] = useState('Vijay Nagar');
  const [propAddress, setPropAddress] = useState('');
  const [propMinRent, setPropMinRent] = useState('8000');
  const [propMaxRent, setPropMaxRent] = useState('14000');
  const [propGender, setPropGender] = useState<GenderPreference>('ANY');
  const [propFood, setPropFood] = useState('Mess Included (3 times)');
  const [propDesc, setPropDesc] = useState('');
  const [propCover, setPropCover] = useState(
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=900&auto=format&fit=crop&q=80'
  );

  // Reel Form State
  const [reelCaption, setReelCaption] = useState('');
  const [reelVideoUrl, setReelVideoUrl] = useState(
    'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-with-living-room-and-kitchen-41551-large.mp4'
  );
  const [reelRent, setReelRent] = useState('9500');
  const [reelLocation, setReelLocation] = useState('Vijay Nagar, Indore');

  // Requirement Form State
  const [reqTitle, setReqTitle] = useState('Looking for Single Room / PG in Vijay Nagar');
  const [reqBudgetMin, setReqBudgetMin] = useState('7000');
  const [reqBudgetMax, setReqBudgetMax] = useState('10000');
  const [reqMoveIn, setReqMoveIn] = useState('Immediately');
  const [reqDescription, setReqDescription] = useState(
    'Need a quiet, furnished room with high-speed WiFi near college or IT corridor.'
  );

  const indoreAreas = ['Vijay Nagar', 'Scheme 54', 'Scheme 140', 'Bhawarkua', 'Palasia', 'Rau', 'Bengali Square'];

  // Calculate 10-day expiry date to preview
  const expiryDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (!isCreateModalOpen) return null;

  const handleAiEnhanceListing = async () => {
    setIsAiGenerating(true);
    try {
      const res = await api.generateListingWithAI({
        title: listingTitle || 'Room',
        area: listingArea,
        propertyType: listingPropType,
        roomType: listingRoomType,
        rent: Number(listingRent) || 9000,
        notes: listingDescription,
      });
      if (res.enhancedTitle) setListingTitle(res.enhancedTitle);
      if (res.description) setListingDescription(res.description);
      if (res.suggestedAmenities?.length) {
        setListingAmenities((prev) => Array.from(new Set([...prev, ...res.suggestedAmenities])));
      }
      showToast('AI enhanced your title, description and amenities!', 'success');
    } catch (err: any) {
      showToast('AI enhancement unavailable, keep your edits', 'info');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingTitle || !listingRent) {
      showToast('Please provide a title and rent amount', 'warning');
      return;
    }

    try {
      await api.createListing({
        title: listingTitle,
        description: listingDescription,
        rent: Number(listingRent),
        deposit: Number(listingDeposit),
        propertyType: listingPropType,
        roomType: listingRoomType,
        city: 'Indore',
        area: listingArea,
        genderPreference: listingGender,
        photos: [listingPhotoUrl],
        amenities: listingAmenities,
      });
      showToast('Listing published! It will remain active for 10 days.', 'success');
      await refreshUserData();
      closeCreateModal();
      setActiveView('home');
    } catch (err: any) {
      showToast(err.message || 'Failed to create listing', 'error');
    }
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propTitle.trim() || !propArea.trim()) {
      showToast('Property name and location area are required', 'warning');
      return;
    }

    try {
      const res = await api.createProperty({
        title: propTitle.trim(),
        description: propDesc.trim() || `Modern ${propType} living in ${propArea}.`,
        propertyType: propType,
        city: 'Indore',
        area: propArea,
        fullAddress: propAddress || `${propArea}, Indore`,
        minRent: Number(propMinRent) || 8000,
        maxRent: Number(propMaxRent) || 14000,
        genderPreference: propGender,
        foodOption: propFood,
        coverPhoto: propCover,
        photos: [propCover],
        amenities: ['WiFi', 'Food', 'AC', 'Attached Bath', 'Power Backup'],
      });
      showToast('Property registered with Instagram-style profile!', 'success');
      await refreshUserData();
      closeCreateModal();
      openPropertyProfile(res.property.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to create property', 'error');
    }
  };

  const handleCreateReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelCaption || !reelVideoUrl) {
      showToast('Please provide video URL and caption', 'warning');
      return;
    }

    try {
      await api.createReel({
        caption: reelCaption,
        videoUrl: reelVideoUrl,
        location: reelLocation,
        rentAmount: Number(reelRent),
        category: 'ROOM_TOUR',
      });
      showToast('Property video tour published!', 'success');
      await refreshUserData();
      closeCreateModal();
      setActiveView('home');
    } catch (err: any) {
      showToast(err.message || 'Failed to create reel', 'error');
    }
  };

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRequirement({
        title: reqTitle,
        city: 'Indore',
        preferredAreas: ['Vijay Nagar'],
        budgetMin: Number(reqBudgetMin),
        budgetMax: Number(reqBudgetMax),
        moveInDate: reqMoveIn,
        description: reqDescription,
        preferences: ['WiFi', 'Furnished', 'Attached Bath'],
      });
      showToast('Rental requirement posted for owners & brokers to discover!', 'success');
      await refreshUserData();
      closeCreateModal();
      setActiveView('find-tenants');
    } catch (err: any) {
      showToast(err.message || 'Failed to create requirement', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Post Listing & Marketplace Inventory</h2>
              <p className="text-[11px] text-zinc-400">Publish verified room listings, complete properties, or tenant requirements.</p>
            </div>
          </div>
          <button
            onClick={closeCreateModal}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 p-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('listing')}
            className={`flex-1 min-w-fit px-3 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'listing'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Room Listing (10-Day Verified)
          </button>

          <button
            onClick={() => setActiveTab('property')}
            className={`flex-1 min-w-fit px-3 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'property'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Full Property / PG Building
          </button>

          <button
            onClick={() => setActiveTab('requirement')}
            className={`flex-1 min-w-fit px-3 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'requirement'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tenant Room Requirement
          </button>
        </div>

        {/* Tab 1: Room Listing Form */}
        {activeTab === 'listing' && (
          <form onSubmit={handleCreateListing} className="p-6 space-y-4">
            {/* 10-DAY EXPIRATION PROMINENT NOTICE */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>10-Day Active Guarantee Rule</span>
                </div>
                <button
                  type="button"
                  onClick={handleAiEnhanceListing}
                  disabled={isAiGenerating}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/40 text-[11px] font-bold hover:bg-violet-500/30 transition-colors disabled:opacity-50"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>{isAiGenerating ? 'AI Enhancing...' : 'AI Enhance'}</span>
                </button>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                Your listing will remain active across the marketplace for exactly <strong>10 days</strong>.
                Expired listings can be renewed in 1-click or marked as rented from your dashboard.
              </p>
              <div className="pt-1 text-[11px] font-semibold text-emerald-400">
                🗓️ Expiry date: {expiryDate}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Listing Title</label>
              <input
                type="text"
                placeholder="e.g. Single AC Room with Food & WiFi in Vijay Nagar"
                value={listingTitle}
                onChange={(e) => setListingTitle(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Monthly Rent (₹)</label>
                <input
                  type="number"
                  placeholder="8500"
                  value={listingRent}
                  onChange={(e) => setListingRent(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Deposit (₹)</label>
                <input
                  type="number"
                  placeholder="8500"
                  value={listingDeposit}
                  onChange={(e) => setListingDeposit(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Area</label>
                <select
                  value={listingArea}
                  onChange={(e) => setListingArea(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                >
                  {indoreAreas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Type</label>
                <select
                  value={listingPropType}
                  onChange={(e) => setListingPropType(e.target.value as PropertyType)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="PG">PG</option>
                  <option value="ROOM">Room</option>
                  <option value="FLAT">Flat</option>
                  <option value="COLIVING">Co-Living</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Room</label>
                <select
                  value={listingRoomType}
                  onChange={(e) => setListingRoomType(e.target.value as RoomType)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="SINGLE">Single</option>
                  <option value="DOUBLE">Double</option>
                  <option value="1BHK">1BHK</option>
                  <option value="STUDIO">Studio</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Room Photo URL</label>
              <input
                type="text"
                value={listingPhotoUrl}
                onChange={(e) => setListingPhotoUrl(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Include details about WiFi speed, meals, gate timings..."
                value={listingDescription}
                onChange={(e) => setListingDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:opacity-95 text-white font-extrabold text-sm shadow-xl shadow-rose-600/25 active:scale-98 transition-all"
            >
              Publish 10-Day Listing
            </button>
          </form>
        )}

        {/* Tab 2: Create Property / PG Form */}
        {activeTab === 'property' && (
          <form onSubmit={handleCreateProperty} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Property / Business Name</label>
              <input
                type="text"
                placeholder="e.g. Royal Palms Executive PG & Co-Living"
                value={propTitle}
                onChange={(e) => setPropTitle(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Property Type</label>
                <select
                  value={propType}
                  onChange={(e) => setPropType(e.target.value as PropertyType)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="PG">PG (Hostel)</option>
                  <option value="FLAT">Flat / Apartment</option>
                  <option value="COLIVING">Co-Living Space</option>
                  <option value="HOUSE">Independent House</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Area in Indore</label>
                <select
                  value={propArea}
                  onChange={(e) => setPropArea(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                >
                  {indoreAreas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Min Rent (₹)</label>
                <input
                  type="number"
                  value={propMinRent}
                  onChange={(e) => setPropMinRent(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Max Rent (₹)</label>
                <input
                  type="number"
                  value={propMaxRent}
                  onChange={(e) => setPropMaxRent(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Gender Preference</label>
                <select
                  value={propGender}
                  onChange={(e) => setPropGender(e.target.value as GenderPreference)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white"
                >
                  <option value="ANY">Any / Co-Ed</option>
                  <option value="BOYS">Boys Only</option>
                  <option value="GIRLS">Girls Only</option>
                  <option value="FAMILY">Family</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Food Option</label>
                <input
                  type="text"
                  value={propFood}
                  onChange={(e) => setPropFood(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Cover Photo URL</label>
              <input
                type="text"
                value={propCover}
                onChange={(e) => setPropCover(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Bio / Overview</label>
              <textarea
                rows={2}
                value={propDesc}
                onChange={(e) => setPropDesc(e.target.value)}
                placeholder="Top amenities, nearby landmarks like Medanta or DAVV..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-sm shadow-xl"
            >
              Create Property Profile
            </button>
          </form>
        )}

        {/* Tab 3: Property Reel Form */}
        {activeTab === 'reel' && (
          <form onSubmit={handleCreateReel} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Reel Video URL (MP4)</label>
              <input
                type="text"
                value={reelVideoUrl}
                onChange={(e) => setReelVideoUrl(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Caption & Hashtags</label>
              <textarea
                rows={3}
                placeholder="Room walkthrough tour! 🛏️ AC, attached bath, 5 mins from Vijay Nagar. #IndorePG"
                value={reelCaption}
                onChange={(e) => setReelCaption(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Rent Tag (₹)</label>
                <input
                  type="number"
                  value={reelRent}
                  onChange={(e) => setReelRent(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Location</label>
                <input
                  type="text"
                  value={reelLocation}
                  onChange={(e) => setReelLocation(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 text-white font-extrabold text-sm shadow-xl"
            >
              Post Video Reel
            </button>
          </form>
        )}

        {/* Tab 4: Tenant Requirement Form */}
        {activeTab === 'requirement' && (
          <form onSubmit={handleCreateRequirement} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">What are you looking for?</label>
              <input
                type="text"
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Budget Min (₹)</label>
                <input
                  type="number"
                  value={reqBudgetMin}
                  onChange={(e) => setReqBudgetMin(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1">Budget Max (₹)</label>
                <input
                  type="number"
                  value={reqBudgetMax}
                  onChange={(e) => setReqBudgetMax(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Move-in Date</label>
              <input
                type="text"
                value={reqMoveIn}
                onChange={(e) => setReqMoveIn(e.target.value)}
                placeholder="Immediately or e.g. 15 October"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">Description & Needs</label>
              <textarea
                rows={3}
                value={reqDescription}
                onChange={(e) => setReqDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-extrabold text-sm shadow-xl"
            >
              Post Rental Requirement
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
