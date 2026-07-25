export type UserRole = "customer" | "photographer" | "admin";

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  email: string;
  phoneVerifiedAt: string | null;
  status: "active" | "suspended" | "withdrawn";
}

export interface ShootCategory {
  id: string;
  code: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

export interface PhotographerSummary {
  id: string;
  businessName: string;
  activeRegions: string[];
  moodTags: string[];
  categories: string[];
  avgRating: number | null;
  completedBookingsCount: number;
}

export interface Portfolio {
  id: string;
  photographerId: string;
  categoryId: string;
  imageUrl: string;
  sortOrder: number;
  category?: ShootCategory;
}

export interface PackageItem {
  id: string;
  photographerId: string;
  title: string;
  category: string;
  durationMin: number;
  basePrice: number;
  includedPhotos: number;
  retouchScope: string | null;
  rawIncluded: boolean;
  deliveryDays: number;
  options: Record<string, number> | null;
}

export interface PhotographerProfile extends PhotographerSummary {
  representativeName: string;
  verificationStatus: "pending" | "verified" | "rejected";
  responseTimeAvgMin: number | null;
  createdAt: string;
  user: { name: string };
  portfolios: Portfolio[];
  packages: PackageItem[];
}

export interface MyPhotographerProfile extends PhotographerProfile {
  userId: string;
  businessRegNo: string;
  settlementAccount: string;
  settlementAccountHolder: string;
}

export type BookingStatus =
  | "inquiry"
  | "quoted"
  | "held"
  | "deposit_paid"
  | "confirmed"
  | "completed"
  | "delivered"
  | "closed"
  | "cancelled"
  | "disputed";

export interface BookingConfirmationRecord {
  id: string;
  bookingId: string;
  field: string;
  value: string;
  confirmedByCustomerAt: string | null;
  confirmedByPhotographerAt: string | null;
}

export interface Booking {
  id: string;
  customerId: string;
  photographerId: string;
  packageId: string | null;
  status: BookingStatus;
  shootCategoryId: string;
  shootDatetime: string | null;
  location: string | null;
  headcount: number | null;
  purpose: string | null;
  totalAmount: number | null;
  depositAmount: number | null;
  balanceAmount: number | null;
  holdExpiresAt: string | null;
  balanceDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  confirmations?: BookingConfirmationRecord[];
  shootCategory?: ShootCategory;
  chatRoom?: { id: string; contactDisclosed: boolean } | null;
  deliveries?: Delivery[];
}

export interface Delivery {
  id: string;
  bookingId: string;
  photoUrls: string[];
  representativePhotoUrls: string[] | null;
  deliveredAt: string | null;
  downloadExpiresAt: string | null;
  customerConfirmedAt: string | null;
}

export interface BookingListItem {
  id: string;
  photographerId: string;
  customerId: string;
  status: BookingStatus;
  shootDatetime: string | null;
  location: string | null;
  totalAmount: number | null;
  createdAt: string;
}

export type MessageType = "text" | "image" | "file" | "location" | "system";

export interface Message {
  id: string;
  chatRoomId: string;
  senderId: string;
  type: MessageType;
  content: string;
  piiFlag: boolean;
  createdAt: string;
}

export interface Settlement {
  id: string;
  photographerId: string;
  periodStart: string;
  periodEnd: string;
  status: "scheduled" | "held" | "paid";
  heldReason: string | null;
  totalAmount: number;
  paidAt: string | null;
}

export interface SettlementItem {
  id: string;
  settlementId: string;
  bookingId: string;
  grossAmount: number;
  platformFee: number;
  pgFee: number;
  deductionAmount: number;
  netAmount: number;
}

export interface ReceivedDelivery {
  id: string;
  bookingId: string;
  representativePhotoUrls: string[] | null;
  photoUrls: string[];
  deliveredAt: string | null;
  downloadExpiresAt: string | null;
  customerConfirmedAt: string | null;
  booking: {
    location: string | null;
    shootDatetime: string | null;
    photographer: { businessName: string };
  };
}

export interface FavoriteItem {
  id: string;
  createdAt: string;
  photographer: PhotographerSummary;
}

export type DisputeType = "quality" | "noshow" | "delay" | "other";
export type DisputeStatus =
  | "open"
  | "fact_check_requested"
  | "resolved"
  | "escalated";

export interface Dispute {
  id: string;
  bookingId: string;
  raisedBy: "customer" | "photographer";
  type: DisputeType;
  status: DisputeStatus;
  photographerResponseDueAt: string | null;
  resolution: string | null;
  resolvedAt: string | null;
}

export interface Payment {
  id: string;
  bookingId: string;
  type: "deposit" | "balance" | "refund";
  amount: number;
  status: "pending" | "completed" | "cancelled" | "expired" | "failed";
  paidAt: string | null;
}

export interface AdminDashboard {
  newCustomersThisWeek: number;
  newPhotographersThisWeek: number;
  pendingInquiries: number;
  activeDisputes: number;
  scheduledSettlementTotal: number;
  monthlyGrossRevenue: number;
  monthlyPlatformRevenue: number;
}

export interface AdminPhotographer {
  id: string;
  businessName: string;
  representativeName: string;
  businessRegNo: string;
  verificationStatus: "pending" | "verified" | "rejected";
  createdAt: string;
  user: { name: string; phone: string | null; email: string; status: string };
}

export interface AdminPayment {
  id: string;
  bookingId: string;
  type: "deposit" | "balance" | "refund";
  amount: number;
  status: string;
  paidAt: string | null;
  booking: {
    customer: { name: string };
    photographer: { businessName: string };
  };
}

export interface AdminReview {
  id: string;
  bookingId: string;
  ratingOverall: number;
  content: string | null;
  isBlinded: boolean;
  booking: {
    customer: { name: string };
    photographer: { businessName: string };
  };
}
