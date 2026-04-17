import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, MapPin, CheckCircle2, ShoppingBag, CreditCard, Lock, Phone, User, AlertCircle, Zap } from 'lucide-react';
import { tenantFetch } from '../../lib/api';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  selectedOptions?: { id: number; name: string; price: number }[];
  observation?: string;
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
  });
  const [addressData, setAddressData] = useState({
    type: 'Casa',
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    complement: '',
  });
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | 'new' | null>(null);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  
  const [password, setPassword] = useState('');
  const [authStep, setAuthStep] = useState<'phone' | 'login' | 'register' | 'authenticated'>(user ? 'authenticated' : 'phone');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Dinheiro' | 'Cartão'>('PIX');

  useEffect(() => {
    if (cart.length === 0) {
      navigate(`/${tenantSlug}`);
    }
  }, [cart, tenantSlug, navigate]);

  useEffect(() => {
    if (authStep === 'authenticated' && tenantSlug && user?.id) {
      tenantFetch(tenantSlug, `/api/users/${user.id}/addresses`)
        .then(res => res.json())
        .then(data => {
          setSavedAddresses(data || []);
          if (data && data.length > 0) {
            const defaultAddr = data.find((a: any) => a.is_default) || data[0];
            setSelectedAddressId(defaultAddr.id);
            setAddressData({
              type: defaultAddr.type,
              cep: defaultAddr.cep,
              street: defaultAddr.street,
              number: defaultAddr.number,
              neighborhood: defaultAddr.neighborhood,
              city: defaultAddr.city,
              state: defaultAddr.state,
              complement: defaultAddr.complement || '',
            });
          } else {
            setSelectedAddressId('new');
          }
        })
        .catch(err => console.error('Error fetching addresses:', err));
    }
  }, [authStep, tenantSlug]);

  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    setAddressData(prev => ({ ...prev, cep: cleanCep }));
    
    if (cleanCep.length === 8) {
      setIsSearchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddressData(prev => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }));
        }
      } catch (err) {
        console.error('Error fetching CEP:', err);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

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
    const fullAddress = `${addressData.street}, ${addressData.number}${addressData.complement ? ` - ${addressData.complement}` : ''}, ${addressData.neighborhood}, ${addressData.city}-${addressData.state}, CEP: ${addressData.cep}`;
    
    if (authStep !== 'authenticated' || !addressData.street || !addressData.number) return;
    
    setIsSubmitting(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user')!);
      
      // Save address if new
      if (selectedAddressId === 'new') {
        await tenantFetch(tenantSlug!, `/api/users/${currentUser.id}/addresses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...addressData, is_default: savedAddresses.length === 0 })
        });
      }

      const res = await tenantFetch(tenantSlug!, '/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          client_name: currentUser.name,
          client_phone: currentUser.phone,
          delivery_address: fullAddress,
          items: cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price, selectedOptions: i.selectedOptions, observation: i.observation })),
          total_price: total,
          payment_method: paymentMethod
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
                 <p className="text-sm font-bold truncate">
                   {addressData.street}, {addressData.number}
                 </p>
              </div>
             <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-red-500" />
                <p className="text-sm font-bold text-gray-600">{cart.length} itens no total</p>
             </div>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => navigate(`/${tenantSlug}/perfil`)}
              className="w-full py-5 bg-red-600 text-white font-bold rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 transition-all uppercase tracking-widest text-sm"
            >
              Acompanhar Meus Pedidos
            </button>
            <button 
              onClick={() => {
                const text = `Olá! Acabei de realizar o pedido #${Date.now().toString().slice(-4)} no site. Pode confirmar pra mim?`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
              }}
              className="w-full py-5 bg-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-600 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" /> Confirmar via WhatsApp
            </button>
          </div>
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
                    className="space-y-4 md:space-y-6"
                  >
                     {authStep === 'authenticated' && savedAddresses.length > 0 && (
                        <div className="bg-white p-5 md:p-6 rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100 mb-4 md:mb-6">
                           <h3 className="text-[10px] md:text-sm font-black uppercase text-gray-400 tracking-widest mb-3 md:mb-4 ml-2">Endereços Salvos</h3>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {savedAddresses.map(addr => (
                                 <button
                                   key={addr.id}
                                   onClick={() => {
                                     setSelectedAddressId(addr.id);
                                     setAddressData(addr);
                                   }}
                                   className={`text-left p-4 rounded-3xl border-2 transition-all ${selectedAddressId === addr.id ? 'border-red-500 bg-red-50' : 'border-gray-50 hover:border-gray-200 bg-white'}`}
                                 >
                                    <div className="flex items-center gap-2 mb-1">
                                       <div className={`w-2 h-2 rounded-full ${selectedAddressId === addr.id ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                                       <span className="text-xs font-black uppercase tracking-tighter text-gray-900">{addr.type}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 line-clamp-1">{addr.street}, {addr.number}</p>
                                 </button>
                              ))}
                              <button
                                onClick={() => {
                                  setSelectedAddressId('new');
                                  setAddressData({ type: 'Casa', cep: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '' });
                                }}
                                className={`text-left p-4 rounded-3xl border-2 border-dashed transition-all ${selectedAddressId === 'new' ? 'border-red-500 bg-red-50' : 'border-gray-100 hover:border-gray-200'}`}
                              >
                                 <span className="text-xs font-black uppercase tracking-tighter text-gray-900">+ Novo Endereço</span>
                              </button>
                           </div>
                        </div>
                     )}

                     {(selectedAddressId === 'new' || authStep !== 'authenticated') && (
                        <div className="bg-white p-5 md:p-8 rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100">
                           <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
                              <MapPin className="w-5 h-5 text-red-500" /> Detalhes da Entrega
                           </h2>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1 block">CEP</label>
                                <div className="relative">
                                  <input 
                                    type="text"
                                    placeholder="00000-000"
                                    value={addressData.cep}
                                    onChange={(e) => handleCepLookup(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-red-500"
                                  />
                                  {isSearchingCep && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                      <div className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="md:col-span-2 flex gap-2">
                                {['Casa', 'Trabalho', 'Outro'].map(t => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => setAddressData({...addressData, type: t})}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${addressData.type === t ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>

                              <div className="md:col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1 block">Rua / Logradouro</label>
                                <input 
                                  value={addressData.street}
                                  onChange={e => setAddressData({...addressData, street: e.target.value})}
                                  placeholder="Nome da rua..."
                                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1 block">Número</label>
                                <input 
                                  value={addressData.number}
                                  onChange={e => setAddressData({...addressData, number: e.target.value})}
                                  placeholder="123"
                                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1 block">Complemento</label>
                                <input 
                                  value={addressData.complement}
                                  onChange={e => setAddressData({...addressData, complement: e.target.value})}
                                  placeholder="Apto, Bloco..."
                                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1 block">Bairro</label>
                                <input 
                                  value={addressData.neighborhood}
                                  onChange={e => setAddressData({...addressData, neighborhood: e.target.value})}
                                  placeholder="Seu bairro..."
                                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1 block">Cidade / UF</label>
                                <input 
                                  value={`${addressData.city}${addressData.state ? ` - ${addressData.state}` : ''}`}
                                  readOnly
                                  className="w-full bg-gray-100 border border-gray-100 rounded-2xl p-4 text-sm font-bold text-gray-500"
                                />
                              </div>
                           </div>
                        </div>
                     )}
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
                    className="space-y-4 md:space-y-6"
                  >
                     <div className="bg-white p-5 md:p-8 rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100">
                        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Resumo do Pedido</h2>
                        <div className="space-y-4 mb-8">
                           {cart.map(item => (
                              <div key={item.id} className="space-y-1">
                                <div className="flex justify-between items-center text-sm">
                                   <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 bg-red-50 text-red-600 rounded flex items-center justify-center font-bold text-xs">{item.quantity}x</span>
                                      <span className="font-medium text-gray-700">{item.name}</span>
                                   </div>
                                   <span className="font-bold text-gray-900">
                                     R$ {((item.price + (item.selectedOptions?.reduce((s, o) => s + o.price, 0) || 0)) * item.quantity).toFixed(2)}
                                   </span>
                                </div>
                                {item.selectedOptions && item.selectedOptions.length > 0 && (
                                  <div className="ml-8 flex flex-wrap gap-1">
                                    {item.selectedOptions.map(opt => (
                                      <span key={opt.id} className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded">
                                        + {opt.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {item.observation && (
                                  <p className="ml-8 text-[10px] text-gray-400 italic">Obs: {item.observation}</p>
                                )}
                              </div>
                           ))}
                        </div>
                        <div className="border-t pt-4 space-y-2">
                           <div className="flex justify-between text-sm text-gray-500">
                              <span>Subtotal</span>
                              <span>R$ {(total || 0).toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between text-sm text-emerald-600 font-bold">
                              <span>Entrega</span>
                              <span>Grátis</span>
                           </div>
                           <div className="flex justify-between text-xl font-black text-gray-900 pt-2">
                              <span>Total</span>
                              <span>R$ {(total || 0).toFixed(2)}</span>
                           </div>
                        </div>

                        <div className="mt-10 pt-10 border-t">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Método de Pagamento</h3>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                  { id: 'PIX', label: 'PIX', icon: <Zap className="w-5 h-5" />, sub: 'Pagamento instantâneo' },
                                  { id: 'Dinheiro', label: 'Dinheiro', icon: <ShoppingBag className="w-5 h-5" />, sub: 'Pagar na entrega' },
                                  { id: 'Cartão', label: 'Cartão', icon: <CreditCard className="w-5 h-5" />, sub: 'Maquininha na entrega' }
                                ].map(method => (
                                  <button
                                    key={method.id}
                                    onClick={() => setPaymentMethod(method.id as any)}
                                    className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${paymentMethod === method.id ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                                  >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === method.id ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
                                      {method.icon}
                                    </div>
                                    <div className="text-left">
                                      <p className="font-bold text-sm text-gray-900">{method.label}</p>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">{method.sub}</p>
                                    </div>
                                    {paymentMethod === method.id && (
                                      <div className="ml-auto w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white scale-75">
                                        <CheckCircle2 className="w-4 h-4" />
                                      </div>
                                    )}
                                  </button>
                                ))}
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
              className="px-6 py-4 text-gray-400 font-bold uppercase text-[10px] md:text-xs tracking-widest disabled:opacity-30"
            >
               Voltar
            </button>
            <button 
              onClick={step === 3 ? submitOrder : handleNext}
              disabled={(step === 1 && (!addressData.street || !addressData.number)) || (step === 2 && authStep !== 'authenticated') || isSubmitting}
              className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] md:text-sm disabled:opacity-50"
            >
               {isSubmitting ? 'Confirmando...' : (step === 3 ? 'Finalizar Pedido' : 'Próximo Passo')}
               <ChevronRight className="w-4 h-4 md:w-5 h-5" />
            </button>
         </div>
      </footer>
    </div>
  );
}
