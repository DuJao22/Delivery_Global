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

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON;');
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
          payment_config TEXT,
          is_exempt INTEGER DEFAULT 0,
          subscription_due_date DATETIME,
          address TEXT,
          lat REAL,
          lng REAL,
          opening_hours TEXT, -- JSON
          delivery_fee REAL DEFAULT 0,
          prep_time_avg INTEGER DEFAULT 30,
          is_open INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          order_index INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS menu_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id INTEGER NOT NULL,
          category_id INTEGER,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          category TEXT, -- Label for legacy support
          image TEXT,
          status TEXT DEFAULT 'available',
          sku TEXT,
          stock_quantity INTEGER,
          prep_time INTEGER,
          FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS product_options (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          menu_item_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL, -- 'variation' or 'addition'
          price REAL DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          FOREIGN KEY (menu_item_id) REFERENCES menu_items (id) ON DELETE CASCADE
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
        is_vip INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, phone),
        FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT DEFAULT 'Casa', -- 'Casa', 'Trabalho', 'Outro'
        cep TEXT,
        street TEXT NOT NULL,
        number TEXT NOT NULL,
        neighborhood TEXT,
        city TEXT,
        state TEXT,
        complement TEXT,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS motoboys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        password TEXT,
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
        payment_method TEXT, -- 'pix', 'money', 'card'
        change_amount REAL, -- Troco para quanto?
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

      // Seed initial data if missing
      const tenants = await database.all('SELECT slug FROM tenants');
      const existingSlugs = tenants.map(t => t.slug);

      // Force example tenants to be exempt
      try {
        // Check if column exists first
        const tableInfo = await database.all("PRAGMA table_info(tenants)");
        const hasExempt = tableInfo.some(col => col.name === 'is_exempt');
        if (!hasExempt) {
          await database.exec("ALTER TABLE tenants ADD COLUMN is_exempt INTEGER DEFAULT 0");
          console.log("[DB] Added is_exempt column to tenants table");
        }
        await database.run("UPDATE tenants SET is_exempt = 1 WHERE slug IN ('burguer-central', 'lanchonete-exemplo')");
      } catch (e) {
        console.warn("[DB] Failed to force exempt status:", (e as Error).message);
      }

      // Ensure orders has all necessary columns
      try {
        const orderTableInfo = await database.all("PRAGMA table_info(orders)");
        const columns = orderTableInfo.map(col => col.name);
        
        if (!columns.includes('change_amount')) {
          await database.exec("ALTER TABLE orders ADD COLUMN change_amount REAL");
          console.log("[DB] Added change_amount column to orders table");
        }
        
        if (!columns.includes('payment_method')) {
          await database.exec("ALTER TABLE orders ADD COLUMN payment_method TEXT");
          console.log("[DB] Added payment_method column to orders table");
        }

        // Add coordinates if missing (for older databases)
        if (!columns.includes('delivery_lat')) {
          await database.exec("ALTER TABLE orders ADD COLUMN delivery_lat REAL");
        }
        if (!columns.includes('delivery_lng')) {
          await database.exec("ALTER TABLE orders ADD COLUMN delivery_lng REAL");
        }
      } catch (e) {
        console.warn("[DB] Failed to migrate orders table:", (e as Error).message);
      }

      // First Tenant
      if (!existingSlugs.includes('burguer-central')) {
        const result1 = await database.run(`
          INSERT INTO tenants (slug, name, admin_username, admin_password, address, lat, lng, is_exempt) 
          VALUES ('burguer-central', 'Burguer Central', 'Dujao', '30031936', 'Av. Paulista, 1000, São Paulo', -23.5614, -46.6559, 1)
        `);
        const id1 = result1.lastID;

        // Create categories for tenant 1
        const catBurgers = await database.run('INSERT INTO categories (tenant_id, name, order_index) VALUES (?, "Hambúrgueres", 0)', id1);
        const catCombos = await database.run('INSERT INTO categories (tenant_id, name, order_index) VALUES (?, "Combos", 1)', id1);
        const catSides = await database.run('INSERT INTO categories (tenant_id, name, order_index) VALUES (?, "Acompanhamentos", 2)', id1);

        await database.run(`
          INSERT INTO menu_items (tenant_id, category_id, name, description, price, category, image) VALUES 
          (?, ?, 'X-Burger Clássico', 'Pão Brioche, Blend 180g, Queijo Cheddar, Maionese da Casa.', 28.90, 'Hambúrgueres', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80'),
          (?, ?, 'Combo Brutal', 'X-Burger + Batata Frita + Refrigerante 350ml.', 45.00, 'Combos', 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&q=80'),
          (?, ?, 'Fritas com Cheddar e Bacon', 'Batata palito crocante com queijo e bacon.', 22.50, 'Acompanhamentos', 'https://images.unsplash.com/photo-1573082883907-8b9bb260163c?w=500&q=80')
        `, id1, catBurgers.lastID, id1, catCombos.lastID, id1, catSides.lastID);

        // Add options for X-Burger
        const xburger = await database.get('SELECT id FROM menu_items WHERE name = "X-Burger Clássico" AND tenant_id = ?', id1);
        if (xburger) {
          await database.run('INSERT INTO product_options (menu_item_id, name, type, price) VALUES (?, ?, ?, ?)', xburger.id, 'Mal Passado', 'variation', 0);
          await database.run('INSERT INTO product_options (menu_item_id, name, type, price) VALUES (?, ?, ?, ?)', xburger.id, 'Ao Ponto', 'variation', 0);
          await database.run('INSERT INTO product_options (menu_item_id, name, type, price) VALUES (?, ?, ?, ?)', xburger.id, 'Bem Passado', 'variation', 0);
          await database.run('INSERT INTO product_options (menu_item_id, name, type, price) VALUES (?, ?, ?, ?)', xburger.id, 'Extra queijo', 'addition', 4.50);
          await database.run('INSERT INTO product_options (menu_item_id, name, type, price) VALUES (?, ?, ?, ?)', xburger.id, 'Bacon crocante', 'addition', 5.00);
        }

        await database.run(`
          INSERT INTO motoboys (tenant_id, name, phone, password, plate, status) VALUES 
          (?, 'Roberto Silva', '11999999999', '123456', 'XYZ-1234', 'online'),
          (?, 'Marta Santos', '11888888888', '123456', 'ABC-5678', 'online')
        `, id1, id1);
      }

      // Second Tenant (Requested Example)
      if (!existingSlugs.includes('lanchonete-exemplo')) {
        const result2 = await database.run(`
          INSERT INTO tenants (slug, name, admin_username, admin_password, address, lat, lng, is_exempt) 
          VALUES ('lanchonete-exemplo', 'Lanchonete Exemplo', 'Dujao', '30031936', 'Rua das Flores, 123, Centro', -23.5505, -46.6333, 1)
        `);
        const id2 = result2.lastID;

        // Create categories for tenant 2
        const catPizza = await database.run('INSERT INTO categories (tenant_id, name, order_index) VALUES (?, "Pizzas", 0)', id2);
        const catDrinks = await database.run('INSERT INTO categories (tenant_id, name, order_index) VALUES (?, "Bebidas", 1)', id2);

        await database.run(`
          INSERT INTO menu_items (tenant_id, category_id, name, description, price, category, image) VALUES 
          (?, ?, 'Pizza Calabresa Média', 'Molho de tomate, mussarela, calabresa e orégano.', 42.00, 'Pizzas', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80'),
          (?, ?, 'Suco de Laranja 500ml', 'Suco natural feito na hora.', 12.00, 'Bebidas', 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=500&q=80')
        `, id2, catPizza.lastID, id2, catDrinks.lastID);

        await database.run(`
          INSERT INTO motoboys (tenant_id, name, phone, password, plate, status) VALUES 
          (?, 'Carlos Correon', '11777777777', '123456', 'KLI-9988', 'online')
        `, id2);
      }
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
  }
}

