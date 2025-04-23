import React from 'react';
import { TransactionDetailProps } from './types';

/**
 * TransactionDetail Component
 * 
 * Displays detailed information about a transaction in a modal.
 */
const TransactionDetail: React.FC<TransactionDetailProps> = ({ 
  transaction, 
  onClose, 
  renderStatus, 
  formatDate 
}) => {
  if (!transaction) return null;
  
  const tx = transaction;
  const rawData = tx.rawData || {};
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">
              {tx.type === 'sent' 
                ? (tx.status === 'SUCCEEDED' ? 'Outgoing Payment' : 'Pending Payment') 
                : (tx.status === 'SETTLED' ? 'Invoice' : 'Pending Invoice')} Details
            </h3>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Amount</h4>
              <p className="text-2xl font-bold mb-4">
                {tx.type === 'received' ? '+' : '-'}{tx.amount.toLocaleString()} sats
                {tx.fee && tx.fee > 0 && (
                  <span className="text-sm text-gray-500 ml-2">
                    + {tx.fee.toLocaleString()} sats fee
                  </span>
                )}
              </p>
              
              <h4 className="font-medium text-gray-700 mb-1">Status</h4>
              <div className="mb-4">
                {renderStatus(tx)}
              </div>
              
              <h4 className="font-medium text-gray-700 mb-1">Date</h4>
              <p className="mb-4">{formatDate(tx.date)}</p>
              
              <h4 className="font-medium text-gray-700 mb-1">Description</h4>
              <p className="mb-4">{tx.description || 'No description'}</p>
              
              {tx.paymentRequest && (
                <>
                  <h4 className="font-medium text-gray-700 mb-1">Payment Request</h4>
                  <div className="bg-gray-100 p-2 rounded-md mb-4 break-all text-xs">
                    {tx.paymentRequest}
                  </div>
                </>
              )}
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-1">ID</h4>
              <div className="bg-gray-100 p-2 rounded-md mb-4 break-all text-xs">
                {tx.id}
              </div>
              
              {tx.type === 'sent' && tx.destination && (
                <>
                  <h4 className="font-medium text-gray-700 mb-1">Destination</h4>
                  <div className="bg-gray-100 p-2 rounded-md mb-4 break-all text-xs">
                    {tx.destination}
                  </div>
                </>
              )}
              
              {tx.isExpired && (
                <div className="mb-4">
                  <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded-md text-xs">
                    Expired at {formatDate(tx.expiryDate as Date)}
                  </span>
                </div>
              )}
              
              {/* Display HTLC information if available */}
              {tx.htlcState && (
                <>
                  <h4 className="font-medium text-gray-700 mb-1">HTLC Status</h4>
                  <p className="mb-4">{tx.htlcState}</p>
                </>
              )}
              
              {/* Show raw data in collapsible section */}
              <div className="mt-4">
                <details>
                  <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                    Show raw data
                  </summary>
                  <pre className="mt-2 bg-gray-100 p-3 rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(rawData, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetail; 