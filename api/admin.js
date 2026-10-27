// ============================================================
// HOUSE OF BULBUL — UNIFIED ADMIN API ROUTER (1 Serverless Function)
// Consolidates all admin endpoints so the project easily stays within
// Vercel Hobby plan limits (max 12 serverless functions).
// ============================================================
const { cors, err } = require('../lib/helpers');

const handlers = {
  'auth-login':        require('../lib/admin/auth-login'),
  'auth-me':           require('../lib/admin/auth-me'),
  'analytics':         require('../lib/admin/analytics'),
  'campaigns':         require('../lib/admin/campaigns'),
  'campaigns-item':    require('../lib/admin/campaigns-item'),
  'collections':       require('../lib/admin/collections'),
  'collections-item':  require('../lib/admin/collections-item'),
  'media':             require('../lib/admin/media'),
  'products':          require('../lib/admin/products'),
  'products-item':     require('../lib/admin/products-item'),
  'settings':          require('../lib/admin/settings'),
  'users':             require('../lib/admin/users')
};

module.exports = async (req, res) => {
  if (cors(req, res)) return;

  // Extract the route either from req.query.route or from req.url
  req.query = req.query || {};
  let route = req.query.route;
  if (!route) {
    const rawPath = (req.url || '').split('?')[0];
    route = rawPath.replace(/^\/api\/admin\/?/, '');
  }
  route = (route || '').replace(/^\/+|\/+$/g, '');

  if (!route) {
    return err(res, 'Admin API route not specified', 400);
  }

  // Preserve req.url with proper path for handlers that inspect req.url
  const queryStr = req.url && req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
  req.url = `/api/admin/${route}${queryStr}`;

  // 1. Auth routes
  if (route === 'auth/login') return handlers['auth-login'](req, res);
  if (route === 'auth/me')    return handlers['auth-me'](req, res);

  // 2. Simple endpoints
  if (route === 'analytics') return handlers['analytics'](req, res);
  if (route === 'settings')  return handlers['settings'](req, res);
  if (route === 'users')     return handlers['users'](req, res);
  if (route === 'media')     return handlers['media'](req, res);

  // 3. Products
  if (route === 'products') return handlers['products'](req, res);
  if (route.startsWith('products/')) {
    const parts = route.split('/');
    req.query.id = parts[1];
    return handlers['products-item'](req, res);
  }

  // 4. Collections
  if (route === 'collections') return handlers['collections'](req, res);
  if (route.startsWith('collections/')) {
    const parts = route.split('/');
    req.query.handle = parts[1];
    return handlers['collections-item'](req, res);
  }

  // 5. Campaigns
  if (route === 'campaigns') return handlers['campaigns'](req, res);
  if (route.startsWith('campaigns/')) {
    const parts = route.split('/');
    req.query.id = parts[1];
    return handlers['campaigns-item'](req, res);
  }

  return err(res, `Unknown admin route: ${route}`, 404);
};
