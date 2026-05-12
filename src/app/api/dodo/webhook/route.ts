import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { paidSubscriptionCreditsResetPatch } from '@/lib/billing/sync-subscription-profile';

// Ensure the route is treated as dynamic
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-dodo-signature');

    // Initialize Supabase inside the handler to avoid build-time errors
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Webhook] Missing Supabase configuration');
      return NextResponse.json({ error: 'Internal configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const crypto = await import('crypto');
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(body);
      const computedSignature = hmac.digest('hex');

      if (computedSignature !== signature) {
        console.error('[Dodo Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      console.warn('[Dodo Webhook] WARNING: DODO_PAYMENTS_WEBHOOK_SECRET is not set. Skipping signature verification.');
    }

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
        
        // 1. Upsert public.profiles table (Primary source for UI)
        // Using upsert ensures that if the profile doesn't exist yet, it gets created.
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert(
            {
              id: userId,
              plan: planId,
              ...paidSubscriptionCreditsResetPatch(),
            },
            { onConflict: 'id' },
          );

        if (profileError) {
          console.error('[Dodo Webhook] Profiles Update Error:', profileError);
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        // 2. Update auth.user_metadata (Secondary source for quick access)
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { plan: planId }
        });

        if (authError) {
          console.error('[Dodo Webhook] Auth Metadata Update Error:', authError);
          // We don't return 500 here because the profiles table was updated successfully
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Dodo Webhook] Error:', error.message || error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
