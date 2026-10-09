CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "bio" TEXT,
    "roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "activeRole" TEXT NOT NULL DEFAULT 'TENANT',
    "city" TEXT,
    "locationArea" TEXT,
    "authProvider" TEXT NOT NULL DEFAULT 'CLERK',
    "providerSubject" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "followersCount" INTEGER NOT NULL DEFAULT 0,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "propertyType" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "fullAddress" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "rules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "foodOption" TEXT,
    "genderPreference" TEXT NOT NULL,
    "noBrokerage" BOOLEAN NOT NULL DEFAULT true,
    "coverPhoto" TEXT,
    "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "totalRooms" INTEGER NOT NULL DEFAULT 1,
    "availableRooms" INTEGER NOT NULL DEFAULT 1,
    "minRent" INTEGER,
    "maxRent" INTEGER,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PropertyImage" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "rent" INTEGER NOT NULL,
    "deposit" INTEGER,
    "furnishing" TEXT,
    "hasAC" BOOLEAN NOT NULL DEFAULT false,
    "hasAttachedBath" BOOLEAN NOT NULL DEFAULT false,
    "hasBalcony" BOOLEAN NOT NULL DEFAULT false,
    "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "availableFrom" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomId" TEXT,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rent" INTEGER NOT NULL,
    "deposit" INTEGER,
    "propertyType" TEXT NOT NULL,
    "roomType" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "genderPreference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rentedAt" TIMESTAMP(3),
    "renewedAt" TIMESTAMP(3),
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "inquiriesCount" INTEGER NOT NULL DEFAULT 0,
    "savesCount" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "preferredAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "budgetMin" INTEGER NOT NULL,
    "budgetMax" INTEGER NOT NULL,
    "propertyTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "roomTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "moveInDate" TEXT,
    "occupation" TEXT,
    "genderPreference" TEXT,
    "preferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "matchScore" INTEGER,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedProperty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedProperty_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkUrl" TEXT,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "context" JSONB,
    "imageUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VisitRequest" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "listingId" TEXT,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "preferredDate" TEXT NOT NULL,
    "preferredTime" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProfile_clerkUserId_key" ON "UserProfile"("clerkUserId");
CREATE UNIQUE INDEX "UserProfile_username_key" ON "UserProfile"("username");
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");
CREATE UNIQUE INDEX "UserProfile_providerSubject_key" ON "UserProfile"("providerSubject");
CREATE UNIQUE INDEX "SavedProperty_userId_propertyId_key" ON "SavedProperty"("userId", "propertyId");
CREATE INDEX "UserProfile_email_idx" ON "UserProfile"("email");
CREATE INDEX "UserProfile_clerkUserId_idx" ON "UserProfile"("clerkUserId");
CREATE INDEX "Property_ownerId_idx" ON "Property"("ownerId");
CREATE INDEX "Property_city_area_idx" ON "Property"("city", "area");
CREATE INDEX "PropertyImage_propertyId_idx" ON "PropertyImage"("propertyId");
CREATE INDEX "Room_propertyId_idx" ON "Room"("propertyId");
CREATE INDEX "Listing_ownerId_idx" ON "Listing"("ownerId");
CREATE INDEX "Listing_status_city_area_idx" ON "Listing"("status", "city", "area");
CREATE INDEX "Requirement_tenantId_idx" ON "Requirement"("tenantId");
CREATE INDEX "Requirement_status_city_idx" ON "Requirement"("status", "city");
CREATE INDEX "SavedProperty_userId_idx" ON "SavedProperty"("userId");
CREATE INDEX "Review_propertyId_idx" ON "Review"("propertyId");
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX "Message_senderId_receiverId_idx" ON "Message"("senderId", "receiverId");
CREATE INDEX "VisitRequest_tenantId_idx" ON "VisitRequest"("tenantId");
CREATE INDEX "VisitRequest_ownerId_idx" ON "VisitRequest"("ownerId");
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

ALTER TABLE "Property"
    ADD CONSTRAINT "Property_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PropertyImage"
    ADD CONSTRAINT "PropertyImage_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Room"
    ADD CONSTRAINT "Room_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Listing"
    ADD CONSTRAINT "Listing_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Listing"
    ADD CONSTRAINT "Listing_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Requirement"
    ADD CONSTRAINT "Requirement_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedProperty"
    ADD CONSTRAINT "SavedProperty_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedProperty"
    ADD CONSTRAINT "SavedProperty_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Review"
    ADD CONSTRAINT "Review_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Review"
    ADD CONSTRAINT "Review_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
    ADD CONSTRAINT "Message_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Message"
    ADD CONSTRAINT "Message_receiverId_fkey"
    FOREIGN KEY ("receiverId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VisitRequest"
    ADD CONSTRAINT "VisitRequest_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VisitRequest"
    ADD CONSTRAINT "VisitRequest_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Report"
    ADD CONSTRAINT "Report_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
