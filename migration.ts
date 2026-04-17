import { getDb } from './src/db/database';

async function migrate() {
  const db = await getDb();
  console.log('--- Iniciando Migração de Banco de Dados ---');

  const addColumn = async (table: string, column: string, type: string) => {
    try {
      await db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`[OK] Coluna ${column} adicionada em ${table}`);
    } catch (err: any) {
      if (err.message.includes('duplicate column name')) {
        console.log(`[SKIP] Coluna ${column} já existe em ${table}`);
      } else {
        console.error(`[ERROR] Erro ao adicionar ${column} em ${table}:`, err.message);
      }
    }
  };

  // Tenants
  await addColumn('tenants', 'opening_hours', 'TEXT');
  await addColumn('tenants', 'delivery_fee', 'REAL DEFAULT 0');
  await addColumn('tenants', 'prep_time_avg', 'INTEGER DEFAULT 30');
  await addColumn('tenants', 'is_open', 'INTEGER DEFAULT 1');

  // Menu Items
  await addColumn('menu_items', 'category_id', 'INTEGER');
  await addColumn('menu_items', 'sku', 'TEXT');
  await addColumn('menu_items', 'stock_quantity', 'INTEGER');
  await addColumn('menu_items', 'prep_time', 'INTEGER');

  // Users
  await addColumn('users', 'is_vip', 'INTEGER DEFAULT 0');

  // Orders
  await addColumn('orders', 'payment_method', "TEXT");

  console.log('--- Migração Concluída ---');
}

migrate();
