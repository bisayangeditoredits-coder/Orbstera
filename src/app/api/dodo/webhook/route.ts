import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin for backend updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role key for bypass
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const signature = req.headers.get('x-dodo-signature');

    // In a real app, you MUST verify the signature here using Dodo's SDK or a crypto check
    // if (!verifySignature(JSON.stringify(body), signature, process.env.DODO_PAYMENTS_WEBHOOK_SECRET)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const event = body;
    console.log('[Dodo Webhook] Received event:', event.type);

    if (event.type === 'subscription.created' || event.type === 'order.succeeded') {
      const metadata = event.data?.metadata || {};
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

        if (error) throw error;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Dodo Webhook] Error:', error.message);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
