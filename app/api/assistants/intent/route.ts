import { NextRequest, NextResponse } from 'next/server';

export const runtime = "nodejs";

// TODO: Implement intent recognition endpoint
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'Not implemented' },
    { status: 501 }
  );
}
