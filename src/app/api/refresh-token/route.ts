import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { provider, refresh_token } = await request.json();

        if (!refresh_token) {
            return NextResponse.json({ error: 'Missing refresh_token' }, { status: 400 });
        }

        let tokenEndpoint = '';
        let body: any = {};

        if (provider === 'google') {
            tokenEndpoint = 'https://oauth2.googleapis.com/token';
            body = {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                refresh_token: refresh_token,
                grant_type: 'refresh_token',
            };
        } else if (provider === 'azure') {
            // Note: For multi-tenant apps, you might need 'common' or the specific tenant ID.
            // Using 'common' is standard for generic Microsoft accounts.
            tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
            body = {
                client_id: process.env.AZURE_CLIENT_ID,
                client_secret: process.env.AZURE_CLIENT_SECRET,
                refresh_token: refresh_token,
                grant_type: 'refresh_token',
                scope: 'offline_access user.read tasks.readwrite', // Ensure scopes match your initial request
            };
        } else {
            return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
        }

        console.log(`[API] Refreshing token for ${provider}...`);

        // Convert body to URLSearchParams for x-www-form-urlencoded
        const params = new URLSearchParams();
        for (const key in body) {
            params.append(key, body[key]);
        }

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[API] Refresh failed:', data);
            return NextResponse.json({ error: data.error_description || data.error || 'Refresh failed' }, { status: response.status });
        }

        // Return the new tokens. Google returns `expires_in` (seconds).
        // It might not return a new refresh_token, so the client should keep the old one if missing.
        return NextResponse.json({
            access_token: data.access_token,
            refresh_token: data.refresh_token, // Might be undefined
            expires_in: data.expires_in,
        });

    } catch (error: any) {
        console.error('[API] Server error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
