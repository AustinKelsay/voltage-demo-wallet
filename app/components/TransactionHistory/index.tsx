"use client";

import React, { useState, useEffect } from 'react';
import { LndClient } from 'flndr';

import TransactionTable from './TransactionTable';
import TransactionFilters from './TransactionFilters';
import TransactionDetail from './TransactionDetail';
import { 
  Transaction, 
  TransactionHistoryProps, 
  TransactionFilters as FiltersType,
  Payment,
  Invoice,
  DecodedPayReq
} from './types';

/**
 * TransactionHistory Component
 * 
 * Displays a paginated list of Lightning Network transactions,
 * both sent and received, using FLNDR to fetch data from LND.
 */
const TransactionHistory: React.FC<TransactionHistoryProps> = ({ pageSize = 10 }) => {
  // Component state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [client, setClient] = useState<LndClient | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Add filter state
  const [filters, setFilters] = useState<FiltersType>({
    type: ['all'],
    status: ['all'],
    timeRange: 'all'
  });
  
  // Toggle filter visibility
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Add detailed view state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailView, setShowDetailView] = useState<boolean>(false);

  // Initialize LND client and set up real-time updates
  useEffect(() => {
    try {
      const lndClient = new LndClient({
        // Use environment variables or defaults for LND connection
        baseUrl: process.env.NEXT_PUBLIC_LND_REST_API_URL || 'http://localhost:8080',
        macaroon: process.env.NEXT_PUBLIC_LND_MACAROON || ''
      });
      
      setClient(lndClient);
      
      // Set up real-time updates for invoices and payments
      try {
        // Subscribe to invoice updates (new and updated invoices)
        const invoiceSubscriptionUrl = lndClient.subscribeInvoices();
        
        // Listen for invoice events
        lndClient.on('invoice', () => {
          // Reload transactions to show the latest state
          loadTransactions();
        });
        
        // Subscribe to payment updates
        const paymentSubscriptionUrl = lndClient.trackPaymentV2();
        
        // Listen for payment updates
        lndClient.on('paymentUpdate', (payment) => {
          // Only reload on final states to avoid too many updates
          if (payment.status === 'SUCCEEDED' || payment.status === 'FAILED') {
            loadTransactions();
          }
        });
        
        // Cleanup function
        return () => {
          try {
            // Close WebSocket connections when component unmounts
            if (invoiceSubscriptionUrl) lndClient.closeConnection(invoiceSubscriptionUrl);
            if (paymentSubscriptionUrl) lndClient.closeConnection(paymentSubscriptionUrl);
          } catch (err) {
            console.error('Error closing WebSocket connections:', err);
          }
        };
      } catch (wsErr) {
        // WebSocket connection error - continue without real-time updates
        console.error('Failed to establish WebSocket connection:', wsErr);
        // Don't set error state as the basic functionality will still work
      }
    } catch (err) {
      console.error('Failed to initialize Lightning client:', err);
      setError('Failed to connect to Lightning Network. Please check your connection.');
    }
  }, []);

  /**
   * Format a timestamp to a readable date string
   */
  const formatDate = (date: Date): string => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  /**
   * Convert msats to sats
   */
  const mSatsToSats = (mSats: string | number): number => {
    return Number(mSats) / 1000;
  };

  /**
   * Load transactions from LND
   */
  const loadTransactions = async () => {
    if (!client) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get all sent payments
      const paymentsResponse = await client.listPayments({
        include_incomplete: true,  // Include in-flight payments
        max_payments: 100,        // Fetch more payments
        count_total_payments: true
      });
      
      let sentPayments: Transaction[] = [];
      
      if (paymentsResponse && paymentsResponse.payments) {
        sentPayments = await Promise.all(paymentsResponse.payments.map(async (payment: Payment) => {
          const description = payment.payment_request 
            ? await decodePaymentRequest(payment.payment_request)
            : payment.path && payment.path.length > 0 ? `Payment to ${payment.path[payment.path.length - 1]}` : 'Lightning payment';
          
          // Store HTLC status for payments that have HTLCs
          let htlcState = "";
          if (payment.htlcs && payment.htlcs.length > 0) {
            // Get the status of the latest HTLC
            htlcState = payment.htlcs[payment.htlcs.length - 1].status;
          }
          
          return {
            id: payment.payment_hash,
            type: 'sent',
            amount: mSatsToSats(payment.value_msat),
            fee: mSatsToSats(payment.fee_msat),
            date: new Date(parseInt(payment.creation_date) * 1000),
            description,
            status: payment.status,
            paymentRequest: payment.payment_request || '',
            destination: payment.path && payment.path.length > 0 ? payment.path[payment.path.length - 1] : '',
            displayState: payment.status, // Store original state
            htlcState,
            rawData: payment // Store the raw payment data for detailed view
          };
        }));
      }
      
      // Get all invoices including unpaid/open ones
      // First, get settled invoices
      const settledInvoicesResponse = await client.listInvoices({
        num_max_invoices: 100      // Adjust based on your needs
      });

      // Then, explicitly get pending invoices
      const pendingInvoicesResponse = await client.listInvoices({
        num_max_invoices: 100,      // Adjust based on your needs
        pending_only: true          // Only fetch unsettled/pending invoices
      });

      // Combine settled and pending invoices
      const combinedInvoices = [
        ...(settledInvoicesResponse.invoices || []),
        ...(pendingInvoicesResponse.invoices || [])
      ];

      let receivedPayments: Transaction[] = [];
      const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds

      // Helper function to process invoices
      const processInvoices = (invoices: Invoice[], currentTime: number): Transaction[] => {
        return invoices.map((invoice: Invoice) => {
          // Consider creation date as when the invoice was created
          const creationDate = parseInt(invoice.creation_date || '0');
          
          // For settled invoices, use settle_date, otherwise use creation_date
          const date = invoice.state === 'SETTLED' && invoice.settle_date 
            ? new Date(parseInt(invoice.settle_date) * 1000)
            : new Date(creationDate * 1000);
          
          // For settled invoices, use value from value_msat or value
          const amount = invoice.state === 'SETTLED'
            ? (invoice.value_msat ? mSatsToSats(invoice.value_msat) : (invoice.value ? parseInt(invoice.value) : 0))
            : (invoice.value_msat ? mSatsToSats(invoice.value_msat) : (invoice.value ? parseInt(invoice.value) : 0));
          
          const status = invoice.state || 'UNKNOWN';
          
          // Calculate expiry timestamp
          const expirySeconds = invoice.expiry ? parseInt(invoice.expiry) : 3600; // Default 1hr
          const expiryTimestamp = creationDate + expirySeconds;
          const expiryDate = new Date(expiryTimestamp * 1000);
          
          // Check if invoice is expired - only mark as expired if it's OPEN and past expiry
          const isExpired = status === 'OPEN' && currentTime > expiryTimestamp;
          
          return {
            id: invoice.r_hash,
            type: 'received' as const,
            amount,
            date,
            description: invoice.memo || 'Lightning invoice',
            status,
            paymentRequest: invoice.payment_request,
            isExpired,
            expiryDate,
            displayState: invoice.state,
            rawData: invoice
          };
        });
      };

      // Process all invoices (both settled and pending)
      if (combinedInvoices && combinedInvoices.length > 0) {
        receivedPayments = processInvoices(combinedInvoices, now);
      }
      
      // Combine and sort all transactions by date
      const allTransactions = [...sentPayments, ...receivedPayments]
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setTransactions(allTransactions);
      
      // Apply current filters and update filtered transactions
      applyFilters(allTransactions);
      
      setLastUpdated(new Date()); // Set last updated timestamp
      setLoading(false);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError('Failed to load transaction history. Please try again later.');
      setLoading(false);
    }
  };

  /**
   * Apply filters to transactions
   */
  const applyFilters = (txList: Transaction[] = transactions) => {
    let filtered = [...txList];
    
    // Filter by transaction type
    if (!filters.type.includes('all')) {
      filtered = filtered.filter(tx => filters.type.includes(tx.type));
    }
    
    // Filter by status
    if (!filters.status.includes('all')) {
      filtered = filtered.filter(tx => filters.status.includes(tx.status));
    }
    
    // Filter by time range
    if (filters.timeRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      switch (filters.timeRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(tx => tx.date >= startDate);
    }
    
    // Calculate pagination
    const totalItems = filtered.length;
    const calculatedTotalPages = Math.ceil(totalItems / pageSize);
    
    setFilteredTransactions(filtered);
    setTotalPages(calculatedTotalPages > 0 ? calculatedTotalPages : 1);
    
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  /**
   * Update filters
   */
  const updateFilter = (filterType: keyof FiltersType, value: string | string[]) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    
    // Apply the new filters
    applyFilters(transactions);
  };

  /**
   * Toggle a specific filter value
   */
  const toggleFilterValue = (filterType: 'type' | 'status', value: string) => {
    const currentValues = [...filters[filterType]];
    
    // If "all" is being added, clear other values
    if (value === 'all') {
      updateFilter(filterType, ['all']);
      return;
    }
    
    // If anything else is being added, remove "all"
    let newValues = currentValues.filter(v => v !== 'all');
    
    // Toggle the value
    if (newValues.includes(value)) {
      newValues = newValues.filter(v => v !== value);
      // If no values left, reset to "all"
      if (newValues.length === 0) {
        newValues = ['all'];
      }
    } else {
      newValues.push(value);
    }
    
    updateFilter(filterType, newValues);
  };

  // Effect to apply filters when they change
  useEffect(() => {
    if (transactions.length > 0) {
      applyFilters();
    }
  }, [filters]);

  /**
   * Try to extract a description from a payment request
   */
  const decodePaymentRequest = async (payReq: string): Promise<string> => {
    if (!client) return '';
    
    try {
      const decodedInvoice = await client.decodePayReq(payReq) as DecodedPayReq;
      return decodedInvoice.description || 'No description';
    } catch (err) {
      console.error('Failed to decode payment request:', err);
      return 'Unable to decode';
    }
  };

  // Load transactions when client is initialized - separate from the WebSocket setup
  useEffect(() => {
    if (client) {
      loadTransactions();
    }
  }, [client]);

  // Get transactions for the current page
  const getPaginatedTransactions = (): Transaction[] => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTransactions.slice(startIndex, endIndex);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Helper function to determine transaction type display text based on status
  const getTransactionTypeDisplay = (tx: Transaction): string => {
    // Check if transaction is in a pending state
    const isPending = ['OPEN', 'IN_FLIGHT', 'PENDING', 'ACCEPTED'].includes(tx.status);
    
    if (tx.type === 'received') {
      return isPending ? 'Receiving' : 'Received';
    } else {
      return isPending ? 'Sending' : 'Sent';
    }
  };

  // Render status with detailed information
  const renderStatus = (tx: Transaction) => {
    let statusClass = '';
    let displayText = tx.status;
    
    // Primary status styling and text
    if (tx.isExpired && tx.status === 'OPEN') {
      // Special case for expired OPEN invoices
      statusClass = 'text-amber-600';
      displayText = 'EXPIRED';
    } else {
      switch (tx.status.toUpperCase()) {
        case 'SUCCEEDED':
        case 'SETTLED':
          statusClass = 'text-green-600';
          break;
        case 'FAILED':
        case 'CANCELED':
          statusClass = 'text-red-600';
          break;
        case 'IN_FLIGHT':
        case 'PENDING':
        case 'ACCEPTED':
          statusClass = 'text-yellow-600';
          displayText = tx.type === 'sent' ? 'IN PROGRESS' : 'PENDING';
          break;
        case 'OPEN':
          statusClass = 'text-blue-600 font-medium';
          displayText = 'UNSETTLED';
          break;
        case 'EXPIRED':
          statusClass = 'text-amber-600';
          break;
        default:
          statusClass = 'text-gray-600';
      }
    }
    
    // Show detailed state info with tooltip
    let tooltipText = tx.displayState && tx.displayState !== tx.status ? ` (${tx.displayState})` : '';
    
    // Add HTLC state if available
    if (tx.htlcState) {
      tooltipText += ` - HTLC: ${tx.htlcState}`;
    }
    
    return (
      <div>
        <span className={statusClass} title={tooltipText}>
          {displayText}
        </span>
        {tooltipText && (
          <span className="text-xs text-gray-500 block">
            {tooltipText}
          </span>
        )}
        {tx.status === 'OPEN' && !tx.isExpired && (
          <span className="block text-xs text-blue-500">
            Waiting for payment...
          </span>
        )}
        {tx.isExpired && (
          <span className="block text-xs text-amber-500">
            Payment window closed
          </span>
        )}
      </div>
    );
  };

  // Handle view details click
  const handleViewDetails = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setShowDetailView(true);
  };

  // Handle close detail view
  const handleCloseDetailView = () => {
    setSelectedTransaction(null);
    setShowDetailView(false);
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Transaction History</h2>
        <div className="flex items-center">
          {lastUpdated && (
            <span className="text-xs text-gray-500 mr-4">
              Last updated: {formatDate(lastUpdated)}
            </span>
          )}
          <button 
            onClick={loadTransactions}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm flex items-center"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      <TransactionFilters 
        filters={filters}
        toggleFilterValue={toggleFilterValue}
        updateFilter={updateFilter}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
      />
      
      <TransactionTable 
        transactions={getPaginatedTransactions()}
        loading={loading}
        error={error}
        onViewDetails={handleViewDetails}
        renderStatus={renderStatus}
        getTransactionTypeDisplay={getTransactionTypeDisplay}
        formatDate={formatDate}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
      
      {showDetailView && selectedTransaction && (
        <TransactionDetail 
          transaction={selectedTransaction}
          onClose={handleCloseDetailView}
          renderStatus={renderStatus}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

export default TransactionHistory; 