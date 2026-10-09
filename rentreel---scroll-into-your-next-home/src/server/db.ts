import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = process.env.DATABASE_URL
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  : null;

export const db = {
  isEnabled: () => Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0),
};

export async function connectDatabase() {
  if (!db.isEnabled()) {
    console.log('[DB] DATABASE_URL is not configured. Falling back to the existing JSON persistence layer.');
    return false;
  }

  if (!prisma) {
    return false;
  }

  try {
    await prisma.$connect();
    console.log('[DB] PostgreSQL connection successful via Prisma.');
    return true;
  } catch (error) {
    console.error('[DB] PostgreSQL connection failed. Application is continuing with the existing file-based fallback.', error);
    return false;
  }
}

export async function ensureUserProfileFromClerk(input: {
  clerkUserId: string;
  username: string;
  email: string;
  name: string;
  avatar?: string | null;
  city?: string | null;
  locationArea?: string | null;
  roles?: string[];
  activeRole?: string;
  authProvider?: string;
  providerSubject?: string | null;
  isVerified?: boolean;
}) {
  if (!prisma) {
    throw new Error('Database is not configured. Set DATABASE_URL to enable Prisma persistence.');
  }

  const normalizeEmail = input.email.trim().toLowerCase();
  const username = input.username.trim() || normalizeEmail.split('@')[0] || `user_${Date.now()}`;

  const existingByEmail = await prisma.userProfile.findUnique({ where: { email: normalizeEmail } }).catch(() => null);

  if (existingByEmail && existingByEmail.clerkUserId !== input.clerkUserId) {
    return existingByEmail;
  }

  const profile = await prisma.userProfile.upsert({
    where: { clerkUserId: input.clerkUserId },
    update: {
      username,
      email: normalizeEmail,
      name: input.name,
      avatar: input.avatar || null,
      city: input.city || null,
      locationArea: input.locationArea || null,
      roles: input.roles || [],
      activeRole: input.activeRole || 'TENANT',
      authProvider: input.authProvider || 'CLERK',
      providerSubject: input.providerSubject || null,
      isVerified: input.isVerified ?? false,
      updatedAt: new Date(),
    },
    create: {
      clerkUserId: input.clerkUserId,
      username,
      email: normalizeEmail,
      name: input.name,
      avatar: input.avatar || null,
      city: input.city || null,
      locationArea: input.locationArea || null,
      roles: input.roles || [],
      activeRole: input.activeRole || 'TENANT',
      authProvider: input.authProvider || 'CLERK',
      providerSubject: input.providerSubject || null,
      isVerified: input.isVerified ?? false,
    },
  });

  return profile;
}

export async function getUserProfileByClerkId(clerkUserId: string) {
  if (!prisma) {
    return null;
  }

  return prisma.userProfile.findUnique({ where: { clerkUserId } });
}

export async function createPropertyRecord(input: {
  ownerClerkUserId: string;
  title: string;
  description?: string;
  propertyType: string;
  city: string;
  area: string;
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
  amenities?: string[];
  rules?: string[];
  foodOption?: string;
  genderPreference?: string;
  noBrokerage?: boolean;
  coverPhoto?: string;
  photos?: string[];
  totalRooms?: number;
  availableRooms?: number;
  minRent?: number;
  maxRent?: number;
}) {
  if (!prisma) {
    throw new Error('Database is not configured. Set DATABASE_URL to enable Prisma persistence.');
  }

  const owner = await getUserProfileByClerkId(input.ownerClerkUserId);
  if (!owner) {
    throw new Error('User profile not found for database-backed property creation.');
  }

  return prisma.property.create({
    data: {
      ownerId: owner.id,
      title: input.title,
      description: input.description ?? '',
      propertyType: input.propertyType,
      city: input.city,
      area: input.area,
      fullAddress: input.fullAddress ?? `${input.area}, ${input.city}`,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      amenities: input.amenities ?? [],
      rules: input.rules ?? [],
      foodOption: input.foodOption ?? null,
      genderPreference: input.genderPreference ?? 'ANY',
      noBrokerage: input.noBrokerage ?? true,
      coverPhoto: input.coverPhoto ?? input.photos?.[0] ?? null,
      photos: input.photos ?? [],
      totalRooms: input.totalRooms ?? 1,
      availableRooms: input.availableRooms ?? 1,
      minRent: input.minRent ?? null,
      maxRent: input.maxRent ?? null,
      rating: 5,
      reviewCount: 0,
      isVerified: false,
    },
    include: {
      owner: true,
    },
  });
}

export async function listPublicProperties(params: {
  city?: string | null;
  area?: string | null;
  propertyType?: string | null;
  minRent?: number | null;
  maxRent?: number | null;
  genderPreference?: string | null;
  noBrokerage?: boolean | null;
  currentUserClerkId?: string | null;
}) {
  if (!prisma) {
    return [];
  }

  const where: Prisma.PropertyWhereInput = {};

  if (params.city) where.city = { equals: params.city, mode: 'insensitive' };
  if (params.area) where.area = { contains: params.area, mode: 'insensitive' };
  if (params.propertyType && params.propertyType !== 'ALL') where.propertyType = params.propertyType;
  if (params.minRent) where.minRent = { gte: Number(params.minRent) };
  if (params.maxRent) where.maxRent = { lte: Number(params.maxRent) };
  if (params.genderPreference && params.genderPreference !== 'ANY') {
    where.OR = [
      { genderPreference: params.genderPreference },
      { genderPreference: 'ANY' },
    ];
  }
  if (params.noBrokerage === true) where.noBrokerage = true;

  const properties = await prisma.property.findMany({
    where,
    include: {
      owner: true,
      savedBy: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return properties.map((property) => ({
    ...property,
    owner: property.owner,
    isSaved: !!(
      params.currentUserClerkId &&
      property.savedBy.some((entry) => entry.user.clerkUserId === params.currentUserClerkId)
    ),
    savedBy: undefined,
  }));
}

export async function toggleSavedProperty(input: {
  currentUserClerkId: string;
  targetType: 'listing' | 'property' | 'reel' | 'post';
  targetId: string;
}) {
  if (!prisma) {
    return { isSaved: false, skipped: true };
  }

  const currentUser = await getUserProfileByClerkId(input.currentUserClerkId);
  if (!currentUser) {
    throw new Error('Authenticated user profile not found in database.');
  }

  if (input.targetType !== 'property') {
    return { isSaved: false, skipped: true };
  }

  const existing = await prisma.savedProperty.findUnique({
    where: {
      userId_propertyId: {
        userId: currentUser.id,
        propertyId: input.targetId,
      },
    },
  });

  if (existing) {
    await prisma.savedProperty.delete({ where: { id: existing.id } });
    return { isSaved: false };
  }

  await prisma.savedProperty.create({
    data: {
      userId: currentUser.id,
      propertyId: input.targetId,
    },
  });

  return { isSaved: true };
}

export async function getSavedPropertiesForUser(currentUserClerkId: string) {
  if (!prisma) {
    return { listings: [], properties: [], reels: [] };
  }

  const currentUser = await getUserProfileByClerkId(currentUserClerkId);
  if (!currentUser) {
    return { listings: [], properties: [], reels: [] };
  }

  const saved = await prisma.savedProperty.findMany({
    where: { userId: currentUser.id },
    include: { property: { include: { owner: true } } },
  });

  return {
    listings: [],
    properties: saved.map((item) => ({
      ...item.property,
      owner: item.property.owner,
      isSaved: true,
    })),
    reels: [],
  };
}

export async function getPropertyById(propertyId: string, currentUserClerkId?: string | null) {
  if (!prisma) {
    return null;
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      owner: true,
      savedBy: {
        include: {
          user: true,
        },
      },
      rooms: true,
      listings: true,
      reviews: { include: { user: true } },
    },
  });

  if (!property) return null;

  return {
    property,
    owner: property.owner,
    rooms: property.rooms,
    listings: property.listings,
    reviews: property.reviews,
    isSaved: !!(
      currentUserClerkId &&
      property.savedBy.some((entry) => entry.user.clerkUserId === currentUserClerkId)
    ),
    isFollowing: false,
  };
}

export { prisma };
