import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Power, 
  LogOut, 
  MessageCircle, 
  History,
  AlertCircle,
  Package,
  Phone,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { tenantFetch } from '../../lib/api';

interface Order {
  id: number;
  client_name: string;
  delivery_address: string;
  total_price: number;
  status: string;
}

export default function MotoboyDashboard() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [motoboy, setMotoboy] = useState<any>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const watchId = useRef<number | null>(null);

  const fetchData = async () => {
    if (!tenantSlug) return;
    try {
      const res = await tenantFetch(tenantSlug, '/api/motoboy/me', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem(`motoboy_token_${tenantSlug}`)}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setMotoboy(data);
      setIsOnline(data.status === 'online');

      const ordersRes = await tenantFetch(tenantSlug, '/api/motoboy/orders', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem(`motoboy_token_${tenantSlug}`)}` }
      });
      const ordersData = await ordersRes.json();
      setAssignedOrders(ordersData);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching motoboy data:', err);
      handleLogout();
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [tenantSlug]);

  const updateLocation = async (coords: GeolocationCoordinates) => {
    if (!tenantSlug || !isOnline) return;
    try {
      await tenantFetch(tenantSlug, '/api/motoboy/location', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem(`motoboy_token_${tenantSlug}`)}`
        },
        body: JSON.stringify({ 
          lat: coords.latitude, 
          lng: coords.longitude 
        })
      });
    } catch (err) {
      console.error('Error updating location:', err);
    }
  };

  useEffect(() => {
    if (isOnline) {
      if ('geolocation' in navigator) {
        watchId.current = navigator.geolocation.watchPosition(
          (pos) => updateLocation(pos.coords),
          (err) => console.error('GPS Error:', err),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    } else {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    }
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [isOnline]);

  const toggleStatus = async () => {
    const newStatus = isOnline ? 'offline' : 'online';
    try {
      await tenantFetch(tenantSlug!, '/api/motoboy/status', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem(`motoboy_token_${tenantSlug}`)}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      setIsOnline(!isOnline);
    } catch (err) {
      alert('Erro ao mudar status');
    }
  };

  const completeOrder = async (orderId: number) => {
    if (!confirm('Confirmar entrega do pedido?')) return;
    try {
      await tenantFetch(tenantSlug!, `/api/motoboy/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem(`motoboy_token_${tenantSlug}`)}` }
      });
      fetchData();
    } catch (err) {
      alert('Erro ao completar pedido');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(`motoboy_token_${tenantSlug}`);
    localStorage.removeItem(`motoboy_id_${tenantSlug}`);
    navigate(`/${tenantSlug}/motoboy/login`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Carregando...</div>;

  const activeOrder = assignedOrders.find(o => o.status === 'out_for_delivery');

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Mobile-optimized Header */}
      <header className="p-6 bg-gray-900 border-b border-white/5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md bg-gray-900/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-bold shadow-lg shadow-red-900/20">
            {motoboy?.name[0]}
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight">{motoboy?.name}</h1>
            <div className="flex items-center gap-2">
               <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-gray-500'}`}></div>
               <span className="text-[10px] uppercase font-bold text-gray-400 leading-none">
                 {isOnline ? 'Disponível p/ entregas' : 'Minha conta: Offline'}
               </span>
            </div>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-gray-500 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="p-6 pb-32">
        {/* Status Switcher Card */}
        <div className={`p-8 rounded-[32px] border transition-all duration-500 mb-8 ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_20px_40px_rgba(16,185,129,0.1)]' : 'bg-gray-900 border-white/5'}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
               <h2 className="text-xl font-black uppercase tracking-tighter italic">Status de Trabalho</h2>
               <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-widest">{isOnline ? 'Rastreamento GPS Ativo' : 'Ative p/ receber pedidos'}</p>
            </div>
            <button 
              onClick={toggleStatus}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isOnline ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-gray-800 text-gray-500'}`}
            >
              <Power className="w-6 h-6" />
            </button>
          </div>
          {!isOnline && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
               <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
               <p className="text-xs text-amber-500/90 leading-relaxed font-medium">Você precisa estar **Online** para o sistema poder atribuir rotas inteligentes para você.</p>
            </div>
          )}
        </div>

        {/* Active Delivery */}
        {activeOrder ? (
          <div className="mb-8">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 ml-2">Entrega Atual</h3>
            <div className="bg-white text-gray-900 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
               
               <div className="flex items-start justify-between mb-6">
                  <div>
                    <h4 className="text-2xl font-black italic uppercase tracking-tighter">#{activeOrder.id}</h4>
                    <p className="font-bold text-gray-500">{activeOrder.client_name}</p>
                  </div>
                  <div className="bg-red-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200">
                     Em Rota
                  </div>
               </div>

               <div className="space-y-4 mb-8">
                  <div className="flex gap-3">
                    <MapPin className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm font-medium leading-relaxed">{activeOrder.delivery_address}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeOrder.delivery_address)}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg active:scale-95"
                  >
                    <Navigation className="w-4 h-4" /> Navegar
                  </a>
                  <button 
                    onClick={() => completeOrder(activeOrder.id)}
                    className="flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-emerald-200 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Entregue
                  </button>
               </div>
            </div>
          </div>
        ) : isOnline ? (
          <div className="py-20 text-center flex flex-col items-center opacity-40">
             <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6">
                <Truck className="w-10 h-10 text-gray-500" />
             </div>
             <h3 className="text-xl font-bold italic uppercase tracking-tighter">Aguardando pedidos...</h3>
             <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">Fique nesta tela até um pedido surgir</p>
          </div>
        ) : null}

        {/* Assigned list */}
        {assignedOrders.filter(o => o.status === 'preparing').length > 0 && (
          <div className="mt-8">
             <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 ml-2">Preparando (Próximos)</h3>
             <div className="space-y-4">
                {assignedOrders.filter(o => o.status === 'preparing').map(order => (
                  <div key={order.id} className="bg-gray-900 border border-white/5 p-6 rounded-3xl flex items-center justify-between group">
                    <div>
                       <p className="text-lg font-bold italic uppercase tracking-tighter">#{order.id}</p>
                       <p className="text-xs text-gray-400 font-medium truncate max-w-[150px]">{order.client_name}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-bold text-white mb-1">R$ {order.total_price.toFixed(2)}</p>
                       <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Aguardando Coleta</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>

      {/* Floating Navigator (simplified bottom bar) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-xl border-t border-white/5 px-6 py-4 z-40">
         <div className="max-w-md mx-auto flex items-center justify-around">
            <NavItem active={true} icon={<Truck className="w-6 h-6" />} label="Atividade" />
            <NavItem active={false} icon={<History className="w-6 h-6" />} label="Histórico" />
            <NavItem active={false} icon={<MessageCircle className="w-6 h-6" />} label="Chat" />
         </div>
      </nav>
    </div>
  );
}

function NavItem({ active, icon, label }: { active: boolean, icon: any, label: string }) {
  return (
    <button className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-red-500 scale-110' : 'text-gray-500 hover:text-gray-300'}`}>
       {icon}
       <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}
