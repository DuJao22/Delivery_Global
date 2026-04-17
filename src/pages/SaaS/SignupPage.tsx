import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo: '',
    cover_image: '',
    payment_config: '',
    admin_username: '',
    admin_password: '',
    populateSampleData: true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Falha ao processar JSON:', text);
        alert('Erro interno do servidor. Por favor, tente novamente.');
        return;
      }

      if (res.ok) {
        navigate(`/${formData.slug}/admin/login`);
      } else {
        alert(`Erro ao criar conta: ${data.details || data.error || 'O link pode já estar em uso.'}`);
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      alert('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-sm border border-secondary">
        <h1 className="text-2xl font-bold text-center mb-6">Criar Sistema</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome do Negócio</label>
            <input 
              type="text" 
              required 
              className="w-full p-3 rounded-xl border border-secondary bg-background"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Link Personalizado (slug)</label>
            <div className="flex items-center">
              <span className="text-text-light mr-2">app.com/</span>
              <input 
                type="text" 
                required 
                pattern="[a-z0-9-]+"
                title="Apenas letras minúsculas, números e hífens"
                className="w-full p-3 rounded-xl border border-secondary bg-background"
                value={formData.slug}
                onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Usuário Administrador</label>
              <input 
                type="text" 
                required 
                className="w-full p-3 rounded-xl border border-secondary bg-background"
                value={formData.admin_username}
                onChange={e => setFormData({...formData, admin_username: e.target.value})}
                placeholder="Ex: admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Senha Administrador</label>
              <input 
                type="password" 
                required 
                className="w-full p-3 rounded-xl border border-secondary bg-background"
                value={formData.admin_password}
                onChange={e => setFormData({...formData, admin_password: e.target.value})}
                placeholder="Sua senha segura"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL do Logo (Opcional)</label>
            <input 
              type="url" 
              className="w-full p-3 rounded-xl border border-secondary bg-background"
              value={formData.logo}
              onChange={e => setFormData({...formData, logo: e.target.value})}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL da Imagem de Capa (Opcional)</label>
            <input 
              type="url" 
              className="w-full p-3 rounded-xl border border-secondary bg-background"
              value={formData.cover_image}
              onChange={e => setFormData({...formData, cover_image: e.target.value})}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Chave Pix (Opcional)</label>
            <input 
              type="text" 
              className="w-full p-3 rounded-xl border border-secondary bg-background"
              value={formData.payment_config}
              onChange={e => setFormData({...formData, payment_config: e.target.value})}
              placeholder="Sua chave Pix"
            />
          </div>
          <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
            <input 
              type="checkbox"
              id="populate"
              className="w-5 h-5 accent-primary cursor-pointer"
              checked={formData.populateSampleData}
              onChange={e => setFormData({...formData, populateSampleData: e.target.checked})}
            />
            <label htmlFor="populate" className="text-sm font-bold text-primary cursor-pointer leading-tight">
              Começar com produtos e categorias de exemplo
              <p className="text-[10px] font-normal text-gray-500 mt-0.5">Recomendado para testar o sistema rapidamente</p>
            </label>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
