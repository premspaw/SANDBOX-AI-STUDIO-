import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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
                } catch (e) {}
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

// Global fetch interceptor to automatically attach Supabase session token
if (typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    window.fetch = async (url, options = {}) => {
        const urlStr = typeof url === 'string' ? url : (url?.toString() || '');
        // Only attach if it's an internal API endpoint
        if (client && (urlStr.includes('/api/') || urlStr.includes('/api/ugc'))) {
            try {
                const { data: { session } } = await client.auth.getSession();
                if (session?.access_token) {
                    options.headers = options.headers || {};
                    if (typeof options.headers.set === 'function') {
                        if (!options.headers.has('Authorization')) {
                            options.headers.set('Authorization', `Bearer ${session.access_token}`);
                        }
                    } else if (Array.isArray(options.headers)) {
                        const hasAuth = options.headers.some(([k]) => k.toLowerCase() === 'authorization');
                        if (!hasAuth) {
                            options.headers.push(['Authorization', `Bearer ${session.access_token}`]);
                        }
                    } else {
                        const hasAuth = !!(options.headers['Authorization'] || options.headers['authorization']);
                        if (!hasAuth) {
                            options.headers['Authorization'] = `Bearer ${session.access_token}`;
                        }
                    }
                }
            } catch (err) {
                console.warn('[FETCH INTERCEPTOR] Failed to attach authorization token:', err);
            }
        }
        return originalFetch(url, options);
    };
}

export const supabase = client
