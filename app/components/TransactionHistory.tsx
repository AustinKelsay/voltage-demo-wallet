"use client"
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LndClient, Transaction, TransactionType, TransactionStatus, ListTransactionHistoryResponse } from 'flndr';

// Define filter state type
interface FilterState {
  types: TransactionType[] | null;
  statuses: TransactionStatus[] | null;
  startDate: string | null;
  endDate: string | null;
}

// Interface for pagination state to include cursors
interface PaginationState {
  offset: number;
  limit: number;
  payment_cursor?: string;
  invoice_cursor?: string;
}

const TransactionHistory: React.FC = () => {
  // Initialize the LND client
  const lndClient = useMemo(() => new LndClient({
    baseUrl: process.env.NEXT_PUBLIC_LND_REST_API_URL || 'https://your-lnd-proxy:8080',
    macaroon: process.env.NEXT_PUBLIC_LND_MACAROON || '',
  }), []);

  // State for transactions and pagination
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionData, setTransactionData] = useState<ListTransactionHistoryResponse | null>(null);
  
  // State for filters
  const [filters, setFilters] = useState<FilterState>({
    types: null,
    statuses: null,
    startDate: null,
    endDate: null
  });
  
  // Pagination state with cursors
  const [pagination, setPagination] = useState<PaginationState>({
    offset: 0,
    limit: 10,
  });

  // Use refs to store current values without causing re-renders
  const filtersRef = useRef(filters);
  const paginationRef = useRef(pagination);
  
  // Update refs when state changes
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  
  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  // Function to build request options - now uses refs instead of state
  const buildRequestOptions = useCallback((isReset: boolean, customPagination?: PaginationState) => {
    const currentFilters = filtersRef.current;
    const currentPagination = customPagination || paginationRef.current;
    
    return {
      offset: isReset ? 0 : currentPagination.offset,
      limit: currentPagination.limit,
      payment_cursor: isReset ? undefined : currentPagination.payment_cursor,
      invoice_cursor: isReset ? undefined : currentPagination.invoice_cursor,
      types: currentFilters.types || undefined,
      statuses: currentFilters.statuses || undefined,
      creation_date_start: currentFilters.startDate ? Math.floor(new Date(currentFilters.startDate).getTime() / 1000).toString() : undefined,
      creation_date_end: currentFilters.endDate ? Math.floor(new Date(currentFilters.endDate).getTime() / 1000).toString() : undefined,
    };
  }, []);

  // Function to fetch transactions with cursor-based pagination
  const fetchTransactions = useCallback(async (resetPagination = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // If resetting pagination, update the pagination state first
      if (resetPagination) {
        setPagination(prev => ({
          offset: 0,
          limit: prev.limit,
          payment_cursor: undefined,
          invoice_cursor: undefined
        }));
      }
      
      // Build request options using the latest state through refs
      const requestOptions = buildRequestOptions(resetPagination);

      const response = await lndClient.listTransactionHistory(requestOptions);
      
      // Update the transaction data
      setTransactionData(prev => {
        // If resetting pagination or first load, replace the data
        if (resetPagination || !prev) {
          return response;
        }
        
        // Otherwise, append the new transactions to the existing ones
        return {
          ...response,
          transactions: [...prev.transactions, ...response.transactions],
          // Keep the new pagination metadata
          offset: response.offset,
          limit: response.limit,
          has_more: response.has_more,
          total_count: response.total_count,
          next_cursor: response.next_cursor
        };
      });
      
      // Store cursors for next page if available
      if (response.next_cursor) {
        setPagination({
          offset: response.next_cursor.offset,
          limit: response.next_cursor.limit,
          payment_cursor: response.next_cursor.payment_cursor ?? undefined,
          invoice_cursor: response.next_cursor.invoice_cursor ?? undefined
        });
      }
    } catch (err) {
      console.error('Transaction fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [lndClient, buildRequestOptions]);

  // Initial load
  useEffect(() => {
    fetchTransactions(true);
  }, [fetchTransactions]);

  // Format amount with sats unit
  const formatAmount = (amount: number): string => {
    return `${amount.toLocaleString()} sats`;
  };

  // Format timestamp to human-readable date/time
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Get transaction status label and color
  const getStatusInfo = useMemo(() => {
    const statusMap: Record<TransactionStatus, { label: string; color: string }> = {
      'succeeded': { label: 'Sent Successfully', color: 'text-green-600' },
      'failed': { label: 'Failed', color: 'text-red-600' },
      'in_flight': { label: 'In Progress', color: 'text-yellow-600' },
      'pending': { label: 'Pending', color: 'text-yellow-600' },
      'settled': { label: 'Received', color: 'text-green-600' },
      'accepted': { label: 'Accepted', color: 'text-blue-600' },
      'canceled': { label: 'Canceled', color: 'text-red-600' },
      'expired': { label: 'Expired', color: 'text-gray-600' }
    };
    
    return (status: TransactionStatus) => statusMap[status] || { label: status, color: 'text-gray-600' };
  }, []);

  // Handler for filter changes
  const handleFilterChange = (filterType: keyof FilterState, value: TransactionType[] | TransactionStatus[] | string | null) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Apply filters and refresh data
  const applyFilters = useCallback(() => {
    fetchTransactions(true);
  }, [fetchTransactions]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters({
      types: null,
      statuses: null,
      startDate: null,
      endDate: null
    });
    fetchTransactions(true);
  }, [fetchTransactions]);

  // Handle pagination - load more pattern for cursor-based pagination
  const loadMore = useCallback(() => {
    if (transactionData?.has_more) {
      fetchTransactions(false);
    }
  }, [transactionData, fetchTransactions]);

  // Handle changing page size
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPagination(prev => ({
      ...prev,
      offset: 0,
      limit: newPageSize,
      payment_cursor: undefined,
      invoice_cursor: undefined
    }));
    // Schedule fetchTransactions for next tick to ensure pagination state is updated
    setTimeout(() => fetchTransactions(true), 0);
  }, [fetchTransactions]);

  // Available transaction types for filter
  const availableTypes = useMemo(() => [
    { value: 'sent' as TransactionType, label: 'Sent Payments' },
    { value: 'received' as TransactionType, label: 'Received Payments' }
  ], []);

  // Available transaction statuses for filter
  const availableStatuses = useMemo(() => [
    { value: 'succeeded' as TransactionStatus, label: 'Succeeded' },
    { value: 'failed' as TransactionStatus, label: 'Failed' },
    { value: 'in_flight' as TransactionStatus, label: 'In Flight' },
    { value: 'pending' as TransactionStatus, label: 'Pending' },
    { value: 'settled' as TransactionStatus, label: 'Settled' },
    { value: 'accepted' as TransactionStatus, label: 'Accepted' },
    { value: 'canceled' as TransactionStatus, label: 'Canceled' },
    { value: 'expired' as TransactionStatus, label: 'Expired' }
  ], []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Lightning Transaction History</h1>
      
      {/* Filters */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Transaction Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={filters.types ? filters.types[0] : ''}
              onChange={e => handleFilterChange('types', e.target.value ? [e.target.value as TransactionType] : null)}
            >
              <option value="">All Types</option>
              {availableTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={filters.statuses ? filters.statuses[0] : ''}
              onChange={e => handleFilterChange('statuses', e.target.value ? [e.target.value as TransactionStatus] : null)}
            >
              <option value="">All Statuses</option>
              {availableStatuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Date Range Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={filters.startDate || ''}
              onChange={e => handleFilterChange('startDate', e.target.value || null)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={filters.endDate || ''}
              onChange={e => handleFilterChange('endDate', e.target.value || null)}
            />
          </div>
        </div>
        
        <div className="mt-4 flex space-x-2">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            onClick={applyFilters}
          >
            Apply Filters
          </button>
          <button
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition"
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {/* Page Size Selector */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700">Items per page:</label>
          <select
            value={pagination.limit}
            onChange={e => handlePageSizeChange(Number(e.target.value))}
            className="p-1 border border-gray-300 rounded text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      
      {/* Transactions Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && !transactionData && (
              <tr>
                <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                  Loading transactions...
                </td>
              </tr>
            )}
            
            {!loading && (!transactionData || transactionData.transactions.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                  No transactions found
                </td>
              </tr>
            )}
            
            {transactionData && transactionData.transactions.map((tx: Transaction) => {
              const statusInfo = getStatusInfo(tx.status);
              
              return (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`font-medium ${tx.type === 'sent' ? 'text-orange-600' : 'text-green-600'}`}>
                        {tx.type === 'sent' ? '↗️ Sent' : '↘️ Received'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(tx.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatAmount(tx.amount)}
                    </div>
                    {tx.fee > 0 && (
                      <div className="text-xs text-gray-500">
                        Fee: {formatAmount(tx.fee)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 bg-opacity-10 ${statusInfo.color} bg-${statusInfo.color.split('-')[1]}-100`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                    {tx.description || 'No description'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Loading indicator for pagination */}
      {loading && transactionData && (
        <div className="text-center my-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading more transactions...</p>
        </div>
      )}
      
      {/* Pagination - Using a "Load More" pattern which works better with cursor-based pagination */}
      {transactionData && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            {transactionData.transactions.length > 0 ? (
              <>
                Showing <span className="font-medium">{transactionData.offset + 1}</span> to <span className="font-medium">
                  {transactionData.offset + transactionData.transactions.length}
                </span> of approximately <span className="font-medium">{transactionData.total_count}</span> transactions
              </>
            ) : (
              'No transactions found'
            )}
          </div>
          
          {transactionData.has_more && (
            <button
              onClick={loadMore}
              disabled={loading}
              className={`px-4 py-2 rounded-md ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white transition`}
            >
              Load More
            </button>
          )}
          
          {!transactionData.has_more && transactionData.transactions.length > 0 && (
            <div className="text-sm text-gray-600">
              You&apos;ve reached the end of the list
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory; 