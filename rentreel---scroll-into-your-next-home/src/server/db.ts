import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

let databaseEnabled = false;

const prisma = process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  : null;

export const db = {
  isEnabled: () => databaseEnabled,
  setEnabled: (enabled: boolean) => {
    databaseEnabled = enabled;
  },
};

export async function connectDatabase() {
  const hasUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

  if (!hasUrl) {
    databaseEnabled = false;
    console.log('[DB] DATABASE_URL is not configured. Falling back to the existing JSON persistence layer.');
    return false;
  }

  if (!prisma) {
    databaseEnabled = false;
    return false;
  }

  try {
    await prisma.$connect();
    databaseEnabled = true;
    console.log('[DB] PostgreSQL connection successful via Prisma.');
    return true;
  } catch (error) {
    databaseEnabled = false;
    console.error('[DB] PostgreSQL connection failed. Application is continuing with the existing file-based fallback.', error);
    return false;
  }
}

export async function ensureUserProfileForUser(input: {
  userId: string;
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

  if (existingByEmail && existingByEmail.clerkUserId !== input.userId) {
    return existingByEmail;
  }

  const profile = await prisma.userProfile.upsert({
    where: { clerkUserId: input.userId },
    update: {
      username,
      email: normalizeEmail,
      name: input.name,
      avatar: input.avatar || null,
      city: input.city || null,
      locationArea: input.locationArea || null,
      roles: input.roles || [],
      activeRole: input.activeRole || 'TENANT',
      authProvider: input.authProvider || 'PROTOTYPE',
      providerSubject: input.providerSubject || null,
      isVerified: input.isVerified ?? false,
      updatedAt: new Date(),
    },
    create: {
      clerkUserId: input.userId,
      username,
      email: normalizeEmail,
      name: input.name,
      avatar: input.avatar || null,
      city: input.city || null,
      locationArea: input.locationArea || null,
      roles: input.roles || [],
      activeRole: input.activeRole || 'TENANT',
      authProvider: input.authProvider || 'PROTOTYPE',
      providerSubject: input.providerSubject || null,
      isVerified: input.isVerified ?? false,
    },
  });

  return profile;
}

export async function getUserProfileByUserId(userId: string) {
  if (!prisma) {
    return null;
  }

  return prisma.userProfile.findUnique({ where: { clerkUserId: userId } });
}

export async function createPropertyRecord(input: {
  ownerUserId: string;
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

  const owner = await getUserProfileByUserId(input.ownerUserId);
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
  currentUserId?: string | null;
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
      params.currentUserId &&
      property.savedBy.some((entry) => entry.user.clerkUserId === params.currentUserId)
    ),
    savedBy: undefined,
  }));
}

export async function toggleSavedProperty(input: {
  currentUserId: string;
  targetType: 'listing' | 'property' | 'reel' | 'post';
  targetId: string;
}) {
  if (!prisma) {
    return { isSaved: false, skipped: true };
  }

  const currentUser = await getUserProfileByUserId(input.currentUserId);
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

export async function getSavedPropertiesForUser(currentUserId: string) {
  if (!prisma) {
    return { listings: [], properties: [], reels: [] };
  }

  const currentUser = await getUserProfileByUserId(currentUserId);
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

export async function getPropertyById(propertyId: string, currentUserId?: string | null) {
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
      currentUserId &&
      property.savedBy.some((entry) => entry.user.clerkUserId === currentUserId)
    ),
    isFollowing: false,
  };
}

export { prisma };
