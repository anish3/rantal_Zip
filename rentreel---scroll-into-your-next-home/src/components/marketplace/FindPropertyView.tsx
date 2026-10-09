import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  Grid,
  Map as MapIcon,
  MapPin,
  Building,
  SlidersHorizontal,
  Send,
  LocateFixed,
  Navigation,
} from 'lucide-react';
import { Property, RentalListing } from '../../types/client.ts';
import { api } from '../../lib/api.ts';
import { useApp } from '../../context/AppContext.tsx';

const DEFAULT_CENTER: [number, number] = [22.7196, 75.8577];

const calculateDistanceKm = (
  start: [number, number],
  end: [number, number]
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(end[0] - start[0]);
  const dLng = toRad(end[1] - start[1]);
  const lat1 = toRad(start[0]);
  const lat2 = toRad(end[0]);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export const FindPropertyView: React.FC = () => {
  const { openPropertyProfile, openChatWith, openScheduleVisit } = useApp();

  const [properties, setProperties] = useState<Property[]>([]);
  const [activeListings, setActiveListings] = useState<RentalListing[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [maxBudget, setMaxBudget] = useState<number>(25000);
  const [selectedGender, setSelectedGender] = useState<string>('ANY');
  const [noBrokerageOnly, setNoBrokerageOnly] = useState<boolean>(false);
  const [filterAmenity, setFilterAmenity] = useState<string[]>([]);
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);
  const [selectedMapPin, setSelectedMapPin] = useState<Property | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'granted' | 'denied' | 'unsupported'>('idle');
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);

  const indoreAreas = ['Vijay Nagar', 'Scheme 54', 'Scheme 140', 'Bhawarkua', 'Palasia', 'Rau', 'Bengali Square'];
  const propertyTypes = ['PG', 'FLAT', 'COLIVING', 'APARTMENT', 'ROOM', 'HOSTEL'];
  const commonAmenities = ['WiFi', 'Food', 'AC', 'Attached Bath', 'Parking', 'Power Backup'];

  const loadData = async () => {
    setLoading(true);
    try {
      const [propData, listingData] = await Promise.all([
        api.getProperties(),
        api.getListings({ status: 'ACTIVE' }),
      ]);
      setProperties(propData.properties);
      setActiveListings(listingData.listings);
      if (propData.properties.length > 0) {
        setSelectedMapPin(propData.properties[0]);
      }
    } catch (error) {
      console.error('Failed to load property data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProperties = useMemo(
    () =>
      properties.filter((property) => {
        if (selectedType !== 'ALL' && property.propertyType !== selectedType) return false;
        if (selectedArea !== 'ALL' && !property.area.toLowerCase().includes(selectedArea.toLowerCase())) return false;
        if (property.minRent > maxBudget) return false;
        if (selectedGender !== 'ANY' && property.genderPreference !== selectedGender && property.genderPreference !== 'ANY') return false;
        if (noBrokerageOnly && !property.noBrokerage) return false;
        if (
          filterAmenity.length > 0 &&
          !filterAmenity.every((amenity) => property.amenities.some((item) => item.toLowerCase() === amenity.toLowerCase()))
        ) {
          return false;
        }
        return true;
      }),
    [properties, selectedType, selectedArea, maxBudget, selectedGender, noBrokerageOnly, filterAmenity]
  );

  useEffect(() => {
    if (filteredProperties.length === 0) {
      return;
    }
    if (!selectedMapPin || !filteredProperties.some((property) => property.id === selectedMapPin.id)) {
      setSelectedMapPin(filteredProperties[0]);
    }
  }, [filteredProperties, selectedMapPin]);

  const toggleAmenity = (amenity: string) => {
    setFilterAmenity((previous) =>
      previous.includes(amenity) ? previous.filter((item) => item !== amenity) : [...previous, amenity]
    );
  };

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(nextLocation);
        setLocationStatus('granted');
      },
      () => {
        setLocationStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (viewMode !== 'map' || !mapRef.current) return;

    let disposed = false;

    const initializeMap = async () => {
      const L = await import('leaflet');
      if (!mapRef.current || disposed) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      }).setView(DEFAULT_CENTER, 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const validProperties = filteredProperties.filter(
        (property) =>
          typeof property.latitude === 'number' &&
          typeof property.longitude === 'number' &&
          Number.isFinite(property.latitude) &&
          Number.isFinite(property.longitude)
      );

      validProperties.forEach((property) => {
        const isSelected = selectedMapPin?.id === property.id;
        const marker = L.circleMarker([property.latitude, property.longitude], {
          radius: isSelected ? 12 : 9,
          color: isSelected ? '#fb7185' : '#e2e8f0',
          fillColor: isSelected ? '#fb7185' : '#f43f5e',
          fillOpacity: 1,
          weight: 2,
          className: 'property-map-marker',
        }).addTo(map);

        marker.bindPopup(`
          <div style="min-width:180px; color:#f4f4f5; font-family:Inter,sans-serif;">
            <strong>${property.title}</strong><br/>
            ${property.area} • ${property.propertyType}<br/>
            <span style="color:#fda4af; font-weight:700;">₹${property.minRent.toLocaleString('en-IN')}</span>
          </div>
        `);

        marker.on('click', () => setSelectedMapPin(property));
      });

      if (validProperties.length > 0) {
        const bounds = L.latLngBounds(
          validProperties.map((property) => [property.latitude, property.longitude] as [number, number])
        );
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.35));
        }
      }

      mapInstanceRef.current = map;
    };

    initializeMap();

    return () => {
      disposed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [viewMode, filteredProperties, selectedMapPin]);

  const selectedProperty = selectedMapPin ?? filteredProperties[0] ?? null;
  const nearMeDistanceKm =
    selectedProperty && userLocation && Number.isFinite(selectedProperty.latitude) && Number.isFinite(selectedProperty.longitude)
      ? calculateDistanceKm(userLocation, [selectedProperty.latitude, selectedProperty.longitude])
      : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 pb-24 md:px-6">
      <div className="mb-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rose-500/35 bg-rose-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300">
              <MapPin className="h-3.5 w-3.5" />
              Indore rental map
            </div>
            <h1 className="text-3xl font-black tracking-[-0.05em] text-white md:text-4xl">
              Find Rental Homes & PGs
            </h1>
            <p className="mt-2 max-w-2xl text-base text-zinc-400">
              Browse verified spaces, compare locations, and inspect nearby rental homes with live map coordinates.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-2xl border border-zinc-800 bg-zinc-900 p-1 shadow-lg md:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-xl p-2.5 transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
              title="Grid View"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-xl p-2.5 transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
              title="List View"
            >
              <MapIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`rounded-xl p-2.5 transition-all ${viewMode === 'map' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
              title="Map View"
            >
              <Navigation className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedType('ALL')}
              className={`rounded-full px-3 py-2 text-sm font-bold transition-all ${selectedType === 'ALL' ? 'bg-rose-500 text-white' : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'}`}
            >
              All Types
            </button>
            {propertyTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`rounded-full px-3 py-2 text-sm font-bold transition-all ${selectedType === type ? 'bg-rose-500 text-white' : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'}`}
              >
                {type}
              </button>
            ))}
          </div>

          <select
            value={selectedArea}
            onChange={(event) => setSelectedArea(event.target.value)}
            className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200"
          >
            <option value="ALL">All areas</option>
            {indoreAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <select
            value={selectedGender}
            onChange={(event) => setSelectedGender(event.target.value)}
            className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200"
          >
            <option value="ANY">Any gender</option>
            <option value="BOYS">Boys only</option>
            <option value="GIRLS">Girls only</option>
            <option value="FAMILY">Family</option>
          </select>

          <button
            onClick={() => setNoBrokerageOnly((value) => !value)}
            className={`rounded-full border px-3 py-2 text-sm font-bold transition-colors ${noBrokerageOnly ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-300' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'}`}
          >
            {noBrokerageOnly ? '✓ Zero brokerage' : 'Zero brokerage'}
          </button>

          <button
            onClick={() => setShowFiltersModal((value) => !value)}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-bold text-zinc-200"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Budget ≤ ₹{maxBudget.toLocaleString('en-IN')}
          </button>
        </div>

        {showFiltersModal && (
          <div className="mt-4 rounded-[1.5rem] border border-zinc-800 bg-zinc-900 p-4 shadow-lg">
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-sm font-bold text-zinc-300">
                <span>Maximum rent</span>
                <span className="text-emerald-400">₹{maxBudget.toLocaleString('en-IN')}/mo</span>
              </div>
              <input
                type="range"
                min="5000"
                max="35000"
                step="1000"
                value={maxBudget}
                onChange={(event) => setMaxBudget(Number(event.target.value))}
                className="w-full accent-rose-500"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-zinc-300">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {commonAmenities.map((amenity) => (
                  <button
                    key={amenity}
                    onClick={() => toggleAmenity(amenity)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${filterAmenity.includes(amenity) ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'map' && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="overflow-hidden rounded-[1.8rem] border border-zinc-800 bg-zinc-900 p-3 shadow-2xl">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
                <MapPin className="h-4 w-4 text-rose-400" />
                Map-based property discovery
              </div>
              <button
                onClick={requestUserLocation}
                className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200"
              >
                <LocateFixed className="h-3.5 w-3.5" />
                {userLocation ? 'Refresh my location' : 'Near me'}
              </button>
            </div>

            <div ref={mapRef} className="h-[420px] w-full overflow-hidden rounded-[1.4rem]" />

            {locationStatus === 'denied' && (
              <p className="mt-3 text-sm text-amber-300">Location permission was denied. You can still view all nearby Indore listings.</p>
            )}
            {locationStatus === 'unsupported' && (
              <p className="mt-3 text-sm text-zinc-400">This browser does not support geolocation, so the map will show all properties without distance labels.</p>
            )}
          </div>

          <div className="rounded-[1.8rem] border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
            {selectedProperty ? (
              <div>
                <div className="relative mb-4 overflow-hidden rounded-[1.3rem]">
                  <img src={selectedProperty.coverPhoto} alt={selectedProperty.title} className="h-48 w-full object-cover" />
                  <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold uppercase text-white">
                    {selectedProperty.propertyType}
                  </span>
                </div>

                <h3 className="text-xl font-black text-white">{selectedProperty.title}</h3>
                <div className="mt-2 flex items-center gap-2 text-sm text-rose-300">
                  <MapPin className="h-4 w-4" />
                  {selectedProperty.area}, Indore
                </div>

                <div className="mt-3 text-2xl font-black text-white">
                  ₹{selectedProperty.minRent.toLocaleString('en-IN')} - ₹{selectedProperty.maxRent.toLocaleString('en-IN')}
                  <span className="ml-1 text-sm font-medium text-zinc-400">/month</span>
                </div>

                <p className="mt-3 text-sm text-zinc-400">{selectedProperty.description}</p>

                {nearMeDistanceKm !== null && (
                  <div className="mt-3 inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                    Approx. {nearMeDistanceKm.toFixed(1)} km away from you
                  </div>
                )}

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => openPropertyProfile(selectedProperty.id)}
                    className="flex-1 rounded-xl bg-rose-500 px-4 py-3 text-sm font-bold text-white"
                  >
                    View profile
                  </button>
                  <button
                    onClick={() => openScheduleVisit(selectedProperty.id, selectedProperty.title, selectedProperty.ownerId)}
                    className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-bold text-zinc-100"
                  >
                    Visit
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center text-center text-sm text-zinc-500">
                No map data available for the current filters.
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode !== 'map' && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProperties.map((property) => (
            <div key={property.id} className="overflow-hidden rounded-[1.7rem] border border-zinc-800 bg-zinc-900 shadow-xl transition-colors hover:border-zinc-700">
              <div className="relative cursor-pointer" onClick={() => openPropertyProfile(property.id)}>
                <img src={property.coverPhoto} alt={property.title} className="h-52 w-full object-cover" />
                <span className="absolute right-3 top-3 rounded-full bg-rose-500/90 px-2 py-1 text-[10px] font-bold uppercase text-white">
                  {property.propertyType}
                </span>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent p-3">
                  <div className="text-lg font-black text-white">
                    ₹{property.minRent.toLocaleString('en-IN')} - ₹{property.maxRent.toLocaleString('en-IN')}
                    <span className="ml-1 text-xs font-medium text-zinc-300">/mo</span>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                  <span className="inline-flex items-center gap-1 text-rose-300">
                    <MapPin className="h-3.5 w-3.5" />
                    {property.area}
                  </span>
                  <span className="font-semibold text-emerald-300">{property.availableRooms} open</span>
                </div>

                <h3 className="text-lg font-bold text-white">{property.title}</h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  {property.amenities.slice(0, 4).map((amenity) => (
                    <span key={amenity} className="rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                      {amenity}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openPropertyProfile(property.id)}
                    className="flex-1 rounded-xl bg-zinc-800 px-3 py-2.5 text-sm font-bold text-white"
                  >
                    View details
                  </button>
                  <button
                    onClick={() =>
                      openChatWith(property.ownerId, {
                        type: 'PROPERTY',
                        id: property.id,
                        title: property.title,
                        subtitle: `${property.area} • ₹${property.minRent}/mo`,
                        price: property.minRent,
                        imageUrl: property.coverPhoto,
                      })
                    }
                    className="rounded-xl bg-rose-500 p-2.5 text-white"
                    title="Message host"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredProperties.length === 0 && !loading && (
        <div className="mt-8 rounded-[1.8rem] border border-zinc-800 bg-zinc-900 py-16 text-center">
          <Building className="mx-auto h-12 w-12 text-zinc-600" />
          <p className="mt-3 text-xl font-bold text-zinc-200">No properties match your current filters.</p>
          <p className="mt-1 text-sm text-zinc-500">Try widening the budget or selecting a different area.</p>
        </div>
      )}
    </div>
  );
};
