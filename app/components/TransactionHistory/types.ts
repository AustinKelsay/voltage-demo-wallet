import React from 'react';

// LndClient API response types - adjusted based on actual API
export interface Payment {
  payment_hash: string;
  value_msat: string; // Note: API returns this as string
  fee_msat: string;   // Note: API returns this as string
  creation_date: string;
  path?: string[];
  status: string;
  payment_request?: string;
  htlcs?: Array<{
    status: string;
    route?: Record<string, unknown>;
  }>;
}

export interface Invoice {
  r_hash: string;
  value_msat?: string; // Note: API returns this as string
  value?: string;      // Note: API returns this as string
  memo?: string;
  state: string;
  settle_date: string;
  payment_request: string;
  expiry?: string;
  creation_date?: string;
  htlcs?: Array<{
    state: string;
    chan_id?: string;
    amt_msat?: string;
  }>;
}

export interface DecodedPayReq {
  description?: string;
}

// Types for transaction data
export interface Transaction {
  id: string;
  type: 'sent' | 'received';
  amount: number; // in sats
  fee?: number;
  date: Date;
  description: string;
  status: string; // 'SETTLED', 'OPEN', 'PENDING', 'EXPIRED', etc.
  paymentRequest?: string;
  destination?: string;
  isExpired?: boolean;
  expiryDate?: Date;
  displayState?: string; // Original state from LND for display purposes
  htlcState?: string;    // HTLC state for invoices: ACCEPTED, SETTLED, CANCELED
  rawData?: Payment | Invoice | Record<string, unknown>; // Store raw invoice/payment data for detailed view
}

// Filter types
export interface TransactionFilters {
  type: string[];       // 'all', 'sent', 'received'
  status: string[];     // 'all', 'SETTLED', 'OPEN', 'CANCELED', etc.
  timeRange: string;    // 'all', 'today', 'week', 'month', 'custom'
}

// Props for the main component
export interface TransactionHistoryProps {
  pageSize?: number;
}

// Props for the transaction table component
export interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  onViewDetails: (tx: Transaction) => void;
  renderStatus: (tx: Transaction) => React.ReactNode;
  getTransactionTypeDisplay: (tx: Transaction) => string;
  formatDate: (date: Date) => string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// Props for the filters component
export interface TransactionFiltersProps {
  filters: TransactionFilters;
  toggleFilterValue: (filterType: 'type' | 'status', value: string) => void;
  updateFilter: (filterType: keyof TransactionFilters, value: string | string[]) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
}

// Props for transaction detail component
export interface TransactionDetailProps {
  transaction: Transaction | null;
  onClose: () => void;
  renderStatus: (tx: Transaction) => React.ReactNode;
  formatDate: (date: Date) => string;
} 