"use client";

import React, { useState, useEffect } from 'react';
import { LndClient } from 'flndr';

// Types for the Lightning Network API response structures
interface RouteHop {
  chan_id: string;
  chan_capacity: string;
  amt_to_forward: string;
  fee: string;
  expiry: number;
  amt_to_forward_msat: string;
  fee_msat: string;
  pub_key: string;
  tlv_payload: boolean;
  mpp_record: Record<string, unknown>;
  custom_records: Record<string, unknown>;
  [key: string]: unknown;
}

interface Route {
  total_time_lock: number;
  total_fees: string;
  total_amt: string;
  hops: RouteHop[];
  total_fees_msat: string;
  total_amt_msat: string;
}

interface HTLC {
  status: string;
  route: Route;
  attempt_id: string;
  attempt_time_ns: string;
  resolve_time_ns: string;
  failure: unknown | null;
  preimage: string;
}

interface PaymentData {
  payment_hash: string;
  payment_preimage: string;
  value_msat: string;
  status: string;
  fee_msat: string;
  creation_time_ns: string;
  payment_request?: string;
  htlcs: HTLC[];
  value_sat: string;
  fee_sat: string;
  creation_date?: string;
  payment_index?: string;
  failure_reason?: string;
}

interface PaymentResult {
  result: PaymentData;
}

/**
 * LightningSend Component
 * 
 * A React component for sending Lightning Network payments using the FLNDR library.
 * This component handles:
 * 1. Accepting a Lightning invoice input
 * 2. Sending the payment via LND
 * 3. Processing the multi-stage payment response
 * 4. Displaying appropriate UI based on payment status
 */
const LightningSend: React.FC = () => {
  // Component state
  const [paymentRequest, setPaymentRequest] = useState<string>('');
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string>('');

  // Initialize the LND client
  const lnd = new LndClient({
    baseUrl: process.env.NEXT_PUBLIC_LND_REST_API_URL || 'https://your-lnd-proxy:8080',
    macaroon: process.env.NEXT_PUBLIC_LND_MACAROON || '',
  });

  /**
   * Parse and process the raw payment response from FLNDR
   * 
   * FLNDR provides payment updates as the payment progresses through 
   * the Lightning Network. This function handles the complex response format
   * and extracts the most recent payment status.
   */
  const processPaymentResponse = (rawResponse: string) => {
    try {
      // First, parse the outer JSON string
      const responseData = JSON.parse(rawResponse);
      
      // If the parsed data is an object with a result property, use it directly
      if (responseData && typeof responseData === 'object' && responseData.result) {
        handlePaymentUpdate(responseData as PaymentResult);
        return;
      }
      
      // Handle case where the response is a string containing newline-separated JSON objects
      if (typeof responseData === 'string') {
        // Split by newlines and filter out empty lines
        const jsonStrings = responseData.split('\n').filter(s => s.trim() !== '');
        
        if (jsonStrings.length === 0) {
          setError('No valid payment response found');
          setLoading(false);
          return;
        }
        
        // Get the last (most recent) response
        const lastJsonString = jsonStrings[jsonStrings.length - 1];
        
        try {
          // Parse the JSON string to get the actual payment result
          const paymentData = JSON.parse(lastJsonString);
          
          if (!paymentData || !paymentData.result) {
            setError('Invalid payment response format');
            setLoading(false);
            return;
          }
          
          // Handle the parsed payment update
          handlePaymentUpdate(paymentData);
        } catch {
          setError('Unable to parse payment response');
          setLoading(false);
        }
      } else {
        setError('Unrecognized payment response format');
        setLoading(false);
      }
    } catch {
      setError('Failed to process payment response');
      setLoading(false);
    }
  };

  /**
   * Handle a payment update based on its status
   */
  const handlePaymentUpdate = (paymentData: PaymentResult) => {
    // Update the payment result state
    setPaymentResult(paymentData);
    
    // Get the payment data from the result
    const { result } = paymentData;
    
    if (!result) return;
    
    // Handle different payment statuses
    switch (result.status) {
      case 'SUCCEEDED':
        // Payment completed successfully
        setLoading(false);
        setError(null);
        break;
      case 'FAILED':
        // Payment failed
        setLoading(false);
        setError(`Payment failed: ${result.failure_reason || 'Unknown error'}`);
        break;
      case 'IN_FLIGHT':
        // Payment is in progress, keep loading state
        break;
      default:
        // Unknown status
        setLoading(false);
        setError(`Unknown payment status: ${result.status}`);
    }
  };

  // Process raw response data whenever it changes
  useEffect(() => {
    if (!rawResponse) return;
    processPaymentResponse(rawResponse);
  }, [rawResponse]);

  /**
   * Send a Lightning payment
   */
  const sendPayment = async () => {
    if (!paymentRequest || paymentRequest.trim() === '') {
      setError('Please enter a valid lightning invoice');
      return;
    }

    try {
      // Reset state and start loading
      setLoading(true);
      setError(null);
      setPaymentResult(null);
      setRawResponse('');

      // Send payment with non-streaming mode (default)
      const result = await lnd.sendPaymentV2({
        payment_request: paymentRequest,
      });

      // Store the raw result for processing
      setRawResponse(JSON.stringify(result));
    } catch {
      setError('Failed to send payment. Please check your invoice and node connection.');
      setLoading(false);
    }
  };

  /**
   * Reset the component state
   */
  const reset = () => {
    setPaymentRequest('');
    setPaymentResult(null);
    setError(null);
    setRawResponse('');
  };

  /**
   * Render the initial payment form
   */
  const renderPaymentForm = () => (
    <div className="space-y-4">
      <div>
        <label htmlFor="paymentRequest" className="block text-sm font-medium text-slate-700 mb-1">
          Lightning Invoice
        </label>
        <textarea
          id="paymentRequest"
          value={paymentRequest}
          onChange={(e) => setPaymentRequest(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          rows={4}
          placeholder="lnbc..."
          disabled={loading}
        />
      </div>
      
      <button
        onClick={sendPayment}
        disabled={loading || !paymentRequest}
        className={`w-full py-2 px-4 rounded-md text-white font-medium ${
          loading || !paymentRequest 
            ? 'bg-slate-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
        }`}
      >
        {loading ? 'Sending...' : 'Send Payment'}
      </button>
      
      {loading && paymentResult?.result?.status === 'IN_FLIGHT' && (
        <div className="text-center text-sm text-slate-600">
          <p>Payment in progress...</p>
          <p className="text-xs mt-1">{paymentResult.result.status}</p>
        </div>
      )}
    </div>
  );

  /**
   * Render the payment result UI
   */
  const renderPaymentResult = () => {
    if (!paymentResult || !paymentResult.result) return null;
    
    const { result } = paymentResult;
    const isSuccess = result.status === 'SUCCEEDED';
    
    return (
      <div className="space-y-6">
        <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
          <div className="flex items-center mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
              isSuccess ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {isSuccess ? <span>✓</span> : <span>✕</span>}
            </div>
            <div>
              <h3 className="font-medium text-slate-800">
                {isSuccess ? 'Payment Successful' : 'Payment Failed'}
              </h3>
              <p className="text-sm text-slate-600">
                {isSuccess 
                  ? `Sent ${result.value_sat} sats` 
                  : 'The payment could not be completed'}
              </p>
            </div>
          </div>
          
          {isSuccess && (
            <div className="space-y-2">
              <div>
                <div className="text-xs text-slate-500">Amount</div>
                <div className="text-slate-800 font-medium">
                  {result.value_sat} sats
                </div>
              </div>
              
              <div>
                <div className="text-xs text-slate-500">Fee</div>
                <div className="text-slate-800 font-medium">
                  {result.fee_sat} sats
                </div>
              </div>
              
              <div>
                <div className="text-xs text-slate-500">Payment Hash</div>
                <div className="text-xs font-mono text-slate-800 break-all">
                  {result.payment_hash}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-slate-500">Payment Preimage</div>
                <div className="text-xs font-mono text-slate-800 break-all">
                  {result.payment_preimage}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <button
          onClick={reset}
          className="w-full py-2 px-4 border border-slate-300 rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          New Payment
        </button>
      </div>
    );
  };

  // Determine what UI to render based on component state
  const renderUI = () => {
    // Show payment form if no result or payment is in flight
    if (!paymentResult || !paymentResult.result || 
        (loading && paymentResult.result.status === 'IN_FLIGHT')) {
      return renderPaymentForm();
    }
    
    // Show payment result for completed payments
    return renderPaymentResult();
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
      <h2 className="text-2xl font-bold text-center mb-6 text-slate-800">Send Lightning Payment</h2>
      
      {renderUI()}
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm font-medium border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
};

export default LightningSend; 