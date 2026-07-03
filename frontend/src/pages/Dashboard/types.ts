/* ══════════════════════════════════════════════════════
   SubTrack — Dashboard Types
   ══════════════════════════════════════════════════════ */

import type { Subscription } from '@/types';
import type { RenewSubscriptionPayload } from '@/api/client';

export interface SummaryCardsProps {
  activeCount: number;
  totalCount: number;
  totalMonthly: number;
  upcomingCount: number;
}

export interface SubscriptionCardProps {
  sub: Subscription;
  index: number;
  viewMode: 'grid' | 'list';
  refreshing: string | null;
  onSelect: (sub: Subscription) => void;
  onRefresh: (subId: string, e: React.MouseEvent) => void;
}

export interface DetailModalProps {
  subscription: Subscription;
  refreshing: string | null;
  deleting: boolean;
  showDeleteConfirm: boolean;
  renewing: boolean;
  showRenewModal: boolean;
  onClose: () => void;
  onRefresh: (subId: string, e: React.MouseEvent) => void;
  onDelete: () => void;
  onEdit: (subId: string) => void;
  onRenew: (payload: RenewSubscriptionPayload) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  setShowRenewModal: (v: boolean) => void;
}
