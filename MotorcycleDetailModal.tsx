import React, { useState } from 'react';
import {
  Bike,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCode,
  FileText,
  Gauge,
  Info,
  Package,
  PlusCircle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Motorcycle } from '../../types';
import { formatCurrency, formatDate, formatKm } from '../../utils/formatters';
import { generateWarrantySchedule } from '../../utils/nfeParser';
import { RevisionStatusBadge, ServiceOrderStatusBadge } from '../common/Badge';

interface MotorcycleDetailModalProps {
  motorcycle: Motorcycle | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectClient?: (clientId: string) => void;
  onSelectOrder?: (orderId: string) => void;
  onOpenNewOS?: (motoId: string) => void;
  onCreateOrder?: (motoId: string) => void;
  onOpenRegisterRevision?: (motoId: string) => void;
  onRegisterRevision?: (motoId: string) => void;
}

export const MotorcycleDetailModal: React.FC<MotorcycleDetailModalProps> = ({
  motorcycle,
  isOpen,
  onClose,
  onSelectClient,
  onSelectOrder,
  onOpenNewOS,
  onCreateOrder,
  onOpenRegisterRevision,
  onRegisterRevision,
}) => {
  const handleRegisterRevision = (motoId: string) => {
    if (onOpenRegisterRevision) {
      onOpenRegisterRevision(motoId);
    } else if (onRegisterRevision) {
      onRegisterRevision(motoId);
    }
  };

  const handleCreateOrder = (motoId: string) => {
    if (onOpenNewOS) {
      onOpenNewOS(motoId);
    } else if (onCreateOrder) {
      onCreateOrder(motoId);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    if (onSelectOrder) {
      onSelectOrder(orderId);
    }
  };

  const handleSelectClient = (clientId: string) => {
    if (onSelectClient) {
      onSelectClient(clientId);
    }
  };
  const {
    getClientById,
    serviceOrders,
    warrantyRevisions,
    getMotorcycleNextRevision,
    updateMotorcycleKm,
    settings,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'timeline' | 'os' | 'revisoes' | 'pecas'>('timeline');
  const [kmUpdateInput, setKmUpdateInput] = useState<string>('');
  const [showKmUpdate, setShowKmUpdate] = useState(false);

  if (!isOpen || !motorcycle) return null;

  const client = getClientById(motorcycle.clientId);
  const nextRev = getMotorcycleNextRevision(motorcycle);

  const motoOrders = serviceOrders.filter((os) => os.motorcycleId === motorcycle.id);
  const motoRevisions = warrantyRevisions.filter((r) => r.motorcycleId === motorcycle.id);

  // Build unified chronological timeline (Section 17)
  interface TimelineEvent {
    id: string;
    date: string;
    type: 'VENDA' | 'REVISAO' | 'ORDEM_SERVICO';
    title: string;
    km: number;
    description: string;
    badge?: React.ReactNode;
    details?: string[];
  }

  const timelineEvents: TimelineEvent[] = [];

  // Venda
  timelineEvents.push({
    id: 'sale',
    date: motorcycle.saleDate,
    type: 'VENDA',
    title: 'Venda & Entrega do Veículo 0km',
    km: motorcycle.deliveryKm,
    description: `Moto faturada para ${client?.name || 'Cliente'} via NF ${motorcycle.invoiceNumber || 'S/N'}. Garantia iniciada em ${formatDate(motorcycle.warrantyStartDate)}.`,
  });

  // Revisões realizadas
  motoRevisions.forEach((rev) => {
    timelineEvents.push({
      id: rev.id,
      date: rev.completedDate || rev.maxDate,
      type: 'REVISAO',
      title: `${rev.revisionNumber}ª Revisão de Garantia Realizada`,
      km: rev.completedKm || rev.targetKm,
      description: `Revisão periódica de ${formatKm(rev.targetKm)} concluída com sucesso. Responsável: ${rev.mechanicName || 'Oficina'}.`,
      badge: <RevisionStatusBadge status={rev.status} />,
      details: rev.notes ? [rev.notes] : undefined,
    });
  });

  // Ordens de serviço
  motoOrders.forEach((os) => {
    // Only add if not already represented as a pure revision
    const isLinkedRevision = motoRevisions.some((r) => r.serviceOrderId === os.id);
    if (!isLinkedRevision) {
      const partsSummary = os.parts.map((p) => `${p.quantity}x ${p.name}`);
      const servicesSummary = os.services.map((s) => s.name);
      timelineEvents.push({
        id: os.id,
        date: os.openedAt,
        type: 'ORDEM_SERVICO',
        title: `Ordem de Serviço ${os.orderNumber} (${os.serviceType})`,
        km: os.currentKm,
        description: `${os.entryReason}. Status: ${os.status}. Total: ${formatCurrency(os.finalTotal)}.`,
        badge: <ServiceOrderStatusBadge status={os.status} />,
        details: [...servicesSummary, ...partsSummary],
      });
    }
  });

  // Sort timeline chronologically (latest first)
  timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleUpdateKmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(kmUpdateInput, 10);
    if (isNaN(val) || val < motorcycle.currentKm) return;
    await updateMotorcycleKm(motorcycle.id, val);
    setShowKmUpdate(false);
    setKmUpdateInput('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-600/30">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-xl tracking-tight">
                  {motorcycle.brand} {motorcycle.model}
                </h3>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-900 text-white">
                  {motorcycle.plate}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ano {motorcycle.year} • Cor: {motorcycle.color} • Chassi: <span className="font-mono">{motorcycle.chassis}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Info Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          {/* Owner Info */}
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
              Proprietário Atual
            </span>
            <div
              onClick={() => {
                if (client) {
                  handleSelectClient(client.id);
                  onClose();
                }
              }}
              className="mt-1 font-bold text-sm text-white hover:text-indigo-300 cursor-pointer flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              {client?.name || 'Não vinculado'}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {client?.phone} • CPF: {client?.cpfCnpj}
            </p>
            {motorcycle.sellerName && (
              <p className="text-[11px] text-indigo-300 mt-1 flex items-center gap-1 font-medium">
                <span>Vendedor:</span>
                <span className="font-bold text-white">{motorcycle.sellerName}</span>
              </p>
            )}
          </div>

          {/* Current KM & Quick Update */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
                Quilometragem Atual
              </span>
              <button
                onClick={() => {
                  setShowKmUpdate(!showKmUpdate);
                  setKmUpdateInput(String(motorcycle.currentKm));
                }}
                className="text-[11px] text-indigo-300 hover:text-white underline cursor-pointer"
              >
                Atualizar KM
              </button>
            </div>

            {showKmUpdate ? (
              <form onSubmit={handleUpdateKmSubmit} className="mt-1 flex items-center gap-1.5">
                <input
                  type="number"
                  min={motorcycle.currentKm}
                  value={kmUpdateInput}
                  onChange={(e) => setKmUpdateInput(e.target.value)}
                  className="w-24 px-2 py-1 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white font-bold"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-[11px] font-bold rounded-lg text-white"
                >
                  Salvar
                </button>
              </form>
            ) : (
              <div className="mt-1 font-extrabold text-xl text-white tracking-tight flex items-center gap-2">
                <Gauge className="w-5 h-5 text-indigo-400" />
                {formatKm(motorcycle.currentKm)}
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              Entrega: {formatKm(motorcycle.deliveryKm)} • Venda: {formatDate(motorcycle.saleDate)}
            </p>
          </div>

          {/* Warranty Milestone */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
                Próxima Revisão de Garantia
              </span>
              <RevisionStatusBadge status={nextRev.status} />
            </div>
            <div className="mt-1 font-bold text-sm text-white">
              {nextRev.revisionNumber}ª Revisão: {formatKm(nextRev.targetKm)}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Prazo limite: {formatDate(nextRev.maxDate)}
            </p>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCreateOrder(motorcycle.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Abrir Ordem de Serviço
            </button>

            <button
              onClick={() => handleRegisterRevision(motorcycle.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Registrar Revisão ({formatKm(nextRev.targetKm)})
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Garantia iniciada em: <strong>{formatDate(motorcycle.warrantyStartDate)}</strong>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'timeline'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Linha do Tempo Completa
          </button>

          <button
            onClick={() => setActiveTab('os')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'os'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Ordens de Serviço ({motoOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('revisoes')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'revisoes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            Revisões de Garantia ({motoRevisions.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
              {timelineEvents.map((evt) => (
                <div key={evt.id} className="relative group">
                  {/* Pin icon on vertical line */}
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-white border-4 border-indigo-600 shadow-xs" />

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {evt.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        {evt.badge}
                        <span className="font-mono text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {formatKm(evt.km)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(evt.date)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {evt.description}
                    </p>

                    {evt.details && evt.details.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap gap-1">
                        {evt.details.map((d, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] text-slate-600 font-medium"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: ORDENS DE SERVIÇO */}
          {activeTab === 'os' && (
            <div className="space-y-3">
              {motoOrders.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Nenhuma ordem de serviço registrada para esta moto.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {motoOrders.map((os) => (
                    <div
                      key={os.id}
                      onClick={() => {
                        handleSelectOrder(os.id);
                        onClose();
                      }}
                      className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {os.orderNumber}
                          </span>
                          <ServiceOrderStatusBadge status={os.status} />
                        </div>
                        <p className="text-xs font-semibold text-slate-800">
                          {os.entryReason}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Abertura: {formatDate(os.openedAt)} • Mecânico: {os.mechanicName} • {formatKm(os.currentKm)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-extrabold text-slate-900">
                          {formatCurrency(os.finalTotal)}
                        </div>
                        <div className="text-[11px] text-indigo-600 font-semibold flex items-center justify-end gap-1 mt-0.5">
                          Ver OS <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REVISÕES & PLANO DE GARANTIA */}
          {activeTab === 'revisoes' && (
            <div className="space-y-5">
              {/* Full Warranty Milestones derived from Invoice Date */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-950">
                        Plano de Garantia ({motorcycle.warrantyPlanMonths || 24} Meses)
                      </h4>
                      <p className="text-[11px] text-indigo-800">
                        Início da vigência: <strong>{formatDate(motorcycle.warrantyStartDate)}</strong> (Data de Faturamento)
                        {motorcycle.invoiceNumber && ` • NF-e ${motorcycle.invoiceNumber}`}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold px-2.5 py-1 bg-white border border-indigo-200 text-indigo-900 rounded-xl">
                    1ª aos 1.000 km • Demais a cada 3.000 km
                  </span>
                </div>

                {/* Grid of Planned Milestones */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {generateWarrantySchedule(
                    motorcycle.warrantyStartDate,
                    motorcycle.warrantyPlanMonths || 24,
                    settings.warrantyRules
                  ).map((m) => {
                    const completedRev = motoRevisions.find((r) => r.revisionNumber === m.revisionNumber);
                    const isNext = nextRev.revisionNumber === m.revisionNumber;

                    return (
                      <div
                        key={m.revisionNumber}
                        className={`p-3 rounded-xl border transition-all ${
                          completedRev
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                            : isNext
                            ? 'bg-white border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-white/80 border-indigo-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider">
                            {m.revisionNumber}ª Revisão
                          </span>
                          {completedRev ? (
                            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> OK
                            </span>
                          ) : isNext ? (
                            <RevisionStatusBadge status={nextRev.status} />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Prevista</span>
                          )}
                        </div>

                        <div className="text-sm font-black font-mono">
                          {formatKm(m.targetKm)}
                        </div>

                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {completedRev
                            ? `Realizada em ${formatDate(completedRev.completedDate)}`
                            : `Até ${formatDate(m.maxDate)}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invoice & Fiscal Meta Card */}
              {motorcycle.invoiceNumber && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-slate-600" />
                    <div>
                      <span className="font-bold text-slate-800">
                        Nota Fiscal de Venda: NF-e {motorcycle.invoiceNumber}
                      </span>
                      <span className="text-slate-500 block text-[11px]">
                        Faturada em {formatDate(motorcycle.saleDate)}
                        {motorcycle.nfeValue ? ` • Valor Total: ${formatCurrency(motorcycle.nfeValue)}` : ''}
                      </span>
                    </div>
                  </div>

                  {motorcycle.nfeKey && (
                    <div className="font-mono text-[10px] text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 truncate max-w-xs">
                      Chave: {motorcycle.nfeKey}
                    </div>
                  )}
                </div>
              )}

              {/* Realized Revisions List */}
              <div className="space-y-3">
                <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Histórico de Revisões Realizadas na Oficina ({motoRevisions.length})
                </h5>

                {motoRevisions.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                    Nenhuma revisão de garantia realizada ainda para esta motocicleta.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {motoRevisions.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">
                              {rev.revisionNumber}ª Revisão ({formatKm(rev.targetKm)})
                            </span>
                            <RevisionStatusBadge status={rev.status} />
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Concluída em {formatDate(rev.completedDate)} aos {formatKm(rev.completedKm)} • Responsável: {rev.mechanicName || 'Oficina'}
                          </p>
                          {rev.notes && (
                            <p className="text-xs text-slate-600 italic mt-1">&quot;{rev.notes}&quot;</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <div className="text-xs text-slate-500 font-mono">
            Renavam: {motorcycle.renavam || '-'} • Motor: {motorcycle.engineNumber || '-'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
