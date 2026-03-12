import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, Lock } from 'lucide-react';
import api from '../../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Report {
  id: string;
  type: string;
  generatedAt: string;
}

const reportTypes = [
  {
    type: 'SCHEDULED',
    label: 'Agendado',
    description: 'Relatório de envios agendados com datas disponíveis',
    minPlan: 'BASIC',
  },
  {
    type: 'GROUPS_LEADS',
    label: 'Grupos/Leads',
    description: 'Lista completa de grupos e leads da campanha',
    minPlan: 'BLACK',
  },
  {
    type: 'GROUPS_LINKS',
    label: 'Grupos/Links',
    description: 'Links de convite para todos os grupos',
    minPlan: 'PREMIUM',
  },
  {
    type: 'ENTRY_EXIT',
    label: 'Entrada/Saída',
    description: 'Análise detalhada de entrada e saída de leads',
    minPlan: 'PREMIUM',
  },
];

const planOrder = ['BASIC', 'ADVANCED', 'PREMIUM', 'BLACK'];

function hasAccess(userPlan: string, minPlan: string) {
  return planOrder.indexOf(userPlan) >= planOrder.indexOf(minPlan);
}

export default function ReportsTab({
  campaignId,
  planTier,
}: {
  campaignId: string;
  planTier: string;
}) {
  const qc = useQueryClient();

  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ['reports', campaignId],
    queryFn: () =>
      api.get(`/campaigns/${campaignId}/reports`).then((r) => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: (type: string) =>
      api.post(`/campaigns/${campaignId}/reports/generate`, { type }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', campaignId] }),
  });

  return (
    <div className="space-y-6">
      {/* Report type cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reportTypes.map((rt) => {
          const accessible = hasAccess(planTier, rt.minPlan);
          return (
            <div
              key={rt.type}
              className={`card ${!accessible ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-400" />
                  <h3 className="font-medium text-white">{rt.label}</h3>
                </div>
                {!accessible && (
                  <span className="flex items-center gap-1 badge-gray">
                    <Lock className="w-3 h-3" />
                    {rt.minPlan}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-4">{rt.description}</p>
              <button
                className="btn-primary text-sm w-full"
                disabled={!accessible || generateMutation.isPending}
                onClick={() => generateMutation.mutate(rt.type)}
              >
                {generateMutation.isPending ? 'Gerando...' : 'Gerar Relatório'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Previous reports */}
      {reports.length > 0 && (
        <div>
          <h3 className="font-semibold text-white mb-3">Relatórios Gerados</h3>
          <div className="space-y-2">
            {reports.map((r) => {
              const rt = reportTypes.find((t) => t.type === r.type);
              return (
                <div key={r.id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-brand-400" />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {rt?.label ?? r.type}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(r.generatedAt), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  <button className="btn-ghost p-2">
                    <Download className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
