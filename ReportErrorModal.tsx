import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Bug, CheckCircle2, HelpCircle, Send, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { ErrorCategory, ErrorSeverity } from '../../types';

interface ReportErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultScreenOrModule?: string;
}

export const ReportErrorModal: React.FC<ReportErrorModalProps> = ({
  isOpen,
  onClose,
  defaultScreenOrModule,
}) => {
  const { currentUser } = useAuth();
  const { addErrorReport } = useStore();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ErrorCategory>('SISTEMA');
  const [severity, setSeverity] = useState<ErrorSeverity>('MEDIA');
  const [screenOrModule, setScreenOrModule] = useState(defaultScreenOrModule || '');
  const [description, setDescription] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor, informe um título ou resumo do erro.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError('Por favor, descreva com mais detalhes o que ocorreu (mínimo de 10 caracteres).');
      return;
    }

    const res = await addErrorReport({
      userId: currentUser?.id || '',
      userName: currentUser?.name || 'Colaborador',
      userEmail: currentUser?.email || '',
      userRole: currentUser?.role || 'staff',
      title: title.trim(),
      description: description.trim(),
      category,
      severity,
      screenOrModule: screenOrModule.trim() || undefined,
      screenshotUrl: screenshotUrl.trim() || undefined,
    });

    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setTitle('');
        setDescription('');
        setScreenshotUrl('');
        setError(null);
        onClose();
      }, 1800);
    } else {
      setError(res.message || 'Erro ao enviar o chamado.');
    }
  };

  const getSeverityBadgeClass = (sev: ErrorSeverity) => {
    switch (sev) {
      case 'CRITICA':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'ALTA':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIA':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'BAIXA':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/30 border border-red-500/40 text-red-400 rounded-xl">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
                Reportar Erro ou Problema
              </h3>
              <p className="text-xs text-slate-300">
                A notificação chegará diretamente para o Administrador resolver
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">
              Chamado Enviado com Sucesso!
            </h4>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              O Administrador Geral já recebeu a notificação em tempo real e irá analisar e solucionar a ocorrência.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Reporter Info Bar */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Solicitante:</span>
                <strong className="text-slate-900">{currentUser?.name || 'Colaborador'}</strong>
                <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                  {currentUser?.role || 'Staff'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono truncate max-w-[180px]">
                {currentUser?.email}
              </span>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Título Resumido do Problema *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Erro ao calcular valor total na OS #104 / Botão não responde"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:border-red-500 focus:bg-white"
              />
            </div>

            {/* Category and Severity Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Módulo / Categoria *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ErrorCategory)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-hidden focus:border-red-500"
                >
                  <option value="SISTEMA">Sistema / Falha Geral</option>
                  <option value="ORDEM_SERVICO">Ordens de Serviço (OS)</option>
                  <option value="ESTOQUE">Estoque & Peças</option>
                  <option value="CADASTRO">Cadastro (Clientes / Motos)</option>
                  <option value="FINANCEIRO">Financeiro & Pagamentos</option>
                  <option value="OUTRO">Outro / Dúvida Operacional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Impacto / Severidade *
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as ErrorSeverity)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-hidden focus:border-red-500"
                >
                  <option value="BAIXA">Baixa (Dúvida / Sugestão)</option>
                  <option value="MEDIA">Média (Inconsistência leve)</option>
                  <option value="ALTA">Alta (Funcionalidade travada)</option>
                  <option value="CRITICA">Crítica (Bloqueia atendimento)</option>
                </select>
              </div>
            </div>

            {/* Screen or specific context */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tela ou Local Onde Aconteceu (Opcional)
              </label>
              <input
                type="text"
                value={screenOrModule}
                onChange={(e) => setScreenOrModule(e.target.value)}
                placeholder="Ex: Tela de Ordens de Serviço > Salvar Fechamento"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-red-500"
              />
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Descrição Detalhada do Erro *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explique o que você estava fazendo, o que aconteceu de inesperado e quais dados foram informados..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-red-500 focus:bg-white resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Quanto mais detalhes você fornecer, mais rápida será a resolução pelo administrador.
              </p>
            </div>

            {/* URL of Screenshot / Evidence */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Link da Imagem / Print (Opcional)
              </label>
              <input
                type="url"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                placeholder="https://exemplo.com/print-erro.png"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden focus:border-red-500"
              />
            </div>

            {/* Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar Notificação ao Administrador
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
