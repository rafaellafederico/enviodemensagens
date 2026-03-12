import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Plus, Copy, Trash2, ExternalLink } from 'lucide-react';
import api from '../../lib/api';
import { useState } from 'react';

interface CampaignLink {
  id: string;
  type: string;
  slug: string;
  label: string | null;
  isActive: boolean;
  _count: { clicks: number };
  groupLinks: { group: { id: string; name: string } }[];
}

const typeLabels: Record<string, string> = {
  MAIN: 'Link Principal',
  DEEP: 'Deep Link',
  COOKIE: 'Link Cookie',
  REDIRECT: 'Link Redirect (Pag Redirect)',
  EXTRA: 'Link Extra',
};

const typeBadge: Record<string, string> = {
  MAIN: 'badge-green',
  DEEP: 'badge-yellow',
  COOKIE: 'bg-blue-900/40 text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium',
  REDIRECT: 'bg-purple-900/40 text-purple-400 text-xs px-2 py-0.5 rounded-full font-medium',
  EXTRA: 'badge-gray',
};

export default function LinksTab({ campaignId }: { campaignId: string }) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ label: '' });
  const [copied, setCopied] = useState<string | null>(null);

  const { data: links = [] } = useQuery<CampaignLink[]>({
    queryKey: ['links', campaignId],
    queryFn: () =>
      api.get(`/campaigns/${campaignId}/links`).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: object) =>
      api.post(`/campaigns/${campaignId}/links`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['links', campaignId] });
      setShowCreate(false);
      setForm({ label: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/campaigns/${campaignId}/links/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links', campaignId] }),
  });

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/r/track/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  const baseUrl = window.location.origin;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {links.length} links configurados
        </p>
        <button
          className="btn-primary flex items-center gap-1 text-sm"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" />
          Novo Link Extra
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">Novo Link Extra</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm text-gray-400 block mb-1">Rótulo do link</label>
                <input
                  className="input"
                  value={form.label}
                  onChange={(e) => setForm({ label: e.target.value })}
                  placeholder="Ex: Tráfego Instagram"
                  required
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

      {/* Links list */}
      <div className="space-y-3">
        {links.map((link) => {
          const url = `${baseUrl}/r/track/${link.slug}`;
          return (
            <div key={link.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-brand-400" />
                  <span className={typeBadge[link.type] ?? 'badge-gray'}>
                    {typeLabels[link.type] ?? link.type}
                  </span>
                  {link.label && (
                    <span className="text-sm text-gray-300">{link.label}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">{link._count.clicks} clicks</span>
                  {link.type === 'EXTRA' && (
                    <button
                      className="btn-ghost p-1.5"
                      onClick={() => {
                        if (confirm('Excluir link?')) deleteMutation.mutate(link.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                <code className="text-sm text-gray-300 flex-1 truncate">{url}</code>
                <button
                  className="btn-ghost p-1"
                  onClick={() => copyLink(link.slug)}
                >
                  {copied === link.slug ? (
                    <span className="text-xs text-brand-400">Copiado!</span>
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
                </a>
              </div>

              {link.groupLinks.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {link.groupLinks.map((gl) => (
                    <span key={gl.group.id} className="badge-gray">
                      {gl.group.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
