import { useState } from 'react';
import { useParams, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  CalendarClock,
  BarChart2,
  MousePointerClick,
  Settings2,
  Radio,
  Link2,
  Globe,
  ChevronLeft,
} from 'lucide-react';
import api from '../lib/api';
import clsx from 'clsx';

import OverviewTab from '../components/campaign/OverviewTab';
import GroupsTab from '../components/campaign/GroupsTab';
import MessagesTab from '../components/campaign/MessagesTab';
import SchedulesTab from '../components/campaign/SchedulesTab';
import ReportsTab from '../components/campaign/ReportsTab';
import ClicksTab from '../components/campaign/ClicksTab';
import MonitoringTab from '../components/campaign/MonitoringTab';
import LinksTab from '../components/campaign/LinksTab';
import CommunitiesTab from '../components/campaign/CommunitiesTab';
import ChannelsTab from '../components/campaign/ChannelsTab';

interface Campaign {
  id: string;
  name: string;
  status: string;
  planTier: string;
  session?: { phoneNumber: string; status: string } | null;
}

const tabs = [
  { key: '', label: 'Visão Geral', icon: LayoutDashboard },
  { key: 'groups', label: 'Grupos', icon: Users },
  { key: 'communities', label: 'Comunidades', icon: Globe },
  { key: 'messages', label: 'Mensagens', icon: MessageSquare },
  { key: 'schedules', label: 'Agendamentos', icon: CalendarClock },
  { key: 'reports', label: 'Relatórios', icon: BarChart2 },
  { key: 'clicks', label: 'Métricas de Cliques', icon: MousePointerClick },
  { key: 'monitoring', label: 'Monitoramento', icon: Radio },
  { key: 'links', label: 'Links Extras', icon: Link2 },
  { key: 'channels', label: 'Canais', icon: Settings2 },
];

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: campaign } = useQuery<Campaign>({
    queryKey: ['campaign', id],
    queryFn: () => api.get(`/campaigns/${id}`).then((r) => r.data),
  });

  // Determine active tab from URL
  const pathSegment = location.pathname.split(`/campaigns/${id}/`)[1] ?? '';
  const activeTab = pathSegment.split('/')[0] ?? '';

  const planBadge: Record<string, string> = {
    BASIC: 'badge-gray',
    ADVANCED: 'badge-yellow',
    PREMIUM: 'badge-green',
    BLACK: 'bg-purple-900/40 text-purple-400 text-xs px-2 py-0.5 rounded-full font-medium',
  };

  return (
    <div>
      {/* Breadcrumb + header */}
      <div className="flex items-start gap-3 mb-4">
        <button
          onClick={() => navigate('/campaigns')}
          className="btn-ghost p-2 mt-0.5"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">
              {campaign?.name ?? 'Carregando...'}
            </h1>
            {campaign && (
              <span className={planBadge[campaign.planTier] ?? 'badge-gray'}>
                {campaign.planTier}
              </span>
            )}
          </div>
          {campaign?.session && (
            <p className="text-sm text-gray-500">
              {campaign.session.phoneNumber} —{' '}
              <span
                className={
                  campaign.session.status === 'CONNECTED'
                    ? 'text-brand-400'
                    : 'text-red-400'
                }
              >
                {campaign.session.status === 'CONNECTED' ? 'Conectado' : 'Desconectado'}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 overflow-x-auto mb-6 gap-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const href = `/campaigns/${id}${tab.key ? `/${tab.key}` : ''}`;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => navigate(href)}
              className={clsx(
                'tab flex items-center gap-1.5 whitespace-nowrap',
                isActive && 'tab-active'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content via nested routes */}
      <Routes>
        <Route index element={<OverviewTab campaignId={id!} />} />
        <Route path="groups" element={<GroupsTab campaignId={id!} />} />
        <Route path="communities" element={<CommunitiesTab campaignId={id!} />} />
        <Route path="messages" element={<MessagesTab campaignId={id!} />} />
        <Route path="schedules" element={<SchedulesTab campaignId={id!} />} />
        <Route path="reports" element={<ReportsTab campaignId={id!} planTier={campaign?.planTier ?? 'BASIC'} />} />
        <Route path="clicks" element={<ClicksTab campaignId={id!} />} />
        <Route path="monitoring" element={<MonitoringTab campaignId={id!} />} />
        <Route path="links" element={<LinksTab campaignId={id!} />} />
        <Route path="channels" element={<ChannelsTab campaignId={id!} />} />
      </Routes>
    </div>
  );
}
