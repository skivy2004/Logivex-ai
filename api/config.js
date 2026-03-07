module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  function normalizeEnv(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().replace(/^['"]|['"]$/g, '').trim();
    return trimmed || null;
  }

  const googleMapsApiKey = normalizeEnv(process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_API_KEY);
  const supabaseUrl = normalizeEnv(process.env.SUPABASE_URL);
  const supabaseAnonKey = normalizeEnv(process.env.SUPABASE_ANON_KEY);

  return res.status(200).json({
    googleMapsApiKey: googleMapsApiKey || null,
    supabaseUrl,
    supabaseAnonKey
  });
};
