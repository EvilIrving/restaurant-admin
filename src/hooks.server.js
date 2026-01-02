import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

console.log('[hooks] Supabase URL:', PUBLIC_SUPABASE_URL ? PUBLIC_SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET');
console.log('[hooks] Supabase Key:', PUBLIC_SUPABASE_ANON_KEY ? 'SET (' + PUBLIC_SUPABASE_ANON_KEY.length + ' chars)' : 'NOT SET');

export async function handle({ event, resolve }) {
    event.locals.supabase = createServerClient(
        PUBLIC_SUPABASE_URL,
        PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll: () => event.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        event.cookies.set(name, value, { ...options, path: '/' });
                    });
                },
            },
        }
    );

    event.locals.getSession = async () => {
        const {
            data: { session },
        } = await event.locals.supabase.auth.getSession();
        return session;
    };

    return resolve(event, {
        filterSerializedResponseHeaders(name) {
            return name === 'content-range' || name === 'x-supabase-api-version';
        },
    });
}
