import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Star,
  StarOff,
  Edit2,
  Trash2,
  Send,
  MessageSquare,
  Link,
  BarChart2,
  Calendar,
  User,
} from 'lucide-react';
import api from '../../lib/api';
import clsx from 'clsx';

interface Message {
  id: string;
  title: string;
  content: string;
  type: string;
  isFavorite: boolean;
  tags: string[];
  hasAttachment: boolean;
  mentionAll: boolean;
  useAI: boolean;
  folder?: { id: string; name: string } | null;
  createdAt: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  TEXT: <MessageSquare className="w-3.5 h-3.5" />,
  LINK: <Link className="w-3.5 h-3.5" />,
  POLL: <BarChart2 className="w-3.5 h-3.5" />,
  EVENT: <Calendar className="w-3.5 h-3.5" />,
  CONTACT: <User className="w-3.5 h-3.5" />,
};

const typeLabels: Record<string, string> = {
  TEXT: 'Texto',
  LINK: 'Link',
  POLL: 'Enquete',
  EVENT: 'Evento',
  CONTACT: 'Contato',
};

export default function MessagesTab({ campaignId }: { campaignId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editMsg, setEditMsg] = useState<Message | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'TEXT',
    mentionAll: false,
    useAI: false,
    tags: '',
  });

  const { data, isLoading } = useQuery<{ messages: Message[]; total: number }>({
    queryKey: ['messages', campaignId, search, typeFilter, favoriteOnly],
    queryFn: () =>
      api
        .get(`/campaigns/${campaignId}/messages`, {
          params: {
            search: search || undefined,
            type: typeFilter || undefined,
            favorite: favoriteOnly ? 'true' : undefined,
          },
        })
        .then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post(`/campaigns/${campaignId}/messages`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', campaignId] });
      setShowCreate(false);
      setForm({ title: '', content: '', type: 'TEXT', mentionAll: false, useAI: false, tags: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & object) =>
      api.patch(`/campaigns/${campaignId}/messages/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', campaignId] });
      setEditMsg(null);
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/campaigns/${campaignId}/messages/${id}/favorite`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', campaignId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/campaigns/${campaignId}/messages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', campaignId] }),
  });

  const messages = data?.messages ?? [];

  const MessageForm = ({ onSubmit, initial }: {
    onSubmit: (d: object) => void;
    initial?: Message | null;
  }) => {
    const [localForm, setLocalForm] = useState({
      title: initial?.title ?? form.title,
      content: initial?.content ?? form.content,
      type: initial?.type ?? form.type,
      mentionAll: initial?.mentionAll ?? form.mentionAll,
      useAI: initial?.useAI ?? form.useAI,
      tags: initial?.tags?.join(', ') ?? form.tags,
    });

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            ...localForm,
            tags: localForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
          });
        }}
        className="space-y-4"
      >
        <div>
          <label className="text-sm text-gray-400 block mb-1">Título</label>
          <input
            className="input"
            value={localForm.title}
            onChange={(e) => setLocalForm({ ...localForm, title: e.target.value })}
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm text-gray-400">Mensagem</label>
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={localForm.useAI}
                onChange={(e) => setLocalForm({ ...localForm, useAI: e.target.checked })}
              />
              Usar Dev.IA
            </label>
          </div>
          <textarea
            className="input min-h-[100px] resize-y"
            value={localForm.content}
            onChange={(e) => setLocalForm({ ...localForm, content: e.target.value })}
            placeholder="Conteúdo da mensagem..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Tipo</label>
            <select
              className="input"
              value={localForm.type}
              onChange={(e) => setLocalForm({ ...localForm, type: e.target.value })}
            >
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Tags</label>
            <input
              className="input"
              value={localForm.tags}
              onChange={(e) => setLocalForm({ ...localForm, tags: e.target.value })}
              placeholder="Boas Vindas, Promo..."
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={localForm.mentionAll}
            onChange={(e) => setLocalForm({ ...localForm, mentionAll: e.target.checked })}
          />
          Mencionar todos os usuários (@todos)
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => {
              setShowCreate(false);
              setEditMsg(null);
            }}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex-1">
            {initial ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="input pl-9"
            placeholder="Pesquisar mensagens..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input w-auto"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Todos os tipos</option>
          {Object.entries(typeLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <button
          className={clsx(
            'btn-secondary flex items-center gap-1.5 text-sm',
            favoriteOnly && 'text-yellow-400 border border-yellow-700'
          )}
          onClick={() => setFavoriteOnly(!favoriteOnly)}
        >
          <Star className="w-4 h-4" />
          Favoritas
        </button>

        <button
          className="btn-primary flex items-center gap-1 text-sm"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" />
          Nova Mensagem
        </button>
      </div>

      <p className="text-sm text-gray-500">
        {data?.total ?? 0} mensagens cadastradas
      </p>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Nova Mensagem</h2>
            <MessageForm
              onSubmit={(d) => createMutation.mutate(d)}
            />
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editMsg && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Editar Mensagem</h2>
            <MessageForm
              initial={editMsg}
              onSubmit={(d) => updateMutation.mutate({ id: editMsg.id, ...d })}
            />
          </div>
        </div>
      )}

      {/* Messages list */}
      {isLoading ? (
        <div className="text-gray-500 text-center py-12">Carregando...</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Nenhuma mensagem encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((m) => (
            <div key={m.id} className="card hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge-gray flex items-center gap-1">
                      {typeIcons[m.type]}
                      {typeLabels[m.type]}
                    </span>
                    {m.tags.map((t) => (
                      <span key={t} className="badge-gray">
                        {t}
                      </span>
                    ))}
                    {m.mentionAll && (
                      <span className="badge-yellow">@todos</span>
                    )}
                  </div>
                  <h3 className="font-medium text-white">{m.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {m.content}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="btn-ghost p-1.5"
                    title="Favoritar"
                    onClick={() => favoriteMutation.mutate(m.id)}
                  >
                    {m.isFavorite ? (
                      <Star className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <StarOff className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  <button
                    className="btn-ghost p-1.5"
                    title="Editar"
                    onClick={() => setEditMsg(m)}
                  >
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    className="btn-ghost p-1.5"
                    title="Disparar"
                  >
                    <Send className="w-4 h-4 text-brand-400" />
                  </button>
                  <button
                    className="btn-ghost p-1.5"
                    title="Excluir"
                    onClick={() => {
                      if (confirm('Excluir mensagem?')) deleteMutation.mutate(m.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
