import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface IntegrationToken {
    access_token: string;
    account_email: string;
    is_primary: boolean;
}

export function useIntegrationToken(provider: 'google' | 'azure') {
    const [tokens, setTokens] = useState<IntegrationToken[]>([]);
    const [loading, setLoading] = useState(true);

    // Backward compatibility for single-token consumers
    const token = tokens.length > 0 ? tokens[0].access_token : null;


    // Upsert Integration
    const { error } = await supabase
        .from('user_integrations')
        .upsert({
            user_id: userId,
            provider: provider,
            account_email: providerEmail,
            access_token: accessToken,
            refresh_token: refreshToken,
            updated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
        }, { onConflict: 'user_id,provider,account_email' });

    if (error) console.error('Error saving token:', error);

} catch (err) {
    console.error('Error saving token:', err);
}
    };

return { tokens, token, loading, fetchTokens };
}
