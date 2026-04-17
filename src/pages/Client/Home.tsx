import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Search, MapPin, Clock, ChevronRight, X, Trash2 } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white font-bold">
              {tenant?.name?.[0] || 'D'}
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">{tenant?.name || 'Carregando...'}</h1>
              <div className="flex items-center text-[10px] text-gray-500 gap-1">
                <Clock className="w-3 h-3" />
                <span>30-45 min • Entrega Grátis</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ShoppingCart className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search & Categories */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="O que você quer comer hoje?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-red-500 transition-colors shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
          <button 
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest whitespace-nowrap transition-all ${!selectedCategory ? 'bg-red-500 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-100'}`}
          >
            Tudo
          </button>
          {menu.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-6 py-2 rounded-full text-[10px] md:text-sm font-black uppercase tracking-widest whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-red-500 text-white shadow-lg' : 'bg-white text-gray-600 border border-gray-100'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid Grouped by Category */}
      <div className="max-w-7xl mx-auto px-4 space-y-8 md:space-y-12 pb-20">
        {filteredMenu.map(category => (
          <div key={category.id} className="space-y-4 md:space-y-6">
            <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-gray-900 border-l-4 border-red-500 pl-4">{category.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {category.items.map((item) => (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setSelectedItemId(item.id)}
                  className="bg-white rounded-[24px] md:rounded-[32px] p-4 md:p-5 shadow-sm border border-gray-50 flex gap-4 md:gap-5 hover:shadow-xl transition-all group active:scale-95 cursor-pointer relative overflow-hidden"
                >
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-sm md:text-base mb-1 group-hover:text-red-600 transition-colors uppercase italic tracking-tighter">{item.name}</h3>
                    <p className="text-[10px] md:text-xs text-gray-400 line-clamp-2 mb-3 md:mb-4 leading-relaxed font-medium">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-black italic text-gray-900 text-base md:text-lg">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                      </span>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItemId(item.id);
                        }}
                        className="p-2 md:p-3 bg-gray-50 text-red-500 rounded-xl md:rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      >
                         <Plus className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl md:rounded-2xl overflow-hidden shrink-0 border border-gray-50 shadow-inner group-hover:rotate-3 transition-transform">
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
