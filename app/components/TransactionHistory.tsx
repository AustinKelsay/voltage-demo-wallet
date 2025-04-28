"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LndClient, Transaction, TransactionType, TransactionStatus } from 'flndr';

interface TransactionHistoryProps {
  pageSize?: number;
  initialTypes?: TransactionType[];
  initialStatuses?: TransactionStatus[];
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
}) => {
  // State for transactions and pagination
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
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
  
  // Load transactions with current filters and pagination
  const loadTransactions = useCallback(async (newOffset = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: TransactionHistoryFilters = {
        limit: pageSize,
        offset: newOffset
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
      
      const response = await lnd.listTransactionHistory(filters);
      
      // Update state based on response
      if (newOffset === 0) {
        // Replace existing transactions if we're starting from the beginning
        setTransactions(response.transactions);
      } else {
        // Append to existing transactions if we're paginating
        setTransactions(prev => [...prev, ...response.transactions]);
      }
      
      setOffset(newOffset);
      setHasMore(response.has_more);
      setTotalCount(response.total_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [lnd, pageSize, selectedTypes, selectedStatuses, dateRange]);
  
  // Initial data load
  useEffect(() => {
    loadTransactions(0);
  }, [loadTransactions]);
  
  // Load next page of transactions
  const loadMore = () => {
    if (!loading && hasMore) {
      loadTransactions(offset + pageSize);
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
  
  // Apply filters
  const applyFilters = () => {
    loadTransactions(0);
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
  
  return (
    <div className="space-y-6">
      {/* Filters Panel */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          
          {/* Filter Actions */}
          <div className="flex flex-col justify-end">
            <div className="space-y-2">
              <button
                onClick={applyFilters}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Apply Filters
              </button>
              <button
                onClick={resetFilters}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
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
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Transaction History
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {loading && offset === 0 
              ? 'Loading transactions...' 
              : `Showing ${transactions.length} of ${totalCount} transactions`}
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
              {transactions.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
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
        
        {/* Load More Button */}
        {hasMore && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading && offset > 0 ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory; 