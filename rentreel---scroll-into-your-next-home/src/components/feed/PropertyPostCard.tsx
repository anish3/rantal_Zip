import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  Send,
  MoreHorizontal,
  ChevronRight,
  Calendar,
  Eye,
} from 'lucide-react';
import { RentalListing, Property } from '../../types/client.ts';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../lib/api.ts';

interface PropertyPostCardProps {
  listing?: RentalListing;
  property?: Property;
  onSelectProperty?: (id: string) => void;
}

export const PropertyPostCard: React.FC<PropertyPostCardProps> = ({
  listing,
  property,
  onSelectProperty,
}) => {
  const { openChatWith, openPropertyProfile, openUserProfile, showToast, openScheduleVisit } = useApp();

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(
    listing ? listing.savesCount + 18 : property ? property.reviewCount * 2 + 15 : 24
  );
  const [isSaved, setIsSaved] = useState(listing?.isSaved || property?.isSaved || false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState<string[]>([
    'Is this available for immediate move-in?',
    'Looks very clean! What are the power backup timings?',
  ]);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const targetOwner = listing?.owner || property?.owner;
  const photos = listing?.photos || property?.photos || [property?.coverPhoto || ''];
  const title = listing?.title || property?.title || 'Rental Unit';
  const rent = listing ? listing.rent : property ? property.minRent : 0;
  const deposit = listing?.deposit;
  const area = listing?.area || property?.area || 'Indore';
  const amenities = listing?.amenities || property?.amenities || [];
  const propertyId = listing?.propertyId || property?.id || '';

  // Calculate remaining days for 10-day expiring listing
  const getRemainingDays = () => {
    if (!listing?.expiresAt) return null;
    const diff = new Date(listing.expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
    return days > 0 ? days : 0;
  };
  const remainingDays = getRemainingDays();

  const handleDoubleTap = () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikeCount((c) => c + 1);
    }
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 800);
  };

  const handleToggleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount((c) => (isLiked ? c - 1 : c + 1));
  };

  const handleToggleSave = async () => {
    const targetType = listing ? 'listing' : 'property';
    const targetId = listing ? listing.id : propertyId;
    try {
      await api.toggleSave(targetType, targetId);
      setIsSaved(!isSaved);
      showToast(isSaved ? 'Removed from saved' : 'Saved to your collection!', 'success');
    } catch (e) {
      setIsSaved(!isSaved);
    }
  };

  const handleMessageOwner = () => {
    if (!targetOwner) return;
    openChatWith(targetOwner.id, {
      type: listing ? 'LISTING' : 'PROPERTY',
      id: listing ? listing.id : propertyId,
      title: title,
      subtitle: `${area}, Indore • ₹${rent.toLocaleString('en-IN')}/mo`,
      price: rent,
      imageUrl: photos[0],
      location: area,
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setLocalComments((prev) => [...prev, commentText.trim()]);
    setCommentText('');
    showToast('Comment posted', 'info');
  };

  return (
    <article className="bg-zinc-900/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl mb-6 backdrop-blur-sm transition-all hover:border-zinc-700/80">
      {/* Header: Owner details & verification */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            onClick={() => targetOwner && openUserProfile(targetOwner.username)}
            className="cursor-pointer relative group"
          >
            <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400">
              <img
                src={targetOwner?.avatar || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=150'}
                alt={targetOwner?.name || 'Owner'}
                className="w-full h-full rounded-full object-cover border-2 border-zinc-950"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span
                onClick={() => targetOwner && openUserProfile(targetOwner.username)}
                className="font-bold text-sm text-zinc-100 hover:text-rose-400 cursor-pointer"
              >
                {targetOwner?.name || 'Indore Property Host'}
              </span>
              {targetOwner?.isVerified && (
                <ShieldCheck className="w-4 h-4 text-sky-400 fill-sky-400/20" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-rose-500" />
                {area}, Indore
              </span>
              <span>•</span>
              <span className="text-zinc-500">
                {listing?.roomType || property?.propertyType || 'PG/Flat'}
              </span>
            </div>
          </div>
        </div>

        {/* 10-day Active Status Badge */}
        <div className="flex items-center gap-2">
          {remainingDays !== null && (
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                remainingDays <= 2
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
              title="Rental listings are verified and refresh every 10 days"
            >
              <Clock className="w-3 h-3" />
              <span>{remainingDays <= 1 ? 'Expires in 24h' : `${remainingDays}d active`}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Media Carousel / Photo */}
      <div
        className="relative aspect-4/3 sm:aspect-16/10 bg-zinc-950 overflow-hidden cursor-pointer select-none group"
        onDoubleClick={handleDoubleTap}
      >
        <img
          src={photos[currentPhotoIdx] || photos[0]}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />

        {/* Double-tap animated heart */}
        {showHeartAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart className="w-24 h-24 text-white fill-rose-500 animate-pulse-heart drop-shadow-2xl" />
          </div>
        )}

        {/* Floating Rent Pill on Image */}
        <div className="absolute bottom-3 left-3 bg-zinc-950/85 backdrop-blur-md border border-zinc-800/90 rounded-2xl px-3.5 py-2 shadow-2xl flex items-center gap-3">
          <div>
            <div className="text-base font-extrabold text-white flex items-baseline gap-1">
              <span>₹{rent.toLocaleString('en-IN')}</span>
              <span className="text-[11px] font-normal text-zinc-400">/mo</span>
            </div>
            {deposit && (
              <p className="text-[10px] text-zinc-400">Deposit: ₹{deposit.toLocaleString('en-IN')}</p>
            )}
          </div>
          <div className="h-6 w-px bg-zinc-800"></div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
            {listing?.roomType || property?.propertyType || 'Single Room'}
          </span>
        </div>

        {/* Photo pagination dots */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-zinc-950/70 backdrop-blur-sm px-2 py-1 rounded-full">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPhotoIdx(i);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  currentPhotoIdx === i ? 'w-4 bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Social Action Bar */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={handleToggleLike}
              className="text-zinc-300 hover:text-rose-500 transition-colors flex items-center gap-1.5"
            >
              <Heart
                className={`w-6 h-6 transition-transform active:scale-125 ${
                  isLiked ? 'text-rose-500 fill-rose-500' : 'text-zinc-300'
                }`}
              />
              <span className="text-xs font-bold text-zinc-300">{likeCount}</span>
            </button>

            <button
              onClick={() => setIsCommentsOpen(!isCommentsOpen)}
              className="text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs font-bold text-zinc-300">{localComments.length}</span>
            </button>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                showToast('Listing link copied to clipboard!', 'info');
              }}
              className="text-zinc-300 hover:text-white transition-colors"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSave}
              className="text-zinc-300 hover:text-amber-400 transition-colors"
            >
              <Bookmark
                className={`w-6 h-6 ${isSaved ? 'text-amber-400 fill-amber-400' : 'text-zinc-300'}`}
              />
            </button>
          </div>
        </div>

        {/* Title & Caption */}
        <div className="space-y-1.5">
          <h3
            onClick={() => propertyId && openPropertyProfile(propertyId)}
            className="font-bold text-base text-zinc-100 hover:text-rose-400 cursor-pointer"
          >
            {title}
          </h3>
          <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
            {listing?.description || property?.description}
          </p>
        </div>

        {/* Amenity Badges */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {amenities.slice(0, 5).map((amenity, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60"
              >
                {amenity}
              </span>
            ))}
            {amenities.length > 5 && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                +{amenities.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Interactive Direct Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800/80">
          <button
            onClick={handleMessageOwner}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5 text-rose-400" />
            <span>Message Owner</span>
          </button>

          <button
            onClick={() => openScheduleVisit(propertyId, title, targetOwner?.id || '')}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule Visit</span>
          </button>

          <button
            onClick={() => propertyId && openPropertyProfile(propertyId)}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="View Instagram Profile"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Collapsible Comments Section */}
        {isCommentsOpen && (
          <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2 animate-in fade-in">
            <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
              {localComments.map((comment, i) => (
                <div key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                  <span className="font-bold text-zinc-200">User_{i + 1}:</span>
                  <span className="text-zinc-400">{comment}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Ask about food, WiFi, gate timings..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-rose-500 text-white font-bold text-xs rounded-xl hover:bg-rose-600 transition-colors"
              >
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
};
