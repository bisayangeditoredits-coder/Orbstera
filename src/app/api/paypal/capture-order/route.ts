import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || '';
const PAYPAL_API_BASE = process.env.NEXT_PUBLIC_PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[PayPal] Token fetch failed:', err);
    throw new Error('Failed to generate PayPal access token');
  }
  const data = await res.json();
  return data.access_token;
}

export async function POST(req: Request) {
  try {
    const { orderID } = await req.json();

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = await getPayPalAccessToken();

    // Capture the payment on PayPal's servers
    const captureRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await captureRes.json();
    console.log('[PayPal] Capture result:', data.status);

    if (data.status === 'COMPLETED') {
      // Determine which plan was purchased from the order description
      const description = data.purchase_units?.[0]?.description || '';
      const plan = description.toLowerCase().includes('creator') ? 'creator_pro' : 'pro';

      // Write plan upgrade to the profiles table (the source of truth)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          plan,
          paid_at: new Date().toISOString(),
          paypal_order_id: orderID,
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('[PayPal] Failed to update profile:', profileError.message);
        throw profileError;
      }

      console.log(`[PayPal] ✅ User ${user.email} upgraded to ${plan}`);
      return NextResponse.json({ success: true, plan });
    }

    return NextResponse.json({ error: 'Payment not completed', status: data.status }, { status: 400 });
  } catch (error: any) {
    console.error('[PayPal] Capture Order Error:', error.message);
    return NextResponse.json({ error: 'Failed to capture order' }, { status: 500 });
  }
}
