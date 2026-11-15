import React, { useState } from 'react';
import { Bell, Plus, Scale } from 'lucide-react';
import { evaluateVehicleEligibility } from '../../../core/intelligence';
import type { ComplianceObligation, PlatformStatus } from '../../../models/types';
import { useEcosystem } from '../../../services/EcosystemContext';
import {
  Card,
  ContextualHelpBanner,
  StatusLabel,
} from '../../ui/DesignSystem';

export const AdminCatalogAndCompliance: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const {
    state,
    updatePlatformStatus,
    addPlatform,
    validateLegislation,
    addLegislation,
    broadcastNotification,
  } = useEcosystem();

  const [newPlatName, setNewPlatName] = useState('');
  const [newPlatComm, setNewPlatComm] = useState(18);

  const [newLawForm, setNewLawForm] = useState({
    title: '',
    category: 'Lei TVDE' as ComplianceObligation['category'],
    officialSource: 'Diário da República / IMT',
    articleRef: 'Art. 1.º',
    adaptationDeadline: '2027-03-01',
    summary: '',
  });

  const [notifForm, setNotifForm] = useState({
    title: '',
    body: '',
    targetUserId: 'ALL',
    category: 'Administração' as const,
  });

  if (activeTab === 'plataformas') {
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="Catálogo Internacional de Plataformas"
          description="Inativar ou ocultar uma plataforma remove-a imediatamente dos menus e seletores do Modo Motorista, preservando integralmente todo o histórico de viagens."
        />

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Adicionar Nova Plataforma ao Catálogo
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newPlatName.trim()) return;
              addPlatform({
                id: newPlatName.toLowerCase().replace(/[^a-z0-9]/g, ''),
                name: newPlatName.trim(),
                countryScope: ['PT'],
                categories: ['Standard'],
                commissionPct: newPlatComm,
                status: 'Ativa',
                integrationStatus: 'Em análise',
                integrationLabel: 'INTEGRAÇÃO A VALIDAR',
              });
              setNewPlatName('');
            }}
            className="flex flex-wrap items-end gap-3 text-xs"
          >
            <div>
              <label htmlFor="np-name" className="block mb-1 font-medium">Nome da Plataforma</label>
              <input
                id="np-name"
                type="text"
                value={newPlatName}
                onChange={(e) => setNewPlatName(e.target.value)}
                placeholder="Ex: DiDi / 99"
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="np-comm" className="block mb-1 font-medium">Comissão (%)</label>
              <input
                id="np-comm"
                type="number"
                value={newPlatComm}
                onChange={(e) => setNewPlatComm(Number(e.target.value))}
                className="w-24 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
              />
            </div>
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold">
              Adicionar Plataforma
            </button>
          </form>
        </Card>

        <Card className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Plataforma</th>
                <th className="p-3">Mercados</th>
                <th className="p-3">Comissão</th>
                <th className="p-3">Estado Operacional (Cascata Motorista)</th>
                <th className="p-3">Estado da Integração Externa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {state.platforms.map((pl) => (
                <tr key={pl.id}>
                  <td className="p-3 font-bold">{pl.name}</td>
                  <td className="p-3">{pl.countryScope.join(', ')}</td>
                  <td className="p-3 font-mono-tabular">{pl.commissionPct}%</td>
                  <td className="p-3">
                    <select
                      aria-label={`Estado operacional de ${pl.name}`}
                      value={pl.status}
                      onChange={(e) => updatePlatformStatus(pl.id, e.target.value as PlatformStatus)}
                      className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="Ativa">Ativa</option>
                      <option value="Oculta">Oculta</option>
                      <option value="Suspensa">Suspensa</option>
                      <option value="Encerrada">Encerrada</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <StatusLabel tone="warning" text={`${pl.integrationStatus} · ${pl.integrationLabel}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  if (activeTab === 'paises') {
    return (
      <Card className="overflow-x-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold">Países, Moedas, Fiscalidade &amp; Licenças</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">País</th>
              <th className="p-3">Idioma</th>
              <th className="p-3">Moeda</th>
              <th className="p-3">IVA</th>
              <th className="p-3">Regime TVDE</th>
              <th className="p-3">Plataformas Permitidas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {state.countries.map((c) => (
              <tr key={c.code}>
                <td className="p-3 font-semibold">{c.name} ({c.code})</td>
                <td className="p-3">{c.language}</td>
                <td className="p-3 font-mono-tabular">{c.currency}</td>
                <td className="p-3 font-mono-tabular">{c.vatPct}%</td>
                <td className="p-3">{c.tvdeRegulated ? c.driverLicenseRequired : 'Regime local'}</td>
                <td className="p-3">{c.activePlatforms.join(', ').toUpperCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
  }

  if (activeTab === 'veiculos-eleg') {
    return (
      <Card className="overflow-x-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold">Catálogo Central de Veículos &amp; Regras de Elegibilidade</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Veículo</th>
              <th className="p-3">Ano / Mercado</th>
              <th className="p-3">Elegibilidade Legal TVDE</th>
              <th className="p-3">Uber Comercial</th>
              <th className="p-3">Bolt Comercial</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {state.vehicles.map((v) => {
              const el = evaluateVehicleEligibility(v);
              return (
                <tr key={v.id}>
                  <td className="p-3 font-semibold">{v.brand} {v.model} ({v.fuelType})</td>
                  <td className="p-3">{v.year} · {v.city}/{v.countryCode}</td>
                  <td className="p-3">
                    <StatusLabel
                      tone={el.tvdeLegalEligible ? 'success' : 'danger'}
                      text={el.tvdeLegalEligible ? 'Elegível' : 'Inelegível'}
                    />
                  </td>
                  <td className="p-3">{el.platformEligibility.uber.categories.join(', ')}</td>
                  <td className="p-3">{el.platformEligibility.bolt.categories.join(', ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    );
  }

  if (activeTab === 'legislacao') {
    return (
      <div className="space-y-6">
        <ContextualHelpBanner
          title="AIVAD Compliance Admin — Fluxo de Validação Jurídica Humana"
          description="Rascunhos detetados por monitorização exigem validação humana antes de serem comunicados como obrigações definitivas aos motoristas."
        />

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Registar Nova Norma / Diploma para Análise
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newLawForm.title.trim()) return;
              addLegislation({
                countryCode: 'PT',
                title: newLawForm.title,
                category: newLawForm.category,
                officialSource: newLawForm.officialSource,
                articleRef: newLawForm.articleRef,
                publishedDate: '2026-11-14',
                effectiveDate: 'A definir',
                adaptationDeadline: newLawForm.adaptationDeadline,
                status: 'Em análise',
                affectedProfile: 'Todos TVDE',
                summary: newLawForm.summary || 'Pendente de revisão jurídica.',
                humanValidated: false,
              });
              setNewLawForm((f) => ({ ...f, title: '', summary: '' }));
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
          >
            <input
              type="text"
              placeholder="Título da obrigação ou diploma"
              value={newLawForm.title}
              onChange={(e) => setNewLawForm((f) => ({ ...f, title: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <input
              type="text"
              placeholder="Fonte oficial (ex: Diário da República)"
              value={newLawForm.officialSource}
              onChange={(e) => setNewLawForm((f) => ({ ...f, officialSource: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold">
              Criar em Análise
            </button>
          </form>
        </Card>

        <div className="space-y-3">
          {state.obligations.map((ob) => (
            <Card key={ob.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-sm">{ob.title}</p>
                <p className="text-slate-500">{ob.officialSource} · {ob.articleRef}</p>
                <p className="text-slate-600 dark:text-slate-300">{ob.summary}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <StatusLabel
                  tone={ob.humanValidated ? 'success' : 'warning'}
                  text={ob.humanValidated ? `Validado (${ob.status})` : 'Requer validação humana'}
                />
                {!ob.humanValidated && (
                  <button
                    type="button"
                    onClick={() => validateLegislation(ob.id, 'Em vigor')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    Validar e Notificar Motoristas
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // NOTIFICAÇÕES & COMUNICAÇÃO
  return (
    <div className="space-y-6">
      <ContextualHelpBanner
        title="Centro de Notificações & Comunicação Segmentada"
        description="Envie comunicados individuais ou gerais. Os alertas entregues aparecem imediatamente no Modo Motorista com confirmação de leitura."
      />

      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          Emitir Notificação / Comunicado
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!notifForm.title.trim() || !notifForm.body.trim()) return;
            broadcastNotification(
              notifForm.title,
              notifForm.body,
              notifForm.targetUserId,
              notifForm.category
            );
            setNotifForm((f) => ({ ...f, title: '', body: '' }));
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
        >
          <input
            type="text"
            placeholder="Título da notificação"
            value={notifForm.title}
            onChange={(e) => setNotifForm((f) => ({ ...f, title: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
          <select
            aria-label="Destinatário"
            value={notifForm.targetUserId}
            onChange={(e) => setNotifForm((f) => ({ ...f, targetUserId: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="ALL">Todos os utilizadores</option>
            {state.users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>
          <button type="submit" className="px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold">
            Enviar Comunicado
          </button>
          <textarea
            rows={2}
            placeholder="Corpo da mensagem..."
            value={notifForm.body}
            onChange={(e) => setNotifForm((f) => ({ ...f, body: e.target.value }))}
            className="sm:col-span-3 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
        </form>
      </Card>

      <Card className="p-5 space-y-2 text-xs">
        <h3 className="text-sm font-bold">Histórico de Envios &amp; Confirmação de Leitura</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {state.notifications.map((n) => (
            <div key={n.id} className="py-2.5 flex justify-between gap-3">
              <div>
                <p className="font-semibold">{n.title}</p>
                <p className="text-slate-500">{n.body}</p>
              </div>
              <StatusLabel tone={n.read ? 'success' : 'info'} text={n.read ? 'Lida' : 'Entregue (Não lida)'} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
