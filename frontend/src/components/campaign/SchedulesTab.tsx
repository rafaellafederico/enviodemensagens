import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CalendarClock, XCircle } from 'lucide-react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';

interface Schedule {
  id: string;
  type: string;
  status: string;
  scheduledAt: string;
  executedAt: string | null;
  message?: { id: string; title: string } | null;
  groups: { group: { id: string; name: string } }[];
}

const scheduleTypes: Record<string, string> = {
  SEND_MESSAGE: 'Enviar Mensagem',
  CHANGE_GROUP_NAME: 'Alterar Nome do Grupo',
  CHANGE_GROUP_DESCRIPTION: 'Adicionar Descrição',
  EXPORT_CONTACTS: 'Exportar Contatos',
  CHANGE_GROUP_IMAGE: 'Alterar Imagem',
  PROMOTE_ADMIN: 'Promover Admin',
  ADD_USER: 'Adicionar Usuário',
  EDIT_GROUP_DATA: 'Editar Dados do Grupo',
  REMOVE_CONTACTS: 'Remover Contatos',
  LEAVE_GROUP: 'Sair do Grupo',
  WELCOME_MESSAGE: 'Boas-vindas',
};

const statusStyle: Record<string, string> = {
  SCHEDULED: 'badge-yellow',
  EXECUTED: 'badge-green',
  CANCELLED: 'badge-gray',
  FAILED: 'badge-red',
};

const statusLabel: Record<string, string> = {
  SCHEDULED: 'Programado',
  EXECUTED: 'Executado',
  CANCELLED: 'Cancelado',
  FAILED: 'Falhou',
};

export default function SchedulesTab({ campaignId }: { campaignId: string }) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    type: 'SEND_MESSAGE',
    scheduledAt: '',
    groupIds: [] as string[],
    messageId: '',
  });

  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ['schedules', campaignId, statusFilter],
    queryFn: () =>
      api
        .get(`/campaigns/${campaignId}/schedules`, {
          params: { status: statusFilter || undefined },
        })
        .then((r) => r.data),
  });

  const { data: groups = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['groups-select', campaignId],
    queryFn: () =>
      api
        .get(`/campaigns/${campaignId}/groups`)
        .then((r) => r.data.groups.map((g: { id: string; name: string }) => ({ id: g.id, name: g.name }))),
  });

  const { data: messages = [] } = useQuery<{ id: string; title: string }[]>({
    queryKey: ['messages-select', campaignId],
    queryFn: () =>
      api
        .get(`/campaigns/${campaignId}/messages`)
        .then((r) => r.data.messages.map((m: { id: string; title: string }) => ({ id: m.id, title: m.title }))),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post(`/campaigns/${campaignId}/schedules`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules', campaignId] });
      setShowCreate(false);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/campaigns/${campaignId}/schedules/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules', campaignId] }),
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {['', 'SCHEDULED', 'EXECUTED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              'px-3 py-1 rounded-lg text-sm transition-colors',
              statusFilter === s
                ? 'bg-brand-600/20 text-brand-400 border border-brand-700'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            {s ? statusLabel[s] : 'Todos'}
          </button>
        ))}

        <button
          className="btn-primary ml-auto flex items-center gap-1 text-sm"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Novo Agendamento</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  ...form,
                  scheduledAt: new Date(form.scheduledAt).toISOString(),
                  messageId: form.messageId || undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm text-gray-400 block mb-1">Tipo de Automação</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {Object.entries(scheduleTypes).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              {form.type === 'SEND_MESSAGE' && (
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Mensagem</label>
                  <select
                    className="input"
                    value={form.messageId}
                    onChange={(e) => setForm({ ...form, messageId: e.target.value })}
                  >
                    <option value="">Selecione uma mensagem</option>
                    {messages.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-400 block mb-1">Grupos</label>
                <div className="space-y-1 max-h-40 overflow-y-auto bg-gray-800 rounded-lg p-2">
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.groupIds.includes(g.id)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            groupIds: e.target.checked
                              ? [...form.groupIds, g.id]
                              : form.groupIds.filter((i) => i !== g.id),
                          })
                        }
                      />
                      {g.name}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">Data e Hora</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowCreate(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando...' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule list */}
      {isLoading ? (
        <div className="text-gray-500 text-center py-12">Carregando...</div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Nenhum agendamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="card flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={statusStyle[s.status]}>{statusLabel[s.status]}</span>
                  <span className="badge-gray">{scheduleTypes[s.type] ?? s.type}</span>
                </div>
                {s.message && (
                  <p className="text-sm text-white font-medium">{s.message.title}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(s.scheduledAt), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                  {s.executedAt &&
                    ` — executado em ${format(new Date(s.executedAt), "dd/MM HH:mm")}`}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {s.groups.map((g) => g.group.name).join(', ')}
                </p>
              </div>
              {s.status === 'SCHEDULED' && (
                <button
                  className="btn-ghost p-1.5 shrink-0"
                  onClick={() => cancelMutation.mutate(s.id)}
                  title="Cancelar"
                >
                  <XCircle className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
