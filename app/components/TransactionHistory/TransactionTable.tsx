import React from 'react';
import { TransactionTableProps } from './types';

/**
 * TransactionTable Component
 * 
 * Displays a paginated table of transactions with sorting and filtering capabilities.
 */
const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  loading,
  error,
  onViewDetails,
  renderStatus,
  getTransactionTypeDisplay,
  formatDate,
  currentPage,
  totalPages,
  onPageChange
}) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-2">Loading transactions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        <p>{error}</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <p className="text-center py-8 text-gray-500">No transactions found matching your filters.</p>
    );
  }

  // Pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center mt-4 space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Previous
        </button>
        
        <span className="px-3 py-1">
          Page {currentPage} of {totalPages}
        </span>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`font-medium ${tx.type === 'received' ? 'text-green-600' : 'text-red-600'}`}>
                    {getTransactionTypeDisplay(tx)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium">
                    {tx.type === 'received' ? '+' : '-'}{tx.amount.toLocaleString()} sats
                  </span>
                  {tx.fee && tx.fee > 0 && (
                    <span className="block text-xs text-gray-500">
                      Fee: {tx.fee.toLocaleString()} sats
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 truncate max-w-xs">
                    {tx.description || 'No description'}
                    {tx.status === 'OPEN' && tx.expiryDate && (
                      <span className="block text-xs text-gray-500">
                        Expires: {formatDate(tx.expiryDate)}
                      </span>
                    )}
                    {tx.status === 'EXPIRED' && (
                      <span className="block text-xs text-gray-500">
                        Expired
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(tx.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {renderStatus(tx)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => onViewDetails(tx)}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {renderPagination()}
    </>
  );
};

export default TransactionTable; 