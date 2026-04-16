import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, User, ArrowRight, Truck } from 'lucide-react';
import { tenantFetch } from '../../lib/api';

export default function AdminLogin() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await tenantFetch(tenantSlug!, '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(`admin_token_${tenantSlug}`, data.token);
        navigate(`/${tenantSlug}/admin`);
      } else {
        setError('Usuário ou senha incorretos.');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative back-blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-50 rounded-full -mr-48 -mt-48 blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gray-50 rounded-full -ml-48 -mb-48 blur-3xl opacity-50"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-red-600 rounded-[30px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-200 rotate-12">
            <Truck className="w-10 h-10 text-white -rotate-12" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter mb-2">Delivery Global</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Acesso Gestor da Unidade</p>
        </div>

        <div className="bg-white p-10 rounded-[48px] shadow-[0_40px_80px_rgba(0,0,0,0.06)] border border-gray-50">
          {error && (
            <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold uppercase flex items-center justify-center gap-2 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Usuário Administrador</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 rounded-3xl bg-gray-50 border border-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Senha Segura</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 rounded-3xl bg-gray-50 border border-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-5 bg-gray-900 text-white font-black rounded-3xl hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
            >
              {loading ? 'Validando...' : 'Entrar no Sistema'} <ArrowRight className="w-5 h-5 ml-3" />
            </button>
          </form>
        </div>

        <p className="mt-12 text-center text-gray-300 text-[10px] font-black uppercase tracking-widest">
           &copy; 2024 Delivery Global Intelligente
        </p>
      </motion.div>
    </div>
  );
}
