import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { requireAuthContext } = require('../lib/serverless-auth.js');
const { methodNotAllowed } = require('../lib/serverless-utils.js');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const auth = await requireAuthContext(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  return res.status(200).json({
    success: true,
    user: {
      id: auth.userProfile.id,
      email: auth.userProfile.email,
      name: auth.userProfile.name,
      role: auth.userProfile.role || 'user'
    }
  });
}
