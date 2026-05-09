import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { DodoPayments } from 'dodopayments';

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    let { data: { user } } = await supabase.auth.getUser();
    
    // TEMPORARY: Allow guest checkout for testing purposes
    const customerEmail = user?.email || 'guest@example.com';
    const customerName = user?.user_metadata?.full_name || 'Guest User';
    const userId = user?.id || 'guest_test';

    const { planId, productId } = await req.json();

    const PRODUCT_MAP: Record<string, string> = {
      'student_pro': process.env.DODO_STUDENT_PRO_ID || '',
      'creator_pro': process.env.DODO_CREATOR_PRO_ID || '',
    };

    const targetProductId = productId || PRODUCT_MAP[planId];

    if (!targetProductId) {
      return NextResponse.json({ error: 'Invalid product or plan ID' }, { status: 400 });
    }

    // Initialize inside the handler to ensure fresh env variables
    const apiKey = (process.env.DODO_PAYMENTS_API_KEY || '').trim();
    const isTest = process.env.DODO_PAYMENTS_ENDPOINT?.includes('test');
    
    console.log('[Dodo] Initializing checkout:', { 
      planId, 
      productId: targetProductId, 
      mode: isTest ? 'test_mode' : 'live_mode',
      keyPrefix: apiKey.substring(0, 5) 
    });

    const dodo = new DodoPayments({
      bearerToken: apiKey,
      environment: isTest ? 'test_mode' : 'live_mode',
    });

    const basePayload = {
      customer: {
        email: customerEmail,
        name: customerName,
      },
      product_cart: [
        {
          product_id: targetProductId,
          quantity: 1,
        }
      ],
      metadata: {
        userId: userId,
        planId: planId,
      },
    };

    // Generate secure signature for the return URL
    const crypto = await import('crypto');
    const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET || 'dev';
    const sig = crypto.createHmac('sha256', secret).update(`${userId}:${planId}`).digest('hex');

    const sessionPayload: any = {
      ...basePayload,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/dodo/sync?userId=${userId}&planId=${planId}&sig=${sig}`,
    };

    const session = await dodo.checkoutSessions.create(sessionPayload);

    return NextResponse.json({ url: session.checkout_url });
  } catch (error: any) {
    console.error('[Dodo] Checkout Error:', error.message || error);
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 });
  }
}
