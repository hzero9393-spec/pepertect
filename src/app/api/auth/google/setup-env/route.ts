import { NextRequest, NextResponse } from 'next/server';

/**
 * One-time setup endpoint to add Google OAuth env vars to Vercel.
 * 
 * POST /api/auth/google/setup-env
 * Body: { clientId: string, clientSecret: string }
 * 
 * This uses the Vercel REST API (v9) to create/update env vars.
 * Requires VERCEL_TOKEN and VERCEL_PROJECT_ID to be set on the project.
 */
export async function POST(req: NextRequest) {
  try {
    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;

    if (!vercelToken || !vercelProjectId) {
      return NextResponse.json({
        success: false,
        error: 'VERCEL_TOKEN and VERCEL_PROJECT_ID must be set on the project first.',
      }, { status: 500 });
    }

    const body = await req.json();
    const { clientId, clientSecret } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'clientId and clientSecret are required',
      }, { status: 400 });
    }

    const baseUrl = `https://api.vercel.com/v9/projects/${vercelProjectId}/env`;
    const headers = {
      Authorization: `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    };

    const results: Array<{ key: string; status: string }> = [];

    // Env vars to set
    const envVars = [
      { key: 'GOOGLE_CLIENT_ID', value: clientId, target: ['production', 'preview', 'development'] },
      { key: 'GOOGLE_CLIENT_SECRET', value: clientSecret, target: ['production', 'preview', 'development'] },
      { key: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID', value: clientId, target: ['production', 'preview', 'development'] },
    ];

    for (const envVar of envVars) {
      // Check if env var already exists
      const listRes = await fetch(baseUrl, { headers });
      const envs = listRes.ok ? (await listRes.json()).envs || [] : [];
      const existing = envs.find((e: any) => e.key === envVar.key);

      if (existing) {
        // Update existing
        const patchRes = await fetch(`${baseUrl}/${existing.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            value: envVar.value,
            target: envVar.target,
            type: 'encrypted',
          }),
        });
        results.push({ key: envVar.key, status: patchRes.ok ? 'updated' : `failed (${patchRes.status})` });
      } else {
        // Create new
        const createRes = await fetch(baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            key: envVar.key,
            value: envVar.value,
            target: envVar.target,
            type: 'encrypted',
          }),
        });
        results.push({ key: envVar.key, status: createRes.ok ? 'created' : `failed (${createRes.status})` });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Google OAuth env vars configured on Vercel. Redeploy for changes to take effect.',
      results,
    });
  } catch (error: any) {
    console.error('Google setup-env error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
}
