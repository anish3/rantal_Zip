export type UserRole = 'TENANT' | 'OWNER' | 'PG_HOSTEL' | 'BROKER' | 'ADMIN';

export type PropertyType = 'PG' | 'ROOM' | 'FLAT' | 'HOUSE' | 'HOSTEL' | 'APARTMENT' | 'COLIVING';

export type RoomType = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | '1BHK' | '2BHK' | '3BHK' | 'STUDIO';

export type FurnishingStatus = 'FULLY' | 'SEMI' | 'UNFURNISHED';

export type GenderPreference = 'BOYS' | 'GIRLS' | 'ANY' | 'FAMILY';

export type ListingStatus = 'ACTIVE' | 'EXPIRED' | 'RENTED' | 'PAUSED';

export type RequirementStatus = 'ACTIVE' | 'FULFILLED' | 'CLOSED';

export type OccupationType = 'STUDENT' | 'WORKING_PROFESSIONAL' | 'OTHER';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  bio?: string;
  roles: UserRole[];
  activeRole: UserRole;
  isVerified: boolean;
  city: string;
  locationArea: string;
  occupation?: OccupationType;
  instituteOrCompany?: string;
  authProvider?: 'GOOGLE' | 'LOCAL';
  providerSubject?: string;
  followersCount: number;
  followingCount: number;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
}

export interface Room {
  id: string;
  propertyId: string;
  roomNumber: string;
  roomType: RoomType;
  rent: number;
  deposit: number;
  furnishing: FurnishingStatus;
  hasAC: boolean;
  hasAttachedBath: boolean;
  hasBalcony: boolean;
  photos: string[];
  availableFrom: string;
  isAvailable: boolean;
}

export interface Property {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  city: string;
  area: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  rules: string[];
  foodOption?: string; // 'Mess Included' | 'Veg Only' | 'Self Cooking Allowed'
  genderPreference: GenderPreference;
  noBrokerage: boolean;
  coverPhoto: string;
  photos: string[];
  totalRooms: number;
  availableRooms: number;
  minRent: number;
  maxRent: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RentalListing {
  id: string;
  propertyId: string;
  roomId?: string;
  ownerId: string;
  title: string;
  description: string;
  rent: number;
  deposit: number;
  propertyType: PropertyType;
  roomType: RoomType;
  city: string;
  area: string;
  photos: string[];
  amenities: string[];
  genderPreference: GenderPreference;
  status: ListingStatus;
  createdAt: string;
  expiresAt: string; // 10 days from creation / renewal
  rentedAt?: string;
  renewedAt?: string;
  viewsCount: number;
  inquiriesCount: number;
  savesCount: number;
  isFeatured?: boolean;
}

export interface RentalRequirement {
  id: string;
  tenantId: string;
  title: string;
  city: string;
  preferredAreas: string[];
  budgetMin: number;
  budgetMax: number;
  propertyTypes: PropertyType[];
  roomTypes: RoomType[];
  moveInDate: string;
  occupation: OccupationType;
  genderPreference: GenderPreference;
  preferences: string[]; // e.g. ['WiFi', 'Furnished', 'Attached Bath', 'No Food Restrictions']
  description: string;
  status: RequirementStatus;
  createdAt: string;
  viewsCount: number;
  matchScore?: number;
}

export interface Reel {
  id: string;
  ownerId: string;
  propertyId?: string;
  listingId?: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  location: string;
  propertyTitle?: string;
  rentAmount?: number;
  category: 'ROOM_TOUR' | 'PG_TOUR' | 'AMENITIES' | 'LOCATION' | 'AVAILABILITY';
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  viewsCount: number;
  createdAt: string;
}

export interface Post {
  id: string;
  ownerId: string;
  propertyId?: string;
  images: string[];
  caption: string;
  location: string;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  targetId: string; // reelId or postId
  targetType: 'REEL' | 'POST';
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface Review {
  id: string;
  propertyId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface MessageContext {
  type: 'PROPERTY' | 'LISTING' | 'REEL' | 'REQUIREMENT';
  id: string;
  title: string;
  subtitle?: string;
  price?: number;
  imageUrl?: string;
  location?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  context?: MessageContext;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: string[]; // user IDs
  lastMessage?: string;
  lastMessageAt: string;
  unreadCount: { [userId: string]: number };
  activeContext?: MessageContext;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | 'EXPIRING_SOON'
    | 'LISTING_EXPIRED'
    | 'LISTING_RENEWED'
    | 'NEW_MESSAGE'
    | 'INQUIRY'
    | 'VISIT_REQUEST'
    | 'REQUIREMENT_MATCH'
    | 'LIKE'
    | 'NEW_FOLLOWER';
  title: string;
  message: string;
  linkUrl?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface VisitRequest {
  id: string;
  propertyId: string;
  listingId?: string;
  tenantId: string;
  ownerId: string;
  preferredDate: string;
  preferredTime: string;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'PROPERTY' | 'USER' | 'LISTING' | 'REEL';
  targetId: string;
  reason: string;
  details?: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
}

export interface MatchScoreResult {
  property: Property;
  listing?: RentalListing;
  requirement: RentalRequirement;
  score: number; // 0 - 100
  matchedCriteria: string[];
  unmatchedCriteria: string[];
}
