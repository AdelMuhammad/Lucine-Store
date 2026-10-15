// Supabase Edge Function: admin-create-user
//
// Creates a store account from the admin console. The browser only sends the
// fields; this function holds the service_role key and refuses to run unless
// the caller's own profile row has role = 'admin'.
//
// Deploy:
//   supabase functions deploy admin-create-user --project-ref <project-ref>
//
// No secrets are read from the request: SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY are injected automatically by the platform.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method-not-allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'server-misconfigured' }, 500)
  }

  const authorization = req.headers.get('Authorization') ?? ''
  if (!authorization) return json({ error: 'forbidden' }, 401)

  // Resolve the caller from their JWT.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data: caller, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !caller.user) {
    return json({ error: 'forbidden' }, 401)
  }

  // Service-role client for the privileged admin operations.
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('user_id', caller.user.id)
    .maybeSingle()
  if (callerProfile?.role !== 'admin') {
    return json({ error: 'forbidden' }, 403)
  }

  let payload: Record<string, unknown>
  try {
    payload = (await req.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid-payload' }, 400)
  }

  const email = String(payload.email ?? '').trim().toLowerCase()
  const password = String(payload.password ?? '')
  const fullName = String(payload.fullName ?? '').trim()
  const phone = String(payload.phone ?? '').trim()
  const role = payload.role === 'admin' ? 'admin' : 'customer'

  if (!EMAIL_PATTERN.test(email)) return json({ error: 'invalid-email' }, 400)
  if (password.length < 6) return json({ error: 'weak-password' }, 400)

  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      // Email confirmation is disabled; make the account usable immediately.
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

  if (createError || !created.user) {
    const message = (createError?.message ?? '').toLowerCase()
    if (
      message.includes('already') ||
      message.includes('registered') ||
      message.includes('exists')
    ) {
      return json({ error: 'email-in-use' }, 409)
    }
    return json({ error: 'create-failed' }, 400)
  }

  // The `handle_new_user` trigger inserts the profile row, but upserting here
  // guarantees the row (and the chosen role/phone) even if the trigger is
  // missing from the project.
  await adminClient.from('profiles').upsert(
    {
      user_id: created.user.id,
      email,
      full_name: fullName,
      phone,
      role,
    },
    { onConflict: 'user_id' },
  )

  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('user_id', created.user.id)
    .maybeSingle()

  return json({ profile }, 200)
})
