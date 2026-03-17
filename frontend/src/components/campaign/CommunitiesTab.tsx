import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Plus, Trash2, ExternalLink } from 'lucide-react';
import api from '../../lib/api';

interface Community {
  id: string;
  name: string;
  description: string | null;
  inviteLink: string | null;
  createdAt: string;
  _count: { groups: number };
}

export default function CommunitiesTab({ campaignId }: { campaignId: string }) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', inviteLink: '' });

  const { data: communities = [], isLoading } = useQuery<Community[]>({
    queryKey: ['communities', campaignId],
    queryFn: () => api.get(`/campaigns/${campaignId}/communities`).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) =>
      api.post(`/campaigns/${campaignId}/communities`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communities', campaignId] });
      setShowCreate(false);
      setForm({ name: '', description: '', inviteLink: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/campaigns/${campaignId}/communities/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communities', campaignId] }),
  });

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
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
            >
              <div>
                <label className="text-sm text-gray-400 block mb-1">Nome</label>
                <input
                  className="input"
                  placeholder="Nome da Comunidade"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Descrição</label>
                <textarea
                  className="input"
                  placeholder="Descrição..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Link de Convite</label>
                <input
                  className="input"
                  placeholder="https://chat.whatsapp.com/..."
                  value={form.inviteLink}
                  onChange={(e) => setForm({ ...form, inviteLink: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setShowCreate(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-gray-500 text-center py-12">Carregando...</div>
      ) : communities.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Globe className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium">Nenhuma comunidade</p>
          <p className="text-sm mt-1">
            Crie ou importe comunidades do WhatsApp para organizar múltiplos grupos
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {communities.map((c) => (
            <div key={c.id} className="card hover:border-gray-700 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-brand-400 shrink-0" />
                  <h3 className="font-medium text-white truncate">{c.name}</h3>
                </div>
                <button
                  className="btn-ghost p-1 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    if (confirm('Excluir comunidade?')) deleteMutation.mutate(c.id);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
              {c.description && (
                <p className="text-sm text-gray-500 mb-2 line-clamp-2">{c.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{c._count.groups} grupos vinculados</span>
                {c.inviteLink && (
                  <a
                    href={c.inviteLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Entrar
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
