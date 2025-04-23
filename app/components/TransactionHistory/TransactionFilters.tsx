import React from 'react';
import { TransactionFiltersProps } from './types';

/**
 * TransactionFilters Component
 * 
 * Provides UI for filtering transactions by type, status, and time range.
 */
const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  toggleFilterValue,
  updateFilter,
  showFilters,
  setShowFilters
}) => {
  // All possible transaction types
  const txTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'sent', label: 'Sent' },
    { value: 'received', label: 'Received' }
  ];
  
  // All possible statuses - combine both payment and invoice statuses
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'SETTLED', label: 'Settled' },
    { value: 'SUCCEEDED', label: 'Succeeded' },
    { value: 'OPEN', label: 'Unsettled' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'IN_FLIGHT', label: 'In Flight' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'CANCELED', label: 'Canceled' },
    { value: 'EXPIRED', label: 'Expired' }
  ];
  
  // Time range options
  const timeRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' }
  ];

  return (
    <>
      <div className="mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>
      
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-md mb-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Transaction Type</h3>
            <div className="flex flex-wrap gap-2">
              {txTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => toggleFilterValue('type', type.value)}
                  className={`px-3 py-1 rounded-full text-xs ${
                    filters.type.includes(type.value)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(status => (
                <button
                  key={status.value}
                  onClick={() => toggleFilterValue('status', status.value)}
                  className={`px-3 py-1 rounded-full text-xs ${
                    filters.status.includes(status.value)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Time Range</h3>
            <div className="flex flex-wrap gap-2">
              {timeRangeOptions.map(time => (
                <button
                  key={time.value}
                  onClick={() => updateFilter('timeRange', time.value)}
                  className={`px-3 py-1 rounded-full text-xs ${
                    filters.timeRange === time.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {time.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionFilters; 