import { useState } from 'react';
import { Globe, Plus } from 'lucide-react';

export default function CommunitiesTab({ campaignId }: { campaignId: string }) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          className="btn-primary flex items-center gap-1 text-sm"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" />
          Nova Comunidade
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">Nova Comunidade</h2>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setShowCreate(false); }}>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Nome</label>
                <input className="input" placeholder="Nome da Comunidade" required />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Descrição</label>
                <textarea className="input" placeholder="Descrição..." />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Link de Convite</label>
                <input className="input" placeholder="https://chat.whatsapp.com/..." />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowCreate(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="text-center py-16 text-gray-500">
        <Globe className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="font-medium">Nenhuma comunidade</p>
        <p className="text-sm mt-1">
          Crie ou importe comunidades do WhatsApp para organizar múltiplos grupos
        </p>
      </div>
    </div>
  );
}
