import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../lib/api';
import { useState } from 'react';

interface Monitoring {
  id: string;
  isActive: boolean;
  onJoinWebhook: string;
  onLeaveWebhook: string;
  externalJoinUrl: string | null;
  externalLeaveUrl: string | null;
  group: { id: string; name: string; status: string };
}

interface MonitoringData {
  enabled: boolean;
  monitorings: Monitoring[];
}

const webhookTypes = [
  { value: 'OFFICIAL_CAMPAIGN', label: 'Campanha Oficial', disabled: true },
  { value: 'NORMAL_CAMPAIGN', label: 'Campanha Normal', disabled: true },
  { value: 'EXTERNAL', label: 'Webhook Externo' },
  { value: 'CURRENT_CAMPAIGN', label: 'Campanha Atual' },
];

export default function MonitoringTab({ campaignId }: { campaignId: string }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    groupId: '',
    onJoinWebhook: 'CURRENT_CAMPAIGN',
    onLeaveWebhook: 'CURRENT_CAMPAIGN',
    externalJoinUrl: '',
    externalLeaveUrl: '',
  });

  const { data } = useQuery<MonitoringData>({
    queryKey: ['monitoring', campaignId],
    queryFn: () =>
      api.get(`/campaigns/${campaignId}/monitoring`).then((r) => r.data),
  });

  const { data: groups = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['groups-select', campaignId],
    queryFn: () =>
      api.get(`/campaigns/${campaignId}/groups`).then((r) =>
        r.data.groups.map((g: { id: string; name: string }) => ({ id: g.id, name: g.name }))
      ),
  });

  const toggleEnabledMutation = useMutation({
    mutationFn: () => api.patch(`/campaigns/${campaignId}/monitoring/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monitoring', campaignId] }),
  });

  const addMutation = useMutation({
    mutationFn: (body: object) =>
      api.post(`/campaigns/${campaignId}/monitoring`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitoring', campaignId] });
      setShowAdd(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/campaigns/${campaignId}/monitoring/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monitoring', campaignId] }),
  });

  const monitorings = data?.monitorings ?? [];

  return (
    <div className="space-y-4">
      {/* Global toggle */}
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="w-5 h-5 text-brand-400" />
          <div>
            <h3 className="font-semibold text-white">Monitoramento de Grupos</h3>
            <p className="text-sm text-gray-500">
              Detecta entradas e saídas automáticas de leads
            </p>
          </div>
        </div>
        <button onClick={() => toggleEnabledMutation.mutate()}>
          {data?.enabled ? (
            <ToggleRight className="w-8 h-8 text-brand-400" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-gray-600" />
          )}
        </button>
      </div>

      {/* Add group to monitor */}
      <div className="flex justify-end">
        <button
          className="btn-primary flex items-center gap-1 text-sm"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="w-4 h-4" />
          Adicionar Grupo
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">
              Monitorar Grupo
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMutation.mutate({
                  groupId: form.groupId,
                  onJoinWebhook: form.onJoinWebhook,
                  onLeaveWebhook: form.onLeaveWebhook,
                  externalJoinUrl: form.externalJoinUrl || undefined,
                  externalLeaveUrl: form.externalLeaveUrl || undefined,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm text-gray-400 block mb-1">Grupo</label>
                <select
                  className="input"
                  value={form.groupId}
                  onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                  required
                >
                  <option value="">Selecione</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Ao Entrar no Grupo
                </label>
                <select
                  className="input"
                  value={form.onJoinWebhook}
                  onChange={(e) => setForm({ ...form, onJoinWebhook: e.target.value })}
                >
                  {webhookTypes.map((w) => (
                    <option key={w.value} value={w.value} disabled={w.disabled}>
                      {w.label} {w.disabled ? '(indisponível)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Ao Sair do Grupo
                </label>
                <select
                  className="input"
                  value={form.onLeaveWebhook}
                  onChange={(e) => setForm({ ...form, onLeaveWebhook: e.target.value })}
                >
                  {webhookTypes.map((w) => (
                    <option key={w.value} value={w.value} disabled={w.disabled}>
                      {w.label} {w.disabled ? '(indisponível)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {(form.onJoinWebhook === 'EXTERNAL' || form.onLeaveWebhook === 'EXTERNAL') && (
                <>
                  {form.onJoinWebhook === 'EXTERNAL' && (
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">URL Webhook Entrada</label>
                      <input
                        className="input"
                        value={form.externalJoinUrl}
                        onChange={(e) => setForm({ ...form, externalJoinUrl: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                  {form.onLeaveWebhook === 'EXTERNAL' && (
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">URL Webhook Saída</label>
                      <input
                        className="input"
                        value={form.externalLeaveUrl}
                        onChange={(e) => setForm({ ...form, externalLeaveUrl: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowAdd(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={addMutation.isPending}>
                  {addMutation.isPending ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monitored groups */}
      {monitorings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Radio className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Nenhum grupo monitorado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {monitorings.map((m) => (
            <div key={m.id} className="card flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-white">{m.group.name}</h3>
                  <span className={m.isActive ? 'badge-green' : 'badge-gray'}>
                    {m.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Entrada: {webhookTypes.find((w) => w.value === m.onJoinWebhook)?.label ?? m.onJoinWebhook}
                </p>
                <p className="text-xs text-gray-500">
                  Saída: {webhookTypes.find((w) => w.value === m.onLeaveWebhook)?.label ?? m.onLeaveWebhook}
                </p>
              </div>
              <button
                className="btn-ghost p-1.5"
                onClick={() => deleteMutation.mutate(m.id)}
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
