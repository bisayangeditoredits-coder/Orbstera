import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ensure the route is treated as dynamic
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-dodo-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Initialize Supabase inside the handler to avoid build-time errors
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Webhook] Missing Supabase configuration');
      return NextResponse.json({ error: 'Internal configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const payload = JSON.parse(body);
    const eventType = payload.type;
    const data = payload.data;

    console.log(`[Dodo Webhook] Received event: ${eventType}`);

    if (eventType === 'subscription.active' || eventType === 'subscription.renewed' || eventType === 'payment.succeeded') {
      const metadata = data.metadata || {};
      const userId = metadata.userId;
      const planId = metadata.planId;

      if (userId && planId) {
        console.log(`[Dodo Webhook] Upgrading user ${userId} to ${planId}`);
        
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ 
            plan: planId,
            updated_at: new Date().toISOString() 
          })
          .eq('id', userId);

        if (error) {
          console.error('[Dodo Webhook] Supabase Update Error:', error);
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Dodo Webhook] Error:', error.message || error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
