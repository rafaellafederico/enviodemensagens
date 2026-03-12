import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MousePointerClick,
  UserPlus,
  UserMinus,
  Users,
  LayoutGrid,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import api from '../../lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useState } from 'react';

interface Overview {
  totalClicks: number;
  joined: number;
  left: number;
  totalParticipants: number;
  totalGroups: number;
  fullGroups: number;
  availableGroups: number;
}

interface Settings {
  maxClicksPerGroup: number;
  cacheDays: number;
  randomizeLinks: boolean;
  facebookPixelId: string | null;
  welcomeMsgStartTime: string | null;
  welcomeMsgStopTime: string | null;
  welcomeMsgOffHours: string | null;
  monitoringEnabled: boolean;
}

const statCards = (o: Overview) => [
  { label: 'Total de Clicks', value: o.totalClicks, icon: MousePointerClick, color: 'text-brand-400' },
  { label: 'Entraram', value: o.joined, icon: UserPlus, color: 'text-blue-400' },
  { label: 'Saíram', value: o.left, icon: UserMinus, color: 'text-red-400' },
  { label: 'Participantes', value: o.totalParticipants, icon: Users, color: 'text-purple-400' },
  { label: 'Total de Grupos', value: o.totalGroups, icon: LayoutGrid, color: 'text-yellow-400' },
  { label: 'Grupos Cheios', value: o.fullGroups, icon: CheckCircle2, color: 'text-orange-400' },
  { label: 'Grupos Disponíveis', value: o.availableGroups, icon: Circle, color: 'text-green-400' },
];

export default function OverviewTab({ campaignId }: { campaignId: string }) {
  const qc = useQueryClient();
  const [settingsSection, setSettingsSection] = useState(false);

  const { data: overview } = useQuery<Overview>({
    queryKey: ['overview', campaignId],
    queryFn: () => api.get(`/campaigns/${campaignId}/overview`).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: campaign } = useQuery<Settings & { id: string; name: string }>({
    queryKey: ['campaign', campaignId],
    queryFn: () => api.get(`/campaigns/${campaignId}`).then((r) => r.data),
  });

  const { data: clicks } = useQuery({
    queryKey: ['clicks', campaignId],
    queryFn: () => api.get(`/campaigns/${campaignId}/clicks`).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Settings>) =>
      api.patch(`/campaigns/${campaignId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign', campaignId] }),
  });

  const [localSettings, setLocalSettings] = useState<Partial<Settings>>({});

  const handleSaveSettings = () => {
    updateMutation.mutate(localSettings);
  };

  if (!overview) return <div className="text-gray-500 py-8 text-center">Carregando...</div>;

  const stats = statCards(overview);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card text-center">
              <Icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <p className="text-2xl font-bold text-white">{s.value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      {clicks && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Clicks por Dia</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={clicks.byDate ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="Clicks"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Clicks por Hora</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={clicks.byHour ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="hour" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Clicks"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Settings */}
      {campaign && (
        <div className="card">
          <button
            className="flex items-center justify-between w-full text-left"
            onClick={() => setSettingsSection(!settingsSection)}
          >
            <h3 className="font-semibold text-white">Configurações da Campanha</h3>
            <span className="text-gray-500 text-sm">{settingsSection ? '▲' : '▼'}</span>
          </button>

          {settingsSection && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Basic settings */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  Básico
                </h4>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">
                    Quantidade de Cliques por Grupo
                  </label>
                  <input
                    type="number"
                    className="input"
                    defaultValue={campaign.maxClicksPerGroup}
                    onChange={(e) =>
                      setLocalSettings((s) => ({
                        ...s,
                        maxClicksPerGroup: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Dias em Cache</label>
                  <input
                    type="number"
                    className="input"
                    defaultValue={campaign.cacheDays}
                    onChange={(e) =>
                      setLocalSettings((s) => ({
                        ...s,
                        cacheDays: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              {/* Advanced settings */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  Avançado
                </h4>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={`w-10 h-5 rounded-full transition-colors ${
                      (localSettings.randomizeLinks ?? campaign.randomizeLinks)
                        ? 'bg-brand-600'
                        : 'bg-gray-700'
                    }`}
                    onClick={() =>
                      setLocalSettings((s) => ({
                        ...s,
                        randomizeLinks: !(s.randomizeLinks ?? campaign.randomizeLinks),
                      }))
                    }
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full m-0.5 transition-transform ${
                        (localSettings.randomizeLinks ?? campaign.randomizeLinks)
                          ? 'translate-x-5'
                          : ''
                      }`}
                    />
                  </div>
                  <span className="text-sm text-gray-300">Randomizador de Links</span>
                </label>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Pixel do Facebook</label>
                  <input
                    className="input"
                    defaultValue={campaign.facebookPixelId ?? ''}
                    placeholder="ID do Pixel"
                    onChange={(e) =>
                      setLocalSettings((s) => ({
                        ...s,
                        facebookPixelId: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Welcome message timing */}
              <div className="space-y-3 sm:col-span-2">
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  Mensagem de Boas-Vindas
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { field: 'welcomeMsgStartTime', label: 'Início dos envios' },
                    { field: 'welcomeMsgStopTime', label: 'Suspensão' },
                    { field: 'welcomeMsgOffHours', label: 'Fora do intervalo' },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label className="text-sm text-gray-400 block mb-1">{label}</label>
                      <input
                        type="time"
                        className="input"
                        defaultValue={
                          (campaign as Record<string, string | null>)[field] ?? ''
                        }
                        onChange={(e) =>
                          setLocalSettings((s) => ({
                            ...s,
                            [field]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <button
                  className="btn-primary"
                  onClick={handleSaveSettings}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
