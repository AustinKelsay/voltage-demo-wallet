"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LndClient, Transaction, TransactionType, TransactionStatus } from 'flndr';

interface TransactionHistoryProps {
  pageSize?: number;
  initialTypes?: TransactionType[];
  initialStatuses?: TransactionStatus[];
  initialFetchLimit?: number;
}

interface TransactionHistoryFilters {
  limit: number;
  offset: number;
  types?: TransactionType[];
  statuses?: TransactionStatus[];
  creation_date_start?: string;
  creation_date_end?: string;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  pageSize = 25,
  initialTypes,
  initialStatuses,
  initialFetchLimit = 1000,
}) => {
  // State for transactions and pagination
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [displayedTransactions, setDisplayedTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetchLimit, setFetchLimit] = useState(initialFetchLimit);
  
  // Filter state
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>(initialTypes || []);
  const [selectedStatuses, setSelectedStatuses] = useState<TransactionStatus[]>(initialStatuses || []);
  const [dateRange, setDateRange] = useState<{start?: string, end?: string}>({});

  // Initialize the LND client with useMemo
  const lnd = useMemo(() => new LndClient({
    baseUrl: process.env.NEXT_PUBLIC_LND_REST_API_URL || 'https://your-lnd-proxy:8080',
    macaroon: process.env.NEXT_PUBLIC_LND_MACAROON || '',
  }), []);
  
  // Format date to readable format
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  // Format amount in sats to more readable format
  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat().format(amount) + ' sats';
  };
  
  // Load ALL transactions with current filters
  const loadAllTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create filters for LND client
      const filters: TransactionHistoryFilters = {
        limit: fetchLimit, // Use the user-configurable limit
        offset: 0
      };
      
      // Apply filters if set
      if (selectedTypes.length > 0) {
        filters.types = selectedTypes;
      }
      
      if (selectedStatuses.length > 0) {
        filters.statuses = selectedStatuses;
      }
      
      if (dateRange.start) {
        filters.creation_date_start = dateRange.start;
      }
      
      if (dateRange.end) {
        filters.creation_date_end = dateRange.end;
      }
      
      // Instead of relying on the pagination from the API, we'll fetch a large batch
      // and handle pagination on the client side
      const fetchResult = await lnd.listTransactionHistory(filters);
      
      // Store all transactions
      setAllTransactions(fetchResult.transactions);
      setTotalCount(fetchResult.transactions.length);
      
      // Calculate total pages
      const pages = Math.ceil(fetchResult.transactions.length / pageSize);
      setTotalPages(pages > 0 ? pages : 1);
      
      // Set current page to 1 when filtering
      setCurrentPage(1);
      
      // Display the first page of transactions
      updateDisplayedTransactions(fetchResult.transactions, 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [lnd, pageSize, selectedTypes, selectedStatuses, dateRange, fetchLimit]);
  
  // Update displayed transactions based on current page
  const updateDisplayedTransactions = (transactions: Transaction[], page: number) => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setDisplayedTransactions(transactions.slice(startIndex, endIndex));
  };
  
  // Initial data load
  useEffect(() => {
    loadAllTransactions();
  }, [loadAllTransactions]);
  
  // Handle page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && !loading) {
      setCurrentPage(page);
      updateDisplayedTransactions(allTransactions, page);
    }
  };
  
  // Handle filter changes
  const handleTypeChange = (type: TransactionType) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };
  
  const handleStatusChange = (status: TransactionStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  // Handle fetch limit change
  const handleFetchLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFetchLimit(Number(e.target.value));
  };
  
  // Apply filters
  const applyFilters = () => {
    loadAllTransactions();
  };
  
  // Reset filters
  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setDateRange({});
    // Will trigger useEffect due to dependency changes
  };
  
  // Get appropriate status badge styling
  const getStatusBadgeClass = (status: TransactionStatus): string => {
    switch (status) {
      case 'succeeded':
      case 'settled':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'canceled':
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'in_flight':
      case 'pending':
      case 'accepted':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get appropriate type badge styling
  const getTypeBadgeClass = (type: TransactionType): string => {
    return type === 'received' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-purple-100 text-purple-800';
  };

  // Generate pagination buttons
  const renderPagination = () => {
    const pages = [];
    const maxButtons = 5; // Maximum number of page buttons to show
    
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    // Previous button
    pages.push(
      <button
        key="prev"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        Previous
      </button>
    );
    
    // Page 1
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => goToPage(1)}
          className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          1
        </button>
      );
      
      // Ellipsis if needed
      if (startPage > 2) {
        pages.push(
          <span key="ellipsis1" className="px-2 py-1">
            ...
          </span>
        );
      }
    }
    
    // Page buttons
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`px-3 py-1 rounded-md border ${
            currentPage === i
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      );
    }
    
    // Ellipsis if needed
    if (endPage < totalPages - 1) {
      pages.push(
        <span key="ellipsis2" className="px-2 py-1">
          ...
        </span>
      );
    }
    
    // Last page button if not included
    if (endPage < totalPages) {
      pages.push(
        <button
          key={totalPages}
          onClick={() => goToPage(totalPages)}
          className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {totalPages}
        </button>
      );
    }
    
    // Next button
    pages.push(
      <button
        key="next"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages || loading}
        className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        Next
      </button>
    );
    
    return pages;
  };

  // Render skeleton loader for transaction rows
  const renderSkeletonRows = () => {
    const skeletonRows = [];
    for (let i = 0; i < pageSize; i++) {
      skeletonRows.push(
        <tr key={`skeleton-${i}`} className="animate-pulse">
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </td>
          <td className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </td>
        </tr>
      );
    }
    return skeletonRows;
  };
  
  return (
    <div className="space-y-6">
      {/* Filters Panel */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Transaction Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type
            </label>
            <div className="space-y-2">
              {(['sent', 'received'] as TransactionType[]).map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => handleTypeChange(type)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="ml-2 text-sm">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Transaction Statuses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {([
                'succeeded', 'settled', 'failed', 'pending', 
                'in_flight', 'accepted', 'canceled', 'expired'
              ] as TransactionStatus[]).map(status => (
                <label key={status} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(status)}
                    onChange={() => handleStatusChange(status)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span className="ml-2 text-sm">{status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Fetch Limit Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fetch Limit
            </label>
            <select
              value={fetchLimit}
              onChange={handleFetchLimitChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value={100}>100 transactions</option>
              <option value={250}>250 transactions</option>
              <option value={500}>500 transactions</option>
              <option value={1000}>1,000 transactions</option>
              <option value={2000}>2,000 transactions</option>
              <option value={5000}>5,000 transactions</option>
              <option value={10000}>10,000 transactions</option>
              <option value={20000}>20,000 transactions</option>
              <option value={50000}>50,000 transactions</option>
              <option value={100000}>100,000 transactions</option>
              <option value={200000}>200,000 transactions</option>
              <option value={500000}>500,000 transactions</option>
              <option value={1000000}>1,000,000 transactions</option>
            </select>
          </div>
          
          {/* Filter Actions */}
          <div className="flex flex-col justify-end">
            <div className="space-y-2">
              <button
                onClick={applyFilters}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  'Apply Filters'
                )}
              </button>
              <button
                onClick={resetFilters}
                disabled={loading}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Transaction List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            Transaction History
            {loading && (
              <span className="ml-2 inline-flex items-center">
                <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            )}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {loading 
              ? `Loading up to ${fetchLimit} transactions...` 
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, totalCount)} of ${totalCount} transactions`}
          </p>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border-b border-red-200">
            <p className="font-medium">Error loading transactions</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
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
              {loading ? (
                // Skeleton loader while loading
                renderSkeletonRows()
              ) : displayedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                displayedTransactions.map((tx, index) => (
                  <tr key={`${tx.id}-${index}-${tx.timestamp}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(tx.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadgeClass(tx.type)}`}>
                        {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={tx.type === 'received' ? 'text-green-600' : 'text-red-600'}>
                        {tx.type === 'received' ? '+' : '-'}{formatAmount(tx.amount)}
                      </span>
                      {tx.fee > 0 && (
                        <span className="block text-xs text-gray-500">
                          Fee: {formatAmount(tx.fee)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(tx.status)}`}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {tx.description || 'No description'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Loading indicator for bottom of table */}
        {loading && (
          <div className="flex justify-center items-center py-6 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-blue-600">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading transactions...</span>
            </div>
          </div>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && !loading && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-center space-x-2">
            {renderPagination()}
          </div>
        )}
        
        {/* Page Info - show even when only one page */}
        {!loading && (
          <div className="px-6 py-2 border-t border-gray-200 text-center text-sm text-gray-600">
            Page {currentPage} of {totalPages || 1}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory; 