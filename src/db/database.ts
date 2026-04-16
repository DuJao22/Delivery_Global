import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDb() {
  if (!db) {
    // Choose a persistent location if available (Render, Docker, etc)
    const dbDir = process.env.DB_PATH || process.env.RENDER_DISK_PATH || process.cwd();
    const dbPath = path.join(dbDir, 'database.sqlite');
    
    console.log(`[DB] Using database at: ${dbPath}`);
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  }
  return db;
}

export async function initDb() {
  const database = await getDb();
  
  try {
    // Tenants (Restaurants/Stores)
    await database.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        logo TEXT,
        cover_image TEXT,
        primary_color TEXT DEFAULT '#EF4444',
        secondary_color TEXT DEFAULT '#F9FAFB',
        admin_username TEXT,
        admin_password TEXT,
        status TEXT DEFAULT 'active',
        address TEXT,
        lat REAL,
        lng REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT,
        image TEXT,
        status TEXT DEFAULT 'available',
        FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        password TEXT,
        address_text TEXT,
        lat REAL,
        lng REAL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, phone),
        FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS motoboys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        plate TEXT,
        status TEXT DEFAULT 'offline', -- offline, online, busy
        lat REAL,
        lng REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        user_id INTEGER,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        items TEXT NOT NULL, -- JSON string
        total_price REAL NOT NULL,
        status TEXT DEFAULT 'pending', -- pending, preparing, ready, out_for_delivery, delivered, cancelled
        delivery_address TEXT NOT NULL,
        delivery_lat REAL,
        delivery_lng REAL,
        motoboy_id INTEGER,
        route_order INTEGER, -- for manual routing
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
        FOREIGN KEY (motoboy_id) REFERENCES motoboys (id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS order_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
      );
    `);

      // Seed initial data if empty
      const tenantCount = await database.get('SELECT COUNT(*) as count FROM tenants');
      if (tenantCount.count === 0) {
        // First Tenant
        const result1 = await database.run(`
          INSERT INTO tenants (slug, name, admin_username, admin_password, address, lat, lng) 
          VALUES ('burguer-central', 'Burguer Central', 'Dujao', '30031936', 'Av. Paulista, 1000, São Paulo', -23.5614, -46.6559)
        `);
        const id1 = result1.lastID;

        await database.run(`
          INSERT INTO menu_items (tenant_id, name, description, price, category, image) VALUES 
          (?, 'X-Burger Clássico', 'Pão Brioche, Blend 180g, Queijo Cheddar, Maionese da Casa.', 28.90, 'Hambúrgueres', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80'),
          (?, 'Combo Brutal', 'X-Burger + Batata Frita + Refrigerante 350ml.', 45.00, 'Combos', 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&q=80'),
          (?, 'Fritas com Cheddar e Bacon', 'Batata palito crocante com queijo e bacon.', 22.50, 'Acompanhamentos', 'https://images.unsplash.com/photo-1573082883907-8b9bb260163c?w=500&q=80')
        `, id1, id1, id1);

        // Second Tenant (Requested Example)
        const result2 = await database.run(`
          INSERT INTO tenants (slug, name, admin_username, admin_password, address, lat, lng) 
          VALUES ('lanchonete-exemplo', 'Lanchonete Exemplo', 'Dujao', '30031936', 'Rua das Flores, 123, Centro', -23.5505, -46.6333)
        `);
        const id2 = result2.lastID;

        await database.run(`
          INSERT INTO menu_items (tenant_id, name, description, price, category, image) VALUES 
          (?, 'Pizza Calabresa Média', 'Molho de tomate, mussarela, calabresa e orégano.', 42.00, 'Pizzas', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80'),
          (?, 'Suco de Laranja 500ml', 'Suco natural feito na hora.', 12.00, 'Bebidas', 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=500&q=80'),
          (?, 'Açaí 500ml', 'Com granola, banana e leite em pó.', 18.50, 'Sobremesas', 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=500&q=80')
        `, id2, id2, id2);

        await database.run(`
          INSERT INTO motoboys (tenant_id, name, phone, plate, status) VALUES 
          (?, 'Roberto Silva', '11999999999', 'XYZ-1234', 'online'),
          (?, 'Marta Santos', '11888888888', 'ABC-5678', 'online'),
          (?, 'Carlos Correon', '11777777777', 'KLI-9988', 'online')
        `, id1, id1, id2);
      }
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
  }
}

