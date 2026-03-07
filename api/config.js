module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const googleMapsApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  return res.status(200).json({
    googleMapsApiKey: googleMapsApiKey || null,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
};
