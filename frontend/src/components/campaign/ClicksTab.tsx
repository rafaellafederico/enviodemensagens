import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { MousePointerClick } from 'lucide-react';

const DEVICE_COLORS = {
  MOBILE: '#22c55e',
  DESKTOP: '#3b82f6',
  TABLET: '#f59e0b',
  UNKNOWN: '#6b7280',
};

export default function ClicksTab({ campaignId }: { campaignId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ['clicks', campaignId, startDate, endDate],
    queryFn: () =>
      api
        .get(`/campaigns/${campaignId}/clicks`, {
          params: { startDate, endDate },
        })
        .then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="card flex flex-wrap items-center gap-3">
        <h3 className="font-medium text-white flex items-center gap-2">
          <MousePointerClick className="w-4 h-4 text-brand-400" />
          Métricas de Cliques
        </h3>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-sm text-gray-400">De</label>
          <input
            type="date"
            className="input w-auto"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <label className="text-sm text-gray-400">Até</label>
          <input
            type="date"
            className="input w-auto"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-center py-12">Carregando...</div>
      ) : !data ? null : (
        <>
          {/* Total */}
          <div className="card text-center">
            <p className="text-4xl font-bold text-white">{data.total.toLocaleString()}</p>
            <p className="text-gray-500 text-sm mt-1">Total de Cliques no período</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By date */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-300 mb-4">Fluxo por Data</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#111827',
                      border: '1px solid #374151',
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Clicks" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* By hour */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-300 mb-4">Fluxo por Hora</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.byHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="hour" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#111827',
                      border: '1px solid #374151',
                      borderRadius: 8,
                    }}
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

            {/* Devices */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-300 mb-4">Dispositivos</h3>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={data.byDevice}
                      dataKey="count"
                      nameKey="device"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                    >
                      {data.byDevice.map((entry: { device: string }) => (
                        <Cell
                          key={entry.device}
                          fill={
                            DEVICE_COLORS[entry.device as keyof typeof DEVICE_COLORS] ??
                            '#6b7280'
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#111827',
                        border: '1px solid #374151',
                        borderRadius: 8,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {data.byDevice.map((d: { device: string; count: number }) => (
                    <div key={d.device} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            background:
                              DEVICE_COLORS[d.device as keyof typeof DEVICE_COLORS] ??
                              '#6b7280',
                          }}
                        />
                        <span className="text-sm text-gray-300 capitalize">
                          {d.device.toLowerCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-white">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Origins */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-300 mb-4">
                Origem (Top 10)
              </h3>
              <div className="space-y-2">
                {data.byOrigin.map((o: { origin: string; count: number }) => (
                  <div key={o.origin} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm text-gray-300 truncate">{o.origin}</span>
                        <span className="text-sm font-medium text-white ml-2">{o.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (o.count / data.total) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {data.byOrigin.length === 0 && (
                  <p className="text-gray-500 text-sm">Sem dados de origem</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
