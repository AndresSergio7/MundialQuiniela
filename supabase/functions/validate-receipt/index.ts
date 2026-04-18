// ============================================================
// validate-receipt — Edge Function.
// Validates an Apple or Google purchase receipt server-side and
// grants the corresponding entitlement atomically.
//
// Request body:
//   { payment_id: string }
//
// Response:
//   { valid: boolean, entitlement_id?: string, error?: string }
//
// The function:
//   1. loads the payment row (pending),
//   2. verifies the receipt with Apple (verifyReceipt) or
//      Google (androidpublisher v3),
//   3. marks the payment verified or failed,
//   4. calls grant_entitlement_from_payment — idempotent, so
//      retries and restores cannot double-grant.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const APPLE_PROD = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';
const APPLE_SHARED_SECRET = Deno.env.get('APPLE_SHARED_SECRET') ?? '';

interface Payment {
  id: string;
  platform: 'ios' | 'android' | 'web';
  receipt_data: string | null;
  product_id: string;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let payment_id: string | null = null;
  try {
    ({ payment_id } = await req.json());
  } catch {
    return json({ valid: false, error: 'Invalid request body.' }, 400);
  }
  if (!payment_id) return json({ valid: false, error: 'payment_id required' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: payment } = await supabase
    .from('payments')
    .select('id, platform, receipt_data, product_id, status')
    .eq('id', payment_id)
    .maybeSingle();

  if (!payment) return json({ valid: false, error: 'Payment not found.' }, 404);
  const p = payment as Payment;

  // Already verified → short-circuit via idempotent grant.
  if (p.status === 'verified') {
    const { data: ent } = await supabase.rpc('grant_entitlement_from_payment', {
      p_payment_id: p.id,
    });
    return json({
      valid: true,
      entitlement_id: ent?.entitlement_id ?? null,
      reused: true,
    });
  }

  let valid = false;
  try {
    if (p.platform === 'ios') {
      valid = await verifyApple(p.receipt_data ?? '', p.product_id);
    } else if (p.platform === 'android') {
      valid = await verifyGoogle(p.receipt_data ?? '', p.product_id);
    } else {
      // web / demo path — always valid but the payment row stays
      // flagged verified so restore flows can dedupe.
      valid = true;
    }
  } catch (err) {
    console.error('receipt validation threw', err);
    valid = false;
  }

  await supabase
    .from('payments')
    .update({
      status: valid ? 'verified' : 'failed',
      verified_at: new Date().toISOString(),
    })
    .eq('id', p.id);

  if (!valid) return json({ valid: false, error: 'Receipt rejected.' });

  const { data: grant } = await supabase.rpc('grant_entitlement_from_payment', {
    p_payment_id: p.id,
  });

  return json({
    valid: true,
    entitlement_id: grant?.entitlement_id ?? null,
    reused: !!grant?.reused,
  });
});

// ---------- helpers ----------
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function verifyApple(receipt: string, expectedProductId: string): Promise<boolean> {
  if (!receipt) return false;
  const post = async (url: string) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receipt,
        password: APPLE_SHARED_SECRET,
        'exclude-old-transactions': true,
      }),
    }).then((r) => r.json());

  let resp = await post(APPLE_PROD);
  if (resp.status === 21007) resp = await post(APPLE_SANDBOX); // sandbox retry
  if (resp.status !== 0) return false;

  const latest = resp.latest_receipt_info?.[0] ?? resp.receipt?.in_app?.[0];
  return latest?.product_id === expectedProductId;
}

async function verifyGoogle(purchaseToken: string, productId: string): Promise<boolean> {
  // Minimal server-to-server validation using a service account JWT.
  // Fill in GOOGLE_PACKAGE_NAME + GOOGLE_SERVICE_ACCOUNT_JSON secrets to enable.
  const packageName = Deno.env.get('GOOGLE_PACKAGE_NAME');
  const saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!packageName || !saJson || !purchaseToken) return false;

  try {
    const token = await googleAccessToken(JSON.parse(saJson));
    const url =
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}` +
      `/purchases/products/${productId}/tokens/${purchaseToken}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { purchaseState?: number };
    // 0 = purchased, 1 = cancelled, 2 = pending
    return data.purchaseState === 0;
  } catch (err) {
    console.error('google verify failed', err);
    return false;
  }
}

// Minimal Google OAuth2 JWT exchange.
async function googleAccessToken(sa: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsigned = `${enc(header)}.${enc(claim)}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBuf(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key,
    new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${bufToB64Url(sig)}`;
  const tokRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  }).then((r) => r.json());
  return tokRes.access_token as string;
}

function pemToBuf(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function bufToB64Url(buf: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(buf));
  return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
