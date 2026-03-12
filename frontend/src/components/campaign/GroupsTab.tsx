import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Trash2,
  ToggleLeft,
  ToggleRight,
  FolderOpen,
} from 'lucide-react';
import api from '../../lib/api';
import clsx from 'clsx';

interface Group {
  id: string;
  name: string;
  status: string;
  captureEnabled: boolean;
  participantCount: number;
  maxCapacity: number;
  inviteLink: string | null;
  createdAt: string;
  folder?: { id: string; name: string } | null;
  _count: { leads: number };
}

interface GroupsData {
  groups: Group[];
  counts: {
    total: number;
    active: number;
    inactive: number;
    warning: number;
    full: number;
  };
}

const statusBadge: Record<string, string> = {
  ACTIVE: 'badge-green',
  INACTIVE: 'badge-gray',
  FULL: 'badge-yellow',
  WARNING: 'badge-red',
};

export default function GroupsTab({ campaignId }: { campaignId: string }) {
  const qc = useQueryClient();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ name: '', inviteLink: '' });

  const { data, isLoading } = useQuery<GroupsData>({
    queryKey: ['groups', campaignId, search, statusFilter],
    queryFn: () =>
      api
        .get(`/campaigns/${campaignId}/groups`, {
          params: { search: search || undefined, status: statusFilter || undefined },
        })
        .then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) =>
      api.post(`/campaigns/${campaignId}/groups`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups', campaignId] });
      setShowCreate(false);
      setForm({ name: '', inviteLink: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/campaigns/${campaignId}/groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', campaignId] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, captureEnabled }: { id: string; captureEnabled: boolean }) =>
      api.patch(`/campaigns/${campaignId}/groups/${id}`, { captureEnabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', campaignId] }),
  });

  const bulkActionMutation = useMutation({
    mutationFn: (action: 'activate' | 'deactivate' | 'delete') =>
      api.patch(`/campaigns/${campaignId}/groups/bulk-action`, {
        groupIds: selected,
        action,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups', campaignId] });
      setSelected([]);
    },
  });

  const groups = data?.groups ?? [];
  const counts = data?.counts;

  return (
    <div className="space-y-4">
      {/* Counters */}
      {counts && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Total', value: counts.total, filter: '' },
            { label: 'Ativos', value: counts.active, filter: 'ACTIVE' },
            { label: 'Inativos', value: counts.inactive, filter: 'INACTIVE' },
            { label: 'Aviso', value: counts.warning, filter: 'WARNING' },
            { label: 'Cheios', value: counts.full, filter: 'FULL' },
          ].map((c) => (
            <button
              key={c.label}
              onClick={() => setStatusFilter(c.filter)}
              className={clsx(
                'px-3 py-1 rounded-lg text-sm transition-colors',
                statusFilter === c.filter
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-700'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              {c.label}{' '}
              <span className="font-bold text-white">{c.value}</span>
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="input pl-9"
            placeholder="Pesquisar grupos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {selected.length > 0 && (
          <div className="flex gap-1">
            <button
              className="btn-secondary text-sm"
              onClick={() => bulkActionMutation.mutate('activate')}
            >
              Ativar ({selected.length})
            </button>
            <button
              className="btn-secondary text-sm"
              onClick={() => bulkActionMutation.mutate('deactivate')}
            >
              Desativar
            </button>
            <button
              className="btn-secondary text-sm text-red-400"
              onClick={() => {
                if (confirm(`Excluir ${selected.length} grupos?`))
                  bulkActionMutation.mutate('delete');
              }}
            >
              Excluir
            </button>
          </div>
        )}

        <div className="flex gap-1 ml-auto">
          <button
            className={clsx('btn-ghost p-2', view === 'grid' && 'text-brand-400')}
            onClick={() => setView('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            className={clsx('btn-ghost p-2', view === 'list' && 'text-brand-400')}
            onClick={() => setView('list')}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            className="btn-primary flex items-center gap-1 text-sm"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4" />
            Novo Grupo
          </button>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">Novo Grupo</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm text-gray-400 block mb-1">Nome do Grupo</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: VIP Turma A"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Link de Convite</label>
                <input
                  className="input"
                  value={form.inviteLink}
                  onChange={(e) => setForm({ ...form, inviteLink: e.target.value })}
                  placeholder="https://chat.whatsapp.com/..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowCreate(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Groups */}
      {isLoading ? (
        <div className="text-gray-500 text-center py-12">Carregando...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Nenhum grupo encontrado</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {groups.map((g) => (
            <div
              key={g.id}
              className={clsx(
                'card cursor-pointer transition-all',
                selected.includes(g.id) ? 'border-brand-600' : 'hover:border-gray-700'
              )}
              onClick={() =>
                setSelected((s) =>
                  s.includes(g.id) ? s.filter((i) => i !== g.id) : [...s, g.id]
                )
              }
            >
              <div className="flex items-start justify-between mb-2">
                <span className={statusBadge[g.status]}>{g.status}</span>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn-ghost p-1"
                    onClick={() =>
                      toggleMutation.mutate({
                        id: g.id,
                        captureEnabled: !g.captureEnabled,
                      })
                    }
                  >
                    {g.captureEnabled ? (
                      <ToggleRight className="w-4 h-4 text-brand-400" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  <button
                    className="btn-ghost p-1"
                    onClick={() => {
                      if (confirm('Excluir grupo?')) deleteMutation.mutate(g.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              <h3 className="font-medium text-white truncate mb-1">{g.name}</h3>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{g.participantCount}/{g.maxCapacity} membros</span>
                <span>{g._count.leads} leads</span>
              </div>
              {g.folder && (
                <p className="text-xs text-gray-600 mt-1">📁 {g.folder.name}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Grupo</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Status</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Membros</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Leads</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Captação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {groups.map((g) => (
                <tr key={g.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{g.name}</p>
                    {g.folder && (
                      <p className="text-xs text-gray-500">📁 {g.folder.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadge[g.status]}>{g.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {g.participantCount}/{g.maxCapacity}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{g._count.leads}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: g.id,
                          captureEnabled: !g.captureEnabled,
                        })
                      }
                    >
                      {g.captureEnabled ? (
                        <ToggleRight className="w-5 h-5 text-brand-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="btn-ghost p-1"
                      onClick={() => {
                        if (confirm('Excluir grupo?')) deleteMutation.mutate(g.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
