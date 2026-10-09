import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  User,
  Property,
  Room,
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
  MatchScoreResult,
  MessageContext,
} from './types.ts';
import {
  seedUsers,
  seedProperties,
  seedRooms,
  seedListings,
  seedRequirements,
  seedReels,
  seedPosts,
  seedComments,
  seedReviews,
  seedConversations,
  seedMessages,
  seedNotifications,
} from './data/seed.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE_PATH = path.resolve(__dirname, '../../rentreel-db.json');

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface SerializedDatabase {
  users: User[];
  properties: Property[];
  rooms: Room[];
  listings: RentalListing[];
  requirements: RentalRequirement[];
  reels: Reel[];
  posts: Post[];
  comments: Comment[];
  reviews: Review[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
  visitRequests: VisitRequest[];
  reports: Report[];
  likes: string[];
  saves: string[];
  follows: string[];
}

class RentReelStore {
  public users: Map<string, User> = new Map();
  public properties: Map<string, Property> = new Map();
  public rooms: Map<string, Room> = new Map();
  public listings: Map<string, RentalListing> = new Map();
  public requirements: Map<string, RentalRequirement> = new Map();
  public reels: Map<string, Reel> = new Map();
  public posts: Map<string, Post> = new Map();
  public comments: Map<string, Comment> = new Map();
  public reviews: Map<string, Review> = new Map();
  public conversations: Map<string, Conversation> = new Map();
  public messages: Map<string, Message> = new Map();
  public notifications: Map<string, Notification> = new Map();
  public visitRequests: Map<string, VisitRequest> = new Map();
  public reports: Map<string, Report> = new Map();

  // Social relations
  public likes: Set<string> = new Set(); // format: `${userId}:${targetId}`
  public saves: Set<string> = new Set(); // format: `${userId}:${targetType}:${targetId}`
  public follows: Set<string> = new Set(); // format: `${followerId}:${targetUserId}`

  private isSaving = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initDatabase();
    this.startExpirationWorker();
  }

  private initDatabase() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const data: SerializedDatabase = JSON.parse(raw);
        this.loadSerialized(data);
        console.log(`[RentReel DB] Loaded persistent database from ${DB_FILE_PATH}`);
      } else {
        this.seedInitialData();
        this.saveToDiskSync();
        console.log(`[RentReel DB] Initialized and saved seed database to ${DB_FILE_PATH}`);
      }
    } catch (err) {
      console.error('[RentReel DB] Error loading database file, falling back to seed data:', err);
      this.seedInitialData();
    }
  }

  private seedInitialData() {
    this.users.clear();
    this.properties.clear();
    this.rooms.clear();
    this.listings.clear();
    this.requirements.clear();
    this.reels.clear();
    this.posts.clear();
    this.comments.clear();
    this.reviews.clear();
    this.conversations.clear();
    this.messages.clear();
    this.notifications.clear();
    this.visitRequests.clear();
    this.reports.clear();
    this.likes.clear();
    this.saves.clear();
    this.follows.clear();

    seedUsers.forEach((u) => this.users.set(u.id, { ...u }));
    seedProperties.forEach((p) => this.properties.set(p.id, { ...p }));
    seedRooms.forEach((r) => this.rooms.set(r.id, { ...r }));
    seedListings.forEach((l) => this.listings.set(l.id, { ...l }));
    seedRequirements.forEach((req) => this.requirements.set(req.id, { ...req }));
    seedReels.forEach((r) => this.reels.set(r.id, { ...r }));
    seedPosts.forEach((p) => this.posts.set(p.id, { ...p }));
    seedComments.forEach((c) => this.comments.set(c.id, { ...c }));
    seedReviews.forEach((rv) => this.reviews.set(rv.id, { ...rv }));
    seedConversations.forEach((conv) => this.conversations.set(conv.id, { ...conv }));
    seedMessages.forEach((m) => this.messages.set(m.id, { ...m }));
    seedNotifications.forEach((n) => this.notifications.set(n.id, { ...n }));

    // Seed sample visit requests
    const initialVisit: VisitRequest = {
      id: 'visit-1',
      propertyId: 'prop-abc-vijaynagar',
      listingId: 'list-1',
      tenantId: 'user-tenant-aman',
      ownerId: 'user-owner-abc',
      preferredDate: 'Tomorrow',
      preferredTime: '5:00 PM - 6:30 PM',
      message: 'Interested in AC Single Room 101-A. Coming to inspect food and WiFi setup.',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    };
    this.visitRequests.set(initialVisit.id, initialVisit);

    // Seed sample follows
    this.follows.add('user-tenant-aman:user-owner-abc');
    this.follows.add('user-tenant-priya:user-broker-shivam');

    // Run first expiration check
    this.processListingExpirations();
  }

  private loadSerialized(data: SerializedDatabase) {
    data.users?.forEach((u) => this.users.set(u.id, u));
    data.properties?.forEach((p) => this.properties.set(p.id, p));
    data.rooms?.forEach((r) => this.rooms.set(r.id, r));
    data.listings?.forEach((l) => this.listings.set(l.id, l));
    data.requirements?.forEach((req) => this.requirements.set(req.id, req));
    data.reels?.forEach((r) => this.reels.set(r.id, r));
    data.posts?.forEach((p) => this.posts.set(p.id, p));
    data.comments?.forEach((c) => this.comments.set(c.id, c));
    data.reviews?.forEach((rv) => this.reviews.set(rv.id, rv));
    data.conversations?.forEach((conv) => this.conversations.set(conv.id, conv));
    data.messages?.forEach((m) => this.messages.set(m.id, m));
    data.notifications?.forEach((n) => this.notifications.set(n.id, n));
    data.visitRequests?.forEach((v) => this.visitRequests.set(v.id, v));
    data.reports?.forEach((rp) => this.reports.set(rp.id, rp));
    data.likes?.forEach((k) => this.likes.add(k));
    data.saves?.forEach((k) => this.saves.add(k));
    data.follows?.forEach((k) => this.follows.add(k));

    this.processListingExpirations();
  }

  public scheduleDiskSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveToDisk();
    }, 400); // 400ms debounce
  }

  public saveToDiskSync() {
    try {
      const data: SerializedDatabase = {
        users: Array.from(this.users.values()),
        properties: Array.from(this.properties.values()),
        rooms: Array.from(this.rooms.values()),
        listings: Array.from(this.listings.values()),
        requirements: Array.from(this.requirements.values()),
        reels: Array.from(this.reels.values()),
        posts: Array.from(this.posts.values()),
        comments: Array.from(this.comments.values()),
        reviews: Array.from(this.reviews.values()),
        conversations: Array.from(this.conversations.values()),
        messages: Array.from(this.messages.values()),
        notifications: Array.from(this.notifications.values()),
        visitRequests: Array.from(this.visitRequests.values()),
        reports: Array.from(this.reports.values()),
        likes: Array.from(this.likes),
        saves: Array.from(this.saves),
        follows: Array.from(this.follows),
      };
      const tempPath = `${DB_FILE_PATH}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE_PATH);
    } catch (err) {
      console.error('[RentReel DB] Failed sync save to disk:', err);
    }
  }

  public saveToDisk() {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      this.saveToDiskSync();
    } finally {
      this.isSaving = false;
    }
  }

  // 10-day Automatic Server-Side Expiration background worker
  private startExpirationWorker() {
    setInterval(() => {
      this.processListingExpirations();
    }, 30000); // Check every 30 seconds
  }

  public processListingExpirations(): void {
    const now = Date.now();
    let hasChanges = false;

    for (const listing of this.listings.values()) {
      if (listing.status === 'ACTIVE') {
        const expiryTime = new Date(listing.expiresAt).getTime();

        // Check if listing has expired
        if (expiryTime <= now) {
          listing.status = 'EXPIRED';
          hasChanges = true;

          // Check if notification already dispatched
          const alreadyNotified = Array.from(this.notifications.values()).some(
            (n) => n.userId === listing.ownerId && n.type === 'LISTING_EXPIRED' && n.metadata?.listingId === listing.id
          );

          if (!alreadyNotified) {
            this.addNotification({
              userId: listing.ownerId,
              type: 'LISTING_EXPIRED',
              title: 'Room Listing Expired ⚠️',
              message: `Your listing "${listing.title}" expired after 10 days. Renew now to reactivate discovery.`,
              linkUrl: `/listings/${listing.id}`,
              metadata: { listingId: listing.id },
            });
          }
        }
        // Check if expiring in less than 24 hours
        else if (expiryTime - now <= ONE_DAY_MS) {
          const alreadyNotifiedExpiring = Array.from(this.notifications.values()).some(
            (n) => n.userId === listing.ownerId && n.type === 'EXPIRING_SOON' && n.metadata?.listingId === listing.id
          );

          if (!alreadyNotifiedExpiring) {
            this.addNotification({
              userId: listing.ownerId,
              type: 'EXPIRING_SOON',
              title: 'Your Room Listing Expires Tomorrow! ⏳',
              message: `Is "${listing.title}" still available? Renew it for 10 days or mark as rented.`,
              linkUrl: `/listings/${listing.id}`,
              metadata: { listingId: listing.id },
            });
            hasChanges = true;
          }
        }
      }
    }

    if (hasChanges) {
      this.scheduleDiskSave();
    }
  }

  // Listing Operations
  public renewListing(listingId: string): RentalListing | null {
    const listing = this.listings.get(listingId);
    if (!listing) return null;

    listing.status = 'ACTIVE';
    listing.renewedAt = new Date().toISOString();
    listing.expiresAt = new Date(Date.now() + TEN_DAYS_MS).toISOString();

    this.addNotification({
      userId: listing.ownerId,
      type: 'LISTING_RENEWED',
      title: 'Listing Renewed for 10 Days 🎉',
      message: `"${listing.title}" is now active in feeds and discovery for the next 10 days!`,
      linkUrl: `/listings/${listing.id}`,
      metadata: { listingId: listing.id },
    });

    this.scheduleDiskSave();
    return listing;
  }

  public markListingRented(listingId: string): RentalListing | null {
    const listing = this.listings.get(listingId);
    if (!listing) return null;

    listing.status = 'RENTED';
    listing.rentedAt = new Date().toISOString();

    // If property available rooms > 0, decrement
    const prop = this.properties.get(listing.propertyId);
    if (prop && prop.availableRooms > 0) {
      prop.availableRooms -= 1;
    }

    this.scheduleDiskSave();
    return listing;
  }

  public pauseListing(listingId: string): RentalListing | null {
    const listing = this.listings.get(listingId);
    if (!listing) return null;
    listing.status = 'PAUSED';
    this.scheduleDiskSave();
    return listing;
  }

  // Match Scoring Algorithm
  public calculateMatchScore(
    property: Property,
    requirement: RentalRequirement,
    listing?: RentalListing
  ): MatchScoreResult {
    let score = 0;
    const matchedCriteria: string[] = [];
    const unmatchedCriteria: string[] = [];

    // 1. Location match (30 points)
    const areaMatches =
      requirement.preferredAreas.length === 0 ||
      requirement.preferredAreas.some(
        (a) => a.toLowerCase().includes(property.area.toLowerCase()) || property.area.toLowerCase().includes(a.toLowerCase())
      );
    if (areaMatches) {
      score += 30;
      matchedCriteria.push(`Location (${property.area})`);
    } else {
      unmatchedCriteria.push(`Location is outside ${requirement.preferredAreas.join(', ')}`);
    }

    // 2. Budget match (25 points)
    const rentToCheck = listing ? listing.rent : property.minRent;
    if (rentToCheck <= requirement.budgetMax) {
      score += 25;
      matchedCriteria.push(`Budget within ₹${requirement.budgetMax.toLocaleString('en-IN')}`);
    } else if (rentToCheck <= requirement.budgetMax * 1.15) {
      score += 15;
      matchedCriteria.push(`Slightly above budget (₹${rentToCheck.toLocaleString('en-IN')})`);
    } else {
      unmatchedCriteria.push(`Rent ₹${rentToCheck.toLocaleString('en-IN')} exceeds budget`);
    }

    // 3. Property Type match (20 points)
    if (
      requirement.propertyTypes.length === 0 ||
      requirement.propertyTypes.includes(property.propertyType)
    ) {
      score += 20;
      matchedCriteria.push(`Property Type (${property.propertyType})`);
    } else {
      unmatchedCriteria.push(`Type is ${property.propertyType}`);
    }

    // 4. Gender match (15 points)
    if (
      property.genderPreference === 'ANY' ||
      requirement.genderPreference === 'ANY' ||
      property.genderPreference === requirement.genderPreference
    ) {
      score += 15;
      matchedCriteria.push(`Gender preference (${property.genderPreference})`);
    } else {
      unmatchedCriteria.push(`Gender restriction (${property.genderPreference})`);
    }

    // 5. Amenities / Preferences match (10 points)
    const matchedPrefs = (requirement.preferences || []).filter((pref) =>
      property.amenities.some((amenity) => amenity.toLowerCase() === pref.toLowerCase())
    );
    if (matchedPrefs.length > 0) {
      score += Math.min(10, matchedPrefs.length * 3);
      matchedCriteria.push(`Amenities (${matchedPrefs.join(', ')})`);
    }

    score = Math.min(100, Math.round(score));

    return {
      property,
      listing,
      requirement,
      score,
      matchedCriteria,
      unmatchedCriteria,
    };
  }

  // Notifications
  public addNotification(
    data: Omit<Notification, 'id' | 'isRead' | 'createdAt'>
  ): Notification {
    const notif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...data,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(notif.id, notif);
    this.scheduleDiskSave();
    return notif;
  }

  // Reviews
  public addReview(data: Omit<Review, 'id' | 'createdAt'>): Review {
    const rev: Review = {
      id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    this.reviews.set(rev.id, rev);

    // Update property rating
    const prop = this.properties.get(data.propertyId);
    if (prop) {
      const allPropReviews = Array.from(this.reviews.values()).filter((r) => r.propertyId === prop.id);
      const sum = allPropReviews.reduce((acc, r) => acc + r.rating, 0);
      prop.rating = Number((sum / allPropReviews.length).toFixed(1));
      prop.reviewCount = allPropReviews.length;
    }

    this.scheduleDiskSave();
    return rev;
  }

  // Visit Requests
  public createVisitRequest(data: Omit<VisitRequest, 'id' | 'status' | 'createdAt'>): VisitRequest {
    const visit: VisitRequest = {
      id: `visit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...data,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.visitRequests.set(visit.id, visit);

    // Notify owner
    const tenant = this.users.get(data.tenantId);
    this.addNotification({
      userId: data.ownerId,
      type: 'VISIT_REQUEST',
      title: 'New In-Person Visit Request 🗓️',
      message: `${tenant?.name || 'A prospective tenant'} requested a physical visit for ${data.preferredDate} (${data.preferredTime}).`,
      linkUrl: `/owner-dashboard`,
      metadata: { visitId: visit.id, propertyId: data.propertyId },
    });

    this.scheduleDiskSave();
    return visit;
  }

  public updateVisitRequestStatus(
    visitId: string,
    status: 'ACCEPTED' | 'REJECTED' | 'COMPLETED'
  ): VisitRequest | null {
    const visit = this.visitRequests.get(visitId);
    if (!visit) return null;

    visit.status = status;

    // Notify tenant
    const prop = this.properties.get(visit.propertyId);
    this.addNotification({
      userId: visit.tenantId,
      type: 'VISIT_REQUEST',
      title: `Visit Request ${status === 'ACCEPTED' ? 'Approved! ✅' : status === 'REJECTED' ? 'Declined' : 'Updated'}`,
      message: `Your walkthrough for ${prop?.title || 'property'} on ${visit.preferredDate} was ${status.toLowerCase()} by the host.`,
      linkUrl: `/properties/${visit.propertyId}`,
      metadata: { visitId: visit.id, propertyId: visit.propertyId },
    });

    this.scheduleDiskSave();
    return visit;
  }

  // Reports
  public createReport(data: Omit<Report, 'id' | 'status' | 'createdAt'>): Report {
    const report: Report = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...data,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.reports.set(report.id, report);
    this.scheduleDiskSave();
    return report;
  }

  public updateReportStatus(reportId: string, status: 'RESOLVED' | 'DISMISSED'): Report | null {
    const report = this.reports.get(reportId);
    if (!report) return null;
    report.status = status;
    this.scheduleDiskSave();
    return report;
  }

  // User Verification
  public verifyUser(userId: string, isVerified = true): User | null {
    const user = this.users.get(userId);
    if (!user) return null;
    user.isVerified = isVerified;
    this.scheduleDiskSave();
    return user;
  }

  // Messaging & Conversations
  public findOrCreateConversation(
    user1Id: string,
    user2Id: string,
    context?: MessageContext
  ): Conversation {
    const existing = Array.from(this.conversations.values()).find(
      (c) =>
        c.participants.includes(user1Id) &&
        c.participants.includes(user2Id) &&
        c.participants.length === 2
    );

    if (existing) {
      if (context) {
        existing.activeContext = context;
      }
      this.scheduleDiskSave();
      return existing;
    }

    const newConv: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      participants: [user1Id, user2Id],
      lastMessageAt: new Date().toISOString(),
      unreadCount: { [user1Id]: 0, [user2Id]: 0 },
      activeContext: context,
    };
    this.conversations.set(newConv.id, newConv);
    this.scheduleDiskSave();
    return newConv;
  }

  public sendMessage(params: {
    conversationId: string;
    senderId: string;
    receiverId: string;
    text: string;
    context?: MessageContext;
    imageUrl?: string;
  }): Message {
    const msg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      conversationId: params.conversationId,
      senderId: params.senderId,
      receiverId: params.receiverId,
      text: params.text,
      context: params.context,
      imageUrl: params.imageUrl,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    this.messages.set(msg.id, msg);

    // Update conversation
    const conv = this.conversations.get(params.conversationId);
    if (conv) {
      conv.lastMessage = params.text;
      conv.lastMessageAt = msg.createdAt;
      conv.unreadCount[params.receiverId] = (conv.unreadCount[params.receiverId] || 0) + 1;
      if (params.context) {
        conv.activeContext = params.context;
      }
    }

    // Trigger notification for recipient
    const sender = this.users.get(params.senderId);
    this.addNotification({
      userId: params.receiverId,
      type: 'NEW_MESSAGE',
      title: `Message from ${sender?.name || 'User'} 💬`,
      message: params.text.slice(0, 80),
      linkUrl: `/messages?conv=${params.conversationId}`,
      metadata: { conversationId: params.conversationId, senderId: params.senderId },
    });

    this.scheduleDiskSave();
    return msg;
  }
}

export const store = new RentReelStore();
