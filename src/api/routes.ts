import { Router, Request, Response, NextFunction } from 'express';
import { Database } from 'sqlite';
import { getDb } from '../db/database';

const router = Router();

router.get('/system/status', async (req, res) => {
  try {
    const db = await getDb();
    const tenants = await db.all('SELECT slug, is_exempt, created_at FROM tenants');
    res.json({
      db: 'connected',
      tenantCount: tenants.length,
      tenants: tenants,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'System check failed', details: (error as Error).message });
  }
});

// Middleware to resolve tenant
const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  const slug = req.headers['x-tenant-slug'] || req.query.tenant || req.params.tenantSlug;
  console.log(`[API] Resolving tenant for slug: ${slug} (Path: ${req.path})`);
  
  if (!slug) {
    console.warn('[API] Missing tenant slug in request');
    return res.status(400).json({ error: 'Tenant slug is required' });
  }

  try {
    const db = await getDb();
    const tenant = await db.get('SELECT * FROM tenants WHERE slug = ?', slug);
    
    if (!tenant) {
      console.warn(`[API] Tenant not found for slug: ${slug}`);
      return res.status(404).json({ error: `Estabelecimento não encontrado: ${slug}` });
    }
    
    (req as any).tenant = tenant;
    next();
  } catch (error) {
    console.error('[API] Error in resolveTenant:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar dados do estabelecimento',
      details: (error as Error).message,
      slug: slug 
    });
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

async function seedTenantSampleData(db: Database, tenantId: number) {
  // 1. Create categories
  const categories = ['Hambúrgueres', 'Bebidas', 'Acompanhamentos'];
  const categoryIds: number[] = [];
  
  for (let i = 0; i < categories.length; i++) {
    const result = await db.run(
      'INSERT INTO categories (tenant_id, name, order_index) VALUES (?, ?, ?)',
      tenantId, categories[i], i
    );
    categoryIds.push(result.lastID!);
  }

  // 2. Create products
  const products = [
    {
      categoryId: categoryIds[0],
      name: 'X-Burger Clássico',
      description: 'Pão de brioche, blend de 150g, queijo cheddar, alface, tomate e maionese secreta.',
      price: 28.90,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
      options: [
        { name: 'Bem Passado', type: 'variation', price: 0 },
        { name: 'Ao Ponto', type: 'variation', price: 0 },
        { name: 'Mal Passado', type: 'variation', price: 0 },
        { name: 'Extra Queijo', type: 'addition', price: 4.50 },
        { name: 'Bacon', type: 'addition', price: 6.00 }
      ]
    },
    {
      categoryId: categoryIds[0],
      name: 'Monstruoso Burger',
      description: 'Pão australiano, 2 blends de 180g, bacon caramelizado, cebola crispy e muito cheddar.',
      price: 42.00,
      image: 'https://images.unsplash.com/photo-1594212699903-ec8a3ecc50f6?w=800&q=80',
      options: []
    },
    {
      categoryId: categoryIds[1],
      name: 'Coca-Cola 350ml',
      description: 'Lata gelada.',
      price: 6.50,
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80',
      options: []
    },
    {
      categoryId: categoryIds[2],
      name: 'Batata Rústica',
      description: 'Porção crocante com alecrim e páprica.',
      price: 18.00,
      image: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=800&q=80',
      options: []
    }
  ];

  for (const prod of products) {
    const result = await db.run(
      'INSERT INTO menu_items (tenant_id, category_id, name, description, price, image) VALUES (?, ?, ?, ?, ?, ?)',
      tenantId, prod.categoryId, prod.name, prod.description, prod.price, prod.image
    );
    const itemId = result.lastID!;

    for (const opt of prod.options) {
      await db.run(
        'INSERT INTO product_options (menu_item_id, name, type, price) VALUES (?, ?, ?, ?)',
        itemId, opt.name, opt.type, opt.price
      );
    }
  }
}

router.post('/superadmin/tenants', async (req, res) => {
  const { slug, name, admin_username, admin_password, address, lat, lng, populateSampleData } = req.body;
  console.log('[API] Criando novo tenant:', { slug, name, populateSampleData });
  
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
    const tenantId = result.lastID!;
    
    if (populateSampleData) {
      await seedTenantSampleData(db, tenantId);
    }

    console.log('[API] Tenant criado com sucesso. ID:', tenantId);
    res.json({ success: true, tenantId });
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
    
    // Get all categories first
    const categories = await db.all('SELECT * FROM categories WHERE tenant_id = ? ORDER BY order_index ASC', tenantId);
    
    // Get all items
    const items = await db.all('SELECT * FROM menu_items WHERE tenant_id = ? AND status = "available"', tenantId);
    
    // Group items by category
    const menu = categories.map(cat => ({
      ...cat,
      items: items.filter(item => item.category_id === cat.id)
    }));
    
    // Add items that might not have a category (fallback)
    const categorizedItemIds = new Set(items.filter(i => i.category_id).map(i => i.id));
    const uncategorizedItems = items.filter(i => !i.category_id || !categorizedItemIds.has(i.id));
    
    if (uncategorizedItems.length > 0) {
      menu.push({
        id: 0,
        name: 'Geral',
        order_index: 999,
        is_active: 1,
        items: uncategorizedItems
      } as any);
    }

    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching menu' });
  }
});

router.get('/menu-items/:itemId', resolveTenant, async (req, res) => {
  const { itemId } = req.params;
  try {
    const db = await getDb();
    const item = await db.get('SELECT * FROM menu_items WHERE id = ?', itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    
    const options = await db.all('SELECT * FROM product_options WHERE menu_item_id = ? AND is_active = 1', itemId);
    res.json({ ...item, options });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching item details' });
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

// --- USER ADDRESSES ---
router.get('/users/:userId/addresses', resolveTenant, async (req, res) => {
  const { userId } = req.params;
  try {
    const db = await getDb();
    const addresses = await db.all('SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC', userId);
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching addresses' });
  }
});

router.post('/users/:userId/addresses', resolveTenant, async (req, res) => {
  const { userId } = req.params;
  const { type, cep, street, number, neighborhood, city, state, complement, is_default } = req.body;
  try {
    const db = await getDb();
    
    if (is_default) {
      await db.run('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', userId);
    }
    
    // Check if address already exists to avoid duplicates
    const existing = await db.get(
      'SELECT id FROM user_addresses WHERE user_id = ? AND street = ? AND number = ? AND cep = ?',
      userId, street, number, cep
    );

    if (existing) {
      if (is_default) {
        await db.run('UPDATE user_addresses SET is_default = 1 WHERE id = ?', existing.id);
      }
      return res.json({ success: true, id: existing.id, existed: true });
    }

    const result = await db.run(
      'INSERT INTO user_addresses (user_id, type, cep, street, number, neighborhood, city, state, complement, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      userId, type || 'Casa', cep, street, number, neighborhood, city, state, complement, is_default ? 1 : 0
    );
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: 'Error saving address' });
  }
});

router.delete('/users/:userId/addresses/:addressId', resolveTenant, async (req, res) => {
  const { addressId } = req.params;
  try {
    const db = await getDb();
    await db.run('DELETE FROM user_addresses WHERE id = ?', addressId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting address' });
  }
});

router.post('/orders', resolveTenant, async (req, res) => {
  const { user_id, client_name, client_phone, items, total_price, delivery_address, delivery_lat, delivery_lng, payment_method, change_amount } = req.body;
  const tenantId = (req as any).tenant.id;
  
  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO orders (tenant_id, user_id, client_name, client_phone, items, total_price, delivery_address, delivery_lat, delivery_lng, payment_method, change_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      tenantId, user_id || null, client_name, client_phone, JSON.stringify(items), total_price, delivery_address, delivery_lat || null, delivery_lng || null, payment_method || 'PIX', change_amount || null
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
    const pendingOrders = await db.get('SELECT COUNT(*) as count FROM orders WHERE tenant_id = ? AND status IN ("pending", "preparing")', tenantId);
    const activeMotoboys = await db.get('SELECT COUNT(*) as count FROM motoboys WHERE tenant_id = ? AND status != "offline"', tenantId);
    
    // Orders by day for chart
    const ordersByDay = await db.all(`
      SELECT date(created_at) as day, COUNT(*) as total 
      FROM orders 
      WHERE tenant_id = ? 
      GROUP BY day 
      ORDER BY day ASC 
      LIMIT 7
    `, tenantId);

    const revenueByMethod = await db.all(`
      SELECT payment_method as method, SUM(total_price) as total
      FROM orders
      WHERE tenant_id = ? AND status = "delivered"
      GROUP BY method
    `, tenantId);

    res.json({
      totalOrders: totalOrders.count || 0,
      totalRevenue: totalRevenue.sum || 0,
      pendingOrders: pendingOrders.count || 0,
      activeMotoboys: activeMotoboys.count || 0,
      ordersByDay: ordersByDay.length > 0 ? ordersByDay : [{ day: new Date().toISOString().split('T')[0], total: 0 }],
      revenueByMethod
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

// Settings Management
router.get('/admin/settings', resolveTenant, async (req, res) => {
  const tenant = (req as any).tenant;
  res.json({
    logo: tenant.logo,
    is_open: tenant.is_open,
    delivery_fee: tenant.delivery_fee,
    prep_time_avg: tenant.prep_time_avg,
    opening_hours: tenant.opening_hours ? JSON.parse(tenant.opening_hours) : null,
    address: tenant.address
  });
});

router.put('/admin/settings', resolveTenant, async (req, res) => {
  const tenantId = (req as any).tenant.id;
  const { logo, is_open, delivery_fee, prep_time_avg, opening_hours, address } = req.body;
  try {
    const db = await getDb();
    await db.run(
      'UPDATE tenants SET logo = ?, is_open = ?, delivery_fee = ?, prep_time_avg = ?, opening_hours = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      logo, is_open ? 1 : 0, delivery_fee, prep_time_avg, JSON.stringify(opening_hours), address, tenantId
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error updating settings' });
  }
});

// Category Management
router.get('/admin/categories', resolveTenant, async (req, res) => {
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const categories = await db.all('SELECT * FROM categories WHERE tenant_id = ? ORDER BY order_index ASC', tenantId);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

router.post('/admin/categories', resolveTenant, async (req, res) => {
  const tenantId = (req as any).tenant.id;
  const { name, order_index } = req.body;
  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO categories (tenant_id, name, order_index) VALUES (?, ?, ?)',
      tenantId, name, order_index || 0
    );
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: 'Error creating category' });
  }
});

// Customer Management
router.get('/admin/customers', resolveTenant, async (req, res) => {
  const tenantId = (req as any).tenant.id;
  try {
    const db = await getDb();
    const customers = await db.all(`
      SELECT u.id, u.name, u.phone, u.is_vip, u.created_at,
             COUNT(o.id) as total_orders,
             SUM(o.total_price) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'delivered'
      WHERE u.tenant_id = ?
      GROUP BY u.id
      ORDER BY total_orders DESC
    `, tenantId);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching customers' });
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

router.get('/motoboy/available-orders', resolveMotoboy, async (req, res) => {
    const tenantId = (req as any).motoboy.tenant_id;
    try {
      const db = await getDb();
      const orders = await db.all(`
        SELECT * FROM orders 
        WHERE tenant_id = ? AND status = 'ready' AND motoboy_id IS NULL
        ORDER BY created_at ASC
      `, tenantId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching available orders' });
    }
});

router.post('/motoboy/orders/:orderId/accept', resolveMotoboy, async (req, res) => {
    const { orderId } = req.params;
    const motoboyId = (req as any).motoboy.id;
    const tenantId = (req as any).motoboy.tenant_id;
    try {
      const db = await getDb();
      
      // Atomic check if still available
      const order = await db.get('SELECT * FROM orders WHERE id = ? AND tenant_id = ? AND status = "ready" AND motoboy_id IS NULL', orderId, tenantId);
      if (!order) {
        return res.status(400).json({ error: 'Pedido não está mais disponível' });
      }

      await db.run('UPDATE orders SET status = "out_for_delivery", motoboy_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', motoboyId, orderId);
      await db.run('INSERT INTO order_history (order_id, status, note) VALUES (?, "out_for_delivery", "Motoboy aceitou a entrega")', orderId);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error accepting order' });
    }
});

// Default 404 for API
router.use((req, res) => {
  console.warn(`[API] Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

export default router;
