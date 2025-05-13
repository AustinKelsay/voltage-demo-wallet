"use client";

import React, { useState } from 'react';
import { LndClient } from 'flndr';
import QRCode from './QRCode';
import eventBus from '../utils/eventBus';

// Types based on FLNDR API responses
interface Invoice {
  payment_request: string;
  payment_hash: string; // The hash in string format as expected by the API
  value_msat: string;
  timestamp: string;
  expiry: string;
  memo?: string;
  settled: boolean;
}

const LightningReceive: React.FC = () => {
  const [amount, setAmount] = useState<number>(10);
  const [memo, setMemo] = useState<string>('');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<boolean>(false);
  const [checkingPayment, setCheckingPayment] = useState<boolean>(false);

  // Initialize the LND client
  const lnd = new LndClient({
    baseUrl: process.env.NEXT_PUBLIC_LND_REST_API_URL || 'https://your-lnd-proxy:8080',
    macaroon: process.env.NEXT_PUBLIC_LND_MACAROON || '',
  });

  const createInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create invoice with amount in satoshis
      const newInvoice = await lnd.addInvoice({
        value_msat: amount * 1000 + '', // Convert sats to msats and to string
        memo: memo || 'Lightning Payment',
        expiry: '3600', // 1 hour expiry as string
      });

      // Transform the response to match our Invoice interface
      const formattedInvoice = {
        payment_request: newInvoice.payment_request,
        payment_hash: newInvoice.r_hash,
        value_msat: (amount * 1000) + '',
        timestamp: Math.floor(Date.now() / 1000) + '',
        expiry: '3600',
        memo: memo || 'Lightning Payment',
        settled: false
      };

      setInvoice(formattedInvoice);

      // Emit an event to notify other components that an invoice was created
      eventBus.emit('invoice:created', formattedInvoice);
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError('Failed to create invoice. Please check your node connection.');
    } finally {
      setLoading(false);
    }
  };

  const checkInvoiceStatus = async () => {
    if (!invoice) return;

    try {
      setLoading(true);
      setCheckingPayment(true);
      // Cast to string if needed by the library
      console.log(invoice);
      const updatedInvoice = await lnd.lookupInvoiceV2(invoice.payment_hash);
      
      const wasSettledBefore = invoice.settled;
      const isSettledNow = updatedInvoice.settled;
      
      // Update local state
      const updatedInvoiceState = {
        ...invoice,
        settled: isSettledNow
      };
      
      setInvoice(updatedInvoiceState);
      
      // If the invoice was just paid (status changed from unsettled to settled),
      // emit a transaction event
      if (!wasSettledBefore && isSettledNow) {
        eventBus.emit('transaction:new', updatedInvoiceState);
        setSuccessMessage('Payment received!');
        // Automatically clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } else if (!isSettledNow) {
        setSuccessMessage('Payment not detected yet. Please try again in a moment.');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err) {
      console.error('Error checking invoice:', err);
      setError('Failed to check payment status.');
    } finally {
      setLoading(false);
      setTimeout(() => setCheckingPayment(false), 3000);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopyMessage(true);
        setTimeout(() => setCopyMessage(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        setError('Failed to copy to clipboard');
      });
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
      <h2 className="text-2xl font-bold text-center mb-6 text-slate-800">Lightning Invoice</h2>
      
      {!invoice ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1">
              Amount (sats)
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              min="1"
            />
          </div>
          
          <div>
            <label htmlFor="memo" className="block text-sm font-medium text-slate-700 mb-1">
              Memo (optional)
            </label>
            <input
              type="text"
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={createInvoice}
            disabled={loading || amount <= 0}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              loading || amount <= 0 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-center">
            <QRCode data={invoice.payment_request} size={200} />
          </div>
          
          <div className="text-center">
            <span className="text-3xl font-bold text-slate-800">{amount}</span>
            <span className="text-xl ml-1 text-slate-800">sats</span>
            <p className="text-sm text-slate-600 mt-1 font-medium">
              {invoice.settled ? '✓ Paid' : 'Waiting for payment...'}
            </p>
          </div>
          
          <div className="bg-slate-100 p-3 rounded-md relative">
            <div className="text-xs text-slate-600 mb-1 font-medium">Invoice</div>
            <div className="text-xs font-mono break-all pr-6 text-slate-800">
              {invoice.payment_request}
            </div>
            <div className="absolute top-3 right-3">
              <button 
                onClick={() => copyToClipboard(invoice.payment_request)}
                className="text-blue-600 hover:text-blue-800 relative"
                aria-label="Copy to clipboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                {copyMessage && (
                  <span className="absolute -top-8 -left-6 bg-black text-white text-xs py-1 px-2 rounded shadow-md whitespace-nowrap">
                    Copied!
                  </span>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setInvoice(null)}
              className="flex-1 py-2 px-4 border border-slate-300 rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              New Invoice
            </button>
            <button
              onClick={checkInvoiceStatus}
              disabled={loading}
              className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${
                loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {loading ? 'Checking...' : 'Check Payment'}
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm font-medium border border-red-200">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className={`mt-4 p-3 rounded-md text-sm font-medium border flex items-center ${
          successMessage.includes('not detected') 
            ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
            : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {successMessage.includes('not detected') ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {successMessage}
        </div>
      )}
      
      {invoice && !invoice.settled && checkingPayment && !successMessage && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm font-medium border border-blue-200 flex items-center">
          <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Checking payment status...
        </div>
      )}
    </div>
  );
};

export default LightningReceive; 