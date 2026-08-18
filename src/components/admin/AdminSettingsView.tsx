import React, { useState } from 'react';
import {
  AlertCircle,
  Bug,
  Building2,
  CheckCircle,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Lock,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { SectionKey, UserRole } from '../../types';
import { formatDate } from '../../utils/formatters';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { ErrorReportsSection } from './ErrorReportsSection';

const PERMISSION_SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'dashboard', label: 'Painel / Dashboard' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'motos', label: 'Motos Vendidas' },
  { key: 'revisoes', label: 'Revisões de Garantia' },
  { key: 'ordens', label: 'Ordens de Serviço (Oficina)' },
  { key: 'servicos', label: 'Tabela de Serviços' },
  { key: 'estoque', label: 'Estoque de Peças' },
  { key: 'movimentacoes', label: 'Movimentações de Estoque' },
  { key: 'relatorios', label: 'Relatórios Gerenciais' },
];

const PERMISSION_ROLES: { key: UserRole; label: string }[] = [
  { key: 'vendedor', label: 'Vendedor' },
  { key: 'recepcionista', label: 'Recepcionista' },
  { key: 'mecanico', label: 'Mecânico' },
];

export const AdminSettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    parts,
    recalculateAllPartsPrices,
    auditLogs,
    resetDatabase,
    exportDatabaseJSON,
    importDatabaseJSON,
    pendingErrorReportsCount,
    rolePermissions,
    updateRolePermission,
  } = useStore();
  const {
    users,
    addUser,
    deleteUser,
    updateUser,
    toggleUserActive,
    approveUser,
    rejectUser,
    pendingApprovalUsers,
    pendingApprovalCount,
    currentUser,
    isAdmin,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'loja' | 'usuarios' | 'permissoes' | 'erros' | 'auditoria' | 'dados'>('loja');

  const [permissionSuccessMsg, setPermissionSuccessMsg] = useState<string | null>(null);

  const isSectionCheckedForRole = (role: UserRole, section: SectionKey): boolean => {
    const found = rolePermissions.find((p) => p.role === role && p.sectionKey === section);
    return found ? found.canView : true;
  };

  const handleTogglePermission = async (role: UserRole, section: SectionKey, currentlyChecked: boolean) => {
    const nextValue = !currentlyChecked;
    await updateRolePermission(role, section, nextValue);
    // 'staff' is a legacy alias for 'recepcionista' - keep both in sync so
    // older accounts created under that role name behave the same way.
    if (role === 'recepcionista') {
      await updateRolePermission('staff' as UserRole, section, nextValue);
    }
    const roleLabel = PERMISSION_ROLES.find((r) => r.key === role)?.label || role;
    const sectionLabel = PERMISSION_SECTIONS.find((s) => s.key === section)?.label || section;
    setPermissionSuccessMsg(
      `${nextValue ? 'Acesso concedido' : 'Acesso removido'}: ${roleLabel} → ${sectionLabel}`
    );
    setTimeout(() => setPermissionSuccessMsg(null), 3000);
  };

  // Store settings form state
  const [storeName, setStoreName] = useState(settings.storeName || '');
  const [legalName, setLegalName] = useState(settings.legalName || '');
  const [cnpj, setCnpj] = useState(settings.cnpj || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp || '');
  const [email, setEmail] = useState(settings.email || '');
  const [address, setAddress] = useState(settings.address || '');
  const [number, setNumber] = useState(settings.number || '');
  const [neighborhood, setNeighborhood] = useState(settings.neighborhood || '');
  const [city, setCity] = useState(settings.city || '');
  const [state, setState] = useState(settings.state || '');

  // Warranty rules form state
  const [skipFirst1000Km, setSkipFirst1000Km] = useState(settings.warrantyRules.skipFirst1000Km || false);
  const [firstRevisionKm, setFirstRevisionKm] = useState(settings.warrantyRules.firstRevisionKm || 1000);
  const [subsequentIntervalKm, setSubsequentIntervalKm] = useState(settings.warrantyRules.subsequentIntervalKm || 3000);
  const [intervalMonths, setIntervalMonths] = useState(settings.warrantyRules.intervalMonths || 6);
  const [alertDaysTolerance, setAlertDaysTolerance] = useState(settings.warrantyRules.alertDaysTolerance || 30);
  const [alertKmTolerance, setAlertKmTolerance] = useState(settings.warrantyRules.alertKmTolerance || 500);

  // Parts automatic pricing state
  const [defaultMarkupPercent, setDefaultMarkupPercent] = useState(settings.defaultMarkupPercent ?? 40);
  const [autoApplyMarkup, setAutoApplyMarkup] = useState(settings.autoApplyMarkup !== false);
  const [recalcSuccessMsg, setRecalcSuccessMsg] = useState<string | null>(null);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // User form modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('123456');
  const [newUserRole, setNewUserRole] = useState<UserRole>('vendedor');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Approval override role map
  const [approvalRoleOverrides, setApprovalRoleOverrides] = useState<Record<string, UserRole>>({});
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Reset confirmation
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      storeName,
      legalName,
      cnpj,
      phone,
      whatsapp,
      email,
      address,
      number,
      neighborhood,
      city,
      state,
      warrantyRules: {
        skipFirst1000Km,
        firstRevisionKm: Number(firstRevisionKm),
        subsequentIntervalKm: Number(subsequentIntervalKm),
        intervalMonths: Number(intervalMonths),
        alertDaysTolerance: Number(alertDaysTolerance),
        alertKmTolerance: Number(alertKmTolerance),
      },
      defaultMarkupPercent: Number(defaultMarkupPercent),
      autoApplyMarkup,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleRecalculatePrices = async () => {
    const res = await recalculateAllPartsPrices(Number(defaultMarkupPercent));
    setRecalcSuccessMsg(`Preços de venda de ${res.count} peça(s) atualizados com sucesso com margem de ${res.markup}%!`);
    setTimeout(() => setRecalcSuccessMsg(null), 4000);
  };

  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    setAddUserError(null);
    setIsAddingUser(true);
    const res = await addUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      phone: newUserPhone.trim(),
      role: newUserRole,
      password: newUserPassword.trim() || '123456',
    });
    setIsAddingUser(false);

    if (!res.success) {
      setAddUserError(res.message || 'Não foi possível criar o usuário.');
      return;
    }

    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserPassword('123456');
    setIsUserModalOpen(false);
  };

  const handleApprove = async (userId: string) => {
    const roleOverride = approvalRoleOverrides[userId];
    await approveUser(userId, roleOverride);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingUserId) return;
    await rejectUser(rejectingUserId, rejectionReasonInput.trim() || 'Solicitação recusada pelo Administrador.');
    setRejectingUserId(null);
    setRejectionReasonInput('');
  };

  const handleExportJSON = () => {
    const jsonString = exportDatabaseJSON();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_vittamotos_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = await importDatabaseJSON(content);
        if (res.success) {
          alert('Backup restaurado com sucesso!');
        } else {
          alert('Falha ao restaurar o backup: ' + (res.message || 'Arquivo JSON inválido.'));
        }
      }
    };
    reader.readAsText(file);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrador (Total)', color: 'bg-red-100 text-red-700 border-red-200' };
      case 'vendedor':
        return { label: 'Vendedor', color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'recepcionista':
      case 'staff':
        return { label: 'Recepcionista', color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'mecanico':
        return { label: 'Mecânico', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      default:
        return { label: role, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  // Access guard: this screen exposes user management, audit logs and full
  // database export/import/reset. It must only be reachable by Administrators,
  // even if a non-admin lands here indirectly (e.g. via a notification link).
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">Acesso Restrito</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Esta área é exclusiva para Administradores. Fale com o administrador do
          sistema caso precise de alguma alteração aqui.
        </p>
      </div>
    );
  }

  return (    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-red-600" />
          Configurações & Administração do Sistema
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Parâmetros da loja, aprovação de cadastros, controle de acessos por função, auditoria e backup
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('loja')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'loja'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Dados da Loja & Regras de Garantia
        </button>

        <button
          onClick={() => setActiveTab('usuarios')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap relative cursor-pointer ${
            activeTab === 'usuarios'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuários & Aprovação de Cadastros</span>
          {pendingApprovalCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-slate-950 rounded-full animate-pulse">
              {pendingApprovalCount} pendente(s)
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('permissoes')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'permissoes'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          Permissões por Função
        </button>

        <button
          onClick={() => setActiveTab('erros')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap relative cursor-pointer ${
            activeTab === 'erros'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bug className="w-4 h-4 text-red-500" />
          <span>Central de Erros & Chamados</span>
          {pendingErrorReportsCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded-full animate-pulse">
              {pendingErrorReportsCount} pendente(s)
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'auditoria'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          Logs de Auditoria ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('dados')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'dados'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          Backup & Banco de Dados
        </button>
      </div>

      {/* TAB 1: LOJA & GARANTIA */}
      {activeTab === 'loja' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              Configurações atualizadas com sucesso!
            </div>
          )}

          {/* Dados Cadastrais */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-red-600" />
              Dados da Concessionária (Shineray Oficial)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Razão Social
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Telefone Fixo
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp Oficial da Oficina
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Endereço Completo
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua / Avenida"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden"
                  />
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="Nº"
                    className="w-24 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  UF
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm uppercase focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Regras de Garantia */}
          <div className="p-5 bg-red-50/50 border border-red-100 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-100/80 pb-3">
              <h4 className="font-bold text-red-950 text-xs uppercase tracking-wider flex items-center gap-2">
                <Wrench className="w-4 h-4 text-red-600" />
                Parâmetros de Revisões de Garantia Shineray & Alertas Automáticos
              </h4>
              <span className="text-[11px] text-red-700 bg-red-100/60 px-2.5 py-1 rounded-full font-medium">
                Cálculo inteligente de quilometragem e tolerâncias
              </span>
            </div>

            {/* Opção de desconsiderar 1000km e começar a partir de novo parâmetro */}
            <div className="p-3.5 bg-white border border-red-200 rounded-xl space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipFirst1000Km}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSkipFirst1000Km(checked);
                    if (checked && firstRevisionKm === 1000) {
                      setFirstRevisionKm(3000); // Sugere o novo parâmetro padrão
                    } else if (!checked && firstRevisionKm === 3000) {
                      setFirstRevisionKm(1000);
                    }
                  }}
                  className="w-4 h-4 text-red-600 rounded-md border-slate-300 focus:ring-red-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800">
                  Desconsiderar os 1.000 km tradicionais da 1ª revisão (Iniciar a contagem a partir de um novo parâmetro)
                </span>
              </label>
              <p className="text-[11px] text-slate-500 pl-6.5">
                {skipFirst1000Km
                  ? 'A 1ª revisão não será em 1.000 km. As revisões começarão a contar a partir do KM inicial definido abaixo e progredirão no intervalo configurado.'
                  : 'Padrão tradicional Shineray: 1ª revisão aos 1.000 km e as subsequentes no intervalo configurado (ex: 4.000 km, 7.000 km...).'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {skipFirst1000Km ? 'Novo KM Inicial (1ª Rev.)' : '1ª Revisão (KM)'}
                </label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={firstRevisionKm}
                  onChange={(e) => setFirstRevisionKm(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono focus:outline-hidden focus:border-red-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {skipFirst1000Km ? 'Ex: 3.000 km, 4.000 km' : 'Padrão: 1.000 km'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Intervalo KM Subsequente
                </label>
                <input
                  type="number"
                  min={500}
                  step={500}
                  value={subsequentIntervalKm}
                  onChange={(e) => setSubsequentIntervalKm(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono focus:outline-hidden focus:border-red-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Padrão: 3.000 km</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Intervalo em Meses
                </label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={intervalMonths}
                  onChange={(e) => setIntervalMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono focus:outline-hidden focus:border-red-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Padrão: 6 meses</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tolerância (Dias)
                </label>
                <input
                  type="number"
                  min={0}
                  value={alertDaysTolerance}
                  onChange={(e) => setAlertDaysTolerance(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono focus:outline-hidden focus:border-red-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Padrão: 30 dias</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tolerância (KM)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={alertKmTolerance}
                  onChange={(e) => setAlertKmTolerance(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono focus:outline-hidden focus:border-red-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Padrão: 500 km</span>
              </div>
            </div>

            {/* Simulação em tempo real do cronograma gerado */}
            <div className="bg-white/80 rounded-xl p-3 border border-red-100">
              <span className="text-[11px] font-bold text-slate-700 block mb-2">
                Simulação da Escala de Revisões com os Parâmetros Atuais:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((revNum) => {
                  const targetKm =
                    revNum === 1
                      ? Number(firstRevisionKm)
                      : Number(firstRevisionKm) + (revNum - 1) * Number(subsequentIntervalKm);
                  const months = revNum * Number(intervalMonths);
                  return (
                    <div
                      key={revNum}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center"
                    >
                      <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        {revNum}ª Revisão
                      </div>
                      <div className="text-xs font-black text-red-600 font-mono mt-0.5">
                        {targetKm.toLocaleString('pt-BR')} km
                      </div>
                      <div className="text-[10px] text-slate-400">ou até {months} meses</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Parâmetros de Precificação Automática de Peças */}
          <div className="p-5 bg-amber-50/40 border border-amber-200/80 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
              <h4 className="font-bold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Parâmetros de Precificação Automática de Peças (% Margem / Markup)
              </h4>
              <span className="text-[11px] text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full font-medium">
                Cálculo automático: Preço de Venda = Custo de Compra + Margem %
              </span>
            </div>

            {recalcSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                {recalcSuccessMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Margem de Lucro Padrão (% Markup)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={500}
                    step={1}
                    value={defaultMarkupPercent}
                    onChange={(e) => setDefaultMarkupPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono pr-8 focus:outline-hidden focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Ex: 40% (Adiciona 40% sobre o valor de custo)
                </span>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={autoApplyMarkup}
                    onChange={(e) => setAutoApplyMarkup(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded-md border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Sugerir/Preencher preço de venda automaticamente nos novos cadastros e entradas de estoque
                  </span>
                </label>
                <div className="text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-amber-100">
                  <span className="font-bold text-slate-800">Exemplo prático de precificação:</span>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                    <span>
                      Custo de Compra: <strong className="font-mono text-slate-900">R$ 50,00</strong>
                    </span>
                    <span>+</span>
                    <span>
                      Margem: <strong className="font-mono text-amber-700">+{defaultMarkupPercent}%</strong>
                    </span>
                    <span>=</span>
                    <span>
                      Preço de Venda Sugerido:{' '}
                      <strong className="font-mono text-emerald-700">
                        R${' '}
                        {(50 * (1 + Number(defaultMarkupPercent) / 100)).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ação rápida para recalcular todas as peças do estoque com a nova % */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-amber-100">
              <span className="text-xs text-slate-600">
                Você tem <strong>{parts.length}</strong> peça(s) no catálogo de estoque.
              </span>
              <button
                type="button"
                onClick={handleRecalculatePrices}
                className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-950" />
                Recalcular Preços de Venda de Todas as Peças ({defaultMarkupPercent}%)
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Salvar Configurações
            </button>
          </div>
        </form>
      )}      {/* TAB 2: USUÁRIOS E APROVAÇÃO */}
      {activeTab === 'usuarios' && (
        <div className="space-y-6">
          {/* SEÇÃO 1: SOLICITAÇÕES DE CADASTRO PENDENTES */}
          {pendingApprovalCount > 0 ? (
            <div className="bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-amber-950 text-sm sm:text-base flex items-center gap-2">
                      <span>Solicitações de Acesso Pendentes</span>
                      <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 rounded-full text-xs font-black">
                        {pendingApprovalCount}
                      </span>
                    </h3>
                    <p className="text-xs text-amber-800">
                      Estes colaboradores já confirmaram o e-mail via código e aguardam sua autorização para acessar o sistema.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {pendingApprovalUsers.map((pendingUser) => {
                  const assignedRole = approvalRoleOverrides[pendingUser.id] || pendingUser.role;
                  return (
                    <div
                      key={pendingUser.id}
                      className="bg-white border border-amber-200 rounded-2xl p-4.5 shadow-xs space-y-3.5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm border border-amber-200">
                            {pendingUser.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{pendingUser.name}</h4>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {pendingUser.email}
                            </p>
                            {pendingUser.phone && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {pendingUser.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[10px] font-bold">
                          E-mail Confirmado ✓
                        </span>
                      </div>

                      {/* Cargo selector before approval */}
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                        <span className="font-bold text-slate-600">Cargo / Função a Conceder:</span>
                        <select
                          value={assignedRole}
                          onChange={(e) =>
                            setApprovalRoleOverrides((prev) => ({
                              ...prev,
                              [pendingUser.id]: e.target.value as UserRole,
                            }))
                          }
                          className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-hidden"
                        >
                          <option value="vendedor">Vendedor</option>
                          <option value="recepcionista">Recepcionista</option>
                          <option value="mecanico">Mecânico</option>
                          <option value="admin">Administrador Geral</option>
                        </select>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setRejectingUserId(pendingUser.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 cursor-pointer transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Recusar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApprove(pendingUser.id)}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Aprovar Acesso
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Nenhum cadastro pendente de aprovação no momento.</span>
              </div>
              <span className="text-[11px] text-slate-400">Todos os usuários ativos estão regularizados</span>
            </div>
          )}

          {/* SEÇÃO 2: USUÁRIOS ATIVOS DO SISTEMA */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Controle de Usuários & Permissões do Sistema
                </h3>
                <p className="text-xs text-slate-500">
                  Gerenciamento de papéis (Administrador, Vendedores, Recepcionistas, Mecânicos)
                </p>
              </div>
              <button
                onClick={() => {
                  setAddUserError(null);
                  setIsUserModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Adicionar Usuário Direto
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {users
                .filter((u) => u.status === 'approved' || !u.status)
                .map((u) => {
                  const roleBadge = getRoleBadge(u.role);
                  return (
                    <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{u.name}</h4>
                            {u.id === currentUser?.id && (
                              <span className="px-1.5 py-0.5 bg-slate-900 text-white rounded-md text-[9px] font-bold">
                                Você
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">{u.email} {u.phone ? `• ${u.phone}` : ''}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-auto">
                        {/* Role selector */}
                        {isAdmin && u.id !== currentUser?.id ? (
                          <select
                            value={u.role}
                            onChange={(e) => updateUser(u.id, { role: e.target.value as UserRole })}
                            className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-hidden"
                          >
                            <option value="admin">Administrador (Total)</option>
                            <option value="vendedor">Vendedor</option>
                            <option value="recepcionista">Recepcionista</option>
                            <option value="mecanico">Mecânico</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                        )}

                        {/* Toggle active button */}
                        {isAdmin && u.id !== currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => toggleUserActive(u.id)}
                            className={`p-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
                              u.active ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                            }`}
                            title={u.active ? 'Desativar usuário' : 'Ativar usuário'}
                          >
                            {u.active ? (
                              <ToggleRight className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                        )}

                        {/* Delete button */}
                        {isAdmin && u.id !== currentUser?.id && (
                          <button
                            onClick={() => setUserToDelete(u.id)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USUARIOS */}
      {/* ... usuarios view ... */}

      {/* TAB: PERMISSÕES POR FUNÇÃO */}
      {activeTab === 'permissoes' && (      {activeTab === 'permissoes' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-start gap-3">
            <Lock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-800">
              <p className="font-bold mb-0.5">Controle de acesso por seção</p>
              <p>
                Marque as seções que cada função pode enxergar no menu lateral. O Administrador sempre tem
                acesso total e não aparece aqui. Mudanças entram em vigor imediatamente para qualquer pessoa
                conectada, mesmo sem precisar sair e entrar de novo.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[560px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Seção do Sistema
                    </th>
                    {PERMISSION_ROLES.map((r) => (
                      <th
                        key={r.key}
                        className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center"
                      >
                        {r.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_SECTIONS.map((section, idx) => (
                    <tr
                      key={section.key}
                      className={`border-b border-slate-100 ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                    >
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700">{section.label}</td>
                      {PERMISSION_ROLES.map((r) => {
                        const checked = isSectionCheckedForRole(r.key, section.key);
                        return (
                          <td key={r.key} className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(r.key, section.key, checked)}
                              title={checked ? 'Clique para remover o acesso' : 'Clique para conceder acesso'}
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors cursor-pointer mx-auto ${
                                checked
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'bg-white border-slate-300 hover:border-slate-400'
                              }`}
                            >
                              {checked && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {permissionSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {permissionSuccessMsg}
            </div>
          )}
        </div>
      )}

      {/* TAB: CENTRAL DE ERROS */}
      {activeTab === 'erros' && <ErrorReportsSection />}

      {/* TAB 3: AUDITORIA */}
      {activeTab === 'auditoria' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Registro de Auditoria</h3>
              <p className="text-xs text-slate-500">Histórico detalhado de todas as operações e alterações no sistema</p>
            </div>
            <span className="text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-lg">
              {auditLogs.length} eventos registrados
            </span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-3">Usuário</th>
                  <th className="py-3 px-3">Ação</th>
                  <th className="py-3 px-3">Entidade</th>
                  <th className="py-3 px-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{log.userName}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">{log.entity}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-md truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BACKUP & BANCO DE DADOS */}
      {activeTab === 'dados' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-red-600" />
              Backup e Exportação de Dados do Sistema
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Gere cópias de segurança de todos os clientes, motocicletas, ordens de serviço e catálogo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <Download className="w-4 h-4 text-red-600" />
                Exportar Backup Completo (JSON)
              </h4>
              <p className="text-xs text-slate-600">
                Baixe um arquivo seguro contendo todos os dados e histórico da concessionária.
              </p>
              <button
                type="button"
                onClick={handleExportJSON}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                Baixar Arquivo JSON de Backup
              </button>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" />
                Restaurar Backup (JSON)
              </h4>
              <p className="text-xs text-slate-600">
                Substitua ou importe dados de um arquivo salvo anteriormente.
              </p>
              <label className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                Selecionar Arquivo JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
            <div>
              <h4 className="font-bold text-rose-700 text-xs">Zona de Risco: Apagar Todos os Dados</h4>
              <p className="text-xs text-slate-500 max-w-md">
                Remove permanentemente todos os clientes, motos, ordens de serviço, estoque, movimentações e
                histórico de auditoria. Não é uma reposição de dados de exemplo - a base fica vazia. Use o
                backup acima antes de continuar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer shrink-0"
            >
              Apagar Todos os Dados
            </button>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Cadastrar Novo Usuário (Direto)</h3>
            {addUserError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {addUserError}
              </div>
            )}
            <form onSubmit={handleAddUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ex: Carlos Santos"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="usuario@vittamotos.com.br"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Telefone</label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="(27) 99999-0000"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Senha Inicial</label>
                  <input
                    type="text"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Papel / Função</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="vendedor">Vendedor (Gestão de Vendas & Clientes)</option>
                  <option value="recepcionista">Recepcionista (Atendimento Operacional)</option>
                  <option value="mecanico">Mecânico (Oficina, OS & Serviços)</option>
                  <option value="admin">Administrador Geral (Acesso Total)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isAddingUser}
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isAddingUser ? 'Cadastrando...' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingUserId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 text-rose-600">
              <XCircle className="w-5 h-5" />
              Recusar Solicitação de Cadastro
            </h3>
            <p className="text-xs text-slate-600">
              Informe o motivo da recusa (opcional). O usuário será informado ao tentar acessar.
            </p>
            <textarea
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="Ex: Cadastro duplicado / E-mail não autorizado para a equipe."
              className="w-full h-24 p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingUserId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md cursor-pointer"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation */}
      {isResetConfirmOpen && (
        <ConfirmationModal
          isOpen={isResetConfirmOpen}
          onClose={() => setIsResetConfirmOpen(false)}
          onConfirm={async () => {
            await resetDatabase();
            setIsResetConfirmOpen(false);
          }}
          title="Apagar Todos os Dados do Sistema"
          message="Atenção: esta ação é IRREVERSÍVEL. Todos os clientes, motos, ordens de serviço, peças, movimentações de estoque e histórico de auditoria serão permanentemente apagados. Isso não é uma reposição de dados de exemplo - a base ficará vazia. Baixe um backup antes de continuar, se ainda não o fez. Deseja mesmo apagar tudo?"
          confirmText="Sim, Apagar Tudo Permanentemente"
        />
      )}

      {/* Delete User Confirmation */}
      {userToDelete && (
        <ConfirmationModal
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={async () => {
            const res = await deleteUser(userToDelete);
            if (!res.success) {
              alert(res.message);
            }
            setUserToDelete(null);
          }}
          title="Excluir Usuário"
          message="Tem certeza que deseja remover este usuário?"
          confirmText="Sim, Remover"
        />
      )}
    </div>
  );
};
