import { createAuthenticatedFetch } from './authenticatedFetch.js'
import { API_BASE_URL } from '../config/apiConfig.js'
import { createClient } from '@supabase/supabase-js'

const getEnv = (key) => {
    if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
        return window.__ENV__[key];
    }
    return import.meta.env[key];
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY')

let client = null;

try {
    if (supabaseUrl && supabaseUrl.startsWith('https://') && supabaseAnonKey && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
        client = createClient(supabaseUrl, supabaseAnonKey)
    } else {
        console.warn('Supabase credentials missing or invalid. Check your .env file.')
    }
} catch (error) {
    console.error('Supabase initialization failed:', error)
}

if (!client) {
    console.log('[SUPABASE] Creating local development mock client to prevent app crashes...');
    const dummyAuth = {
        getUser: async () => ({ data: { user: { id: 'local_user', email: 'local@example.com' } }, error: null }),
        getSession: async () => ({ data: { session: { access_token: 'local_token', user: { id: 'local_user', email: 'local@example.com' } } }, error: null }),
        onAuthStateChange: (callback) => {
            setTimeout(() => {
                try {
                    callback('SIGNED_IN', { access_token: 'local_token', user: { id: 'local_user', email: 'local@example.com' } });
                } catch (e) {
                    console.warn('[SUPABASE_MOCK] Auth change callback error:', e);
                }
            }, 0);
            return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signOut: async () => ({ error: null }),
        resetPasswordForEmail: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: { session: { access_token: 'local_token' } }, error: null }),
        signUp: async () => ({ data: { session: { access_token: 'local_token' } }, error: null }),
        updateUser: async () => ({ error: null }),
    };

    const makeQueryBuilder = () => {
        const builder = new Proxy({}, {
            get(target, prop) {
                if (prop === 'then') {
                    return (resolve) => resolve({ data: [], error: null });
                }
                return () => builder;
            }
        });
        return builder;
    };

    const dummyStorage = {
        from: () => ({
            upload: async () => ({ data: { path: 'local_path' }, error: null }),
            getPublicUrl: (path) => ({ data: { publicUrl: `/uploads/${path}` } }),
        }),
    };

    client = {
        auth: dummyAuth,
        from: () => makeQueryBuilder(),
        storage: dummyStorage,
        isDemo: true,
    };
}

// Attach browser sessions only to configured first-party API destinations.
if (typeof window !== 'undefined') {
    window.fetch = createAuthenticatedFetch({
        fetch: window.fetch.bind(window),
        getSession: () => client.auth.getSession(),
        origin: window.location.origin,
        apiBaseUrl: API_BASE_URL
    });
}

export const supabase = client
