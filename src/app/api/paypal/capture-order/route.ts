import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ error: 'PayPal is deprecated. Use Dodo Payments.' }, { status: 410 });
}
