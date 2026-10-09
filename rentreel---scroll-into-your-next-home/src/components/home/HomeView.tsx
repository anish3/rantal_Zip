import React, { useEffect, useState } from 'react';
import {
  Search,
  MapPin,
  Building2,
  Home as HomeIcon,
  Sparkles,
  Clock,
  Star,
  Users,
  Eye,
  MessageSquare,
  Bookmark,
  PlusCircle,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Property, RentalListing, RentalRequirement, VisitRequest } from '../../types/client.ts';
import { api } from '../../lib/api.ts';
import { useApp } from '../../context/AppContext.tsx';

export const HomeView: React.FC = () => {
  const {
    currentUser,
    setActiveView,
    openPropertyProfile,
    openCreateModal,
    openScheduleVisit,
    openChatWith,
    showToast,
    openSearch,
  } = useApp();

  const [properties, setProperties] = useState<Property[]>([]);
  const [listings, setListings] = useState<RentalListing[]>([]);
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [savedListings, setSavedListings] = useState<RentalListing[]>([]);
  const [requirements, setRequirements] = useState<RentalRequirement[]>([]);
  const [ownerVisits, setOwnerVisits] = useState<VisitRequest[]>([]);
  const [ownerListings, setOwnerListings] = useState<RentalListing[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('All Indore');
  const [selectedType, setSelectedType] = useState('ALL');

  const indoreAreas = [
    'All Indore',
    'Vijay Nagar',
    'Bhawarkua',
    'Scheme 54',
    'Scheme 140',
    'Palasia',
    'Rau',
  ];

  const propertyTypes = [
    { id: 'ALL', label: 'All Categories' },
    { id: 'PG', label: 'PG & Hostels' },
    { id: 'ROOM', label: 'Private Rooms' },
    { id: 'FLAT', label: 'Flats & 1/2 BHK' },
    { id: 'COLIVING', label: 'Co-Living' },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const [propsData, listingsData, savedData, reqData] = await Promise.all([
        api.getProperties(),
        api.getListings(),
        api.getSavedItems().catch(() => ({ listings: [], properties: [], reels: [] })),
        api.getRequirements().catch(() => ({ requirements: [] })),
      ]);

      setProperties(propsData.properties || []);
      setListings(listingsData.listings || []);
      setSavedProperties(savedData.properties || []);
      setSavedListings(savedData.listings || []);
      setRequirements(reqData.requirements || []);

      // If user is owner/hostel manager, load their metrics
      if (
        currentUser?.activeRole === 'OWNER' ||
        currentUser?.activeRole === 'PG_HOSTEL' ||
        currentUser?.activeRole === 'BROKER' ||
        currentUser?.activeRole === 'ADMIN'
      ) {
        try {
          const [ownerListingsRes, visitsRes] = await Promise.all([
            api.getListings({ ownerId: currentUser.id }),
            api.getVisitRequests(),
          ]);
          setOwnerListings(ownerListingsRes.listings || []);
          setOwnerVisits(visitsRes.visits?.filter((v) => v.ownerId === currentUser.id) || []);
        } catch (e) {
          console.error('Owner data error', e);
        }
      }
    } catch (err) {
      console.error('Home load error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id, currentUser?.activeRole]);

  const handleToggleSave = async (e: React.MouseEvent, type: 'property' | 'listing', id: string) => {
    e.stopPropagation();
    try {
      const res = await api.toggleSave(type, id);
      showToast(res.isSaved ? 'Saved to your collection' : 'Removed from saved collection', 'info');
      // refresh saved items in state
      const updatedSaved = await api.getSavedItems();
      setSavedProperties(updatedSaved.properties || []);
      setSavedListings(updatedSaved.listings || []);
    } catch (e: any) {
      showToast('Could not update saved status', 'error');
    }
  };

  // Filter properties based on search query, area, and type
  const filteredProperties = properties.filter((prop) => {
    const matchesSearch =
      !searchQuery.trim() ||
      prop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.propertyType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesArea =
      selectedArea === 'All Indore' ||
      prop.area.toLowerCase().includes(selectedArea.toLowerCase());

    const matchesType =
      selectedType === 'ALL' || prop.propertyType.toUpperCase() === selectedType;

    return matchesSearch && matchesArea && matchesType;
  });

  const filteredListings = listings.filter((listing) => {
    const matchesSearch =
      !searchQuery.trim() ||
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.propertyType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesArea =
      selectedArea === 'All Indore' ||
      listing.area.toLowerCase().includes(selectedArea.toLowerCase());

    const matchesType =
      selectedType === 'ALL' || listing.propertyType.toUpperCase() === selectedType;

    return matchesSearch && matchesArea && matchesType;
  });

  // Recommended properties (highest rated and verified)
  const recommendedProperties = [...properties]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 4);

  // Recently listed rooms (sorted by creation date)
  const recentlyListed = [...listings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // Nearby properties (matching user's area or Vijay Nagar)
  const userLocality = currentUser?.locationArea || 'Vijay Nagar';
  const nearbyProperties = properties
    .filter((p) => p.area.toLowerCase().includes(userLocality.toLowerCase()))
    .slice(0, 4);

  // Popular properties
  const popularProperties = [...properties]
    .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
    .slice(0, 4);

  const isOwnerPersona =
    currentUser?.activeRole === 'OWNER' ||
    currentUser?.activeRole === 'PG_HOSTEL' ||
    currentUser?.activeRole === 'BROKER' ||
    currentUser?.activeRole === 'ADMIN';

  // Owner statistics
  const ownerActiveCount = ownerListings.filter((l) => l.status === 'ACTIVE').length;
  const ownerTotalViews = ownerListings.reduce((sum, l) => sum + (l.viewsCount || 0), 0);
  const ownerPendingVisits = ownerVisits.filter((v) => v.status === 'PENDING').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 space-y-10">
      {/* Top Header & Search Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Indore Verified Marketplace
            </span>
            <span className="text-xs font-semibold text-zinc-400">
              Zero Brokerage • 10-Day Verified Freshness
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
            Find your next room, PG, or flat in{' '}
            <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              Indore
            </span>
          </h1>

          <p className="text-sm text-zinc-300">
            Direct owner listings, verified student hostels, and premium co-living spaces across Vijay
            Nagar, Bhawarkua, and Scheme 140.
          </p>

          {/* Quick Search Bar */}
          <div className="pt-2">
            <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-700/80 rounded-2xl p-2 shadow-2xl focus-within:border-rose-500/80 focus-within:ring-2 focus-within:ring-rose-500/20 transition-all">
              <div className="pl-3 text-zinc-400">
                <Search className="w-5 h-5 text-rose-400" />
              </div>
              <input
                type="text"
                placeholder="Search properties by location, name, type (e.g. Vijay Nagar, 1BHK, Single AC)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-2 py-1 text-xs text-zinc-400 hover:text-white"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setActiveView('find-property')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 hover:opacity-95 transition-opacity shrink-0 flex items-center gap-1.5"
              >
                <span>Browse All</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Area Filter Pills */}
          <div className="flex items-center gap-2 pt-2 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-zinc-500" /> Locality:
            </span>
            {indoreAreas.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedArea === area
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-700/60'
                }`}
              >
                {area}
              </button>
            ))}
          </div>

          {/* Property Type Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider shrink-0">
              Type:
            </span>
            {propertyTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedType === type.id
                    ? 'bg-zinc-200 text-zinc-950 font-bold shadow-md'
                    : 'bg-zinc-900/90 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* For Owners: Quick Landlord Management Dashboard Card */}
      {isOwnerPersona && (
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Layers className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-white">Landlord & PG Control Bar</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {currentUser?.activeRole}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Quick access to active inventory, tenant inquiries, and 10-day listing renewals.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={() => openCreateModal('listing')}
                className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:opacity-95 text-xs font-extrabold text-white shadow-lg shadow-rose-600/20 flex items-center justify-center gap-1.5 transition-all"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Quick Post Listing</span>
              </button>
              <button
                onClick={() => setActiveView('owner-dashboard')}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors flex items-center gap-1"
              >
                <span>Full Hub</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-xs font-medium">Your Listings</span>
                <Building2 className="w-3.5 h-3.5 text-zinc-500" />
              </div>
              <p className="text-xl font-black text-white">{ownerListings.length}</p>
              <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                {ownerActiveCount} Active (10d fresh)
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-xs font-medium">Listing Views</span>
                <Eye className="w-3.5 h-3.5 text-zinc-500" />
              </div>
              <p className="text-xl font-black text-white">{ownerTotalViews}</p>
              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Across Indore marketplace</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-xs font-medium">Tenant Enquiries</span>
                <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
              </div>
              <p className="text-xl font-black text-rose-400">{ownerVisits.length}</p>
              <p className="text-[10px] text-rose-300 font-medium mt-0.5">
                {ownerPendingVisits} pending walkthroughs
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-xs font-medium">Market Demand</span>
                <Users className="w-3.5 h-3.5 text-zinc-500" />
              </div>
              <p className="text-xl font-black text-amber-400">{requirements.length}</p>
              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Active tenant requests</p>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Recommended For You */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Recommended For You
              </h2>
              <p className="text-xs text-zinc-400">
                Top rated, verified accommodations matching quality standards in Indore.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveView('find-property')}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {recommendedProperties.map((prop) => {
            const isSaved = savedProperties.some((p) => p.id === prop.id);
            return (
              <div
                key={prop.id}
                onClick={() => openPropertyProfile(prop.id)}
                className="group bg-zinc-900/80 border border-zinc-800/90 rounded-3xl overflow-hidden hover:border-zinc-700 hover:shadow-2xl hover:shadow-rose-500/5 transition-all cursor-pointer flex flex-col"
              >
                {/* Photo & badges */}
                <div className="relative aspect-16/10 overflow-hidden bg-zinc-950">
                  <img
                    src={prop.coverPhoto || prop.photos[0]}
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />

                  {/* Top badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-zinc-900/90 text-white backdrop-blur-md border border-zinc-700">
                      {prop.propertyType}
                    </span>
                    {prop.isVerified && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white backdrop-blur-md flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                      </span>
                    )}
                  </div>

                  {/* Save button */}
                  <button
                    onClick={(e) => handleToggleSave(e, 'property', prop.id)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-zinc-950/80 hover:bg-zinc-900 text-zinc-300 hover:text-white backdrop-blur-md border border-zinc-800 transition-colors"
                    title={isSaved ? 'Remove from saved' : 'Save property'}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${
                        isSaved ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'
                      }`}
                    />
                  </button>

                  {/* Bottom rating tag */}
                  <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 text-xs text-white font-bold">
                    <div className="flex items-center gap-1 bg-amber-500/90 text-zinc-950 px-1.5 py-0.5 rounded-md text-[11px] font-extrabold">
                      <Star className="w-3 h-3 fill-zinc-950" />
                      <span>{prop.rating}</span>
                    </div>
                    <span className="text-[11px] text-zinc-300">({prop.reviewCount} reviews)</span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-100 group-hover:text-rose-400 transition-colors line-clamp-1">
                      {prop.title}
                    </h3>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{prop.area}, Indore</span>
                    </p>

                    {/* Amenities chips */}
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {prop.amenities.slice(0, 3).map((amenity) => (
                        <span
                          key={amenity}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                        >
                          {amenity}
                        </span>
                      ))}
                      {prop.amenities.length > 3 && (
                        <span className="text-[10px] text-zinc-500 self-center">
                          +{prop.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rent & Action */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold">Starts from</p>
                      <p className="text-sm font-black text-white">
                        ₹{prop.minRent.toLocaleString('en-IN')}
                        <span className="text-[11px] text-zinc-400 font-normal">/mo</span>
                      </p>
                    </div>

                    <span className="text-xs font-bold text-rose-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      View <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Recently Listed (10-Day Cycle Freshness) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Recently Listed Rooms & Suites
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  10-Day Verified
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Fresh listings published by owners recently. Active for 10 days before expiry.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveView('find-property')}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            <span>See All Listings</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {recentlyListed.map((listing) => {
            const isSaved = savedListings.some((l) => l.id === listing.id);
            // Calculate days left in 10-day cycle
            const expiryTime = new Date(listing.expiresAt).getTime();
            const now = Date.now();
            const daysLeft = Math.max(0, Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24)));

            return (
              <div
                key={listing.id}
                onClick={() => openPropertyProfile(listing.propertyId)}
                className="group bg-zinc-900/80 border border-zinc-800/90 rounded-3xl overflow-hidden hover:border-zinc-700 hover:shadow-2xl transition-all cursor-pointer flex flex-col"
              >
                <div className="relative aspect-16/10 overflow-hidden bg-zinc-950">
                  <img
                    src={listing.photos[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-zinc-900/90 text-white backdrop-blur-md border border-zinc-700">
                      {listing.roomType}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                      {daysLeft}d left
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleToggleSave(e, 'listing', listing.id)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-zinc-950/80 hover:bg-zinc-900 text-zinc-300 hover:text-white backdrop-blur-md border border-zinc-800 transition-colors"
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${
                        isSaved ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'
                      }`}
                    />
                  </button>

                  <div className="absolute bottom-2.5 left-3 text-white">
                    <p className="text-base font-black text-white">
                      ₹{listing.rent.toLocaleString('en-IN')}
                      <span className="text-xs text-zinc-300 font-normal">/month</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-100 group-hover:text-rose-400 transition-colors line-clamp-1">
                      {listing.title}
                    </h3>
                    <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{listing.area}, Indore</span>
                    </p>

                    <p className="text-[11px] text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                      {listing.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openScheduleVisit(listing.propertyId, listing.title, listing.ownerId);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Book Visit</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openChatWith(listing.ownerId, {
                          type: 'LISTING',
                          id: listing.id,
                          title: listing.title,
                          price: listing.rent,
                          subtitle: `${listing.area} • ₹${listing.rent}/mo`,
                          imageUrl: listing.photos[0],
                        });
                      }}
                      className="py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold transition-colors"
                      title="Direct Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 3: Near You (Indore Localities) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Near You in {userLocality}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Local Hub
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Convenient rooms within walking distance of prime transit, institutes, and IT offices.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedArea(userLocality);
              setActiveView('find-property');
            }}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
          >
            <span>Explore {userLocality}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {(nearbyProperties.length > 0 ? nearbyProperties : properties.slice(0, 4)).map((prop) => (
            <div
              key={prop.id}
              onClick={() => openPropertyProfile(prop.id)}
              className="group bg-zinc-900/80 border border-zinc-800/90 rounded-3xl overflow-hidden hover:border-zinc-700 hover:shadow-2xl transition-all cursor-pointer flex flex-col"
            >
              <div className="relative aspect-16/10 overflow-hidden bg-zinc-950">
                <img
                  src={prop.coverPhoto || prop.photos[0]}
                  alt={prop.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />

                <div className="absolute top-3 left-3">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-900/90 text-zinc-200 border border-zinc-700 backdrop-blur-md">
                    {prop.genderPreference === 'GIRLS'
                      ? 'Girls Only'
                      : prop.genderPreference === 'BOYS'
                      ? 'Boys Only'
                      : 'Any Gender'}
                  </span>
                </div>

                <div className="absolute bottom-2.5 left-3 text-white">
                  <p className="text-sm font-black text-white">
                    ₹{prop.minRent.toLocaleString('en-IN')} - ₹{prop.maxRent.toLocaleString('en-IN')}
                    <span className="text-[11px] text-zinc-400 font-normal">/mo</span>
                  </p>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-100 group-hover:text-rose-400 transition-colors line-clamp-1">
                    {prop.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{prop.fullAddress}</p>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>{prop.totalRooms} Total Rooms</span>
                    <span className="text-emerald-400 font-bold">
                      {prop.availableRooms} Available
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{prop.foodOption || 'Food Available'}</span>
                  <span className="font-bold text-rose-400 flex items-center gap-0.5">
                    Details <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Popular Properties in Indore */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Popular Properties & Residences
              </h2>
              <p className="text-xs text-zinc-400">
                Most viewed and booked accommodations with high community reviews.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveView('find-property')}
            className="text-xs font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
          >
            <span>Browse Directory</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {popularProperties.map((prop) => (
            <div
              key={prop.id}
              onClick={() => openPropertyProfile(prop.id)}
              className="group bg-zinc-900/80 border border-zinc-800/90 rounded-3xl overflow-hidden hover:border-zinc-700 hover:shadow-2xl transition-all cursor-pointer flex flex-col"
            >
              <div className="relative aspect-16/10 overflow-hidden bg-zinc-950">
                <img
                  src={prop.coverPhoto || prop.photos[0]}
                  alt={prop.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />

                <div className="absolute top-3 left-3">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-zinc-900/90 text-white backdrop-blur-md border border-zinc-700">
                    {prop.propertyType}
                  </span>
                </div>

                <div className="absolute bottom-2.5 left-3 flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md px-2 py-0.5 rounded-lg border border-zinc-700/80 text-xs font-bold text-white">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{prop.rating}</span>
                  <span className="text-[10px] text-zinc-400">({prop.reviewCount})</span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-100 group-hover:text-rose-400 transition-colors line-clamp-1">
                    {prop.title}
                  </h3>
                  <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{prop.area}, Indore</span>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <p className="text-xs font-black text-white">
                    ₹{prop.minRent.toLocaleString('en-IN')}+{' '}
                    <span className="text-[10px] text-zinc-400 font-normal">/mo</span>
                  </p>
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-0.5">
                    View <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: Saved Properties */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Bookmark className="w-4 h-4 fill-pink-400/30" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Saved Properties & Bookmarks
              </h2>
              <p className="text-xs text-zinc-400">
                Quick access to properties you've shortlisted for walkthroughs.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveView('saved')}
            className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1 transition-colors"
          >
            <span>View All Saved ({savedProperties.length + savedListings.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {savedProperties.length > 0 || savedListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {savedProperties.slice(0, 4).map((prop) => (
              <div
                key={prop.id}
                onClick={() => openPropertyProfile(prop.id)}
                className="group bg-zinc-900/80 border border-zinc-800/90 rounded-3xl overflow-hidden hover:border-zinc-700 transition-all cursor-pointer flex flex-col"
              >
                <div className="relative aspect-16/10 overflow-hidden bg-zinc-950">
                  <img
                    src={prop.coverPhoto || prop.photos[0]}
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute top-3 right-3 p-1.5 rounded-full bg-zinc-950/80 text-amber-400">
                    <Bookmark className="w-3.5 h-3.5 fill-amber-400" />
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white line-clamp-1">{prop.title}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{prop.area}, Indore</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-black text-white">
                      ₹{prop.minRent.toLocaleString('en-IN')}/mo
                    </span>
                    <span className="text-xs font-bold text-rose-400">Open Profile</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 text-center space-y-3">
            <Bookmark className="w-8 h-8 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-300">No saved properties yet</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Click the bookmark icon on any room or property card to save it here for comparison and
              walkthrough planning.
            </p>
            <button
              onClick={() => setActiveView('find-property')}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 transition-colors"
            >
              Browse Indore Properties
            </button>
          </div>
        )}
      </section>

      {/* Section 6: Active Tenant Enquiries & Requirements (Market Activity) */}
      <section className="space-y-4 pt-4 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Tenant Rental Requests & Enquiries
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Direct Matches
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Verified tenants looking for immediate move-in accommodations across Indore.
              </p>
            </div>
          </div>

          {isOwnerPersona && (
            <button
              onClick={() => setActiveView('find-tenants')}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              <span>View All Tenant Requests ({requirements.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requirements.slice(0, 3).map((req) => (
            <div
              key={req.id}
              className="bg-zinc-900/80 border border-zinc-800/90 rounded-3xl p-5 hover:border-zinc-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Budget ₹{req.budgetMin.toLocaleString('en-IN')} - ₹{req.budgetMax.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-semibold">
                    Move-in: {req.moveInDate}
                  </span>
                </div>

                <h3 className="font-extrabold text-sm text-zinc-100">{req.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {req.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {req.preferredAreas.map((area) => (
                    <span
                      key={area}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700"
                    >
                      📍 {area}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
                    {req.tenant?.name ? req.tenant.name.charAt(0) : 'T'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">
                      {req.tenant?.name || 'Verified Tenant'}
                    </p>
                    <p className="text-[10px] text-zinc-500">{req.occupation}</p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    openChatWith(req.tenantId, {
                      type: 'REQUIREMENT',
                      id: req.id,
                      title: req.title,
                      subtitle: `Budget ₹${req.budgetMax}/mo • Move-in: ${req.moveInDate}`,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-colors"
                >
                  Contact Tenant
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
