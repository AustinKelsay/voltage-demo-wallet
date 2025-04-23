"use client";

import React, { useState } from 'react';
import { LndClient } from 'flndr';
import QRCode from './QRCode';

// Types based on FLNDR API responses
interface Invoice {
  payment_request: string;
  payment_hash: string;
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
      setInvoice({
        payment_request: newInvoice.payment_request,
        payment_hash: Buffer.from(newInvoice.r_hash).toString('hex'),
        value_msat: (amount * 1000) + '',
        timestamp: Math.floor(Date.now() / 1000) + '',
        expiry: '3600',
        memo: memo || 'Lightning Payment',
        settled: false
      });
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
      const updatedInvoice = await lnd.lookupInvoiceV2(invoice.payment_hash);
      
      setInvoice({
        ...invoice,
        settled: updatedInvoice.settled
      });
      
      if (updatedInvoice.settled) {
        alert('Payment received!');
      }
    } catch (err) {
      console.error('Error checking invoice:', err);
      setError('Failed to check payment status.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => alert('Copied to clipboard!'))
      .catch(err => console.error('Failed to copy:', err));
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
            <button 
              onClick={() => copyToClipboard(invoice.payment_request)}
              className="absolute top-3 right-3 text-blue-600 hover:text-blue-800"
              aria-label="Copy to clipboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
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
    </div>
  );
};

export default LightningReceive; 