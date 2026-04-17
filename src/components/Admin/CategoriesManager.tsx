import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, GripVertical, Check, X, Package } from 'lucide-react';
import { tenantFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';

interface Category {
  id: number;
  name: string;
  order_index: number;
  is_active: number;
}

interface Props {
  tenantSlug: string;
}

export default function CategoriesManager({ tenantSlug }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchCategories = async () => {
    try {
      const res = await tenantFetch(tenantSlug, '/api/admin/categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [tenantSlug]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const res = await tenantFetch(tenantSlug, '/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newName, order_index: categories.length })
      });
      if (res.ok) {
        setNewName('');
        setIsAdding(false);
        fetchCategories();
      }
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando categorias...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter">Categorias do Cardápio</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1"> Organize seu cardápio por grupos</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-red-900/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Nova Categoria
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-xl flex items-center gap-4"
          >
            <input 
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Pizzas, Bebidas, Sobremesas..."
              className="flex-1 bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-2">
              <button 
                onClick={handleAdd}
                className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsAdding(false)}
                className="w-12 h-12 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-3">
        {categories.map((cat, index) => (
          <div 
            key={cat.id}
            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-red-100 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                <GripVertical className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-gray-400 mr-2 uppercase tracking-widest">{String(index + 1).padStart(2, '0')}</span>
                <span className="font-bold text-gray-900">{cat.name}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                <Edit2 className="w-4 h-4" />
              </button>
              <button className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {categories.length === 0 && !isAdding && (
          <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[40px]">
             <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Nenhuma categoria cadastrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
