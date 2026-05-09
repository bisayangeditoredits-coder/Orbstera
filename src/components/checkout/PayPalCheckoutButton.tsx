'use client';

import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PayPalCheckoutButton({ planId, price }: { planId: string, price: string }) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Make sure this matches what you put in .env.local
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'test';

  return (
    <PayPalScriptProvider options={{ "clientId": clientId, components: "buttons", currency: "USD" }}>
      <div className="relative z-10 w-full min-h-[150px]">
        {error && <p className="text-red-500 text-sm mb-4 text-center font-bold">{error}</p>}
        
        <PayPalButtons
          style={{ layout: "vertical", shape: "pill", color: "blue", label: "pay" }}
          createOrder={async () => {
            setError(null);
            try {
              const res = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId, price })
              });
              const orderData = await res.json();
              if (orderData.id) {
                return orderData.id;
              } else {
                throw new Error(orderData.error || 'Failed to create order');
              }
            } catch (err: any) {
              setError(err.message);
              return null;
            }
          }}
          onApprove={async (data, actions) => {
            try {
              const res = await fetch('/api/paypal/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderID: data.orderID })
              });
              const captureData = await res.json();
              
              if (captureData.success) {
                // Payment was successful! Supabase was updated.
                // Force a hard reload so the UI registers the new Pro plan
                window.location.href = '/dashboard?upgrade=success';
              } else {
                setError('Payment failed to capture. Please try again.');
              }
            } catch (err: any) {
              setError('An error occurred during payment processing.');
            }
          }}
          onError={(err) => {
            console.error('PayPal Checkout Error:', err);
            setError("Something went wrong with the PayPal popup.");
          }}
        />
      </div>
    </PayPalScriptProvider>
  );
}
