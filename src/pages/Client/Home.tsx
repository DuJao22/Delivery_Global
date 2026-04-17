import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Search, MapPin, Clock, ChevronRight, X, Trash2, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { tenantFetch } from '../../lib/api';
import { useTenant } from '../../components/TenantProvider';
import ProductModal from '../../components/Client/ProductModal';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}

interface CartItem {
  id: string; // Composite ID to handle same product with different options
  productId: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  observation?: string;
  selectedOptions?: { id: number; name: string; price: number }[];
}

interface Category {
  id: number;
  name: string;
  items: MenuItem[];
}

export default function Home() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenant } = useTenant();
  const [menu, setMenu] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!tenantSlug) return;
    
    tenantFetch(tenantSlug, '/api/menu')
      .then(res => res.json())
      .then(data => setMenu(data))
      .catch(err => console.error('Error fetching menu:', err));
  }, [tenantSlug]);

  const addToCart = (item: any, quantity: number = 1, observation: string = '', selectedOptions: any[] = []) => {
    // Generate a unique ID based on options and observation to distinguish different versions of the same product
    const optionsKey = selectedOptions.map(o => o.id).sort().join('-');
    const cartId = `${item.id}-${optionsKey}-${observation}`;

    setCart(prev => {
      const existing = prev.find(i => i.id === cartId);
      if (existing) {
        return prev.map(i => i.id === cartId ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { 
        id: cartId,
        productId: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity, 
        observation, 
        selectedOptions 
      }];
    });
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.id === cartId);
      if (item) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return prev.filter(i => i.id !== cartId);
        return prev.map(i => i.id === cartId ? { ...i, quantity: newQty } : i);
      }
      return prev;
    });
  };

  const filteredMenu = menu.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0 && (!selectedCategory || cat.id === selectedCategory));

  const cartTotal = cart.reduce((sum, item) => {
    const optionsTotal = item.selectedOptions?.reduce((s, o) => s + o.price, 0) || 0;
    return sum + ((item.price + optionsTotal) * item.quantity);
  }, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    // Navigate to a simplified booking/checkout flow
    navigate(`/${tenantSlug}/agendar`, { state: { cart, total: cartTotal } });
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* High-Impact Hero Section */}
      <div className="relative h-[45vh] min-h-[400px] w-full bg-gradient-to-br from-[#5D21D0] via-[#8239E8] to-[#2B0B80] overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/20 rounded-full -ml-32 -mb-32 blur-[100px]"></div>
        
        <div className="max-w-7xl mx-auto px-6 pt-12 text-center lg:text-left h-full flex flex-col items-center lg:items-start">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-8 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20"
          >
            <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-[#5D21D0] font-black text-[10px]">W</div>
            <span className="text-white font-bold text-[10px] tracking-widest uppercase">Cardápio Web</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tighter max-w-2xl"
          >
            O MAIOR <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50">CARDÁPIO DIGITAL</span> <br />
            DO BRASIL
          </motion.h1>
        </div>
      </div>

      {/* Floating Store Header Card */}
      <div className="max-w-4xl mx-auto px-4 -mt-32 relative z-30">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100"
        >
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
            <div className="relative group">
              <div className="w-24 h-24 bg-gradient-to-tr from-primary to-accent rounded-[24px] overflow-hidden border-4 border-white shadow-xl">
                 {tenant?.logo ? (
                   <img src={tenant.logo} alt={tenant.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-white text-3xl font-black">
                     {tenant?.name?.[0]}
                   </div>
                 )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow-lg animate-bounce">
                <Clock className="w-3 h-3" />
              </div>
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter mb-1">{tenant?.name || 'Carregando...'}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{tenant?.address || 'Localização não informada'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-emerald-500">Aberto até às 23h59</span>
                </div>
              </div>
              
              <div className="mt-6 flex items-center gap-2">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text"
                    placeholder="O que você quer comer hoje?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-xs font-medium focus:outline-none focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                  />
                </div>
                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-3 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all active:scale-95 shadow-lg"
                >
                   <ShoppingCart className="w-5 h-5" />
                   {cartCount > 0 && (
                     <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                       {cartCount}
                     </span>
                   )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Horizontal Categories */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="flex items-center gap-3 overflow-x-auto pb-6 no-scrollbar">
          <button 
            onClick={() => setSelectedCategory(null)}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all ${!selectedCategory ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
          >
            Tudo
          </button>
          {menu.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Highlights / Features (Optional, matching image motif) */}
      {!selectedCategory && !searchQuery && (
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Destaques</h3>
            <span className="text-xs font-bold text-primary flex items-center gap-1 cursor-pointer hover:underline uppercase tracking-tighter transition-all">
              Ver tudo <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          
          <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
            {menu[0]?.items.slice(0, 3).map((item, idx) => (
              <motion.div 
                key={`highlight-${item.id}`}
                whileHover={{ y: -5 }}
                className="w-72 shrink-0 bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer group"
                onClick={() => setSelectedItemId(item.id)}
              >
                <div className="relative h-48">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                  <div className="absolute top-4 left-4 bg-primary text-white text-[8px] font-black px-3 py-1.5 rounded-lg uppercase tracking-[0.15em] backdrop-blur-md">
                    Promoção Imperdível
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">{item.name}</h4>
                  <p className="text-[10px] text-gray-500 line-clamp-2 mb-4 font-medium">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 line-through font-bold">R$ {(item.price * 1.2).toFixed(2)}</span>
                      <span className="text-lg font-black text-gray-900 italic tracking-tighter">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                      </span>
                    </div>
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                       <Plus className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Main Menu Feed */}
      <div className="max-w-7xl mx-auto px-6 space-y-16 pb-20">
        {filteredMenu.map(category => (
          <div key={category.id} className="space-y-8">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900 flex items-center gap-4">
              {category.name}
              <div className="h-px flex-1 bg-gradient-to-r from-gray-100 to-transparent"></div>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.items.map((item) => (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSelectedItemId(item.id)}
                  className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-50 flex gap-6 hover:shadow-2xl transition-all group active:scale-95 cursor-pointer relative overflow-hidden"
                >
                  <div className="flex-1">
                    <div className="inline-block px-2 py-0.5 bg-accent/10 text-accent text-[7px] font-black uppercase tracking-widest rounded mb-2">
                       Novidade
                    </div>
                    <h3 className="font-bold text-gray-900 text-base mb-1 group-hover:text-primary transition-colors uppercase italic tracking-tighter">{item.name}</h3>
                    <p className="text-[10px] text-gray-400 line-clamp-2 mb-4 leading-relaxed font-medium">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-black italic text-gray-900 text-lg">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                      </span>
                    </div>
                  </div>
                  <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-gray-50 shadow-inner group-hover:rotate-3 transition-transform">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        {filteredMenu.length === 0 && (
          <div className="py-20 text-center">
             <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Nenhum item encontrado</p>
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[60] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" /> Seu Carrinho
                </h2>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <ShoppingCart className="w-10 h-10 text-gray-200" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Seu carrinho está vazio</h3>
                    <p className="text-sm text-gray-500">Adicione alguns itens para começar seu pedido.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-gray-900 text-sm uppercase italic tracking-tighter">{item.name}</h4>
                          <span className="text-sm font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.price + (item.selectedOptions?.reduce((s,o) => s + o.price, 0) || 0)) * item.quantity)}
                          </span>
                        </div>
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                             {item.selectedOptions.map(opt => (
                               <span key={opt.id} className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                                 + {opt.name}
                               </span>
                             ))}
                          </div>
                        )}
                        {item.observation && (
                          <p className="text-[10px] text-gray-400 mt-1 italic italic">Obs: {item.observation}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 text-gray-400 hover:text-gray-900 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t bg-gray-50">
                  <div className="flex items-center justify-between mb-2 text-gray-500 text-sm">
                    <span>Subtotal</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-6 text-gray-900 font-bold text-lg">
                    <span>Total</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}</span>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-200 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    Finalizar Pedido <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Cart Button for Mobile */}
      {cartCount > 0 && !isCartOpen && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-6 left-4 right-4 z-40 md:hidden"
        >
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-red-500 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase opacity-80 leading-none mb-1">Ver Carrinho</p>
                <p className="font-bold text-sm leading-none">{cartCount} ite{cartCount > 1 ? 'ns' : 'm'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </motion.div>
      )}

      {/* Floating Action / Saiba Mais (Matching user image) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[40] pointer-events-none w-full max-w-xs px-6">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full bg-white text-gray-900 px-8 py-4 rounded-full shadow-[0_15px_30px_rgba(0,0,0,0.15)] border border-gray-100 flex items-center justify-center gap-3 font-bold text-lg pointer-events-auto"
        >
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
             <Zap className="w-4 h-4 fill-current" />
          </div>
          Saiba mais
        </motion.button>
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedItemId && (
          <ProductModal 
            itemId={selectedItemId}
            tenantSlug={tenantSlug!}
            onClose={() => setSelectedItemId(null)}
            onAddToCart={addToCart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
