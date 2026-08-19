import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bike,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileCode,
  FileSpreadsheet,
  MessageSquare,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  UploadCloud,
  User,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { RevisionStatus } from '../../types';
import { formatDate, formatKm } from '../../utils/formatters';
import { RevisionStatusBadge } from '../common/Badge';
import { ImportNfeModal } from '../motorcycles/ImportNfeModal';
import { RegisterRevisionModal } from './RegisterRevisionModal';

interface WarrantyRevisionsViewProps {
  onSelectMoto?: (motoId: string) => void;
  onSelectClient?: (clientId: string) => void;
}

export const WarrantyRevisionsView: React.FC<WarrantyRevisionsViewProps> = ({
  onSelectMoto,
  onSelectClient,
}) => {
  const handleSelectMoto = (motoId: string) => {
    if (onSelectMoto) onSelectMoto(motoId);
  };

  const handleSelectClient = (clientId: string) => {
    if (onSelectClient) onSelectClient(clientId);
  };
  const {
    motorcycles,
    warrantyRevisions,
    getClientById,
    getMotorcycleNextRevision,
    settings,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PROXIMA' | 'VENCENDO' | 'ATRASADA' | 'REALIZADAS'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isImportNfeOpen, setIsImportNfeOpen] = useState(false);
  const [selectedMotoForRevision, setSelectedMotoForRevision] = useState<string | undefined>(undefined);

  // Compute pending & next revisions for all bikes
  const revisionsSchedule = useMemo(() => {
    return motorcycles.map((m) => {
      const client = getClientById(m.clientId);
      const nextRev = getMotorcycleNextRevision(m);
      const pastRevs = warrantyRevisions.filter((r) => r.motorcycleId === m.id && r.completed);

      // Remaining km & days
      const kmRemaining = nextRev.targetKm - m.currentKm;
      const today = new Date();
      const maxDateObj = new Date(nextRev.maxDate);
      const diffTime = maxDateObj.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        motorcycle: m,
        client,
        nextRev,
        pastRevs,
        kmRemaining,
        daysRemaining,
      };
    });
  }, [motorcycles, warrantyRevisions, getClientById, getMotorcycleNextRevision]);

  // Filter list
  const filteredSchedule = useMemo(() => {
    return revisionsSchedule.filter((item) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        item.motorcycle.plate.toLowerCase().includes(term) ||
        item.motorcycle.model.toLowerCase().includes(term) ||
        item.motorcycle.brand.toLowerCase().includes(term) ||
        (item.client && item.client.name.toLowerCase().includes(term));

      if (!matchesSearch) return false;

      if (activeTab === 'ALL') return true;
      if (activeTab === 'REALIZADAS') return item.pastRevs.length > 0;
      return item.nextRev.status === activeTab;
    });
  }, [revisionsSchedule, searchTerm, activeTab]);

  // Status counts for badge tabs
  const counts = useMemo(() => {
    let proxima = 0;
    let vencendo = 0;
    let atrasada = 0;

    revisionsSchedule.forEach((r) => {
      if (r.nextRev.status === 'PROXIMA') proxima++;
      if (r.nextRev.status === 'VENCENDO') vencendo++;
      if (r.nextRev.status === 'ATRASADA') atrasada++;
    });

    return {
      all: revisionsSchedule.length,
      proxima,
      vencendo,
      atrasada,
      realizadas: warrantyRevisions.filter((r) => r.completed).length,
    };
  }, [revisionsSchedule, warrantyRevisions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarClock className="w-6 h-6 text-indigo-600" />
            Cronograma de Revisões de Garantia
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            1ª aos 1.000 km • Demais a cada 3.000 km ou 6 meses (o que ocorrer primeiro)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsImportNfeOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            Importar Motos via NF-e
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedMotoForRevision(undefined);
              setIsRegisterModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Registrar Revisão
          </button>
        </div>
      </div>

      {/* Rules & Tolerances Explanatory Card */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-indigo-950">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 text-white rounded-xl">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold block">Critérios de Validade da Garantia Shineray</span>
            <span className="text-indigo-800 text-[11px]">
              Tolerância: {settings.warrantyRules.alertKmTolerance} km antes/depois da meta ou até ±{settings.warrantyRules.alertDaysTolerance} dias da data máxima calculada a partir do faturamento.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-indigo-900 bg-white/70 px-3 py-1.5 rounded-xl border border-indigo-200">
          <span>1ª: 1.000 km</span>
          <span>•</span>
          <span>2ª: 4.000 km</span>
          <span>•</span>
          <span>3ª: 7.000 km</span>
          <span>•</span>
          <span>4ª: 10.000 km</span>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="space-y-3">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todas as Motos ({counts.all})
          </button>

          <button
            onClick={() => setActiveTab('ATRASADA')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'ATRASADA'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Atrasadas ({counts.atrasada})
          </button>

          <button
            onClick={() => setActiveTab('VENCENDO')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'VENCENDO'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Vencendo em Breve ({counts.vencendo})
          </button>

          <button
            onClick={() => setActiveTab('PROXIMA')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'PROXIMA'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-sky-800 bg-sky-50 hover:bg-sky-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Próximas ({counts.proxima})
          </button>

          <button
            onClick={() => setActiveTab('REALIZADAS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'REALIZADAS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Histórico Realizado ({counts.realizadas})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por placa, cliente ou modelo..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 shadow-xs"
          />
        </div>
      </div>

      {/* Revisions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Motocicleta & Placa</th>
                <th className="py-3.5 px-3">Proprietário</th>
                <th className="py-3.5 px-3">KM Atual</th>
                <th className="py-3.5 px-3">Próxima Revisão</th>
                <th className="py-3.5 px-3">Data Limite</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchedule.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhum agendamento encontrado para este filtro.
                  </td>
                </tr>
              ) : (
                filteredSchedule.map(({ motorcycle: m, client, nextRev, kmRemaining, daysRemaining }) => {
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Moto & Placa */}
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => handleSelectMoto(m.id)}
                          className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer text-sm"
                        >
                          {m.brand} {m.model}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 bg-slate-900 text-white rounded">
                            {m.plate}
                          </span>
                          <span className="text-[11px] text-slate-400">Ano {m.year}</span>
                        </div>
                      </td>

                      {/* Proprietário */}
                      <td className="py-3.5 px-3">
                        <div
                          onClick={() => client && handleSelectClient(client.id)}
                          className="font-semibold text-slate-800 hover:text-indigo-600 cursor-pointer truncate max-w-[150px]"
                        >
                          {client?.name || 'Sem cliente'}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{client?.phone}</span>
                        </div>
                      </td>

                      {/* KM Atual */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-slate-800 text-sm">
                          {formatKm(m.currentKm)}
                        </span>
                      </td>

                      {/* Próxima Revisão */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-indigo-700">
                          {nextRev.revisionNumber}ª Revisão: {formatKm(nextRev.targetKm)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {kmRemaining > 0 ? (
                            <span>Faltam {formatKm(kmRemaining)}</span>
                          ) : (
                            <span className="text-rose-600 font-bold">
                              Excedeu em {formatKm(Math.abs(kmRemaining))}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Data Limite */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {formatDate(nextRev.maxDate)}
                        </div>
                        <div className="text-[10px] mt-0.5">
                          {daysRemaining > 0 ? (
                            <span className="text-slate-500">Restam {daysRemaining} dias</span>
                          ) : (
                            <span className="text-rose-600 font-bold">
                              Vencida há {Math.abs(daysRemaining)} dias
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <RevisionStatusBadge status={nextRev.status} />
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {client?.whatsapp && (
                            <a
                              href={`https://wa.me/55${client.whatsapp.replace(/\D/g, '')}?text=Olá ${client.name}, informamos que sua moto ${m.brand} ${m.model} (${m.plate}) está com a ${nextRev.revisionNumber}ª revisão de garantia agendada para ${formatKm(nextRev.targetKm)}. Entre em contato para agendar!`}
                              target="_blank"
                              rel="noreferrer"
                              title="Avisar cliente no WhatsApp"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </a>
                          )}

                          <button
                            onClick={() => {
                              setSelectedMotoForRevision(m.id);
                              setIsRegisterModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Dar Baixa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Modal */}
      {isRegisterModalOpen && (
        <RegisterRevisionModal
          isOpen={isRegisterModalOpen}
          onClose={() => {
            setIsRegisterModalOpen(false);
            setSelectedMotoForRevision(undefined);
          }}
          defaultMotorcycleId={selectedMotoForRevision}
        />
      )}

      {/* Import NF-e Modal */}
      {isImportNfeOpen && (
        <ImportNfeModal
          isOpen={isImportNfeOpen}
          onClose={() => setIsImportNfeOpen(false)}
        />
      )}
    </div>
  );
};
