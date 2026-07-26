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
  rescheduleRequests?: RescheduleRequest[];
  photographer?: {
    businessName: string;
    representativeName: string;
    businessRegNo: string;
    activeRegions: string[];
  };
}

export type RescheduleRequestedBy = "customer" | "photographer";
export type RescheduleStatus = "pending" | "approved" | "rejected";

export interface RescheduleRequest {
  id: string;
  bookingId: string;
  requestedBy: RescheduleRequestedBy;
  newShootDatetime: string | null;
  newLocation: string | null;
  reason: string | null;
  status: RescheduleStatus;
  respondedAt: string | null;
  createdAt: string;
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

export type SupportTicketCategory =
  | "general"
  | "payment"
  | "booking_change"
  | "cancellation_refund"
  | "photographer_report"
  | "delivery_dispute"
  | "photo_deletion"
  | "privacy"
  | "partnership"
  | "other";
export type SupportTicketStatus = "open" | "answered" | "closed";

export interface SupportTicket {
  id: string;
  category: SupportTicketCategory;
  isEmergency: boolean;
  content: string;
  status: SupportTicketStatus;
  adminResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface AdminSupportTicket extends SupportTicket {
  userId: string;
  bookingId: string | null;
  user: { name: string; phone: string | null; role: UserRole };
}

export interface AdminBookingListItem {
  id: string;
  status: BookingStatus;
  shootDatetime: string | null;
  location: string | null;
  totalAmount: number | null;
  createdAt: string;
  customer: { name: string; phone: string | null };
  photographer: { businessName: string };
}

export interface AdminBookingDetail extends Omit<Booking, "customer" | "photographer"> {
  customer: { name: string; phone: string | null; email: string };
  photographer: {
    businessName: string;
    representativeName: string;
    businessRegNo: string;
  };
  payments: Payment[];
  cancellations: {
    id: string;
    initiatedBy: string;
    fault: string;
    ruleApplied: string;
    refundAmount: number;
    compensationAmount: number | null;
    createdAt: string;
  }[];
  disputes: {
    id: string;
    raisedBy: string;
    type: string;
    status: string;
    resolution: string | null;
  }[];
  review: {
    ratingOverall: number;
    content: string | null;
  } | null;
  chatRoom: {
    id: string;
    contactDisclosed: boolean;
    messages: { id: string; senderId: string; content: string; createdAt: string }[];
  } | null;
}

export type AppNotificationType =
  | "booking_created"
  | "quote_received"
  | "payment_completed"
  | "cancellation"
  | "reschedule_requested"
  | "reschedule_responded"
  | "dispute_filed"
  | "dispute_resolved"
  | "support_answered"
  | "delivery_ready";

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  role: UserRole;
  status: "active" | "suspended" | "withdrawn";
  createdAt: string;
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

export interface AdminDispute {
  id: string;
  bookingId: string;
  raisedBy: "customer" | "photographer";
  type: DisputeType;
  status: DisputeStatus;
  photographerResponseDueAt: string | null;
  resolution: string | null;
  resolvedAt: string | null;
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
