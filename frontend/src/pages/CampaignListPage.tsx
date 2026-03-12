import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Megaphone,
  Wifi,
  WifiOff,
  Clock,
  Users,
  MousePointerClick,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';

interface Campaign {
  id: string;
  name: string;
  status: string;
  planTier: string;
  createdAt: string;
  endDate: string | null;
  session?: { phoneNumber: string; status: string } | null;
  _count: { groups: number; leads: number; clicks: number };
}

export default function CampaignListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    mainRedirectUrl: 'https://',
    endDate: '',
  });

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/campaigns').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => api.post('/campaigns', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setShowCreate(false);
      setForm({ name: '', mainRedirectUrl: 'https://', endDate: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const planColor: Record<string, string> = {
    BASIC: 'badge-gray',
    ADVANCED: 'badge-yellow',
    PREMIUM: 'badge-green',
    BLACK: 'bg-purple-900/40 text-purple-400 text-xs px-2 py-0.5 rounded-full font-medium',
  };

  const statusIcon = (session?: Campaign['session'] | null) =>
    session?.status === 'CONNECTED' ? (
      <Wifi className="w-4 h-4 text-brand-400" />
    ) : (
      <WifiOff className="w-4 h-4 text-gray-600" />
    );

  const remainingDays = (endDate: string | null) => {
    if (!endDate) return null;
    const diff = Math.ceil(
      (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return diff;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Campanhas de Grupos</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Gerencie seus disparos em massa no WhatsApp
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">Nova Campanha</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome da campanha</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Lançamento Produto X"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Link Principal (redirecionamento)
                </label>
                <input
                  className="input"
                  value={form.mainRedirectUrl}
                  onChange={(e) =>
                    setForm({ ...form, mainRedirectUrl: e.target.value })
                  }
                  placeholder="https://seu-link.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Data de término (opcional)
                </label>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
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

      {/* List */}
      {isLoading ? (
        <div className="text-gray-500 text-center py-16">Carregando...</div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Megaphone className="w-12 h-12 text-gray-700 mb-4" />
          <p className="text-gray-400 font-medium">Nenhuma campanha ainda</p>
          <p className="text-gray-600 text-sm mt-1">
            Crie sua primeira campanha para começar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((c) => {
            const days = remainingDays(c.endDate);
            return (
              <div
                key={c.id}
                className="card hover:border-gray-700 transition-colors cursor-pointer group"
                onClick={() => navigate(`/campaigns/${c.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {statusIcon(c.session)}
                    <h3 className="font-semibold text-white truncate">{c.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className={planColor[c.planTier] ?? 'badge-gray'}>
                      {c.planTier}
                    </span>
                    <button
                      className="btn-ghost p-1 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Excluir campanha?'))
                          deleteMutation.mutate(c.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                </div>

                {c.session && (
                  <p className="text-xs text-gray-500 mb-3">{c.session.phoneNumber}</p>
                )}

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-gray-800 rounded-lg p-2 text-center">
                    <MousePointerClick className="w-4 h-4 text-brand-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-white">{c._count.clicks}</p>
                    <p className="text-xs text-gray-500">Clicks</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2 text-center">
                    <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-white">{c._count.leads}</p>
                    <p className="text-xs text-gray-500">Leads</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-2 text-center">
                    <Megaphone className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-white">{c._count.groups}</p>
                    <p className="text-xs text-gray-500">Grupos</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>
                    Criada em{' '}
                    {format(new Date(c.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                  {days !== null && (
                    <span
                      className={clsx(
                        'flex items-center gap-1',
                        days < 7 ? 'text-red-400' : days < 30 ? 'text-yellow-400' : 'text-gray-500'
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      {days > 0 ? `${days} dias restantes` : 'Expirada'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
