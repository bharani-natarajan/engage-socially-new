import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// LinkedIn comment replies require knowing the post URN separately from the comment URN.
// Full reply support will be added in a future iteration.
export async function POST() {
  return NextResponse.json(
    { error: 'LinkedIn comment replies are not yet supported.' },
    { status: 501 }
  );
}
