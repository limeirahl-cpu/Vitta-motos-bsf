import React, { useState } from 'react';
import {
  Bell,
  Bug,
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  Search,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { ReportErrorModal } from './ReportErrorModal';
import { ShinerayLogo } from './ShinerayLogo';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onNavigate: (tab: string) => void;
  isSidebarCollapsed?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenSearch,
  onOpenNotifications,
  onNavigate,
  isSidebarCollapsed = false,
}) => {
  const {
    currentUser,
    logout,
    isAdmin,
    pendingApprovalCount,
  } = useAuth();
  const { notifications, settings, pendingErrorReportsCount, stores, activeStoreId, setActiveStoreId } = useStore();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [isReportErrorModalOpen, setIsReportErrorModalOpen] = useState(false);

  // Admin-only alert types (mirrors NotificationDrawer) excluded from the badge
  // count for non-admin users so the bell doesn't flag alerts they can't act on.
  const unreadNotifs = notifications.filter(
    (n) => !n.read && (isAdmin || (n.type !== 'USER_PENDING_APPROVAL' && n.type !== 'ERROR_REPORT'))
  ).length;
  const totalNotificationBadge = unreadNotifs + (isAdmin ? pendingApprovalCount + pendingErrorReportsCount : 0);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrador', color: 'bg-red-50 text-red-700 border-red-200' };
      case 'vendedor':
        return { label: 'Vendedor', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'recepcionista':
      case 'staff':
        return { label: 'Recepcionista', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'mecanico':
        return { label: 'Mecânico', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: 'Colaborador', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(currentUser?.role);

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 select-none">
      {/* Left section: Slide/Toggle button & Official Shineray Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-700 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title={isSidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        >
          {isSidebarCollapsed ? (
            <Menu className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        {/* Store & Shineray Brand Header */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="Ir para o Dashboard"
        >
          <div className="p-1 bg-white rounded-lg flex items-center justify-center border border-slate-100 shadow-2xs group-hover:border-red-200 transition-colors">
            <ShinerayLogo variant="icon" size="sm" />
          </div>
          <div className="hidden sm:block">
            <span className="font-extrabold text-slate-900 text-sm tracking-tight block leading-tight group-hover:text-red-600 transition-colors">
              {settings.storeName || 'Vitta Motos'}
            </span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block leading-none">
              Shineray Concessionária
            </span>
          </div>
        </div>

        {/* Store switcher - only shown when the person has access to more
            than one store (admins always see every store). */}
        {stores.length > 1 && (
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setShowStoreDropdown((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Trocar de loja"
            >
              <Building2 className="w-3.5 h-3.5 text-red-600" />
              <span className="truncate max-w-[140px]">{settings.storeName || 'Selecionar loja'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showStoreDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowStoreDropdown(false)} />
                <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50">
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Suas Lojas
                  </p>
                  {stores.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActiveStoreId(s.id);
                        setShowStoreDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        activeStoreId === s.id ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-semibold">{s.storeName}</span>
                        <span className="text-slate-400 ml-1">({s.city})</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Center: Global Search Bar trigger & Admin Pending Approval Balloon */}
      <div className="flex-1 max-w-lg mx-2 sm:mx-6 flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex-1 flex items-center justify-between px-3.5 py-2 text-xs sm:text-sm text-slate-400 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-2xs group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
            <span className="text-slate-500 font-medium truncate">
              Buscar cliente, placa, OS, peça...
            </span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-white border border-slate-200 rounded-md">
            Ctrl+K
          </kbd>
        </button>

        {/* Balão de Notificação de Novo Cadastro Pendente para o Administrador */}
        {isAdmin && pendingApprovalCount > 0 && (
          <button
            type="button"
            onClick={() => onNavigate('configuracoes')}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 animate-pulse transition-all cursor-pointer shrink-0"
            title="Novos usuários aguardando autorização de acesso"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{pendingApprovalCount} cadastro(s) pendente(s)</span>
          </button>
        )}

        {/* Balão de Chamados de Erro Pendentes para o Administrador */}
        {isAdmin && pendingErrorReportsCount > 0 && (
          <button
            type="button"
            onClick={() => onNavigate('configuracoes')}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 animate-pulse transition-all cursor-pointer shrink-0"
            title="Chamados de erro reportados pela equipe aguardando resolução"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>{pendingErrorReportsCount} erro(s) reportado(s)</span>
          </button>
        )}
      </div>

      {/* Right: Report Error, Notifications & User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Report Error Button accessible to all users */}
        <button
          type="button"
          onClick={() => setIsReportErrorModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-all cursor-pointer shadow-2xs"
          title="Reportar um erro, problema ou sugestão para o Administrador"
        >
          <Bug className="w-4 h-4 text-red-500" />
          <span className="hidden sm:inline">Reportar Erro</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-slate-600 hover:text-red-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Central de Alertas & Notificações"
        >
          <Bell className="w-5 h-5" />
          {totalNotificationBadge > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-2xs animate-pulse">
              {totalNotificationBadge > 9 ? '9+' : totalNotificationBadge}
            </span>
          )}
        </button>

        {/* User profile dropdown button */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 font-black text-xs flex items-center justify-center border border-red-200">
              {currentUser?.name.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser?.name.split(' ')[0]}
              </div>
              <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                <span className={`px-1.5 py-0.2 rounded-md font-bold text-[9px] border ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showUserDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">{currentUser?.name}</p>
                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser?.email}</p>
                  {currentUser?.phone && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{currentUser.phone}</p>
                  )}
                </div>

                <div className="pt-1 border-t border-slate-100 space-y-0.5">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setIsReportErrorModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Bug className="w-4 h-4 text-red-500" />
                    Reportar Erro / Problema
                  </button>

                  <button
                    onClick={() => {
                      logout();
                      setShowUserDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Encerrar Sessão
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Global Error Reporting Modal */}
      <ReportErrorModal
        isOpen={isReportErrorModalOpen}
        onClose={() => setIsReportErrorModalOpen(false)}
      />
    </header>
  );
};
