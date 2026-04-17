import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Layout, ArrowRight, Shield, ShoppingBag, Globe, AlertCircle } from 'lucide-react';

export default function PortalLogin() {
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getCleanedSlug = (input: string) => {
    let raw = input.trim();
    try {
      if (raw.includes('/') || raw.includes('.')) {
        const urlStr = raw.startsWith('http') ? raw : `http://${raw}`;
        const url = new URL(urlStr);
        const pathParts = url.pathname.split('/').filter(p => p);
        if (pathParts.length > 0) return pathParts[0].toLowerCase().replace(/[^a-z0-9-]/g, '');
      }
    } catch (e) {}
    if (raw.includes('/')) {
      raw = raw.split('/').filter(p => p).pop() || raw;
    }
    return raw.toLowerCase().replace(/[^a-z0-9-]/g, '');
  };

  const detectedSlug = getCleanedSlug(slug);

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!slug.trim()) {
      setError('Por favor, informe o link da sua loja.');
      return;
    }

    setLoading(true);

    try {
      // Handle full URLs or paths: extract the last part of the path
      let rawSlug = slug.trim();
      try {
        // Check if it's a URL
        if (rawSlug.includes('/') || rawSlug.includes('.')) {
          const urlStr = rawSlug.startsWith('http') ? rawSlug : `http://${rawSlug}`;
          const url = new URL(urlStr);
          const pathParts = url.pathname.split('/').filter(p => p);
          if (pathParts.length > 0) {
            // Usually the first part of the path is the tenant slug (e.g. /my-store/...)
            rawSlug = pathParts[0];
          }
        }
      } catch (e) {
        // If not a URL, just take the last part after / if any
        if (rawSlug.includes('/')) {
          rawSlug = rawSlug.split('/').filter(p => p).pop() || rawSlug;
        }
      }

      // Final cleaning: remove everything except alphanumeric and hyphens
      const cleanSlug = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '');
      
      if (!cleanSlug) {
        setError('Link inválido.');
        setLoading(false);
        return;
      }

      // Check if tenant exists
      const res = await fetch(`/api/tenants/check/${cleanSlug}`);
      const data = await res.json();

      if (data.exists) {
        if (data.status === 'suspended') {
          setError('Este estabelecimento está suspenso. Entre em contato com o suporte.');
        } else {
          // Redirect to the tenant-specific admin login
          navigate(`/${cleanSlug}/admin/login`);
        }
      } else {
        setError('Estabelecimento não encontrado. Verifique o link informado.');
      }
    } catch (err) {
      setError('Erro ao validar o link. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 selection:bg-red-100 selection:text-red-600">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-red-50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gray-50 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-xl shadow-red-200 group-hover:scale-110 transition-transform">
              D
            </div>
            <span className="text-2xl font-black tracking-tighter">Delivery Master</span>
          </Link>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter mb-2">Acesso ao Painel</h1>
          <p className="text-gray-500 font-medium">Informe o link do seu estabelecimento para entrar.</p>
        </div>

        <div className="bg-white rounded-[40px] shadow-[0_32px_64px_rgba(0,0,0,0.08)] border border-gray-100 p-8 lg:p-10">
          <form onSubmit={handleAccess} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-sm font-black text-gray-400 uppercase tracking-widest ml-1">
                Link da sua Loja (URL)
              </label>
              <div className="relative group">
                <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-600 transition-colors" />
                <input 
                  type="text" 
                  placeholder="ex: minha-lanchonete"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 font-bold placeholder:text-gray-300 focus:bg-white focus:border-red-600 outline-none transition-all shadow-sm group-hover:border-gray-200"
                />
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-2 ml-1">
                delivery-master.app/<span className="text-red-600">{detectedSlug || 'seu-link'}</span>
              </p>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-200 flex items-center justify-center group active:scale-95 disabled:opacity-50 disabled:cursor-wait"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Acessar Painel
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-50 flex flex-col gap-4">
            <Link 
              to="/superadmin/login" 
              className="flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors py-2"
            >
              <Shield className="w-4 h-4" />
              Sou Administrador da Plataforma
            </Link>
            <Link 
              to="/signup" 
              className="flex items-center justify-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 transition-colors py-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Não tem uma conta? Começar Grátis
            </Link>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-gray-300 font-bold uppercase tracking-[0.2em]">
            Delivery Master Logística &copy; 2026
          </p>
        </div>
      </motion.div>
    </div>
  );
}
