import {
  User,
  Property,
  RentalListing,
  RentalRequirement,
  Reel,
  Post,
  Comment,
  Review,
  Conversation,
  Message,
  Notification,
  VisitRequest,
  Report,
  UserRole,
} from '../types/client.ts';

const BASE_URL = '/api';

// Current active user ID holder for client-side API requests
let currentClientId: string = (() => {
  try {
    const saved = localStorage.getItem('rentreel_active_user_id');
    if (saved) return saved;
  } catch (e) {}
  return 'user-tenant-aman';
})();

export function setApiClientUserId(userId: string) {
  currentClientId = userId;
  try {
    localStorage.setItem('rentreel_active_user_id', userId);
  } catch (e) {}
}

export function getApiClientUserId(): string {
  try {
    const saved = localStorage.getItem('rentreel_active_user_id');
    if (saved) return saved;
  } catch (e) {}
  return currentClientId;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const activeUserId = getApiClientUserId();
  const res = await fetch(`${BASE_URL}${url}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': activeUserId,
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  getSessionUser: async () => {
    const res = await fetch(`${BASE_URL}/auth/session`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || 'Not authenticated');
    }

    return res.json() as Promise<{ user: User }>;
  },
  getCurrentUser: () => fetchJson<{ user: User }>('/auth/me'),
  getDemoUsers: () => fetchJson<{ users: User[]; currentUserId: string }>('/auth/demo-users'),
  googleLogin: async (credential: string) => {
    const res = await fetch(`${BASE_URL}/auth/google`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ credential }),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || 'Google login failed');
    }

    const data = await res.json() as { success: boolean; user: User };
    if (data?.user?.id) {
      setApiClientUserId(data.user.id);
    }
    return data;
  },
  logout: async () => {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || 'Logout failed');
    }

    localStorage.removeItem('rentreel_active_user_id');
    return res.json() as Promise<{ success: boolean; message: string }>;
  },
  switchUser: async (userId: string) => {
    setApiClientUserId(userId);
    const res = await fetchJson<{ success: boolean; user: User }>('/auth/switch-user', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    if (res?.user?.id) {
      setApiClientUserId(res.user.id);
    }
    return res;
  },
  switchRole: (role: UserRole) =>
    fetchJson<{ success: boolean; user: User }>('/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),
  register: async (data: { name: string; username: string; email: string; role?: UserRole; city?: string; locationArea?: string; phone?: string }) => {
    const res = await fetchJson<{ success: boolean; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res?.user?.id) {
      setApiClientUserId(res.user.id);
    }
    return res;
  },
  login: async (usernameOrEmail: string) => {
    const res = await fetchJson<{ success: boolean; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail }),
    });
    if (res?.user?.id) {
      setApiClientUserId(res.user.id);
    }
    return res;
  },

  // Feed
  getFeed: () =>
    fetchJson<{
      listings: RentalListing[];
      reels: Reel[];
      requirements: RentalRequirement[];
      posts: Post[];
    }>('/feed'),

  // Properties
  getProperties: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson<{ properties: Property[] }>(`/properties${query ? `?${query}` : ''}`);
  },
  getPropertyById: (id: string) =>
    fetchJson<{
      property: Property;
      owner: User;
      rooms: any[];
      listings: RentalListing[];
      reels: Reel[];
      reviews: Review[];
      isSaved: boolean;
      isFollowing: boolean;
    }>(`/properties/${id}`),
  createProperty: (data: Partial<Property>) =>
    fetchJson<{ success: boolean; property: Property }>('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProperty: (id: string, data: Partial<Property>) =>
    fetchJson<{ success: boolean; property: Property }>(`/properties/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteProperty: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/properties/${id}`, {
      method: 'DELETE',
    }),
  getPropertyRooms: (id: string) =>
    fetchJson<{ rooms: any[] }>(`/properties/${id}/rooms`),
  addPropertyRoom: (id: string, roomData: any) =>
    fetchJson<{ success: boolean; room: any }>(`/properties/${id}/rooms`, {
      method: 'POST',
      body: JSON.stringify(roomData),
    }),

  // Listings (with 10-day lifecycle)
  getListings: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson<{ listings: RentalListing[] }>(`/listings${query ? `?${query}` : ''}`);
  },
  getListingById: (id: string) =>
    fetchJson<{
      listing: RentalListing;
      owner: User;
      property: Property;
      isSaved: boolean;
    }>(`/listings/${id}`),
  createListing: (data: Partial<RentalListing>) =>
    fetchJson<{ success: boolean; listing: RentalListing }>('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateListing: (id: string, data: Partial<RentalListing>) =>
    fetchJson<{ success: boolean; listing: RentalListing }>(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteListing: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/listings/${id}`, {
      method: 'DELETE',
    }),
  renewListing: (id: string) =>
    fetchJson<{ success: boolean; listing: RentalListing; message: string }>(`/listings/${id}/renew`, {
      method: 'POST',
    }),
  markListingRented: (id: string) =>
    fetchJson<{ success: boolean; listing: RentalListing; message: string }>(`/listings/${id}/mark-rented`, {
      method: 'POST',
    }),
  pauseListing: (id: string) =>
    fetchJson<{ success: boolean; listing: RentalListing }>(`/listings/${id}/pause`, {
      method: 'POST',
    }),

  // Requirements (Tenant discovery)
  getRequirements: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson<{ requirements: RentalRequirement[] }>(`/requirements${query ? `?${query}` : ''}`);
  },
  createRequirement: (data: Partial<RentalRequirement>) =>
    fetchJson<{ success: boolean; requirement: RentalRequirement }>('/requirements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteRequirement: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/requirements/${id}`, {
      method: 'DELETE',
    }),
  getRequirementMatches: (id: string) =>
    fetchJson<{
      requirement: RentalRequirement;
      matches: Array<{
        property: Property;
        listing?: RentalListing;
        score: number;
        matchedCriteria: string[];
        unmatchedCriteria: string[];
        owner: User;
      }>;
    }>(`/requirements/${id}/matches`),

  // Reels
  getReels: (category?: string) => {
    const query = category ? `?category=${category}` : '';
    return fetchJson<{ reels: Reel[] }>(`/reels${query}`);
  },
  createReel: (data: Partial<Reel>) =>
    fetchJson<{ success: boolean; reel: Reel }>('/reels', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteReel: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/reels/${id}`, {
      method: 'DELETE',
    }),
  likeReel: (id: string) =>
    fetchJson<{ success: boolean; isLiked: boolean; likesCount: number }>(`/reels/${id}/like`, {
      method: 'POST',
    }),
  getReelComments: (id: string) => fetchJson<{ comments: Comment[] }>(`/reels/${id}/comments`),
  addReelComment: (id: string, text: string) =>
    fetchJson<{ success: boolean; comment: Comment }>(`/reels/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  // Reviews
  getPropertyReviews: (propertyId: string) =>
    fetchJson<{ reviews: Review[] }>(`/properties/${propertyId}/reviews`),
  addPropertyReview: (propertyId: string, data: { rating: number; comment: string }) =>
    fetchJson<{ success: boolean; review: Review }>(`/properties/${propertyId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // In-Person Visit Requests
  getVisitRequests: () => fetchJson<{ visits: VisitRequest[] }>('/visits'),
  createVisitRequest: (data: {
    propertyId: string;
    listingId?: string;
    ownerId: string;
    preferredDate: string;
    preferredTime: string;
    message?: string;
  }) =>
    fetchJson<{ success: boolean; visit: VisitRequest }>('/visits', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateVisitRequestStatus: (id: string, status: 'ACCEPTED' | 'REJECTED' | 'COMPLETED') =>
    fetchJson<{ success: boolean; visit: VisitRequest }>(`/visits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Social & Profiles
  getUserProfile: (username: string) =>
    fetchJson<{
      user: User;
      isFollowing: boolean;
      properties: Property[];
      listings: RentalListing[];
      reels: Reel[];
      requirements: RentalRequirement[];
      posts: Post[];
      reviews: Review[];
    }>(`/users/${username}`),
  toggleFollow: (userId: string) =>
    fetchJson<{ success: boolean; isFollowing: boolean; followersCount: number }>(`/users/${userId}/follow`, {
      method: 'POST',
    }),
  toggleSave: (targetType: 'listing' | 'property' | 'reel' | 'post', targetId: string) =>
    fetchJson<{ success: boolean; isSaved: boolean }>('/social/save', {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId }),
    }),
  getSavedItems: () =>
    fetchJson<{
      listings: RentalListing[];
      properties: Property[];
      reels: Reel[];
    }>('/social/saved'),

  // Messages
  getConversations: () => fetchJson<{ conversations: Conversation[] }>('/conversations'),
  startConversation: (targetUserId: string, context?: any) =>
    fetchJson<{ conversation: Conversation; otherUser: User }>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, context }),
    }),
  getMessages: (conversationId: string) =>
    fetchJson<{
      conversation: Conversation;
      otherUser: User;
      messages: Message[];
    }>(`/conversations/${conversationId}/messages`),
  sendMessage: (data: {
    conversationId: string;
    receiverId: string;
    text: string;
    context?: any;
    imageUrl?: string;
  }) =>
    fetchJson<{ success: boolean; message: Message }>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Notifications
  getNotifications: () => fetchJson<{ notifications: Notification[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: string) =>
    fetchJson<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    fetchJson<{ success: boolean }>('/notifications/mark-all-read', { method: 'POST' }),

  // Search
  searchGlobal: (query: string, tab = 'all') =>
    fetchJson<{
      properties: Property[];
      listings: RentalListing[];
      users: User[];
      reels: Reel[];
      requirements: RentalRequirement[];
    }>(`/search?q=${encodeURIComponent(query)}&tab=${tab}`),

  // Anti-fraud & Reports
  createReport: (data: { targetType: 'PROPERTY' | 'USER' | 'LISTING' | 'REEL'; targetId: string; reason: string; details?: string }) =>
    fetchJson<{ success: boolean; report: Report }>('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAdminReports: () => fetchJson<{ reports: Report[] }>('/admin/reports'),
  updateReportStatus: (id: string, status: 'RESOLVED' | 'DISMISSED') =>
    fetchJson<{ success: boolean; report: Report }>(`/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  verifyUser: (id: string, isVerified = true) =>
    fetchJson<{ success: boolean; user: User }>(`/admin/verify-user/${id}`, {
      method: 'POST',
      body: JSON.stringify({ isVerified }),
    }),

  // AI & Gemini Integrations
  analyzeMatchWithAI: (propertyId: string, requirementId: string) =>
    fetchJson<{
      success: boolean;
      analysis: {
        aiScore: number;
        summary: string;
        pros: string[];
        cons: string[];
        negotiationTip: string;
      };
    }>('/ai/match-analysis', {
      method: 'POST',
      body: JSON.stringify({ propertyId, requirementId }),
    }),
  generateListingWithAI: (params: {
    title: string;
    area: string;
    propertyType: string;
    roomType: string;
    rent: number;
    notes?: string;
  }) =>
    fetchJson<{
      success: boolean;
      enhancedTitle: string;
      description: string;
      suggestedAmenities: string[];
      instagramHashtags: string[];
    }>('/ai/generate-listing', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // Admin
  getAdminMetrics: () => fetchJson<any>('/admin/metrics'),
};
