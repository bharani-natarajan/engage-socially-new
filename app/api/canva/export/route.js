import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { startExport, waitForExport } from '@/lib/canva';

export const dynamic = 'force-dynamic';

// POST /api/canva/export  { designId }
export async function POST(request) {
  const store = await cookies();
  const accessToken = store.get('canva_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'canva_not_connected' }, { status: 401 });
  }

  const { designId } = await request.json();
  if (!designId) {
    return NextResponse.json({ error: 'designId required' }, { status: 400 });
  }

  try {
    const exportData = await startExport(accessToken, designId);
    console.log('[Canva export started]', JSON.stringify(exportData));
    const jobId = exportData.job?.id ?? exportData.id;
    if (!jobId) throw new Error(`No export job ID — Canva returned: ${JSON.stringify(exportData)}`);

    const url = await waitForExport(accessToken, jobId);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[Canva export error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
