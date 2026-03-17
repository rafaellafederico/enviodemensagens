import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Plus, Trash2, ExternalLink, Users } from 'lucide-react';
import api from '../../lib/api';

interface Channel {
  id: string;
  name: string;
  followersCount: number;
  inviteLink: string | null;
  createdAt: string;
}

export default function ChannelsTab({ campaignId }: { campaignId: string }) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', inviteLink: '' });

  const { data: channels = [], isLoading } = useQuery<Channel[]>({
    queryKey: ['channels', campaignId],
    queryFn: () => api.get(`/campaigns/${campaignId}/channels`).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) =>
      api.post(`/campaigns/${campaignId}/channels`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['channels', campaignId] });
      setShowCreate(false);
      setForm({ name: '', inviteLink: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/campaigns/${campaignId}/channels/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channels', campaignId] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          className="btn-primary flex items-center gap-1 text-sm"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" />
          Novo Canal
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">Novo Canal</h2>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
            >
              <div>
                <label className="text-sm text-gray-400 block mb-1">Nome do Canal</label>
                <input
                  className="input"
                  placeholder="Nome"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Link de Convite</label>
                <input
                  className="input"
                  placeholder="https://whatsapp.com/channel/..."
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
      ) : channels.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Radio className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="font-medium">Nenhum canal</p>
          <p className="text-sm mt-1">
            Crie ou importe canais do WhatsApp para transmissão unilateral para seguidores
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((c) => (
            <div key={c.id} className="card hover:border-gray-700 transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-brand-400 shrink-0" />
                  <h3 className="font-medium text-white truncate">{c.name}</h3>
                </div>
                <button
                  className="btn-ghost p-1 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    if (confirm('Excluir canal?')) deleteMutation.mutate(c.id);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {c.followersCount.toLocaleString()} seguidores
                </span>
                {c.inviteLink && (
                  <a
                    href={c.inviteLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Seguir
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
