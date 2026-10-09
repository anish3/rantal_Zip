import React, { useState, useEffect } from 'react';
import { Bookmark, Building, Home, Clock } from 'lucide-react';
import { RentalListing, Property } from '../../types/client.ts';
import { api } from '../../lib/api.ts';
import { useApp } from '../../context/AppContext.tsx';

export const SavedView: React.FC = () => {
  const { openPropertyProfile, setViewParams, setActiveView } = useApp();

  const [savedListings, setSavedListings] = useState<RentalListing[]>([]);
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [activeTab, setActiveTab] = useState<'listings' | 'properties'>('listings');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaved = async () => {
      setLoading(true);
      try {
        const res = await api.getSavedItems();
        setSavedListings(res.listings || []);
        setSavedProperties(res.properties || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-2 mb-6">
        <Bookmark className="w-5 h-5 text-amber-400 fill-amber-400" />
        <h1 className="text-2xl font-black text-white tracking-tight">Saved Collection</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 mb-6">
        <button
          onClick={() => setActiveTab('listings')}
          className={`flex-1 py-3 text-xs font-bold border-b-2 ${
            activeTab === 'listings'
              ? 'border-rose-500 text-white'
              : 'border-transparent text-zinc-400'
          }`}
        >
          Room Listings ({savedListings.length})
        </button>
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-3 text-xs font-bold border-b-2 ${
            activeTab === 'properties'
              ? 'border-rose-500 text-white'
              : 'border-transparent text-zinc-400'
          }`}
        >
          Properties ({savedProperties.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'listings' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {savedListings.map((l) => (
            <div
              key={l.id}
              onClick={() => openPropertyProfile(l.propertyId)}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 cursor-pointer hover:border-zinc-700 transition-colors shadow-lg"
            >
              <img
                src={l.photos[0]}
                alt={l.title}
                className="w-full aspect-16/10 rounded-2xl object-cover mb-3"
              />
              <span className="text-xs font-extrabold text-white">
                ₹{l.rent.toLocaleString('en-IN')}/mo
              </span>
              <h4 className="text-xs font-bold text-zinc-200 mt-1 line-clamp-1">{l.title}</h4>
              <p className="text-[11px] text-zinc-400">{l.area}, Indore</p>
            </div>
          ))}
          {savedListings.length === 0 && (
            <div className="col-span-2 py-16 text-center text-xs text-zinc-500">
              No saved room listings yet. Click the bookmark icon on any post to save.
            </div>
          )}
        </div>
      )}

      {activeTab === 'properties' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {savedProperties.map((p) => (
            <div
              key={p.id}
              onClick={() => openPropertyProfile(p.id)}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 cursor-pointer hover:border-zinc-700 transition-colors shadow-lg"
            >
              <img
                src={p.coverPhoto}
                alt={p.title}
                className="w-full aspect-16/10 rounded-2xl object-cover mb-3"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white">
                  ₹{p.minRent.toLocaleString('en-IN')} - ₹{p.maxRent.toLocaleString('en-IN')}/mo
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                  {p.propertyType}
                </span>
              </div>
              <h4 className="text-xs font-bold text-zinc-200 mt-1 line-clamp-1">{p.title}</h4>
              <p className="text-[11px] text-zinc-400">{p.area}, Indore</p>
            </div>
          ))}
          {savedProperties.length === 0 && (
            <div className="col-span-2 py-16 text-center text-xs text-zinc-500">
              No saved properties yet. Click the save icon on any property profile to add here.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
