import React, { useState } from 'react';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { ErrorCategory, ErrorReport, ErrorSeverity, ErrorStatus } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const ErrorReportsSection: React.FC = () => {
  const { errorReports, updateErrorReportStatus, deleteErrorReport, pendingErrorReportsCount } = useStore();
  const { currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ErrorStatus>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | ErrorSeverity>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ErrorCategory>('ALL');

  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [adminResponseInput, setAdminResponseInput] = useState('');
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Filtered list
  const filteredReports = errorReports.filter((r) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      r.title.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term) ||
      r.userName.toLowerCase().includes(term) ||
      (r.screenOrModule && r.screenOrModule.toLowerCase().includes(term));

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesSeverity = severityFilter === 'ALL' || r.severity === severityFilter;
    const matchesCategory = categoryFilter === 'ALL' || r.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesSeverity && matchesCategory;
  });

  const handleOpenDetail = (report: ErrorReport) => {
    setSelectedReport(report);
    setAdminResponseInput(report.adminResponse || '');
  };

  const handleUpdateStatus = async (status: ErrorStatus) => {
    if (!selectedReport) return;
    await updateErrorReportStatus(
      selectedReport.id,
      status,
      adminResponseInput.trim() || undefined,
      currentUser?.name || 'Administrador'
    );
    setActionSuccessMsg(`Status do chamado atualizado para "${status}" com sucesso!`);
    setSelectedReport((prev) =>
      prev
        ? {
            ...prev,
            status,
            adminResponse: adminResponseInput.trim() || prev.adminResponse,
            resolvedAt: status === 'RESOLVIDO' ? new Date().toISOString() : prev.resolvedAt,
            resolvedBy: status === 'RESOLVIDO' ? currentUser?.name || 'Administrador' : prev.resolvedBy,
          }
        : null
    );
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleDeleteConfirm = async () => {
    if (reportToDelete) {
      await deleteErrorReport(reportToDelete);
      if (selectedReport?.id === reportToDelete) {
        setSelectedReport(null);
      }
      setReportToDelete(null);
      setActionSuccessMsg('Chamado removido com sucesso.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

  const getSeverityBadge = (sev: ErrorSeverity) => {
    switch (sev) {
      case 'CRITICA':
        return (
          <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
            <AlertOctagon className="w-3 h-3" /> Crítica
          </span>
        );
      case 'ALTA':
        return (
          <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg bg-orange-100 text-orange-800 border border-orange-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Alta
          </span>
        );
      case 'MEDIA':
        return (
          <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Média
          </span>
        );
      case 'BAIXA':
        return (
          <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Baixa
          </span>
        );
    }
  };

  const getStatusBadge = (status: ErrorStatus) => {
    switch (status) {
      case 'PENDENTE':
        return (
          <span className="px-2.5 py-1 text-xs font-extrabold uppercase rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            Pendente
          </span>
        );
      case 'EM_ANALISE':
        return (
          <span className="px-2.5 py-1 text-xs font-extrabold uppercase rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Em Análise
          </span>
        );
      case 'RESOLVIDO':
        return (
          <span className="px-2.5 py-1 text-xs font-extrabold uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Resolvido
          </span>
        );
      case 'IGNORADO':
        return (
          <span className="px-2.5 py-1 text-xs font-extrabold uppercase rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Ignorado
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: ErrorCategory) => {
    switch (cat) {
      case 'SISTEMA':
        return 'Sistema / Falha Geral';
      case 'ORDEM_SERVICO':
        return 'Ordens de Serviço';
      case 'ESTOQUE':
        return 'Estoque & Peças';
      case 'CADASTRO':
        return 'Cadastros (Clientes / Motos)';
      case 'FINANCEIRO':
        return 'Financeiro & Caixa';
      case 'OUTRO':
      default:
        return 'Outro / Geral';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-red-600/30 border border-red-500/40 text-red-400 rounded-2xl">
              <Bug className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold tracking-tight">
                  Central de Erros, Chamados & Suporte
                </h3>
                {pendingErrorReportsCount > 0 && (
                  <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-red-600 text-white animate-pulse">
                    {pendingErrorReportsCount} pendente(s)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Notificações enviadas pelos usuários (vendedores, mecânicos e recepção) para acompanhamento e resolução
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700">
            <span>Total de chamados: <strong className="text-white">{errorReports.length}</strong></span>
            <span>•</span>
            <span>Resolvidos: <strong className="text-emerald-400">{errorReports.filter((r) => r.status === 'RESOLVIDO').length}</strong></span>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, usuário ou descrição..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-red-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="EM_ANALISE">Em Análise</option>
            <option value="RESOLVIDO">Resolvidos</option>
            <option value="IGNORADO">Ignorados</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Todas as Severidades</option>
            <option value="CRITICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Todas as Categorias</option>
            <option value="SISTEMA">Sistema</option>
            <option value="ORDEM_SERVICO">Ordens de Serviço</option>
            <option value="ESTOQUE">Estoque</option>
            <option value="CADASTRO">Cadastros</option>
            <option value="FINANCEIRO">Financeiro</option>
            <option value="OUTRO">Outro</option>
          </select>
        </div>
      </div>

      {/* Main List of Error Reports */}
      <div className="grid grid-cols-1 gap-3">
        {filteredReports.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
            <Bug className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-400" />
            <p className="text-sm font-semibold text-slate-600">Nenhum chamado de erro encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Todos os módulos operando normalmente ou ajuste os filtros.</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div
              key={report.id}
              onClick={() => handleOpenDetail(report)}
              className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                report.status === 'PENDENTE'
                  ? 'border-rose-300 bg-rose-50/20 hover:border-rose-400'
                  : report.status === 'EM_ANALISE'
                  ? 'border-amber-300 bg-amber-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(report.status)}
                  {getSeverityBadge(report.severity)}
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    {getCategoryLabel(report.category)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDateTime(report.createdAt)}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-extrabold text-slate-900 group-hover:text-red-600 transition-colors">
                    {report.title}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                    {report.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reportado por:</span>
                    <strong className="text-slate-800">{report.userName}</strong>
                    <span className="text-[10px] uppercase font-bold text-slate-400">({report.userRole})</span>
                  </div>

                  {report.screenOrModule && (
                    <div className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                      {report.screenOrModule}
                    </div>
                  )}

                  {report.adminResponse && (
                    <div className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>Com resposta do Admin</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDetail(report);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                >
                  Abrir Detalhes
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReportToDelete(report.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Excluir Chamado"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail & Resolution Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600/30 text-red-400 rounded-xl">
                  <Bug className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white">
                      Análise do Chamado de Erro
                    </h3>
                    {getStatusBadge(selectedReport.status)}
                  </div>
                  <p className="text-xs text-slate-300">
                    Aberto em {formatDateTime(selectedReport.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Reporter Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-400">Solicitante:</span>{' '}
                    <strong className="text-slate-900 text-sm">{selectedReport.userName}</strong>{' '}
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold uppercase text-[10px]">
                      {selectedReport.userRole}
                    </span>
                  </div>
                  <div className="text-slate-500 font-mono">
                    {selectedReport.userEmail}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                  <div>
                    <span className="text-slate-400">Categoria:</span>{' '}
                    <strong className="text-slate-800">{getCategoryLabel(selectedReport.category)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Severidade:</span>{' '}
                    <strong className="text-slate-800">{selectedReport.severity}</strong>
                  </div>
                  {selectedReport.screenOrModule && (
                    <div className="col-span-2">
                      <span className="text-slate-400">Local Ocorrido:</span>{' '}
                      <strong className="text-slate-800 font-mono">{selectedReport.screenOrModule}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-900 text-base">
                  {selectedReport.title}
                </h4>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedReport.description}
                </div>
              </div>

              {/* Screenshot / Evidence Link if present */}
              {selectedReport.screenshotUrl && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-900">Evidência / Print Anexado:</span>
                  <a
                    href={selectedReport.screenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-bold text-indigo-600 hover:underline"
                  >
                    Visualizar imagem <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Admin Resolution Area */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Parecer / Resposta do Administrador
                </label>
                <textarea
                  rows={3}
                  value={adminResponseInput}
                  onChange={(e) => setAdminResponseInput(e.target.value)}
                  placeholder="Escreva uma orientação, explicação da correção ou mensagem para o solicitante..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:border-red-500 focus:bg-white"
                />

                {selectedReport.resolvedAt && (
                  <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Finalizado em {formatDateTime(selectedReport.resolvedAt)} por {selectedReport.resolvedBy || 'Admin'}.
                  </p>
                )}

                {/* Status Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('EM_ANALISE')}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                        selectedReport.status === 'EM_ANALISE'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      Marcar Em Análise
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('RESOLVIDO')}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
                        selectedReport.status === 'RESOLVIDO'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Marcar como Resolvido
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('IGNORADO')}
                      className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Ignorar
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedReport(null)}
                    className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Delete Error Report */}
      <ConfirmationModal
        isOpen={!!reportToDelete}
        onClose={() => setReportToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Chamado de Erro"
        description="Tem certeza que deseja excluir este chamado do histórico do sistema?"
        confirmText="Excluir"
        confirmVariant="danger"
      />
    </div>
  );
};
