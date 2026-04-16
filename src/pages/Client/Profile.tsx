import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, 
  ArrowLeft, 
  History, 
  User, 
  ChevronRight, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  MapPin,
  Search
} from 'lucide-react';
import { tenantFetch } from '../../lib/api';

interface Order {
  id: number;
  total_amount: number;
  customer_address: string;
  status: string;
  motoboy_name?: string;
  created_at: string;
}

export default function ClientProfile() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const fetchOrders = () => {
    if (!user) return;
    tenantFetch(tenantSlug!, `/api/users/${user.id}/orders`)
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(err => {
        console.warn('Fetch error:', err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!user) {
      navigate(`/${tenantSlug}/login`);
      return;
    }
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [user, navigate, tenantSlug]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate(`/${tenantSlug}`);
  };

  if (!user) return null;

  const currentOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const pastOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'preparing': return <Package className="w-5 h-5 text-blue-500" />;
      case 'out_for_delivery': return <Truck className="w-5 h-5 text-purple-600" />;
      case 'delivered': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'Pendente',
      'preparing': 'Em Preparo',
      'out_for_delivery': 'Saiu para Entrega',
      'delivered': 'Entregue',
      'cancelled': 'Cancelado'
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Sidebar - Desktop Layout */}
      <div className="flex flex-col lg:flex-row flex-1">
        <aside className="w-full lg:w-80 bg-white border-r border-gray-100 p-8 shrink-0">
          <Link to={`/${tenantSlug}`} className="inline-flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-red-500 mb-10 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Cardápio
          </Link>
          
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 bg-red-600 rounded-[20px] shadow-lg shadow-red-200 flex items-center justify-center text-white">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 leading-tight uppercase italic">{user.name}</h1>
              <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">{user.phone}</p>
            </div>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('current')}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${
                activeTab === 'current' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>Pedidos em Curso</span>
              {activeTab === 'current' && <motion.div layoutId="tab" className="w-1.5 h-1.5 bg-red-600 rounded-full ml-auto" />}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm ${
                activeTab === 'history' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <History className="w-5 h-5" />
              <span>Histórico</span>
              {activeTab === 'history' && <motion.div layoutId="tab" className="w-1.5 h-1.5 bg-red-600 rounded-full ml-auto" />}
            </button>
          </nav>

          <div className="mt-12 pt-8 border-t border-gray-50">
             <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-6 py-4 text-red-600 font-bold text-sm hover:bg-red-50 rounded-2xl transition-colors"
             >
                <LogOut className="w-5 h-5" /> Sair da Conta
             </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-8 lg:p-16">
          <div className="max-w-4xl mx-auto">
            <header className="mb-12">
               <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter">
                 {activeTab === 'current' ? 'Acompanhar Pedidos' : 'Meus Pedidos Antigos'}
               </h2>
               <p className="text-gray-500 font-medium mt-2">Veja o status real de cada entrega e histórico de consumo.</p>
            </header>

            <AnimatePresence mode="wait">
              {loading ? (
                <div key="loading" className="py-20 flex flex-col items-center opacity-30">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin"></div>
                </div>
              ) : activeTab === 'current' && currentOrders.length === 0 ? (
                <motion.div 
                  key="no-current" 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-white rounded-[40px] p-16 border border-gray-100 text-center shadow-sm"
                >
                   <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
                      <Search className="w-10 h-10 text-gray-200" />
                   </div>
                   <h3 className="text-xl font-bold text-gray-900 mb-3 uppercase italic">Nenhum pedido em andamento</h3>
                   <p className="text-gray-500 mb-10 max-w-xs mx-auto">Parece que você não tem pedidos sendo preparados no momento.</p>
                   <Link 
                     to={`/${tenantSlug}`}
                     className="inline-flex py-4 px-10 bg-red-600 text-white font-bold rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 transition-all uppercase tracking-widest text-sm"
                   >
                     Fazer um Pedido
                   </Link>
                </motion.div>
              ) : activeTab === 'current' ? (
                <motion.div key="current-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                   {currentOrders.map(order => (
                     <div key={order.id} className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 group-hover:bg-red-50 transition-colors"></div>
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                           <div className="flex items-center gap-6">
                              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center shadow-inner">
                                 {getStatusIcon(order.status)}
                              </div>
                              <div>
                                 <p className="text-sm font-black italic uppercase text-red-600 tracking-tighter">#{order.id}</p>
                                 <h4 className="text-xl font-black text-gray-900 uppercase italic leading-none">{getStatusLabel(order.status)}</h4>
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                   FEITO EM: {new Date(order.created_at).toLocaleString('pt-BR')}
                                 </p>
                              </div>
                           </div>

                           <div className="flex flex-col md:items-end">
                              <p className="text-2xl font-black text-gray-900">R$ {order.total_amount.toFixed(2)}</p>
                              <div className="flex items-center gap-2 mt-2 text-gray-500">
                                 <MapPin className="w-3.5 h-3.5" />
                                 <span className="text-[10px] font-bold uppercase tracking-widest truncate max-w-[150px]">{order.customer_address}</span>
                              </div>
                           </div>
                        </div>

                        {order.status === 'out_for_delivery' && (
                           <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <Truck className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Entregador</p>
                                    <p className="text-sm font-bold text-gray-900">{order.motoboy_name || 'Alocando...'}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                                 <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Rastreando ao vivo</span>
                              </div>
                           </div>
                        )}
                        
                        {/* Progress Bar UI */}
                        <div className="mt-8 flex items-center gap-2 h-1.5 bg-gray-50 rounded-full overflow-hidden">
                           <div className={`h-full bg-red-600 transition-all duration-1000 ${order.status === 'pending' ? 'w-1/4' : order.status === 'preparing' ? 'w-1/2' : 'w-3/4'}`}></div>
                        </div>
                     </div>
                   ))}
                </motion.div>
              ) : (
                <motion.div key="past-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                   <div className="overflow-x-auto">
                      <table className="w-full text-left">
                         <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                            <tr>
                               <th className="px-8 py-4">Pedido</th>
                               <th className="px-6 py-4">Data</th>
                               <th className="px-6 py-4">Status</th>
                               <th className="px-6 py-4 text-right">Valor</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-50">
                            {pastOrders.map(order => (
                               <tr key={order.id} className="group hover:bg-gray-25 transition-colors">
                                  <td className="px-8 py-5">
                                     <p className="font-black text-gray-900 italic uppercase">#{order.id}</p>
                                  </td>
                                  <td className="px-6 py-5">
                                     <p className="text-sm font-bold text-gray-500">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                                  </td>
                                  <td className="px-6 py-5">
                                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {getStatusLabel(order.status)}
                                     </span>
                                  </td>
                                  <td className="px-6 py-5 text-right font-black text-gray-900">
                                     R$ {order.total_amount.toFixed(2)}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
