import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const planId = url.searchParams.get('planId');
    const sig = url.searchParams.get('sig');

    if (!userId || !planId || !sig) {
      console.warn('[Dodo Sync] Missing parameters');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/editor?payment=failed`);
    }

    // Verify signature using HMAC SHA-256
    const crypto = await import('crypto');
    const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
    
    if (!secret) {
      console.error('[Dodo Sync] DODO_PAYMENTS_WEBHOOK_SECRET is not set');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/editor?payment=error`);
    }

    const expectedSig = crypto.createHmac('sha256', secret)
                              .update(`${userId}:${planId}`)
                              .digest('hex');
    
    if (sig !== expectedSig) {
      console.error('[Dodo Sync] Invalid signature mismatch');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/editor?payment=failed_sig`);
    }

    console.log(`[Dodo Sync] Secure instant upgrade for user ${userId} to ${planId}`);

    // Initialize Supabase Admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (planId === 'one_time_export') {
      // 1. Fetch current user to get their metadata
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
      const currentCredits = user?.user_metadata?.watermark_free_exports || 0;
      
      // 2. Increment credits
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { watermark_free_exports: currentCredits + 1 }
      });
      console.log(`[Dodo Sync] Added 1 export credit to user ${userId}`);
    } else {
      // 1. Upsert public.profiles (For regular subscriptions)
      await supabaseAdmin
        .from('profiles')
        .upsert({ 
          id: userId,
          plan: planId,
          updated_at: new Date().toISOString() 
        }, { onConflict: 'id' });

      // 2. Update auth.user_metadata
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { plan: planId }
      });
    }

    // Successfully synced, redirect to editor
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/editor?payment=success`);
  } catch (error: any) {
    console.error('[Dodo Sync] Error:', error.message || error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/editor?payment=error`);
  }
}
