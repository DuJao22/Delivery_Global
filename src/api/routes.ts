import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db/database';

const router = Router();

// Middleware to resolve tenant
const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  const slug = req.headers['x-tenant-slug'] || req.query.tenant || req.params.tenantSlug;
  if (!slug) {
    return res.status(400).json({ error: 'Tenant slug is required' });
  }

  try {
    const db = await getDb();
    const tenant = await db.get('SELECT * FROM tenants WHERE slug = ?', slug);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    (req as any).tenant = tenant;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error resolving tenant' });
  }
};

// --- SUPER ADMIN ROUTES ---
router.post('/superadmin/login', async (req, res) => {
  const { username, password } = req.body;
  const expectedUser = process.env.SUPERADMIN_USER || 'Dujao';
  const expectedPass = process.env.SUPERADMIN_PASS || '30031936';

  if (username === expectedUser && password === expectedPass) {
    res.json({ success: true, token: 'superadmin-secret-token' });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

router.get('/superadmin/tenants', async (req, res) => {
  try {
    const db = await getDb();
    const tenants = await db.all('SELECT * FROM tenants ORDER BY created_at DESC');
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tenants' });
  }
});

router.get('/tenants/check/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const db = await getDb();
    // Use case-insensitive search if possible, or force lowercase
    const tenant = await db.get('SELECT slug, name, status FROM tenants WHERE LOWER(slug) = ?', slug.toLowerCase());
    if (tenant) {
      res.json({ exists: true, name: tenant.name, status: tenant.status, slug: tenant.slug });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error checking tenant' });
  }
});

router.post('/superadmin/tenants', async (req, res) => {
  const { slug, name, admin_username, admin_password, address, lat, lng } = req.body;
  console.log('[API] Criando novo tenant:', { slug, name });
  
  try {
    const db = await getDb();
    
    // Check if slug already exists to give a better error
    const existing = await db.get('SELECT id FROM tenants WHERE slug = ?', slug);
    if (existing) {
      console.warn(`[API] Tentativa de criar tenant com slug já existente: ${slug}`);
      return res.status(400).json({ error: 'Este link já está em uso.' });
    }

    const result = await db.run(
      'INSERT INTO tenants (slug, name, admin_username, admin_password, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)',
      slug, name, admin_username || 'admin', admin_password || 'admin123', address, lat, lng
    );
    console.log('[API] Tenant criado com sucesso. ID:', result.lastID);
    res.json({ success: true, tenantId: result.lastID });
  } catch (error) {
    console.error('[API] Erro detalhado ao criar tenant:', error);
    res.status(500).json({ 
      error: 'Erro interno ao criar estabelecimento',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.put('/superadmin/tenants/:id', async (req, res) => {
  const { id } = req.params;
  const { name, primary_color, secondary_color, logo, cover_image, payment_config, is_exempt } = req.body;
  try {
    const db = await getDb();
    await db.run(
      'UPDATE tenants SET name = ?, primary_color = ?, secondary_color = ?, logo = ?, cover_image = ?, payment_config = ?, is_exempt = ? WHERE id = ?',
      name, primary_color, secondary_color, logo, cover_image, payment_config, is_exempt ? 1 : 0, id
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error updating tenant' });
  }
});

router.put('/superadmin/tenants/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const db = await getDb();
    await db.run('UPDATE tenants SET status = ? WHERE id = ?', status, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error updating status' });
  }
});

router.delete('/superadmin/tenants/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    await db.run('DELETE FROM tenants WHERE id = ?', id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting tenant' });
  }
});

router.get('/superadmin/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

router.post('/superadmin/push-subscription', (req, res) => {
  // Store subscription in DB if needed
  res.json({ success: true });
});

// --- PUBLIC STORE ROUTES ---
router.get('/tenants', async (req, res) => {
    try {
      const db = await getDb();
      const tenants = await db.all('SELECT id, slug, name, logo, cover_image, address FROM tenants WHERE status = "active" ORDER BY created_at DESC');
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching tenants' });
    }
});

router.get('/store-info', resolveTenant, (req, res) => {
  const tenant = { ...(req as any).tenant };
  delete tenant.admin_password;
  delete tenant.admin_username;
  res.json(tenant);
});

router.get('/menu', resolveTenant, async (req, res) => {
  try {
    const db = await getDb();
    const tenantId = (req as any).tenant.id;
    const items = await db.all('SELECT * FROM menu_items WHERE tenant_id = ? AND status = "available"', tenantId);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching menu' });
  }
});

// --- CLIENT ROUTES ---
router.post('/users/check', resolveTenant, async (req, res) => {
  const { phone } = req.body;
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const user = await db.get('SELECT id, name FROM users WHERE phone = ? AND tenant_id = ?', phone, tenantId);
    res.json({ exists: !!user, name: user?.name, user_id: user?.id });
  } catch (error) {
    res.status(500).json({ error: 'Error checking user' });
  }
});

router.post('/users/login', resolveTenant, async (req, res) => {
  const { phone, password } = req.body;
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE phone = ? AND password = ? AND tenant_id = ?', phone, password, tenantId);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } else {
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

router.post('/users/register', resolveTenant, async (req, res) => {
  const { name, phone, password } = req.body;
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO users (tenant_id, name, phone, password) VALUES (?, ?, ?, ?)',
      tenantId, name, phone, password
    );
    res.json({ success: true, user_id: result.lastID, name, phone });
  } catch (error) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

router.post('/orders', resolveTenant, async (req, res) => {
  const { user_id, client_name, client_phone, items, total_price, delivery_address, delivery_lat, delivery_lng } = req.body;
  const tenantId = (req as any).tenant.id;
  
  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO orders (tenant_id, user_id, client_name, client_phone, items, total_price, delivery_address, delivery_lat, delivery_lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      tenantId, user_id || null, client_name, client_phone, JSON.stringify(items), total_price, delivery_address, delivery_lat, delivery_lng
    );
    
    // Add history
    await db.run('INSERT INTO order_history (order_id, status, note) VALUES (?, ?, ?)', result.lastID, 'pending', 'Pedido recebido');
    
    res.json({ success: true, orderId: result.lastID });
  } catch (error) {
    res.status(500).json({ error: 'Error creating order' });
  }
});

router.get('/users/:userId/orders', resolveTenant, async (req, res) => {
    const { userId } = req.params;
    const tenantId = (req as any).tenant.id;
    try {
      const db = await getDb();
      const orders = await db.all(`
        SELECT o.*, m.name as motoboy_name 
        FROM orders o 
        LEFT JOIN motoboys m ON o.motoboy_id = m.id
        WHERE o.user_id = ? AND o.tenant_id = ? 
        ORDER BY o.created_at DESC
      `, userId, tenantId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching orders' });
    }
});

// --- ADMIN ROUTES ---
router.post('/admin/login', resolveTenant, async (req, res) => {
  const { username, password } = req.body;
  const tenant = (req as any).tenant;
  
  if (username === (tenant.admin_username || 'admin') && password === (tenant.admin_password || 'admin123')) {
    res.json({ success: true, token: `admin-token-${tenant.slug}` });
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

router.get('/admin/stats', resolveTenant, async (req, res) => {
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const totalOrders = await db.get('SELECT COUNT(*) as count FROM orders WHERE tenant_id = ?', tenantId);
    const totalRevenue = await db.get('SELECT SUM(total_price) as sum FROM orders WHERE tenant_id = ? AND status = "delivered"', tenantId);
    
    // Orders by day for chart
    const ordersByDay = await db.all(`
      SELECT date(created_at) as day, COUNT(*) as total 
      FROM orders 
      WHERE tenant_id = ? 
      GROUP BY day 
      ORDER BY day ASC 
      LIMIT 7
    `, tenantId);

    res.json({
      totalOrders: totalOrders.count || 0,
      totalRevenue: totalRevenue.sum || 0,
      ordersByDay: ordersByDay.length > 0 ? ordersByDay : [{ day: new Date().toISOString().split('T')[0], total: 0 }]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

router.get('/admin/orders', resolveTenant, async (req, res) => {
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const orders = await db.all(`
      SELECT o.*, m.name as motoboy_name 
      FROM orders o 
      LEFT JOIN motoboys m ON o.motoboy_id = m.id 
      WHERE o.tenant_id = ? 
      ORDER BY o.created_at DESC
    `, tenantId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

router.patch('/admin/orders/:id/status', resolveTenant, async (req, res) => {
  const { id } = req.params;
  const { status, note, motoboy_id } = req.body;
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    
    const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status];
    
    if (motoboy_id !== undefined) {
      updates.push('motoboy_id = ?');
      params.push(motoboy_id);
    }
    
    params.push(id, tenantId);
    
    await db.run(`UPDATE orders SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`, ...params);
    await db.run('INSERT INTO order_history (order_id, status, note) VALUES (?, ?, ?)', id, status, note || '');
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error updating order status' });
  }
});

router.get('/admin/motoboys', resolveTenant, async (req, res) => {
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const motoboys = await db.all('SELECT * FROM motoboys WHERE tenant_id = ?', tenantId);
    res.json(motoboys);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching motoboys' });
  }
});

router.post('/admin/motoboys', resolveTenant, async (req, res) => {
  const { name, phone, plate, password } = req.body;
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO motoboys (tenant_id, name, phone, plate, password) VALUES (?, ?, ?, ?, ?)',
      tenantId, name, phone, plate, password || 'delivery123'
    );
    res.json({ success: true, motoboyId: result.lastID });
  } catch (error) {
    res.status(500).json({ error: 'Error creating motoboy' });
  }
});

router.patch('/admin/motoboys/:id/status', resolveTenant, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const db = await getDb();
    await db.run('UPDATE motoboys SET status = ? WHERE id = ?', status, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error updating status' });
  }
});

// --- MOTOBOY ROUTES ---

// Simple helper to get motoboy from token-like header
const resolveMotoboy = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    
    const [_, token] = authHeader.split(' ');
    // In this simple app, token is 'motoboy-token-{tenantSlug}-{motoboyId}'
    const parts = token.split('-');
    const motoboyId = parts[parts.length - 1];
    
    if (!motoboyId) return res.status(401).json({ error: 'Invalid token' });
    
    try {
        const db = await getDb();
        const motoboy = await db.get('SELECT * FROM motoboys WHERE id = ?', motoboyId);
        if (!motoboy) return res.status(404).json({ error: 'Motoboy not found' });
        
        (req as any).motoboy = motoboy;
        next();
    } catch (err) {
        res.status(500).json({ error: 'Auth error' });
    }
}

router.post('/motoboy/login', resolveTenant, async (req, res) => {
    const { phone, password } = req.body;
    const tenantId = (req as any).tenant.id;
    try {
      const db = await getDb();
      const motoboy = await db.get('SELECT * FROM motoboys WHERE tenant_id = ? AND phone = ? AND password = ?', tenantId, phone, password);
      if (motoboy) {
        res.json({ 
            success: true, 
            token: `motoboy-token-${(req as any).tenant.slug}-${motoboy.id}`,
            motoboy 
        });
      } else {
        res.status(401).json({ error: 'Credenciais inválidas' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error logging in' });
    }
});

router.get('/motoboy/me', resolveMotoboy, (req, res) => {
    res.json((req as any).motoboy);
});

router.get('/motoboy/orders', resolveMotoboy, async (req, res) => {
    const motoboyId = (req as any).motoboy.id;
    try {
      const db = await getDb();
      const orders = await db.all(`
        SELECT * FROM orders 
        WHERE motoboy_id = ? AND status IN ('out_for_delivery', 'preparing', 'ready')
        ORDER BY created_at DESC
      `, motoboyId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching orders' });
    }
});

router.patch('/motoboy/location', resolveMotoboy, async (req, res) => {
    const { lat, lng } = req.body;
    const motoboyId = (req as any).motoboy.id;
    try {
      const db = await getDb();
      await db.run('UPDATE motoboys SET lat = ?, lng = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', lat, lng, motoboyId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error updating location' });
    }
});

router.patch('/motoboy/status', resolveMotoboy, async (req, res) => {
    const { status } = req.body;
    const motoboyId = (req as any).motoboy.id;
    try {
      const db = await getDb();
      await db.run('UPDATE motoboys SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', status, motoboyId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error updating status' });
    }
});

router.post('/motoboy/orders/:orderId/complete', resolveMotoboy, async (req, res) => {
    const { orderId } = req.params;
    const motoboyId = (req as any).motoboy.id;
    try {
        const db = await getDb();
        await db.run('UPDATE orders SET status = "delivered", updated_at = CURRENT_TIMESTAMP WHERE id = ? AND motoboy_id = ?', orderId, motoboyId);
        await db.run('INSERT INTO order_history (order_id, status, note) VALUES (?, "delivered", "Entrega concluída")', orderId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error completing order' });
    }
});

export default router;
