import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart2, 
  Map as MapIcon, 
  Users, 
  Package, 
  Settings, 
  LogOut, 
  Bell, 
  Plus, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Filter,
  Search,
  MoreVertical,
  MapPin,
  Navigation,
  ShoppingBag,
  X,
  Phone
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  Cell 
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { tenantFetch } from '../../lib/api';
import CategoriesManager from '../../components/Admin/CategoriesManager';
import StoreSettings from '../../components/Admin/StoreSettings';
import CustomerList from '../../components/Admin/CustomerList';
import ProductsManager from '../../components/Admin/ProductsManager';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const motoboyIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', // Delivery icon
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const storeIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/619/619398.png', // Shop icon
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

interface Order {
  id: number;
  client_name: string;
  delivery_address: string;
  total_price: number;
  status: string;
  motoboy_id: number | null;
  motoboy_name?: string;
  created_at: string;
}

interface Motoboy {
  id: number;
  name: string;
  phone: string;
  status: string;
  lat: number | null;
  lng: number | null;
}

export default function AdminDashboard() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'fleet' | 'motoboys' | 'menu' | 'categories' | 'customers' | 'settings'>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isCreatingMotoboy, setIsCreatingMotoboy] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newMotoboy, setNewMotoboy] = useState({ name: '', phone: '', plate: '', password: '' });
  const [copySuccess, setCopySuccess] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    if (!tenantSlug) return;
    try {
      const [ordersRes, fleetRes, statsRes] = await Promise.all([
        tenantFetch(tenantSlug, '/api/admin/orders'),
        tenantFetch(tenantSlug, '/api/admin/motoboys'),
        tenantFetch(tenantSlug, '/api/admin/stats')
      ]);

      const ordersData = await ordersRes.json();
      const fleetData = await fleetRes.json();
      const statsData = await statsRes.json();

      // Check for new orders
      if (lastOrderId !== null && ordersData.length > 0) {
        const newest = Math.max(...ordersData.map((o: any) => o.id));
        if (newest > lastOrderId) {
          playNotificationSound();
          setNotificationOpen(true);
          setTimeout(() => setNotificationOpen(false), 8000);
        }
        setLastOrderId(newest);
      } else if (ordersData.length > 0) {
        setLastOrderId(Math.max(...ordersData.map((o: any) => o.id)));
      }

      setOrders(ordersData);
      setMotoboys(fleetData);
      setStats(statsData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setLoading(false);
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Audio play blocked by browser'));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, [tenantSlug, lastOrderId]);

  const handleLogout = () => {
    localStorage.removeItem(`admin_token_${tenantSlug}`);
    navigate(`/${tenantSlug}/admin/login`);
  };

  const handleCreateMotoboy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tenantFetch(tenantSlug!, '/api/admin/motoboys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMotoboy)
      });
      setIsCreatingMotoboy(false);
      setNewMotoboy({ name: '', phone: '', plate: '', password: '' });
      fetchData();
    } catch (err) {
      console.error('Error creating motoboy:', err);
      alert('Erro ao criar entregador');
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      await tenantFetch(tenantSlug!, `/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-amber-100 text-amber-700',
      'preparing': 'bg-blue-100 text-blue-700',
      'out_for_delivery': 'bg-purple-100 text-purple-700',
      'delivered': 'bg-emerald-100 text-emerald-700',
      'cancelled': 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = {
      'pending': 'Pendente',
      'preparing': 'Preparando',
      'out_for_delivery': 'Em Rota',
      'delivered': 'Entregue',
      'cancelled': 'Cancelado'
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${colors[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-sans">Carregando Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-white border-b px-4 h-16 flex items-center justify-between sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold">
            D
          </div>
          <span className="font-bold text-gray-900 tracking-tight">Delivery Global</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <MoreVertical className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-[70] lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-[80] lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white font-bold">
                    D
                  </div>
                  <span className="font-bold text-gray-900 tracking-tight text-lg">Delivery Global</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <NavItem active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }} icon={<BarChart2 className="w-5 h-5" />} label="Visão Geral" />
                <NavItem active={activeTab === 'orders'} onClick={() => { setActiveTab('orders'); setMobileMenuOpen(false); }} icon={<ShoppingBag className="w-5 h-5" />} label="Pedidos" />
                <NavItem active={activeTab === 'fleet'} onClick={() => { setActiveTab('fleet'); setMobileMenuOpen(false); }} icon={<MapIcon className="w-5 h-5" />} label="Monitoramento" />
                <NavItem active={activeTab === 'motoboys'} onClick={() => { setActiveTab('motoboys'); setMobileMenuOpen(false); }} icon={<Truck className="w-5 h-5" />} label="Entregadores" />
                <div className="py-4 px-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Cardápio</div>
                <NavItem active={activeTab === 'categories'} onClick={() => { setActiveTab('categories'); setMobileMenuOpen(false); }} icon={<Filter className="w-5 h-5" />} label="Categorias" />
                <NavItem active={activeTab === 'menu'} onClick={() => { setActiveTab('menu'); setMobileMenuOpen(false); }} icon={<Package className="w-5 h-5" />} label="Produtos" />
                <div className="py-4 px-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Gestão</div>
                <NavItem active={activeTab === 'customers'} onClick={() => { setActiveTab('customers'); setMobileMenuOpen(false); }} icon={<Users className="w-5 h-5" />} label="Clientes" />
                <NavItem active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }} icon={<Settings className="w-5 h-5" />} label="Configurar Loja" />
              </nav>

              <div className="p-4 border-t">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium"
                >
                  <LogOut className="w-5 h-5" /> Sair do Painel
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r hidden lg:flex flex-col sticky top-0 h-screen shrink-0">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-red-200">
            D
          </div>
          <span className="font-bold text-gray-900 tracking-tight text-lg">Delivery Global</span>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<BarChart2 className="w-5 h-5" />} label="Visão Geral" />
          <NavItem active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<ShoppingBag className="w-5 h-5" />} label="Pedidos" />
          <NavItem active={activeTab === 'fleet'} onClick={() => setActiveTab('fleet')} icon={<MapIcon className="w-5 h-5" />} label="Monitoramento" />
          <NavItem active={activeTab === 'motoboys'} onClick={() => setActiveTab('motoboys')} icon={<Truck className="w-5 h-5" />} label="Entregadores" />
          <div className="py-4 px-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Cardápio</div>
          <NavItem active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<Filter className="w-5 h-5" />} label="Categorias" />
          <NavItem active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} icon={<Package className="w-5 h-5" />} label="Produtos" />
          <div className="py-4 px-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Gestão</div>
          <NavItem active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users className="w-5 h-5" />} label="Clientes" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings className="w-5 h-5" />} label="Configurar Loja" />
        </nav>

        <div className="p-4 border-t">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium"
          >
            <LogOut className="w-5 h-5" /> Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {notificationOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              className="fixed top-20 right-8 z-[100] bg-gray-900 text-white p-6 rounded-[32px] shadow-2xl border border-white/10 flex items-center gap-6"
            >
               <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center animate-bounce">
                  <Bell className="w-6 h-6" />
               </div>
               <div>
                  <h4 className="font-black uppercase italic tracking-tighter text-lg">Novo Pedido Recebido!</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Confira a aba de pedidos agora</p>
               </div>
               <button onClick={() => setNotificationOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
               </button>
            </motion.div>
          )}
        </AnimatePresence>
        <header className="bg-white border-b h-16 px-4 md:px-8 flex items-center justify-between sticky top-[64px] lg:top-0 z-30">
          <h2 className="text-base md:text-xl font-bold text-gray-900 truncate mr-4">
            {activeTab === 'overview' && 'Dashboard Financeiro'}
            {activeTab === 'orders' && 'Gestão de Pedidos'}
            {activeTab === 'fleet' && 'Monitoramento em Tempo Real'}
            {activeTab === 'menu' && 'Gerenciar Cardápio'}
            {activeTab === 'settings' && 'Configurações do Restaurante'}
          </h2>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-900 rounded-full relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-100 flex items-center justify-center overflow-hidden">
               <img src="https://ui-avatars.com/api/?name=Admin&background=random" alt="Admin" />
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && stats && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard label="Pedidos Hoje" value={String(stats.totalOrders)} icon={<ShoppingBag className="w-6 h-6 text-blue-600" />} trend="Novo" />
                  <StatCard label="Faturamento Total" value={`R$ ${(stats.totalRevenue || 0).toFixed(2)}`} icon={<BarChart2 className="w-6 h-6 text-emerald-600" />} trend="+12%" />
                  <StatCard label="Pedidos Pendentes" value={String(stats.pendingOrders)} icon={<Clock className="w-6 h-6 text-amber-600" />} theme="amber" />
                  <StatCard label="Motoboys Online" value={String(stats.activeMotoboys)} icon={<Truck className="w-6 h-6 text-emerald-600" />} theme="emerald" />
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold mb-6">Performance de Vendas</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.ordersByDay}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                          <RechartsTooltip 
                             cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                             contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -1px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={40}>
                            {stats.ordersByDay.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={index === stats.ordersByDay.length - 1 ? '#ef4444' : '#fee2e2'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold mb-6">Pedidos Recentes</h3>
                    <div className="space-y-4">
                      {orders.slice(0, 5).map(order => (
                        <div key={order.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">#{order.id} {order.client_name}</h4>
                            <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleTimeString()}</p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="w-full mt-6 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      Ver Tudo
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div 
                key="orders"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder="Buscar pedido..." 
                        className="w-full bg-gray-50 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <button className="p-2 bg-gray-50 rounded-xl text-gray-500 hover:text-gray-900 border border-gray-100">
                      <Filter className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-8 py-4">ID / Cliente</th>
                        <th className="px-6 py-4">Endereço</th>
                        <th className="px-6 py-4">Valor</th>
                        <th className="px-6 py-4">Entregador</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-25 transition-colors group">
                          <td className="px-8 py-5">
                            <div>
                              <p className="font-bold text-gray-900">#{order.id}</p>
                              <p className="text-xs text-gray-500">{order.client_name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-sm text-gray-600 truncate max-w-[200px]">{order.delivery_address}</p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-bold text-gray-900">R$ {(order.total_price || 0).toFixed(2)}</p>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              {order.motoboy_name ? (
                                <>
                                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                                    <Truck className="w-3 h-3 text-red-600" />
                                  </div>
                                  <span className="text-sm text-gray-700">{order.motoboy_name}</span>
                                </>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Não atribuído</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {order.status === 'pending' && (
                                <button 
                                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                  title="Preparar"
                                >
                                  <Clock className="w-4 h-4" />
                                </button>
                              )}
                              {order.status === 'preparing' && (
                                <button 
                                  onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                                  className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
                                  title="Enviar p/ Entrega"
                                >
                                  <Truck className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  const text = `Olá ${order.client_name}! Sou do delivery e estou entrando em contato sobre seu pedido #${order.id}.`;
                                  window.open(`https://wa.me/${order.client_name?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(text)}`);
                                }}
                                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
                                title="WhatsApp"
                              >
                                <Phone className="w-4 h-4" />
                              </button>
                              <button className="p-2 hover:bg-gray-100 rounded-lg">
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'fleet' && (
              <motion.div 
                key="fleet"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[700px]"
              >
                {/* Driver List */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b">
                    <h3 className="font-bold text-gray-900">Entregadores ({motoboys.length})</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {motoboys.map(m => (
                      <div key={m.id} className="p-6 border-b hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${m.status === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                              <Truck className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">{m.name}</h4>
                              <p className="text-xs text-gray-500">{m.phone}</p>
                            </div>
                          </div>
                          <span className={`w-3 h-3 rounded-full ${m.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`}></span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                             <Navigation className="w-3 h-3" />
                             {m.status === 'online' ? 'Em atividade' : 'Offline'}
                          </div>
                          <button className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1">
                            Ver Rota <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Real-time Map */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
                   <MapContainer 
                     center={[-23.5505, -46.6333]} 
                     zoom={13} 
                     style={{ height: '100%', width: '100%' }}
                     className="z-10"
                   >
                     <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                     {/* Store Marker */}
                     <Marker position={[-23.5505, -46.6333]} icon={storeIcon}>
                       <Popup>Restaurante Central</Popup>
                     </Marker>
                     {/* Motoboy Markers */}
                     {motoboys.filter(m => m.lat && m.lng).map(m => (
                       <Marker key={m.id} position={[m.lat!, m.lng!]} icon={motoboyIcon}>
                         <Popup>
                           <div className="text-center">
                             <p className="font-bold">{m.name}</p>
                             <p className="text-xs">{m.status === 'online' ? 'Entrega em curso' : 'Estacionado'}</p>
                           </div>
                         </Popup>
                       </Marker>
                     ))}
                   </MapContainer>
                   <div className="absolute top-4 left-4 z-20 pointer-events-none">
                     <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-100/50 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                           <span className="text-xs font-bold text-gray-800">Ao vivo</span>
                        </div>
                        <div className="w-px h-4 bg-gray-200"></div>
                        <span className="text-xs text-gray-600">{motoboys.filter(m => m.status === 'online').length} motoristas rastreados</span>
                     </div>
                   </div>
                </div>
              </motion.div>
            )}
            
            {activeTab === 'motoboys' && (
              <motion.div
                key="motoboys"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Gerenciar Entregadores</h3>
                    <p className="text-sm text-gray-500">Cadastre e acompanhe seus motoboys.</p>
                  </div>
                  <button 
                    onClick={() => setIsCreatingMotoboy(true)}
                    className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
                  >
                    <Plus className="w-5 h-5" /> Cadastrar Entregador
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {motoboys.map(m => (
                    <div key={m.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-full -mr-12 -mt-12 group-hover:bg-red-50 transition-colors"></div>
                       
                       <div className="relative z-10">
                         <div className="flex items-center gap-4 mb-4">
                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${m.status === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                              <Truck className="w-7 h-7" />
                           </div>
                           <div>
                             <h4 className="font-bold text-gray-900">{m.name}</h4>
                             <p className="text-xs text-gray-500">{m.phone}</p>
                           </div>
                         </div>

                         <div className="space-y-3 pt-4 border-t border-gray-50">
                            <div>
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status do App</p>
                               <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${m.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                  <span className="text-xs font-bold text-gray-700 uppercase">{m.status === 'online' ? 'Ativo' : 'Desconectado'}</span>
                               </div>
                            </div>
                            
                            <div>
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Link de Acesso</p>
                               <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                  <span className="text-[10px] font-mono text-gray-500 truncate flex-1 leading-none">
                                    {window.location.origin}/{tenantSlug}/motoboy/login
                                  </span>
                                  <button 
                                    onClick={() => copyToClipboard(`${window.location.origin}/${tenantSlug}/motoboy/login`, m.id)}
                                    className="p-1.5 hover:bg-white rounded-lg transition-colors"
                                  >
                                    <CheckCircle2 className={`w-4 h-4 ${copySuccess === m.id ? 'text-emerald-500' : 'text-gray-400'}`} />
                                  </button>
                               </div>
                            </div>
                         </div>
                       </div>
                    </div>
                  ))}
                </div>

                {/* Empty State */}
                {motoboys.length === 0 && (
                  <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-gray-200">
                     <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Truck className="w-8 h-8 text-gray-300" />
                     </div>
                     <h3 className="font-bold text-gray-900 mb-2">Sem Entregadores</h3>
                     <p className="text-sm text-gray-500">Cadastre seu primeiro motoboy para começar a entregar.</p>
                  </div>
                )}
              </motion.div>
            )}

            {isCreatingMotoboy && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl"
                >
                  <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-6">Novo Entregador</h3>
                  <form onSubmit={handleCreateMotoboy} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Nome Completo</label>
                      <input 
                        required
                        type="text"
                        value={newMotoboy.name}
                        onChange={e => setNewMotoboy({ ...newMotoboy, name: e.target.value })}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 font-bold"
                        placeholder="Ex: João Silva"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">WhatsApp (Somente números)</label>
                      <input 
                        required
                        type="tel"
                        value={newMotoboy.phone}
                        onChange={e => setNewMotoboy({ ...newMotoboy, phone: e.target.value })}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 font-bold"
                        placeholder="Ex: 11999999999"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Placa</label>
                        <input 
                          type="text"
                          value={newMotoboy.plate}
                          onChange={e => setNewMotoboy({ ...newMotoboy, plate: e.target.value })}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 font-bold uppercase"
                          placeholder="ABC-1234"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Senha Inicial</label>
                        <input 
                          required
                          type="password"
                          value={newMotoboy.password}
                          onChange={e => setNewMotoboy({ ...newMotoboy, password: e.target.value })}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 font-bold"
                          placeholder="••••••"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-4 pt-6">
                       <button 
                         type="button" 
                         onClick={() => setIsCreatingMotoboy(false)}
                         className="flex-1 py-4 text-gray-500 font-bold uppercase text-xs tracking-widest"
                       >
                         Cancelar
                       </button>
                       <button 
                         type="submit" 
                         className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-xl shadow-red-200"
                       >
                         Salvar
                       </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {activeTab === 'menu' && tenantSlug && (
               <ProductsManager tenantSlug={tenantSlug} />
            )}

            {activeTab === 'categories' && tenantSlug && (
               <CategoriesManager tenantSlug={tenantSlug} />
            )}

            {activeTab === 'customers' && tenantSlug && (
               <CustomerList tenantSlug={tenantSlug} />
            )}

            {activeTab === 'settings' && tenantSlug && (
              <StoreSettings tenantSlug={tenantSlug} />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean, icon: any, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${active ? 'bg-red-50 text-red-600 shadow-sm shadow-red-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
    >
      {React.cloneElement(icon, { className: `w-5 h-5 ${active ? 'text-red-600' : 'text-gray-400'}` })}
      {label}
    </button>
  );
}

function StatCard({ label, value, icon, trend, theme }: { label: string, value: string, icon: any, trend?: string, theme?: string }) {
  const themeClasses: Record<string, string> = {
    'amber': 'bg-amber-50 text-amber-600',
    'emerald': 'bg-emerald-50 text-emerald-600',
    'blue': 'bg-blue-50 text-blue-600'
  };
  
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${theme ? themeClasses[theme] : 'bg-gray-50'}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
