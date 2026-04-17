import React, { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, Clock, Truck, MapPin, Power } from 'lucide-react';
import { tenantFetch } from '../../lib/api';

interface Settings {
  logo: string;
  is_open: number;
  delivery_fee: number;
  prep_time_avg: number;
  address: string;
}

interface Props {
  tenantSlug: string;
}

export default function StoreSettings({ tenantSlug }: Props) {
  const [settings, setSettings] = useState<Settings>({
    logo: '',
    is_open: 1,
    delivery_fee: 0,
    prep_time_avg: 30,
    address: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, [tenantSlug]);

  const fetchSettings = async () => {
    try {
      const res = await tenantFetch(tenantSlug, '/api/admin/settings');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await tenantFetch(tenantSlug, '/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage('Configurações salvas!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-xl font-black italic uppercase tracking-tighter">Configurações da Loja</h2>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Personalize sua presença online e logística</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Status e Logo */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden">
               <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-1">Status da Loja</h3>
                    <p className={`text-xl font-black italic uppercase tracking-tighter ${settings.is_open ? 'text-emerald-500' : 'text-red-500'}`}>
                      {settings.is_open ? 'Aberta para Pedidos' : 'Fechada Temporariamente'}
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSettings({ ...settings, is_open: settings.is_open ? 0 : 1 })}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${settings.is_open ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-100 text-gray-400'}`}
                  >
                    <Power className="w-6 h-6" />
                  </button>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
               <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Logo da Loja (URL)</label>
               <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center relative overflow-hidden border border-gray-100 shrink-0">
                    {settings.logo ? (
                      <img src={settings.logo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-200" />
                    )}
                  </div>
                  <input 
                    value={settings.logo}
                    onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
                    placeholder="https://sua-logo.com/img.png"
                    className="flex-1 bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 focus:ring-red-500"
                  />
               </div>
            </div>
          </div>

          {/* Delivery e Prep */}
          <div className="space-y-6">
             <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <Truck className="w-5 h-5 text-emerald-500" />
                   </div>
                   <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Taxa de Entrega</h3>
                </div>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                   <input 
                     type="number"
                     step="0.01"
                     value={settings.delivery_fee}
                     onChange={(e) => setSettings({ ...settings, delivery_fee: parseFloat(e.target.value) })}
                     className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 font-bold text-xl focus:ring-2 focus:ring-red-500"
                   />
                </div>
             </div>

             <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-500" />
                   </div>
                   <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Tempo de Preparo (min)</h3>
                </div>
                <input 
                  type="number"
                  value={settings.prep_time_avg}
                  onChange={(e) => setSettings({ ...settings, prep_time_avg: parseInt(e.target.value) })}
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-xl focus:ring-2 focus:ring-red-500"
                />
             </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                 <MapPin className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Endereço de Origem</h3>
           </div>
           <input 
             value={settings.address}
             onChange={(e) => setSettings({ ...settings, address: e.target.value })}
             placeholder="Rua, Número, Bairro, Cidade..."
             className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 focus:ring-red-500"
           />
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-3 ml-1">
             Este endereço é usado para calcular rotas e distância de entrega.
           </p>
        </div>

        <div className="flex items-center justify-between pt-4">
           {message && (
             <span className="text-emerald-500 font-bold text-sm animate-pulse">✨ {message}</span>
           )}
           <div className="flex-1"></div>
           <button 
             type="submit"
             disabled={saving}
             className="flex items-center gap-3 px-12 py-5 bg-red-600 text-white rounded-[24px] font-black uppercase text-sm tracking-widest shadow-xl shadow-red-900/30 active:scale-95 transition-all disabled:opacity-50"
           >
             {saving ? 'Gravando...' : <><Save className="w-5 h-5" /> Salvar Alterações</>}
           </button>
        </div>
      </form>
    </div>
  );
}
