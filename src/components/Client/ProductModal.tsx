import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, Check, ShoppingCart } from 'lucide-react';
import { tenantFetch } from '../../lib/api';

interface ProductOption {
  id: number;
  name: string;
  type: 'variation' | 'addition';
  price: number;
}

interface ProductDetails {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  options: ProductOption[];
}

interface ProductModalProps {
  itemId: number;
  tenantSlug: string;
  onClose: () => void;
  onAddToCart: (item: any, quantity: number, observation: string, selectedOptions: ProductOption[]) => void;
}

export default function ProductModal({ itemId, tenantSlug, onClose, onAddToCart }: ProductModalProps) {
  const [item, setItem] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<ProductOption[]>([]);

  useEffect(() => {
    tenantFetch(tenantSlug, `/api/menu-items/${itemId}`)
      .then(res => res.json())
      .then(data => {
        setItem(data);
        setLoading(false);
        // Haptic feel
        if (navigator.vibrate) navigator.vibrate(10);
      })
      .catch(err => console.error(err));
  }, [itemId, tenantSlug]);

  const toggleOption = (option: ProductOption) => {
    if (selectedOptions.find(o => o.id === option.id)) {
      setSelectedOptions(prev => prev.filter(o => o.id !== option.id));
    } else {
      setSelectedOptions(prev => [...prev, option]);
    }
  };

  const totalPrice = (item?.price || 0) + selectedOptions.reduce((sum, o) => sum + o.price, 0);

  if (loading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      <div className="relative w-full max-w-5xl flex flex-col md:flex-row gap-4 md:gap-8 items-center pointer-events-none p-4 md:p-0">
        {/* 3D Product View */}
        <div className="flex-1 flex items-center justify-center perspective-[1000px] pointer-events-none py-4 md:py-0">
          <motion.div
            initial={{ scale: 0.5, rotateY: 0, opacity: 0, y: 50 }}
            animate={{ 
              scale: 1, 
              rotateY: 20, 
              opacity: 1,
              y: [0, -15, 0]
            }}
            transition={{
              scale: { duration: 0.5, ease: "easeOut" },
              rotateY: { duration: 0.8, ease: "easeOut" },
              opacity: { duration: 0.3 },
              y: { 
                repeat: Infinity, 
                duration: 3, 
                ease: "easeInOut" 
              }
            }}
            className="relative pointer-events-auto"
          >
            {/* Shadow beneath the burger */}
            <motion.div 
               animate={{ 
                 scale: [1, 1.2, 1],
                 opacity: [0.2, 0.1, 0.2] 
               }}
               transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
               className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 md:w-48 h-6 md:h-8 bg-black/40 blur-2xl rounded-full"
            />
            
            <img 
              src={item?.image} 
              alt={item?.name} 
              className="w-40 h-40 md:w-96 md:h-96 object-cover rounded-[32px] md:rounded-[48px] shadow-2xl border-4 border-white/10"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>

        {/* Options Card */}
        <motion.div 
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          className="w-full md:w-[400px] bg-white rounded-t-[40px] md:rounded-[40px] shadow-2xl flex flex-col max-h-[75vh] md:max-h-[85vh] pointer-events-auto overflow-hidden"
        >
          <div className="p-6 md:p-8 pb-4 flex items-center justify-between shrink-0">
             <div>
                <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">{item?.name}</h2>
                <p className="text-[10px] md:text-xs font-bold text-red-500 uppercase tracking-widest mt-2 px-1">Personalize seu pedido</p>
             </div>
             <button 
               onClick={onClose}
               className="p-2 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl transition-all"
             >
                <X className="w-5 h-5 md:w-6 md:h-6" />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-2 md:pt-4 space-y-6 md:space-y-8 no-scrollbar">
             <div>
                <p className="text-sm text-gray-500 leading-relaxed font-medium">{item?.description}</p>
             </div>

             {/* Dynamic Options */}
             {item?.options && item.options.length > 0 && (
                <div className="space-y-4 md:space-y-6">
                   <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-2">Opcionais e Adicionais</h3>
                   <div className="space-y-2 md:space-y-3">
                      {item.options.map(opt => (
                         <button
                           key={opt.id}
                           onClick={() => toggleOption(opt)}
                           className={`w-full flex items-center justify-between p-3 md:p-4 rounded-2xl border-2 transition-all ${
                             selectedOptions.find(o => o.id === opt.id) 
                             ? 'border-red-500 bg-red-50 text-red-600' 
                             : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-gray-200'
                           }`}
                         >
                            <div className="flex items-center gap-3">
                               <div className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all ${
                                 selectedOptions.find(o => o.id === opt.id) 
                                 ? 'bg-red-500 border-red-500' 
                                 : 'border-gray-300'
                               }`}>
                                  {selectedOptions.find(o => o.id === opt.id) && <Check className="w-3 h-3 text-white" />}
                               </div>
                               <span className="text-sm font-bold">{opt.name}</span>
                            </div>
                            {opt.price > 0 && (
                               <span className="text-xs font-black">+ R$ {opt.price.toFixed(2)}</span>
                            )}
                         </button>
                      ))}
                   </div>
                </div>
             )}

             <div className="space-y-2 md:space-y-3">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Alguma Observação?</h3>
                <textarea 
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  placeholder="Ex: Sem cebola, retirar picles..."
                  className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl md:rounded-3xl p-4 text-sm font-medium focus:outline-none focus:border-red-500 focus:bg-white transition-all min-h-[80px] md:min-h-[100px] resize-none"
                />
             </div>
          </div>

          <div className="p-6 md:p-8 bg-gray-50 border-t shrink-0">
             <div className="flex items-center justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-3 md:gap-4 bg-white p-1.5 md:p-2 rounded-xl md:rounded-2xl shadow-sm border border-gray-100">
                   <button 
                     onClick={() => setQuantity(q => Math.max(1, q - 1))}
                     className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                   >
                     <Minus className="w-4 h-4 md:w-5 md:h-5" />
                   </button>
                   <span className="w-4 md:w-6 text-center font-black text-base md:text-lg">{quantity}</span>
                   <button 
                     onClick={() => setQuantity(q => q + 1)}
                     className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                   >
                     <Plus className="w-4 h-4 md:w-5 md:h-5" />
                   </button>
                </div>
                <div className="text-right">
                   <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Subtotal</p>
                   <p className="text-xl md:text-2xl font-black text-gray-900">R$ {(totalPrice * quantity).toFixed(2)}</p>
                </div>
             </div>

             <button 
               onClick={() => {
                 if (navigator.vibrate) navigator.vibrate(50);
                 onAddToCart(item, quantity, observation, selectedOptions);
                 onClose();
               }}
               className="w-full py-4 md:py-5 bg-red-600 text-white font-bold rounded-xl md:rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2 md:gap-3 uppercase tracking-widest text-[10px] md:text-xs"
             >
                <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" /> Adicionar ao Carrinho
             </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
