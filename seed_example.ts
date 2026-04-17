import { getDb, initDb } from './src/db/database';

async function seed() {
  console.log('--- Iniciando Semeio da Loja de Exemplo ---');
  await initDb();
  const db = await getDb();

  try {
    // 1. Limpar dados antigos da lanchonete-exemplo (se existir) para garantir um estado limpo
    const tenant = await db.get("SELECT id FROM tenants WHERE slug = 'lanchonete-exemplo'");
    
    let tenantId: number;
    if (tenant) {
      tenantId = tenant.id;
      console.log(`Limpando dados da loja ID: ${tenantId}...`);
      await db.run('DELETE FROM menu_items WHERE tenant_id = ?', tenantId);
      await db.run('DELETE FROM motoboys WHERE tenant_id = ?', tenantId);
      await db.run('DELETE FROM orders WHERE tenant_id = ?', tenantId);
      await db.run('UPDATE tenants SET name = "Delícias da Cidade", admin_username = "Dujao", admin_password = "30031936" WHERE id = ?', tenantId);
    } else {
      console.log('Criando nova loja de exemplo...');
      const result = await db.run(`
        INSERT INTO tenants (slug, name, admin_username, admin_password, address, lat, lng, is_exempt) 
        VALUES ('lanchonete-exemplo', 'Delícias da Cidade', 'Dujao', '30031936', 'Rua das Flores, 123, Centro', -23.5505, -46.6333, 1)
      `);
      tenantId = result.lastID;
    }

    // 2. Inserir Cardápio Rico
    console.log('Inserindo itens no cardápio...');
    const categories = [
      { name: 'Hambúrgueres Artesanais', items: [
        { name: 'Monstruoso Burger', price: 34.90, desc: 'Pão de brioche, 2 blends de 150g, bacon crocante, cheddar duplo e cebola caramelizada.', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800' },
        { name: 'Classic Tasty', price: 26.50, desc: 'Hambúrguer de 150g, queijo prato, alface, tomate e molho especial.', img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800' }
      ]},
      { name: 'Pizzas', items: [
        { name: 'Pizza Calabresa', price: 42.00, desc: 'Molho de tomate, mussarela premium, calabresa fatiada e cebola.', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800' },
        { name: 'Pizza Margherita', price: 38.00, desc: 'Manjericão fresco, tomate cereja e azeite de oliva.', img: 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad38?w=800' }
      ]},
      { name: 'Bebidas Geladas', items: [
        { name: 'Suco de Laranja 500ml', price: 12.00, desc: 'Suco natural feito na hora.', img: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800' },
        { name: 'Refrigerante Lata', price: 6.50, desc: 'Lata 350ml (Coca-Cola, Guaraná).', img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800' }
      ]}
    ];

    for (const cat of categories) {
      for (const item of cat.items) {
        await db.run(
          'INSERT INTO menu_items (tenant_id, name, description, price, category, image) VALUES (?, ?, ?, ?, ?, ?)',
          tenantId, item.name, item.desc, item.price, cat.name, item.img
        );
      }
    }

    // 3. Cadastrar um Motoboy
    console.log('Cadastrando motoboy de teste...');
    const motoResult = await db.run(
      'INSERT INTO motoboys (tenant_id, name, phone, plate, password, status) VALUES (?, ?, ?, ?, ?, ?)',
      tenantId, 'Carlos Entregador', '11988887777', 'MOT-2024', '123456', 'online'
    );
    const motoboyId = motoResult.lastID;

    // 4. Inserir Pedidos de Exemplo (Histórico e Novos)
    console.log('Criando pedidos simulados...');
    
    // Pedido Entregue
    const order1 = await db.run(
      "INSERT INTO orders (tenant_id, client_name, client_phone, items, total_price, status, delivery_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, DATETIME('now', '-2 hours'))",
      tenantId, 'Maria Silva', '11999998888', '[]', 74.90, 'delivered', 'Av. das Américas, 500 - Apto 12'
    );
    await db.run('INSERT INTO order_history (order_id, status, note) VALUES (?, "pending", "Pedido recebido")', order1.lastID);
    await db.run('INSERT INTO order_history (order_id, status, note) VALUES (?, "delivered", "Entrega finalizada")', order1.lastID);

    // Pedido Pendente (Novo)
    const order2 = await db.run(
      "INSERT INTO orders (tenant_id, client_name, client_phone, items, total_price, status, delivery_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, DATETIME('now', '-10 minutes'))",
      tenantId, 'Roberto Carlos', '11977776666', '[]', 42.00, 'pending', 'Rua Augusta, 1500'
    );
    await db.run('INSERT INTO order_history (order_id, status, note) VALUES (?, "pending", "Aguardando confirmação")', order2.lastID);

    // Pedido Pronto (Para o motoboy pegar)
    const order3 = await db.run(
      "INSERT INTO orders (tenant_id, client_name, client_phone, items, total_price, status, delivery_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, DATETIME('now', '-30 minutes'))",
      tenantId, 'Ana Beatriz', '11955554444', '[]', 32.50, 'ready', 'Alameda Santos, 222'
    );
    await db.run('INSERT INTO order_history (order_id, status, note) VALUES (?, "ready", "O pedido saiu do forno!")', order3.lastID);

    console.log('--- Semeio concluído com sucesso! ---');
    console.log('Link da loja:', `lanchonete-exemplo`);
    console.log('Usuário Admin:', 'Dujao');
    console.log('Senha Admin:', '30031936');
    console.log('Usuário Motoboy (Tel):', '11988887777');
    console.log('Senha Motoboy:', '123456');

  } catch (err) {
    console.error('Erro ao semear banco de dados:', err);
  }
}

seed();
