import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, MapPin, CheckCircle2, ShoppingBag, CreditCard, Lock, Phone, User, AlertCircle } from 'lucide-react';
import { tenantFetch } from '../../lib/api';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export default function CheckoutFlow() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  
  const [step, setStep] = useState(1);
  const cart: CartItem[] = location.state?.cart || [];
  const total: number = location.state?.total || 0;

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  const [clientData, setClientData] = useState({ 
    name: user ? user.name : '', 
    phone: user ? user.phone : '',
    address: ''
  });
  
  const [password, setPassword] = useState('');
  const [authStep, setAuthStep] = useState<'phone' | 'login' | 'register' | 'authenticated'>(user ? 'authenticated' : 'phone');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    if (cart.length === 0) {
      navigate(`/${tenantSlug}`);
    }
  }, [cart, tenantSlug, navigate]);

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await tenantFetch(tenantSlug!, '/api/users/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clientData.phone })
      });
      const data = await res.json();
      if (data.exists) {
        setClientData({ ...clientData, name: data.name });
        setAuthStep('login');
      } else {
        setAuthStep('register');
      }
    } catch (err) {
      setAuthError('Erro ao verificar telefone.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await tenantFetch(tenantSlug!, '/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clientData.phone, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setAuthStep('authenticated');
      } else {
        setAuthError(data.error || 'Senha incorreta.');
      }
    } catch (err) {
      setAuthError('Erro ao fazer login.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await tenantFetch(tenantSlug!, '/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clientData.name, phone: clientData.phone, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('user', JSON.stringify({ id: data.user_id, name: data.name, phone: data.phone }));
        setAuthStep('authenticated');
      } else {
        setAuthError(data.error || 'Erro ao criar conta.');
      }
    } catch (err) {
      setAuthError('Erro ao conectar com o servidor.');
    }
  };

  const submitOrder = async () => {
    if (authStep !== 'authenticated' || !clientData.address) return;
    
    setIsSubmitting(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user')!);
      const res = await tenantFetch(tenantSlug!, '/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          client_name: currentUser.name,
          client_phone: currentUser.phone,
          delivery_address: clientData.address,
          items: cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })),
          total_price: total
        })
      });

      if (res.ok) {
        setOrderSuccess(true);
      } else {
        alert('Erro ao criar pedido.');
      }
    } catch (error) {
      alert('Erro de conexão ao criar pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full"
        >
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter uppercase italic">Pedido Realizado!</h2>
          <p className="text-gray-500 mb-10 leading-relaxed font-medium">
            Seu pedido foi recebido com sucesso. Em breve o restaurante começará o preparo e você poderá acompanhar a entrega.
          </p>
          <div className="bg-gray-50 rounded-3xl p-6 mb-10 text-left border border-gray-100">
             <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-5 h-5 text-red-500" />
                <p className="text-sm font-bold truncate">{clientData.address}</p>
             </div>
             <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-red-500" />
                <p className="text-sm font-bold text-gray-600">{cart.length} itens no total</p>
             </div>
          </div>
          <button 
            onClick={() => navigate(`/${tenantSlug}/perfil`)}
            className="w-full py-5 bg-red-600 text-white font-bold rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 transition-all uppercase tracking-widest text-sm"
          >
            Acompanhar Meus Pedidos
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b px-6 h-16 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500">
           <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-gray-900">Finalizar Pedido</h1>
      </header>

      {/* Progress */}
      <div className="px-6 py-8">
         <div className="flex items-center gap-2 mb-8 max-w-lg mx-auto">
            {[1, 2, 3].map(i => (
               <React.Fragment key={i}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${step >= i ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {i}
                  </div>
                  {i < 3 && <div className={`flex-1 h-1 rounded-full transition-all ${step > i ? 'bg-red-600' : 'bg-gray-200'}`}></div>}
               </React.Fragment>
            ))}
         </div>

         <div className="max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
               {step === 1 && (
                  <motion.div 
                    key="step1" 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                     <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                           <MapPin className="w-5 h-5 text-red-500" /> Endereço de Entrega
                        </h2>
                        <div className="space-y-4">
                           <textarea 
                             placeholder="Rua, número, bairro e complemento..."
                             value={clientData.address}
                             onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
                             className="w-full h-32 bg-gray-50 border border-gray-100 rounded-3xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
                           />
                           <p className="text-xs text-gray-400 font-medium px-4">Capriche no complemento (ex: Casa amarela atrás da escola) para facilitar p/ o motoboy.</p>
                        </div>
                     </div>
                  </motion.div>
               )}

               {step === 2 && (
                  <motion.div 
                    key="step2" 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                     <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Sua Conta</h2>
                        
                        {authStep === 'authenticated' ? (
                           <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center gap-4">
                              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                 <User className="w-6 h-6" />
                              </div>
                              <div>
                                 <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Conectado como</p>
                                 <p className="font-bold text-gray-900">{clientData.name || user?.name}</p>
                              </div>
                           </div>
                        ) : (
                           <div className="space-y-6">
                              {authError && (
                                 <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5" /> {authError}
                                 </div>
                              )}
                              
                              {authStep === 'phone' && (
                                 <form onSubmit={handleCheckPhone} className="space-y-4">
                                    <div className="space-y-2">
                                       <label className="text-xs font-bold text-gray-400 uppercase ml-4">Telefone / WhatsApp</label>
                                       <input 
                                         type="tel" required value={clientData.phone}
                                         onChange={e => setClientData({...clientData, phone: e.target.value})}
                                         className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                         placeholder="(00) 00000-0000"
                                       />
                                    </div>
                                    <button type="submit" className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl">Avançar</button>
                                 </form>
                              )}

                              {authStep === 'login' && (
                                 <form onSubmit={handleLogin} className="space-y-4">
                                    <p className="text-sm text-gray-500 px-4">Olá, {clientData.name}! Informe sua senha para entrar.</p>
                                    <div className="space-y-2">
                                       <label className="text-xs font-bold text-gray-400 uppercase ml-4">Senha</label>
                                       <input 
                                         type="password" required value={password}
                                         onChange={e => setPassword(e.target.value)}
                                         className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                       />
                                    </div>
                                    <button type="submit" className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl">Confirmar</button>
                                 </form>
                              )}

                              {authStep === 'register' && (
                                 <form onSubmit={handleRegister} className="space-y-4">
                                    <div className="space-y-2">
                                       <label className="text-xs font-bold text-gray-400 uppercase ml-4">Seu Nome</label>
                                       <input 
                                         type="text" required value={clientData.name}
                                         onChange={e => setClientData({...clientData, name: e.target.value})}
                                         className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm"
                                       />
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-xs font-bold text-gray-400 uppercase ml-4">Crie uma Senha</label>
                                       <input 
                                         type="password" required value={password}
                                         onChange={e => setPassword(e.target.value)}
                                         className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm"
                                       />
                                    </div>
                                    <button type="submit" className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl">Criar Conta</button>
                                 </form>
                              )}
                           </div>
                        )}
                     </div>
                  </motion.div>
               )}

               {step === 3 && (
                  <motion.div 
                    key="step3" 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                     <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Resumo do Pedido</h2>
                        <div className="space-y-4 mb-8">
                           {cart.map(item => (
                              <div key={item.id} className="flex justify-between items-center text-sm">
                                 <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 bg-red-50 text-red-600 rounded flex items-center justify-center font-bold text-xs">{item.quantity}x</span>
                                    <span className="font-medium text-gray-700">{item.name}</span>
                                 </div>
                                 <span className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                           ))}
                        </div>
                        <div className="border-t pt-4 space-y-2">
                           <div className="flex justify-between text-sm text-gray-500">
                              <span>Subtotal</span>
                              <span>R$ {total.toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between text-sm text-emerald-600 font-bold">
                              <span>Entrega</span>
                              <span>Grátis</span>
                           </div>
                           <div className="flex justify-between text-xl font-black text-gray-900 pt-2">
                              <span>Total</span>
                              <span>R$ {total.toFixed(2)}</span>
                           </div>
                        </div>

                        <div className="mt-10 pt-10 border-t">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Método de Pagamento</h3>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                               <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">
                                  <CreditCard className="w-5 h-5" />
                               </div>
                               <div>
                                  <p className="font-bold text-sm">Pagamento na Entrega</p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">Dinheiro ou Cartão</p>
                               </div>
                            </div>
                        </div>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
      </div>

      {/* Footer Navigation */}
      <footer className="mt-auto bg-white border-t p-6 sticky bottom-0 z-30">
         <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <button 
              onClick={handlePrev} 
              disabled={step === 1}
              className="px-6 py-4 text-gray-400 font-bold uppercase text-xs tracking-widest disabled:opacity-30"
            >
               Voltar
            </button>
            <button 
              onClick={step === 3 ? submitOrder : handleNext}
              disabled={(step === 1 && !clientData.address) || (step === 2 && authStep !== 'authenticated') || isSubmitting}
              className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
               {isSubmitting ? 'Confirmando...' : (step === 3 ? 'Finalizar Pedido' : 'Próximo Passo')}
               <ChevronRight className="w-5 h-5" />
            </button>
         </div>
      </footer>
    </div>
  );
}
