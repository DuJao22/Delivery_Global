import { getDb } from './src/db/database';

async function seed() {
  const db = await getDb();
  console.log('Seeding example shop...');
  
  try {
    const existing = await db.get('SELECT id FROM tenants WHERE slug = ?', 'lanchonete-exemplo');
    if (existing) {
      console.log('Example shop already exists.');
      return;
    }

    const result = await db.run(`
      INSERT INTO tenants (slug, name, admin_username, admin_password, address, lat, lng) 
      VALUES ('lanchonete-exemplo', 'Lanchonete Exemplo', 'admin', 'admin123', 'Rua das Flores, 123, Centro', -23.5505, -46.6333)
    `);
    const id = result.lastID;

    await db.run(`
      INSERT INTO menu_items (tenant_id, name, description, price, category, image) VALUES 
      (?, 'Pizza Calabresa Média', 'Molho de tomate, mussarela, calabresa e orégano.', 42.00, 'Pizzas', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80'),
      (?, 'Suco de Laranja 500ml', 'Suco natural feito na hora.', 12.00, 'Bebidas', 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=500&q=80'),
      (?, 'Açaí 500ml', 'Com granola, banana e leite em pó.', 18.50, 'Sobremesas', 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=500&q=80')
    `, id, id, id);

    await db.run(`
      INSERT INTO motoboys (tenant_id, name, phone, plate, status) VALUES 
      (?, 'Carlos Correon', '11777777777', 'KLI-9988', 'online')
    `, id);

    console.log('Example shop seeded successfully!');
  } catch (err) {
    console.error('Error seeding example shop:', err);
  }
}

seed();
