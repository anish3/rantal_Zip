import { Router, Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { store } from './store.ts';
import { UserRole, PropertyType, RoomType, GenderPreference, Room } from './types.ts';
import { analyzeMatchWithAI, generateListingWithAI } from './gemini.ts';
import {
  db,
  ensureUserProfileFromClerk,
  createPropertyRecord,
  listPublicProperties,
  getPropertyById,
  toggleSavedProperty,
  getSavedPropertiesForUser,
} from './db.ts';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export const apiRouter = Router();

// Current simulated session user (default Aman Sharma, switchable anytime)
let defaultUserId = 'user-tenant-aman';

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

function getActingUserId(req: Request): string {
  const sessionUserId = req.session?.userId as string | undefined;
  if (sessionUserId && store.users.has(sessionUserId)) {
    return sessionUserId;
  }

  const headerUserId = req.headers['x-user-id'] as string;
  if (headerUserId && store.users.has(headerUserId)) {
    return headerUserId;
  }
  return defaultUserId;
}

// Simple in-memory rate limiter per IP/User to prevent spamming
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'ip'}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || entry.resetAt <= now) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= limit) {
      return res.status(429).json({ error: 'Too many requests, please slow down.' });
    }

    entry.count += 1;
    next();
  };
}

// Middleware to run expiration check on request
apiRouter.use((req, res, next) => {
  store.processListingExpirations();
  next();
});

// ==========================================
// AUTHENTICATION & SESSIONS
// ==========================================

apiRouter.get('/auth/session', (req: Request, res: Response) => {
  const sessionUserId = req.session?.userId as string | undefined;
  if (!sessionUserId || !store.users.has(sessionUserId)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  return res.json({ user: store.users.get(sessionUserId) });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const sessionUserId = req.session?.userId as string | undefined;
  if (sessionUserId && store.users.has(sessionUserId)) {
    return res.json({ user: store.users.get(sessionUserId) });
  }

  const currentUserId = getActingUserId(req);
  const user = store.users.get(currentUserId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user });
});

apiRouter.post('/auth/google', async (req: Request, res: Response) => {
  const { credential } = req.body as { credential?: string };

  if (!credential || typeof credential !== 'string') {
    return res.status(400).json({ error: 'Google credential is required' });
  }

  if (!googleClient) {
    return res.status(503).json({
      error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID in your environment.',
    });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(401).json({ error: 'Google account email is not verified.' });
    }

    const email = payload.email.toLowerCase().trim();
    const baseUsername = (payload.given_name || payload.name || 'rentreel')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'rentreel_user';

    let existingUser = Array.from(store.users.values()).find(
      (u) => u.email.toLowerCase() === email || (u.authProvider === 'GOOGLE' && u.providerSubject === payload.sub)
    );

    if (!existingUser) {
      const username = (() => {
        let candidate = baseUsername;
        let index = 1;
        while (Array.from(store.users.values()).some((u) => u.username.toLowerCase() === candidate)) {
          candidate = `${baseUsername}_${index}`;
          index += 1;
        }
        return candidate;
      })();

      const createdUser: any = {
        id: `user-google-${Date.now()}`,
        username,
        name: payload.name || payload.given_name || 'Google User',
        email,
        avatar: payload.picture || `https://images.unsplash.com/photo-${1535713875000 + Math.floor(Math.random() * 1000)}?w=300&auto=format&fit=crop&q=80`,
        bio: 'Verified user from Google sign-in.',
        roles: ['TENANT'],
        activeRole: 'TENANT',
        isVerified: true,
        city: 'Indore',
        locationArea: 'Vijay Nagar',
        authProvider: 'GOOGLE',
        providerSubject: payload.sub,
        followersCount: 0,
        followingCount: 0,
        createdAt: new Date().toISOString(),
      };

      store.users.set(createdUser.id, createdUser);
      defaultUserId = createdUser.id;
      existingUser = createdUser;
      store.scheduleDiskSave();
    } else {
      existingUser.name = payload.name || existingUser.name;
      existingUser.email = email;
      existingUser.avatar = payload.picture || existingUser.avatar;
      existingUser.isVerified = true;
      existingUser.authProvider = 'GOOGLE';
      existingUser.providerSubject = payload.sub;
      existingUser.city = existingUser.city || 'Indore';
      existingUser.locationArea = existingUser.locationArea || 'Vijay Nagar';
      defaultUserId = existingUser.id;
      store.scheduleDiskSave();
    }

    if (!existingUser) {
      return res.status(500).json({ error: 'Failed to create or load the authenticated user.' });
    }

    if (db.isEnabled()) {
      await ensureUserProfileFromClerk({
        clerkUserId: existingUser.id,
        username: existingUser.username,
        email: existingUser.email,
        name: existingUser.name,
        avatar: existingUser.avatar,
        city: existingUser.city,
        locationArea: existingUser.locationArea,
        roles: existingUser.roles,
        activeRole: existingUser.activeRole,
        authProvider: existingUser.authProvider || 'GOOGLE',
        providerSubject: payload.sub,
        isVerified: true,
      });
    }

    req.session.userId = existingUser.id;
    return res.json({ success: true, user: existingUser });
  } catch (error: any) {
    console.error('[Google OAuth] Verification failed:', error);
    return res.status(401).json({
      error: error?.message || 'Google authentication failed. Please try again.',
    });
  }
});

apiRouter.get('/auth/demo-users', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const users = Array.from(store.users.values());
  return res.json({ users, currentUserId });
});

apiRouter.post('/auth/switch-user', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId || !store.users.has(userId)) {
    return res.status(404).json({ error: 'User not found' });
  }
  defaultUserId = userId;
  return res.json({ success: true, user: store.users.get(userId) });
});

apiRouter.post('/auth/switch-role', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const { role } = req.body as { role: UserRole };
  if (!role) return res.status(400).json({ error: 'Role is required' });

  const user = store.users.get(currentUserId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.roles.includes(role)) {
    user.roles.push(role);
  }
  user.activeRole = role;
  store.scheduleDiskSave();
  return res.json({ success: true, user });
});

apiRouter.post('/auth/register', rateLimit(10, 60000), async (req: Request, res: Response) => {
  const { name, username, email, role = 'TENANT', city = 'Indore', locationArea = 'Vijay Nagar', phone } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Valid name is required' });
  }
  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'Valid username is required' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  const cleanEmail = email.toLowerCase().trim();

  const existing = Array.from(store.users.values()).find(
    (u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail
  );
  if (existing) {
    return res.status(400).json({ error: 'Username or email already in use' });
  }

  const newUser = {
    id: `user-${Date.now()}`,
    username: cleanUsername,
    name: name.trim(),
    email: cleanEmail,
    phone: phone?.trim(),
    avatar: `https://images.unsplash.com/photo-${1535713875000 + Math.floor(Math.random() * 1000)}?w=300&auto=format&fit=crop&q=80`,
    bio: `Looking for opportunities and rental community in ${city}.`,
    roles: [role as UserRole],
    activeRole: role as UserRole,
    isVerified: false,
    city: city || 'Indore',
    locationArea: locationArea || 'Vijay Nagar',
    followersCount: 0,
    followingCount: 0,
    createdAt: new Date().toISOString(),
  };

  store.users.set(newUser.id, newUser);
  defaultUserId = newUser.id;
  store.scheduleDiskSave();

  if (db.isEnabled()) {
    await ensureUserProfileFromClerk({
      clerkUserId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
      avatar: newUser.avatar,
      city: newUser.city,
      locationArea: newUser.locationArea,
      roles: newUser.roles,
      activeRole: newUser.activeRole,
      authProvider: 'LOCAL',
      isVerified: newUser.isVerified,
    });
  }

  return res.status(201).json({ success: true, user: newUser });
});

apiRouter.post('/auth/login', rateLimit(15, 60000), (req: Request, res: Response) => {
  const { usernameOrEmail } = req.body;
  if (!usernameOrEmail || typeof usernameOrEmail !== 'string') {
    return res.status(400).json({ error: 'Username or email is required' });
  }

  const term = usernameOrEmail.toLowerCase().trim();
  const user = Array.from(store.users.values()).find(
    (u) => u.username.toLowerCase() === term || u.email.toLowerCase() === term
  );

  if (!user) {
    return res.status(404).json({ error: 'User account not found' });
  }

  defaultUserId = user.id;
  return res.json({ success: true, user });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to logout' });
      }
      return res.json({ success: true, message: 'Logged out successfully' });
    });
    return;
  }

  return res.json({ success: true, message: 'Logged out successfully' });
});

// ==========================================
// FEED (Social + Rental Discovery)
// ==========================================

apiRouter.get('/feed', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);

  // Active listings only for feed discovery (Rule 2 & Rule 3)
  const activeListings = Array.from(store.listings.values())
    .filter((l) => l.status === 'ACTIVE')
    .map((l) => {
      const owner = store.users.get(l.ownerId);
      const prop = store.properties.get(l.propertyId);
      const isSaved = store.saves.has(`${currentUserId}:listing:${l.id}`);
      return {
        ...l,
        owner,
        property: prop,
        isSaved,
      };
    });

  // Recent reels
  const reels = Array.from(store.reels.values()).map((r) => {
    const owner = store.users.get(r.ownerId);
    const isLiked = store.likes.has(`${currentUserId}:reel:${r.id}`);
    const isSaved = store.saves.has(`${currentUserId}:reel:${r.id}`);
    return {
      ...r,
      owner,
      isLiked,
      isSaved,
    };
  });

  // Active tenant requirements
  const requirements = Array.from(store.requirements.values())
    .filter((r) => r.status === 'ACTIVE')
    .map((r) => {
      const tenant = store.users.get(r.tenantId);
      return {
        ...r,
        tenant,
      };
    });

  // Regular posts
  const posts = Array.from(store.posts.values()).map((p) => {
    const owner = store.users.get(p.ownerId);
    const isLiked = store.likes.has(`${currentUserId}:post:${p.id}`);
    const isSaved = store.saves.has(`${currentUserId}:post:${p.id}`);
    return {
      ...p,
      owner,
      isLiked,
      isSaved,
    };
  });

  return res.json({
    listings: activeListings,
    reels,
    requirements,
    posts,
  });
});

// ==========================================
// PROPERTIES (CRUD)
// ==========================================

apiRouter.get('/properties', async (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const { city, area, propertyType, minRent, maxRent, genderPreference, noBrokerage } = req.query;

  if (db.isEnabled()) {
    const properties = await listPublicProperties({
      city: typeof city === 'string' ? city : null,
      area: typeof area === 'string' ? area : null,
      propertyType: typeof propertyType === 'string' ? propertyType : null,
      minRent: minRent ? Number(minRent) : null,
      maxRent: maxRent ? Number(maxRent) : null,
      genderPreference: typeof genderPreference === 'string' ? genderPreference : null,
      noBrokerage: noBrokerage === 'true' ? true : noBrokerage === 'false' ? false : null,
      currentUserClerkId: currentUserId,
    });
    return res.json({ properties });
  }

  let list = Array.from(store.properties.values());

  if (city) {
    list = list.filter((p) => p.city.toLowerCase() === String(city).toLowerCase());
  }
  if (area) {
    list = list.filter((p) => p.area.toLowerCase().includes(String(area).toLowerCase()));
  }
  if (propertyType && propertyType !== 'ALL') {
    list = list.filter((p) => p.propertyType === propertyType);
  }
  if (minRent) {
    list = list.filter((p) => p.maxRent >= Number(minRent));
  }
  if (maxRent) {
    list = list.filter((p) => p.minRent <= Number(maxRent));
  }
  if (genderPreference && genderPreference !== 'ANY') {
    list = list.filter((p) => p.genderPreference === genderPreference || p.genderPreference === 'ANY');
  }
  if (noBrokerage === 'true') {
    list = list.filter((p) => p.noBrokerage);
  }

  const enriched = list.map((p) => {
    const owner = store.users.get(p.ownerId);
    const isSaved = store.saves.has(`${currentUserId}:property:${p.id}`);
    return { ...p, owner, isSaved };
  });

  return res.json({ properties: enriched });
});

apiRouter.get('/properties/:id', async (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);

  if (db.isEnabled()) {
    const dbProperty = await getPropertyById(req.params.id, currentUserId);
    if (!dbProperty) {
      return res.status(404).json({ error: 'Property not found' });
    }
    return res.json(dbProperty);
  }

  const prop = store.properties.get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const owner = store.users.get(prop.ownerId);
  const rooms = Array.from(store.rooms.values()).filter((r) => r.propertyId === prop.id);
  const activeListings = Array.from(store.listings.values()).filter(
    (l) => l.propertyId === prop.id && l.status === 'ACTIVE'
  );
  const reels = Array.from(store.reels.values()).filter((r) => r.propertyId === prop.id);
  const reviews = Array.from(store.reviews.values()).filter((rv) => rv.propertyId === prop.id);
  const isSaved = store.saves.has(`${currentUserId}:property:${prop.id}`);
  const isFollowing = store.follows.has(`${currentUserId}:${prop.ownerId}`);

  return res.json({
    property: prop,
    owner,
    rooms,
    listings: activeListings,
    reels,
    reviews,
    isSaved,
    isFollowing,
  });
});

apiRouter.post('/properties', async (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const {
    title,
    description,
    propertyType,
    city = 'Indore',
    area,
    fullAddress,
    amenities = [],
    rules = [],
    foodOption,
    genderPreference = 'ANY',
    noBrokerage = true,
    coverPhoto,
    photos = [],
    minRent,
    maxRent,
  } = req.body;

  if (db.isEnabled()) {
    const createdProperty = await createPropertyRecord({
      ownerClerkUserId: currentUserId,
      title,
      description,
      propertyType,
      city,
      area,
      fullAddress,
      latitude: Number(req.body.latitude) || undefined,
      longitude: Number(req.body.longitude) || undefined,
      amenities,
      rules,
      foodOption,
      genderPreference,
      noBrokerage,
      coverPhoto,
      photos,
      totalRooms: Number(req.body.totalRooms) || 1,
      availableRooms: Number(req.body.availableRooms) || 1,
      minRent: Number(minRent) || undefined,
      maxRent: Number(maxRent) || undefined,
    });

    const user = store.users.get(currentUserId);
    if (user && !user.roles.includes('OWNER') && !user.roles.includes('PG_HOSTEL')) {
      user.roles.push('OWNER');
    }
    return res.status(201).json({ success: true, property: createdProperty });
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!area || typeof area !== 'string' || !area.trim()) {
    return res.status(400).json({ error: 'Area is required' });
  }

  const parsedMinRent = Number(minRent) || 8000;
  const parsedMaxRent = Number(maxRent) || (parsedMinRent + 4000);

  if (parsedMinRent < 0 || parsedMaxRent < 0) {
    return res.status(400).json({ error: 'Rent cannot be negative' });
  }

  const newProp = {
    id: `prop-${Date.now()}`,
    ownerId: currentUserId,
    title: title.trim(),
    description: description || '',
    propertyType: (propertyType || 'PG') as PropertyType,
    city: city || 'Indore',
    area: area.trim(),
    fullAddress: fullAddress || `${area}, ${city}`,
    latitude: 22.75 + (Math.random() - 0.5) * 0.08,
    longitude: 75.89 + (Math.random() - 0.5) * 0.08,
    amenities: Array.isArray(amenities) ? amenities : ['WiFi', 'Food', 'AC'],
    rules: Array.isArray(rules) ? rules : [],
    foodOption,
    genderPreference: (genderPreference || 'ANY') as GenderPreference,
    noBrokerage: Boolean(noBrokerage),
    coverPhoto: coverPhoto || (photos[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&auto=format&fit=crop&q=80'),
    photos: photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&auto=format&fit=crop&q=80'],
    totalRooms: 1,
    availableRooms: 1,
    minRent: parsedMinRent,
    maxRent: parsedMaxRent,
    rating: 5.0,
    reviewCount: 0,
    isVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.properties.set(newProp.id, newProp);

  // Switch user role to include OWNER if needed
  const user = store.users.get(currentUserId);
  if (user && !user.roles.includes('OWNER') && !user.roles.includes('PG_HOSTEL')) {
    user.roles.push('OWNER');
  }

  store.scheduleDiskSave();
  return res.status(201).json({ success: true, property: newProp });
});

apiRouter.patch('/properties/:id', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const prop = store.properties.get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  // Authorization check
  const user = store.users.get(currentUserId);
  if (prop.ownerId !== currentUserId && user?.activeRole !== 'ADMIN') {
    return res.status(403).json({ error: 'You are not authorized to edit this property' });
  }

  const { title, description, area, minRent, maxRent, amenities, rules, foodOption, genderPreference } = req.body;
  if (title) prop.title = title;
  if (description !== undefined) prop.description = description;
  if (area) prop.area = area;
  if (minRent) prop.minRent = Number(minRent);
  if (maxRent) prop.maxRent = Number(maxRent);
  if (amenities) prop.amenities = amenities;
  if (rules) prop.rules = rules;
  if (foodOption) prop.foodOption = foodOption;
  if (genderPreference) prop.genderPreference = genderPreference;
  prop.updatedAt = new Date().toISOString();

  store.scheduleDiskSave();
  return res.json({ success: true, property: prop });
});

apiRouter.delete('/properties/:id', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const prop = store.properties.get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const user = store.users.get(currentUserId);
  if (prop.ownerId !== currentUserId && user?.activeRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized to delete this property' });
  }

  store.properties.delete(prop.id);
  // Also delete associated active listings
  for (const [id, listing] of store.listings.entries()) {
    if (listing.propertyId === prop.id) {
      store.listings.delete(id);
    }
  }

  store.scheduleDiskSave();
  return res.json({ success: true, message: 'Property deleted successfully' });
});

// Rooms sub-resources
apiRouter.get('/properties/:id/rooms', (req: Request, res: Response) => {
  const rooms = Array.from(store.rooms.values()).filter((r) => r.propertyId === req.params.id);
  return res.json({ rooms });
});

apiRouter.post('/properties/:id/rooms', (req: Request, res: Response) => {
  const prop = store.properties.get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const { roomNumber, roomType, rent, deposit, furnishing, hasAC, hasAttachedBath } = req.body;
  if (!roomNumber || !rent) {
    return res.status(400).json({ error: 'Room number and rent are required' });
  }

  const newRoom: Room = {
    id: `room-${Date.now()}`,
    propertyId: prop.id,
    roomNumber: String(roomNumber),
    roomType: roomType || 'SINGLE',
    rent: Number(rent),
    deposit: Number(deposit || rent),
    furnishing: furnishing || 'FULLY',
    hasAC: Boolean(hasAC),
    hasAttachedBath: Boolean(hasAttachedBath),
    hasBalcony: false,
    photos: [prop.coverPhoto],
    availableFrom: 'Immediately',
    isAvailable: true,
  };

  store.rooms.set(newRoom.id, newRoom);
  prop.totalRooms += 1;
  prop.availableRooms += 1;
  store.scheduleDiskSave();

  return res.status(201).json({ success: true, room: newRoom });
});

// ==========================================
// RENTAL LISTINGS (With 10-Day Expiry Engine)
// ==========================================

apiRouter.get('/listings', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const { status, ownerId, propertyId, area, city, minRent, maxRent, roomType } = req.query;

  let list = Array.from(store.listings.values());

  if (status) {
    if (status !== 'ALL') {
      list = list.filter((l) => l.status === status);
    }
  } else {
    // Default: ACTIVE only for public discovery
    list = list.filter((l) => l.status === 'ACTIVE');
  }

  if (ownerId) {
    list = list.filter((l) => l.ownerId === ownerId);
  }
  if (propertyId) {
    list = list.filter((l) => l.propertyId === propertyId);
  }
  if (area) {
    list = list.filter((l) => l.area.toLowerCase().includes(String(area).toLowerCase()));
  }
  if (city) {
    list = list.filter((l) => l.city.toLowerCase() === String(city).toLowerCase());
  }
  if (minRent) {
    list = list.filter((l) => l.rent >= Number(minRent));
  }
  if (maxRent) {
    list = list.filter((l) => l.rent <= Number(maxRent));
  }
  if (roomType && roomType !== 'ALL') {
    list = list.filter((l) => l.roomType === roomType);
  }

  const enriched = list.map((l) => {
    const owner = store.users.get(l.ownerId);
    const prop = store.properties.get(l.propertyId);
    const isSaved = store.saves.has(`${currentUserId}:listing:${l.id}`);
    return { ...l, owner, property: prop, isSaved };
  });

  return res.json({ listings: enriched });
});

apiRouter.get('/listings/:id', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const listing = store.listings.get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  listing.viewsCount += 1;
  store.scheduleDiskSave();

  const owner = store.users.get(listing.ownerId);
  const property = store.properties.get(listing.propertyId);
  const isSaved = store.saves.has(`${currentUserId}:listing:${listing.id}`);

  return res.json({ listing, owner, property, isSaved });
});

apiRouter.post('/listings', rateLimit(20, 60000), (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const {
    propertyId,
    roomId,
    title,
    description,
    rent,
    deposit,
    propertyType = 'PG',
    roomType = 'SINGLE',
    city = 'Indore',
    area = 'Vijay Nagar',
    photos = [],
    amenities = [],
    genderPreference = 'ANY',
  } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Valid title is required' });
  }
  if (!rent || isNaN(Number(rent)) || Number(rent) <= 0) {
    return res.status(400).json({ error: 'Valid monthly rent amount is required' });
  }

  const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  let targetPropertyId = propertyId;
  if (!targetPropertyId || !store.properties.has(targetPropertyId)) {
    const userProps = Array.from(store.properties.values()).filter((p) => p.ownerId === currentUserId);
    if (userProps.length > 0 && !targetPropertyId) {
      targetPropertyId = userProps[0].id;
    } else {
      const parsedRent = Number(rent);
      const generatedProp = {
        id: `prop-${now}`,
        ownerId: currentUserId,
        title: title.trim(),
        description: description || `Verified rental home in ${area || 'Indore'}.`,
        propertyType: (propertyType || 'PG') as PropertyType,
        city: city || 'Indore',
        area: area || 'Vijay Nagar',
        fullAddress: `${area || 'Vijay Nagar'}, ${city || 'Indore'}`,
        latitude: 22.75 + (Math.random() - 0.5) * 0.08,
        longitude: 75.89 + (Math.random() - 0.5) * 0.08,
        amenities: Array.isArray(amenities) && amenities.length > 0 ? amenities : ['WiFi', 'Food', 'AC', 'Attached Bath'],
        rules: ['Standard residency guidelines'],
        genderPreference: (genderPreference || 'ANY') as GenderPreference,
        noBrokerage: true,
        coverPhoto: photos.length > 0 ? photos[0] : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&auto=format&fit=crop&q=80',
        photos: photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&auto=format&fit=crop&q=80'],
        totalRooms: 1,
        availableRooms: 1,
        minRent: parsedRent,
        maxRent: parsedRent + 2500,
        rating: 5.0,
        reviewCount: 0,
        isVerified: false,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      };
      store.properties.set(generatedProp.id, generatedProp);
      targetPropertyId = generatedProp.id;
    }
  }

  const newListing = {
    id: `list-${now}`,
    propertyId: targetPropertyId,
    roomId,
    ownerId: currentUserId,
    title: title.trim(),
    description: description || '',
    rent: Number(rent),
    deposit: Number(deposit || rent),
    propertyType: propertyType as PropertyType,
    roomType: roomType as RoomType,
    city: city || 'Indore',
    area: area || 'Vijay Nagar',
    photos: photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&auto=format&fit=crop&q=80'],
    amenities: Array.isArray(amenities) ? amenities : ['WiFi', 'Food', 'AC'],
    genderPreference: genderPreference as GenderPreference,
    status: 'ACTIVE' as const,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TEN_DAYS_MS).toISOString(), // Exactly 10 days!
    viewsCount: 0,
    inquiriesCount: 0,
    savesCount: 0,
    isFeatured: false,
  };

  store.listings.set(newListing.id, newListing);

  store.addNotification({
    userId: currentUserId,
    type: 'LISTING_RENEWED',
    title: 'New Room Listing Published 🚀',
    message: `"${title}" is live for 10 days. It will expire on ${new Date(now + TEN_DAYS_MS).toLocaleDateString()}.`,
    linkUrl: `/listings/${newListing.id}`,
    metadata: { listingId: newListing.id },
  });

  store.scheduleDiskSave();
  return res.status(201).json({ success: true, listing: newListing });
});

apiRouter.patch('/listings/:id', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const listing = store.listings.get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const user = store.users.get(currentUserId);
  if (listing.ownerId !== currentUserId && user?.activeRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized to modify this listing' });
  }

  const { title, description, rent, deposit, amenities } = req.body;
  if (title) listing.title = title;
  if (description !== undefined) listing.description = description;
  if (rent) listing.rent = Number(rent);
  if (deposit) listing.deposit = Number(deposit);
  if (amenities) listing.amenities = amenities;

  store.scheduleDiskSave();
  return res.json({ success: true, listing });
});

apiRouter.delete('/listings/:id', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const listing = store.listings.get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const user = store.users.get(currentUserId);
  if (listing.ownerId !== currentUserId && user?.activeRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized to delete this listing' });
  }

  store.listings.delete(listing.id);
  store.scheduleDiskSave();
  return res.json({ success: true, message: 'Listing deleted successfully' });
});

// Renew expired listing for another 10 days (Rule 5)
apiRouter.post('/listings/:id/renew', (req: Request, res: Response) => {
  const listing = store.renewListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  return res.json({ success: true, listing, message: 'Listing renewed for 10 days!' });
});

// Mark listing as RENTED (Rule 3)
apiRouter.post('/listings/:id/mark-rented', (req: Request, res: Response) => {
  const listing = store.markListingRented(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  return res.json({ success: true, listing, message: 'Room marked as rented and removed from discovery.' });
});

// Pause listing
apiRouter.post('/listings/:id/pause', (req: Request, res: Response) => {
  const listing = store.pauseListing(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  return res.json({ success: true, listing });
});

// ==========================================
// TENANT RENTAL REQUIREMENTS (Side 2 Discovery)
// ==========================================

apiRouter.get('/requirements', (req: Request, res: Response) => {
  const { city, area, occupation, budgetMax, status } = req.query;

  let list = Array.from(store.requirements.values());

  if (status && status !== 'ALL') {
    list = list.filter((r) => r.status === status);
  } else if (!status) {
    list = list.filter((r) => r.status === 'ACTIVE');
  }

  if (city) {
    list = list.filter((r) => r.city.toLowerCase() === String(city).toLowerCase());
  }
  if (area) {
    list = list.filter((r) =>
      r.preferredAreas.some((a) => a.toLowerCase().includes(String(area).toLowerCase()))
    );
  }
  if (occupation && occupation !== 'ALL') {
    list = list.filter((r) => r.occupation === occupation);
  }
  if (budgetMax) {
    list = list.filter((r) => r.budgetMin <= Number(budgetMax));
  }

  const enriched = list.map((r) => {
    const tenant = store.users.get(r.tenantId);
    return { ...r, tenant };
  });

  return res.json({ requirements: enriched });
});

apiRouter.post('/requirements', rateLimit(15, 60000), (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const {
    title,
    city = 'Indore',
    preferredAreas = ['Vijay Nagar'],
    budgetMin = 7000,
    budgetMax = 10000,
    propertyTypes = ['PG', 'ROOM'],
    roomTypes = ['SINGLE'],
    moveInDate = 'Immediately',
    occupation = 'STUDENT',
    genderPreference = 'ANY',
    preferences = [],
    description,
  } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const newReq = {
    id: `req-${Date.now()}`,
    tenantId: currentUserId,
    title: title.trim(),
    city: city || 'Indore',
    preferredAreas: Array.isArray(preferredAreas) ? preferredAreas : ['Vijay Nagar'],
    budgetMin: Number(budgetMin) || 7000,
    budgetMax: Number(budgetMax) || 10000,
    propertyTypes: Array.isArray(propertyTypes) ? propertyTypes : ['PG'],
    roomTypes: Array.isArray(roomTypes) ? roomTypes : ['SINGLE'],
    moveInDate: moveInDate || 'Immediately',
    occupation: occupation || 'STUDENT',
    genderPreference: genderPreference || 'ANY',
    preferences: Array.isArray(preferences) ? preferences : ['WiFi'],
    description: description || '',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    viewsCount: 0,
  };

  store.requirements.set(newReq.id, newReq);
  store.scheduleDiskSave();

  return res.status(201).json({ success: true, requirement: newReq });
});

apiRouter.delete('/requirements/:id', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const reqItem = store.requirements.get(req.params.id);
  if (!reqItem) return res.status(404).json({ error: 'Requirement not found' });

  const user = store.users.get(currentUserId);
  if (reqItem.tenantId !== currentUserId && user?.activeRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized to delete this requirement' });
  }

  store.requirements.delete(reqItem.id);
  store.scheduleDiskSave();
  return res.json({ success: true, message: 'Requirement deleted' });
});

// Requirement Matching Engine
apiRouter.get('/requirements/:id/matches', (req: Request, res: Response) => {
  const requirement = store.requirements.get(req.params.id);
  if (!requirement) return res.status(404).json({ error: 'Requirement not found' });

  const activeProperties = Array.from(store.properties.values());
  const activeListings = Array.from(store.listings.values()).filter((l) => l.status === 'ACTIVE');

  const matches = activeProperties.map((prop) => {
    const propListing = activeListings.find((l) => l.propertyId === prop.id);
    const scoreResult = store.calculateMatchScore(prop, requirement, propListing);
    const owner = store.users.get(prop.ownerId);
    return {
      ...scoreResult,
      owner,
    };
  });

  matches.sort((a, b) => b.score - a.score);
  return res.json({ requirement, matches });
});

// ==========================================
// PROPERTY REELS
// ==========================================

apiRouter.get('/reels', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const { category, ownerId } = req.query;

  let list = Array.from(store.reels.values());

  if (category && category !== 'ALL') {
    list = list.filter((r) => r.category === category);
  }
  if (ownerId) {
    list = list.filter((r) => r.ownerId === ownerId);
  }

  const enriched = list.map((r) => {
    const owner = store.users.get(r.ownerId);
    const isLiked = store.likes.has(`${currentUserId}:reel:${r.id}`);
    const isSaved = store.saves.has(`${currentUserId}:reel:${r.id}`);
    return { ...r, owner, isLiked, isSaved };
  });

  return res.json({ reels: enriched });
});

apiRouter.post('/reels', rateLimit(20, 60000), (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const {
    propertyId,
    listingId,
    videoUrl,
    thumbnailUrl,
    caption,
    location = 'Indore',
    propertyTitle,
    rentAmount,
    category = 'ROOM_TOUR',
  } = req.body;

  if (!videoUrl || typeof videoUrl !== 'string') {
    return res.status(400).json({ error: 'Video URL is required' });
  }
  if (!caption || typeof caption !== 'string') {
    return res.status(400).json({ error: 'Caption is required' });
  }

  const newReel = {
    id: `reel-${Date.now()}`,
    ownerId: currentUserId,
    propertyId,
    listingId,
    videoUrl,
    thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80',
    caption: caption.trim(),
    location: location || 'Indore',
    propertyTitle: propertyTitle || 'Exclusive Rental Tour',
    rentAmount: rentAmount ? Number(rentAmount) : undefined,
    category: category as any,
    likesCount: 0,
    commentsCount: 0,
    savesCount: 0,
    viewsCount: 1,
    createdAt: new Date().toISOString(),
  };

  store.reels.set(newReel.id, newReel);
  store.scheduleDiskSave();

  return res.status(201).json({ success: true, reel: newReel });
});

apiRouter.delete('/reels/:id', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const reel = store.reels.get(req.params.id);
  if (!reel) return res.status(404).json({ error: 'Reel not found' });

  const user = store.users.get(currentUserId);
  if (reel.ownerId !== currentUserId && user?.activeRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Unauthorized to delete this reel' });
  }

  store.reels.delete(reel.id);
  store.scheduleDiskSave();
  return res.json({ success: true, message: 'Reel deleted' });
});

apiRouter.post('/reels/:id/like', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const reel = store.reels.get(req.params.id);
  if (!reel) return res.status(404).json({ error: 'Reel not found' });

  const key = `${currentUserId}:reel:${reel.id}`;
  const isLiked = store.likes.has(key);

  if (isLiked) {
    store.likes.delete(key);
    reel.likesCount = Math.max(0, reel.likesCount - 1);
  } else {
    store.likes.add(key);
    reel.likesCount += 1;
  }

  store.scheduleDiskSave();
  return res.json({ success: true, isLiked: !isLiked, likesCount: reel.likesCount });
});

apiRouter.get('/reels/:id/comments', (req: Request, res: Response) => {
  const comments = Array.from(store.comments.values()).filter(
    (c) => c.targetId === req.params.id && c.targetType === 'REEL'
  );
  return res.json({ comments });
});

apiRouter.post('/reels/:id/comments', rateLimit(25, 60000), (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Comment text required' });
  }

  const reel = store.reels.get(req.params.id);
  if (!reel) return res.status(404).json({ error: 'Reel not found' });

  const user = store.users.get(currentUserId);
  const comment = {
    id: `comm-${Date.now()}`,
    targetId: reel.id,
    targetType: 'REEL' as const,
    userId: currentUserId,
    userName: user?.name || 'User',
    userAvatar: user?.avatar || '',
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  store.comments.set(comment.id, comment);
  reel.commentsCount += 1;
  store.scheduleDiskSave();

  return res.status(201).json({ success: true, comment });
});

// ==========================================
// REVIEWS
// ==========================================

apiRouter.get('/properties/:id/reviews', (req: Request, res: Response) => {
  const reviews = Array.from(store.reviews.values()).filter((r) => r.propertyId === req.params.id);
  return res.json({ reviews });
});

apiRouter.post('/properties/:id/reviews', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const { rating, comment } = req.body;
  if (!rating || Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
  }
  if (!comment || typeof comment !== 'string' || !comment.trim()) {
    return res.status(400).json({ error: 'Comment is required' });
  }

  const prop = store.properties.get(req.params.id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  const user = store.users.get(currentUserId);
  const review = store.addReview({
    propertyId: prop.id,
    userId: currentUserId,
    userName: user?.name || 'Verified Resident',
    userAvatar: user?.avatar || '',
    rating: Number(rating),
    comment: comment.trim(),
  });

  return res.status(201).json({ success: true, review });
});

// ==========================================
// VISIT REQUESTS (Physical Walkthroughs)
// ==========================================

apiRouter.get('/visits', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const userVisits = Array.from(store.visitRequests.values())
    .filter((v) => v.tenantId === currentUserId || v.ownerId === currentUserId)
    .map((v) => {
      const tenant = store.users.get(v.tenantId);
      const property = store.properties.get(v.propertyId);
      return { ...v, tenant, property };
    });

  return res.json({ visits: userVisits });
});

apiRouter.post('/visits', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const { propertyId, listingId, ownerId, preferredDate, preferredTime, message } = req.body;

  if (!propertyId || !ownerId) {
    return res.status(400).json({ error: 'propertyId and ownerId are required' });
  }

  const visit = store.createVisitRequest({
    propertyId,
    listingId,
    tenantId: currentUserId,
    ownerId,
    preferredDate: preferredDate || 'Tomorrow',
    preferredTime: preferredTime || '5:00 PM - 6:00 PM',
    message: message?.trim(),
  });

  return res.status(201).json({ success: true, visit });
});

apiRouter.patch('/visits/:id', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const { status } = req.body;
  if (!['ACCEPTED', 'REJECTED', 'COMPLETED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const visit = store.visitRequests.get(req.params.id);
  if (!visit) return res.status(404).json({ error: 'Visit request not found' });

  if (visit.ownerId !== currentUserId && visit.tenantId !== currentUserId) {
    return res.status(403).json({ error: 'Unauthorized to modify this visit request' });
  }

  const updated = store.updateVisitRequestStatus(visit.id, status);
  return res.json({ success: true, visit: updated });
});

// ==========================================
// ANTI-FRAUD & REPORTS
// ==========================================

apiRouter.post('/reports', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const { targetType, targetId, reason, details } = req.body;

  if (!targetType || !targetId || !reason) {
    return res.status(400).json({ error: 'targetType, targetId, and reason are required' });
  }

  const report = store.createReport({
    reporterId: currentUserId,
    targetType,
    targetId,
    reason,
    details,
  });

  return res.status(201).json({ success: true, report });
});

apiRouter.get('/admin/reports', (req: Request, res: Response) => {
  const reports = Array.from(store.reports.values()).map((r) => {
    const reporter = store.users.get(r.reporterId);
    return { ...r, reporter };
  });
  return res.json({ reports });
});

apiRouter.patch('/admin/reports/:id', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['RESOLVED', 'DISMISSED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be RESOLVED or DISMISSED' });
  }

  const report = store.updateReportStatus(req.params.id, status);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  return res.json({ success: true, report });
});

apiRouter.post('/admin/verify-user/:id', (req: Request, res: Response) => {
  const { isVerified = true } = req.body;
  const user = store.verifyUser(req.params.id, Boolean(isVerified));
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ success: true, user });
});

// ==========================================
// SOCIAL ACTIONS (Save, Follow, User Profile)
// ==========================================

apiRouter.post('/social/save', async (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const { targetType, targetId } = req.body as { targetType: 'listing' | 'property' | 'reel' | 'post'; targetId: string };

  if (db.isEnabled()) {
    if (targetType === 'property') {
      const result = await toggleSavedProperty({ currentUserClerkId: currentUserId, targetType, targetId });
      return res.json({ success: true, isSaved: result.isSaved });
    }
    return res.json({ success: true, isSaved: false });
  }

  const key = `${currentUserId}:${targetType}:${targetId}`;
  const isSaved = store.saves.has(key);

  if (isSaved) {
    store.saves.delete(key);
  } else {
    store.saves.add(key);
  }

  store.scheduleDiskSave();
  return res.json({ success: true, isSaved: !isSaved });
});

apiRouter.get('/social/saved', async (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);

  if (db.isEnabled()) {
    const saved = await getSavedPropertiesForUser(currentUserId);
    return res.json(saved);
  }

  const savedListingIds: string[] = [];
  const savedPropertyIds: string[] = [];
  const savedReelIds: string[] = [];

  store.saves.forEach((val) => {
    const [uid, type, id] = val.split(':');
    if (uid === currentUserId) {
      if (type === 'listing') savedListingIds.push(id);
      if (type === 'property') savedPropertyIds.push(id);
      if (type === 'reel') savedReelIds.push(id);
    }
  });

  const listings = savedListingIds.map((id) => store.listings.get(id)).filter(Boolean);
  const properties = savedPropertyIds.map((id) => store.properties.get(id)).filter(Boolean);
  const reels = savedReelIds.map((id) => store.reels.get(id)).filter(Boolean);

  return res.json({ listings, properties, reels });
});

apiRouter.post('/users/:id/follow', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const targetId = req.params.id;
  const targetUser = store.users.get(targetId);
  const currentUser = store.users.get(currentUserId);

  if (!targetUser || !currentUser) return res.status(404).json({ error: 'User not found' });

  const key = `${currentUserId}:${targetId}`;
  const isFollowing = store.follows.has(key);

  if (isFollowing) {
    store.follows.delete(key);
    targetUser.followersCount = Math.max(0, targetUser.followersCount - 1);
    currentUser.followingCount = Math.max(0, currentUser.followingCount - 1);
  } else {
    store.follows.add(key);
    targetUser.followersCount += 1;
    currentUser.followingCount += 1;

    store.addNotification({
      userId: targetId,
      type: 'NEW_FOLLOWER',
      title: 'New Follower 👤',
      message: `${currentUser.name} started following your profile.`,
      linkUrl: `/users/${currentUser.username}`,
    });
  }

  store.scheduleDiskSave();
  return res.json({ success: true, isFollowing: !isFollowing, followersCount: targetUser.followersCount });
});

// Instagram-Style Profile Details
apiRouter.get('/users/:username', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const user = Array.from(store.users.values()).find(
    (u) => u.username.toLowerCase() === req.params.username.toLowerCase()
  );
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isFollowing = store.follows.has(`${currentUserId}:${user.id}`);
  const properties = Array.from(store.properties.values()).filter((p) => p.ownerId === user.id);
  const listings = Array.from(store.listings.values()).filter((l) => l.ownerId === user.id);
  const reels = Array.from(store.reels.values()).filter((r) => r.ownerId === user.id);
  const requirements = Array.from(store.requirements.values()).filter((r) => r.tenantId === user.id);
  const posts = Array.from(store.posts.values()).filter((p) => p.ownerId === user.id);

  const propertyIds = new Set(properties.map((p) => p.id));
  const reviews = Array.from(store.reviews.values()).filter((rv) => propertyIds.has(rv.propertyId));

  return res.json({
    user,
    isFollowing,
    properties,
    listings,
    reels,
    requirements,
    posts,
    reviews,
  });
});

// ==========================================
// MESSAGING & INSTAGRAM-STYLE CHAT
// ==========================================

apiRouter.get('/conversations', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const list = Array.from(store.conversations.values())
    .filter((c) => c.participants.includes(currentUserId))
    .map((c) => {
      const otherUserId = c.participants.find((id) => id !== currentUserId) || c.participants[0];
      const otherUser = store.users.get(otherUserId);
      return {
        ...c,
        otherUser,
        unreadCount: c.unreadCount[currentUserId] || 0,
      };
    })
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return res.json({ conversations: list });
});

apiRouter.post('/conversations', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const { targetUserId, context } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });

  const conversation = store.findOrCreateConversation(currentUserId, targetUserId, context);
  const otherUser = store.users.get(targetUserId);

  return res.json({ conversation, otherUser });
});

apiRouter.get('/conversations/:id/messages', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const conversation = store.conversations.get(req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  conversation.unreadCount[currentUserId] = 0;
  store.scheduleDiskSave();

  const messages = Array.from(store.messages.values())
    .filter((m) => m.conversationId === req.params.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const otherUserId = conversation.participants.find((id) => id !== currentUserId) || conversation.participants[0];
  const otherUser = store.users.get(otherUserId);

  return res.json({
    conversation,
    otherUser,
    messages,
  });
});

apiRouter.post('/messages', rateLimit(40, 60000), (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const { conversationId, receiverId, text, context, imageUrl } = req.body;
  if (!conversationId || !receiverId || !text || !text.trim()) {
    return res.status(400).json({ error: 'conversationId, receiverId, and text are required' });
  }

  const message = store.sendMessage({
    conversationId,
    senderId: currentUserId,
    receiverId,
    text: text.trim(),
    context,
    imageUrl,
  });

  // If message was sent to an owner/host persona, persist an intelligent response
  if (receiverId !== currentUserId) {
    const sender = store.users.get(currentUserId);
    setTimeout(() => {
      const replyOptions = [
        `Hi ${sender?.name || 'there'}! Yes, it's vacant and ready for move-in. Would you like to schedule an in-person visit tomorrow?`,
        `Hello ${sender?.name || 'there'}! Thanks for reaching out. Yes, the room is available with WiFi and power backup. You can book a walkthrough anytime.`,
        `Hi! Yes, food menu is included in the plan and deposit is 1 month rent. Feel free to send a visit request!`,
      ];
      const selectedReply = replyOptions[Math.floor(Math.random() * replyOptions.length)];
      store.sendMessage({
        conversationId,
        senderId: receiverId,
        receiverId: currentUserId,
        text: selectedReply,
        context,
      });
    }, 1200);
  }

  return res.status(201).json({ success: true, message });
});

// ==========================================
// NOTIFICATIONS
// ==========================================

apiRouter.get('/notifications', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  const list = Array.from(store.notifications.values())
    .filter((n) => n.userId === currentUserId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = list.filter((n) => !n.isRead).length;

  return res.json({ notifications: list, unreadCount });
});

apiRouter.patch('/notifications/:id/read', (req: Request, res: Response) => {
  const notif = store.notifications.get(req.params.id);
  if (notif) {
    notif.isRead = true;
    store.scheduleDiskSave();
  }
  return res.json({ success: true });
});

apiRouter.post('/notifications/mark-all-read', (req: Request, res: Response) => {
  const currentUserId = getActingUserId(req);
  store.notifications.forEach((n) => {
    if (n.userId === currentUserId) n.isRead = true;
  });
  store.scheduleDiskSave();
  return res.json({ success: true });
});

// ==========================================
// SEARCH (Unified Global Search)
// ==========================================

apiRouter.get('/search', (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase();

  if (!q) {
    return res.json({ properties: [], listings: [], users: [], reels: [], requirements: [] });
  }

  const matchedProperties = Array.from(store.properties.values()).filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.area.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.propertyType.toLowerCase().includes(q)
  );

  const matchedListings = Array.from(store.listings.values()).filter(
    (l) =>
      l.status === 'ACTIVE' &&
      (l.title.toLowerCase().includes(q) ||
        l.area.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.roomType.toLowerCase().includes(q))
  );

  const matchedUsers = Array.from(store.users.values()).filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.locationArea.toLowerCase().includes(q) ||
      (u.bio && u.bio.toLowerCase().includes(q))
  );

  const matchedReels = Array.from(store.reels.values()).filter(
    (r) =>
      r.caption.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      (r.propertyTitle && r.propertyTitle.toLowerCase().includes(q))
  );

  const matchedRequirements = Array.from(store.requirements.values()).filter(
    (req) =>
      req.status === 'ACTIVE' &&
      (req.title.toLowerCase().includes(q) ||
        req.preferredAreas.some((a) => a.toLowerCase().includes(q)) ||
        req.description.toLowerCase().includes(q))
  );

  return res.json({
    properties: matchedProperties,
    listings: matchedListings,
    users: matchedUsers,
    reels: matchedReels,
    requirements: matchedRequirements,
  });
});

// ==========================================
// AI & GEMINI POWERED ENDPOINTS
// ==========================================

apiRouter.post('/ai/match-analysis', async (req: Request, res: Response) => {
  const { propertyId, requirementId } = req.body;
  if (!propertyId || !requirementId) {
    return res.status(400).json({ error: 'propertyId and requirementId are required' });
  }

  const property = store.properties.get(propertyId);
  const requirement = store.requirements.get(requirementId);

  if (!property || !requirement) {
    return res.status(404).json({ error: 'Property or requirement not found' });
  }

  try {
    const analysis = await analyzeMatchWithAI(property, requirement);
    return res.json({ success: true, analysis });
  } catch (err: any) {
    console.error('AI match analysis error:', err);
    return res.status(500).json({ error: 'AI match analysis failed' });
  }
});

apiRouter.post('/ai/generate-listing', async (req: Request, res: Response) => {
  const { title, area, propertyType, roomType, rent, notes } = req.body;
  if (!area || !rent) {
    return res.status(400).json({ error: 'area and rent are required' });
  }

  try {
    const result = await generateListingWithAI({
      title: title || 'Room',
      area,
      propertyType: propertyType || 'PG',
      roomType: roomType || 'SINGLE',
      rent: Number(rent),
      notes,
    });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('AI listing generation error:', err);
    return res.status(500).json({ error: 'AI listing generation failed' });
  }
});

// ==========================================
// ADMIN METRICS
// ==========================================

apiRouter.get('/admin/metrics', (req: Request, res: Response) => {
  const allListings = Array.from(store.listings.values());
  const activeListings = allListings.filter((l) => l.status === 'ACTIVE').length;
  const expiredListings = allListings.filter((l) => l.status === 'EXPIRED').length;
  const rentedListings = allListings.filter((l) => l.status === 'RENTED').length;

  const totalUsers = store.users.size;
  const totalProperties = store.properties.size;
  const totalReels = store.reels.size;
  const totalRequirements = store.requirements.size;
  const totalInquiries = Array.from(store.conversations.values()).length;
  const totalVisits = store.visitRequests.size;
  const pendingReports = Array.from(store.reports.values()).filter((r) => r.status === 'PENDING').length;

  return res.json({
    activeListings,
    expiredListings,
    rentedListings,
    totalUsers,
    totalProperties,
    totalReels,
    totalRequirements,
    totalInquiries,
    totalVisits,
    pendingReports,
    dailyActiveUsers: Math.floor(totalUsers * 0.72) + 14,
    systemStatus: 'HEALTHY',
    city: 'Indore',
  });
});
