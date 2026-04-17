import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ImageIcon, Package, Filter, Search, Tag } from 'lucide-react';
import { tenantFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category_id: number;
  category_name?: string;
  status: string;
  stock_quantity: number;
}

interface Category {
  id: number;
  name: string;
}

interface Props {
  tenantSlug: string;
}

export default function ProductsManager({ tenantSlug }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchData();
  }, [tenantSlug]);

  const fetchData = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        tenantFetch(tenantSlug, '/api/public/menu'), // We can use public menu to list, or admin endpoint if we want more data
        tenantFetch(tenantSlug, '/api/admin/categories')
      ]);
      const pData = await pRes.json();
      const cData = await cRes.json();
      
      // Flatten public menu which is grouped by category
      const flatProducts: Product[] = [];
      pData.forEach((cat: any) => {
        cat.items.forEach((item: any) => {
          flatProducts.push({
            ...item,
            category_name: cat.name
          });
        });
      });

      setProducts(flatProducts);
      setCategories(cData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest">Carregando estoque...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter">Gestão de Produtos</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Controle seu estoque e cardápio em tempo real</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
           <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full bg-white border border-gray-100 rounded-xl p-3 pl-10 text-sm font-bold shadow-sm focus:ring-2 focus:ring-red-500"
              />
           </div>
           <select 
             value={selectedCategory}
             onChange={(e) => setSelectedCategory(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
             className="w-full md:w-48 bg-white border border-gray-100 rounded-xl p-3 text-sm font-bold shadow-sm focus:ring-2 focus:ring-red-500 appearance-none"
           >
             <option value="all">Todas Categorias</option>
             {categories.map(c => (
               <option key={c.id} value={c.id}>{c.name}</option>
             ))}
           </select>
           <button className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-900/20 active:scale-95 transition-all">
              <Plus className="w-4 h-4" /> Novo Produto
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(product => (
          <div key={product.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden group hover:border-red-100 hover:shadow-xl transition-all relative">
             <div className="h-48 relative overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-100" />
                  </div>
                )}
                <div className="absolute top-4 right-4 translate-y-[-120%] group-hover:translate-y-0 flex gap-2 transition-transform">
                   <button className="w-10 h-10 bg-white/90 backdrop-blur-sm text-gray-900 rounded-xl flex items-center justify-center shadow-lg hover:bg-emerald-500 hover:text-white transition-colors">
                      <Edit2 className="w-4 h-4" />
                   </button>
                   <button className="w-10 h-10 bg-white/90 backdrop-blur-sm text-gray-900 rounded-xl flex items-center justify-center shadow-lg hover:bg-red-500 hover:text-white transition-colors">
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                   <span className="text-xs font-black italic tracking-tighter text-gray-900">R$ {product.price.toFixed(2)}</span>
                </div>
             </div>
             
             <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                   <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                     {product.category_name}
                   </span>
                   {product.stock_quantity <= 5 && (
                     <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        Estoque Baixo
                     </span>
                   )}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-1 leading-tight">{product.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">{product.description}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                   <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estoque: {product.stock_quantity}</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer scale-75">
                         <input type="checkbox" defaultChecked className="sr-only peer" />
                         <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Ativo</span>
                   </div>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
