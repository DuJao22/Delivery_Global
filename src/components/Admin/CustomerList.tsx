import React, { useState, useEffect } from 'react';
import { Search, User, Phone, ShoppingBag, Star, Calendar } from 'lucide-react';
import { tenantFetch } from '../../lib/api';

interface Customer {
  id: number;
  name: string;
  phone: string;
  is_vip: number;
  created_at: string;
  total_orders: number;
  total_spent: number;
}

interface Props {
  tenantSlug: string;
}

export default function CustomerList({ tenantSlug }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [tenantSlug]);

  const fetchCustomers = async () => {
    try {
      const res = await tenantFetch(tenantSlug, '/api/admin/customers');
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando clientes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter">Gestão de Clientes</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Sua base de clientes e histórico de fidelidade</p>
        </div>
        <div className="relative md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full bg-white border border-gray-100 rounded-2xl p-4 pl-12 font-bold text-sm shadow-sm focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map(customer => (
          <div 
            key={customer.id}
            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center relative">
                  <User className="w-6 h-6 text-gray-400" />
                  {customer.is_vip === 1 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                       <Star className="w-3 h-3 fill-current" />
                    </div>
                  )}
               </div>
               <div>
                  <div className="flex items-center gap-2">
                     <h4 className="font-bold text-gray-900">{customer.name}</h4>
                     {customer.is_vip === 1 && (
                       <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">VIP</span>
                     )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                     <div className="flex items-center gap-1 text-[11px] text-gray-400 font-bold uppercase tracking-tight">
                        <Phone className="w-3 h-3" /> {customer.phone}
                     </div>
                     <div className="flex items-center gap-1 text-[11px] text-gray-400 font-bold uppercase tracking-tight">
                        <Calendar className="w-3 h-3" /> {new Date(customer.created_at).toLocaleDateString()}
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-8 w-full md:w-auto">
               <div className="text-center md:text-right">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Pedidos</p>
                  <p className="text-xl font-black italic tracking-tighter text-gray-900">{customer.total_orders}</p>
               </div>
               <div className="text-center md:text-right">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Total Gasto</p>
                  <p className="text-xl font-black italic tracking-tighter text-emerald-600">R$ {(customer.total_spent || 0).toFixed(2)}</p>
               </div>
               <button className="flex-1 md:flex-none p-4 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                  <ShoppingBag className="w-5 h-5 mx-auto" />
               </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[40px]">
             <User className="w-12 h-12 text-gray-200 mx-auto mb-4" />
             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Nenhum cliente encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
