import React from 'react';
import { motion } from 'motion/react';
import { 
  Truck, 
  Map as MapIcon, 
  Navigation, 
  Package, 
  Clock, 
  Shield, 
  ChevronRight, 
  BarChart2, 
  Users, 
  MessageCircle,
  Zap,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-red-100 selection:text-red-600">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-red-200">
              D
            </div>
            <span className="text-xl font-bold tracking-tight">Delivery Global</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#solucao" className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors">Solução</a>
            <a href="#recursos" className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors">Recursos</a>
            <a href="#preços" className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors">Preços</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/superadmin/login" className="text-sm font-semibold text-gray-500 hover:text-gray-900">Entrar</Link>
            <Link 
              to="/signup" 
              className="px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-full hover:bg-gray-800 transition-all shadow-md active:scale-95"
            >
              Começar Agora
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
          <div className="flex-1 text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase tracking-wider mb-8"
            >
              <Zap className="w-3 h-3 fill-current" /> Logística Inteligente para seu Negócio
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl lg:text-8xl font-black text-gray-900 leading-[0.9] tracking-tighter mb-8"
            >
              ENTREGAS <br />
              <span className="text-red-600">INTELIGENTES.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-500 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Controle sua frota, otimize rotas automaticamente e acompanhe cada pedido em tempo real. A plataforma definitiva para restaurantes e lojas que levam a logística a sério.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
            >
              <Link to="/signup" className="w-full sm:w-auto px-10 py-5 bg-red-600 text-white font-bold rounded-2xl text-lg hover:bg-red-700 transition-all shadow-2xl shadow-red-200 flex items-center justify-center gap-2 group">
                Criar Minha Conta <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/lanchonete-exemplo" className="w-full sm:w-auto px-10 py-5 bg-white text-gray-900 border border-gray-100 font-bold rounded-2xl text-lg hover:bg-gray-50 transition-all shadow-xl flex items-center justify-center gap-2 group">
                Ver Loja Exemplo <Package className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>

          <div className="flex-1 relative">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="relative z-10 bg-white rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.1)] border border-gray-100 p-4"
            >
               <img 
                 src="https://images.unsplash.com/photo-1586864387917-f53bc2644343?auto=format&fit=crop&w=1200&q=80" 
                 alt="Dashboard Preview" 
                 className="rounded-[32px] w-full"
               />
               
               {/* Floating elements */}
               <motion.div 
                 animate={{ y: [0, -10, 0] }}
                 transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                 className="absolute -top-10 -right-10 bg-white p-6 rounded-3xl shadow-xl border border-gray-100 hidden md:block"
               >
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                       <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold uppercase text-gray-400">Tempo de Entrega</p>
                       <p className="text-sm font-black">-15% OTIMIZADO</p>
                    </div>
                 </div>
                 <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-emerald-500"></div>
                 </div>
               </motion.div>

               <motion.div 
                 animate={{ y: [0, 10, 0] }}
                 transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
                 className="absolute -bottom-6 -left-10 bg-gray-900 p-6 rounded-3xl shadow-xl hidden md:block"
               >
                 <div className="flex items-center gap-4 text-white">
                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                       <Truck className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="text-xl font-black leading-none">#42 Ativo</p>
                       <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">EM ROTA DE ENTREGA</p>
                    </div>
                 </div>
               </motion.div>
            </motion.div>
            
            {/* Background blur */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-red-100/30 rounded-full blur-[120px] -z-10"></div>
          </div>
        </div>
      </main>

      {/* Stats Board */}
      <section className="bg-gray-50 py-20 border-y border-gray-100">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-12">
            <StatItem label="Pedidos Entregues" value="1.2M+" />
            <StatItem label="Economia em Combustível" value="24%" />
            <StatItem label="Precisão de Horário" value="99.2%" />
            <StatItem label="Motoboys Conectados" value="50k+" />
         </div>
      </section>

      {/* Solution Section */}
      <section id="solucao" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
             <h2 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter mb-6">INTELIGÊNCIA QUE MOVE O SEU NEGÓCIO.</h2>
             <p className="text-lg text-gray-500">Não somos apenas um app de entregas. Somos o centro de controle da sua logística, eliminando erros e atrasos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Navigation className="w-8 h-8" />}
              title="Roteirização Automática"
              description="Nossos algoritmos calculam a melhor sequência de entregas baseada em trânsito e localização."
            />
            <FeatureCard 
              icon={<MapIcon className="w-8 h-8" />}
              title="Rastreamento em Tempo Real"
              description="Clientes e administradores acompanham a localização GPS do motoboy a cada segundo."
            />
            <FeatureCard 
              icon={<Package className="w-8 h-8" />}
              title="Gestão de Pedidos"
              description="Do balcão ao delivery. Centralize todos os seus canais de venda em uma única tela."
            />
          </div>
        </div>
      </section>

      {/* Why Choose Us - Image & Content */}
      <section className="bg-gray-900 py-32 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-20">
          <div className="flex-1">
             <div className="inline-block px-4 py-2 bg-red-600 rounded-lg text-xs font-black uppercase tracking-widest mb-8">
                O Diferencial
             </div>
             <h2 className="text-5xl font-black leading-[0.95] tracking-tighter mb-10">O CONTROLE TOTAL <br /> MUDOU DE MÃOS.</h2>
             
             <ul className="space-y-6">
                <li className="flex gap-4">
                   <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                      <Check className="w-6 h-6 text-red-500" />
                   </div>
                   <div>
                      <h4 className="text-xl font-bold mb-1">Painel Multiloja</h4>
                      <p className="text-gray-400">Gerencie múltiplas unidades de um único login de forma sincronizada.</p>
                   </div>
                </li>
                <li className="flex gap-4">
                   <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                      <Check className="w-6 h-6 text-red-500" />
                   </div>
                   <div>
                      <h4 className="text-xl font-bold mb-1">App Exclusivo para Motoboys</h4>
                      <p className="text-gray-400">Interface simplificada para motoristas aceitarem rotas e confirmarem entregas.</p>
                   </div>
                </li>
             </ul>
          </div>

          <div className="flex-1 relative">
             <div className="aspect-square bg-red-600 rounded-full blur-[150px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20"></div>
             <img 
               src="https://images.unsplash.com/photo-1549463591-24c1882bd398?auto=format&fit=crop&w=800&q=80" 
               alt="Motoboy em ação" 
               className="rounded-[40px] grayscale hover:grayscale-0 transition-all duration-700 relative z-10 shadow-2xl"
             />
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-32 px-6">
         <div className="max-w-5xl mx-auto bg-red-600 rounded-[50px] p-12 lg:p-24 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10">
               <h2 className="text-5xl lg:text-7xl font-black tracking-tighter mb-8 leading-[0.9]">PRONTO PARA ELEVAR <br /> O NÍVEL DO SEU DELIVERY?</h2>
               <p className="text-xl text-red-100 mb-12 max-w-2xl mx-auto">Junte-se a milhares de restaurantes que já otimizaram sua logística conosco.</p>
               <Link to="/signup" className="inline-flex px-12 py-6 bg-white text-red-600 font-bold rounded-2xl text-xl hover:bg-gray-100 transition-all shadow-2xl active:scale-95">
                  Começar Teste Grátis
               </Link>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-gray-100">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">
                D
              </div>
              <span className="font-bold">Delivery Global</span>
            </div>
            
            <div className="flex gap-10 text-sm font-medium text-gray-400">
               <a href="#" className="hover:text-gray-900">Privacidade</a>
               <a href="#" className="hover:text-gray-900">Termos</a>
               <a href="#" className="hover:text-gray-900">Suporte</a>
            </div>

            <p className="text-xs text-gray-400">© 2024 Delivery Global. Made with ❤️ by DS Company.</p>
         </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="p-10 rounded-[40px] bg-gray-50 border border-gray-100/50 hover:bg-white hover:shadow-2xl transition-all duration-500 group">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-red-600 shadow-sm mb-8 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
      <p className="text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="text-center">
       <p className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter mb-2">{value}</p>
       <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}
