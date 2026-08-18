import React from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Bike,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { ShinerayLogo } from './ShinerayLogo';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const {
    isAdmin,
    isVendedor,
    isRecepcionista,
    isMecanico,
    currentUser,
    logout,
    pendingApprovalCount,
  } = useAuth();
  const { serviceOrders, parts, warrantyRevisions, motorcycles, clients, settings, canViewSection } = useStore();

  // Filter counters based on current user role
  const filteredOrders = serviceOrders.filter((o) => {
    if (isVendedor && currentUser) {
      // Seller sees orders for his clients or motorcycles
      const sellerClients = clients.filter(
        (c) => c.sellerId === currentUser.id || c.createdBy === currentUser.id
      ).map((c) => c.id);
      const sellerMotos = motorcycles.filter(
        (m) => m.sellerId === currentUser.id || sellerClients.includes(m.clientId)
      ).map((m) => m.id);
      return (
        o.sellerId === currentUser.id ||
        o.createdBy === currentUser.id ||
        sellerClients.includes(o.clientId) ||
        sellerMotos.includes(o.motorcycleId)
      );
    }
    return true;
  });

  const openOrdersCount = filteredOrders.filter(
    (o) => o.status !== 'FINALIZADA' && o.status !== 'ENTREGUE' && o.status !== 'CANCELADA'
  ).length;

  const lowStockCount = parts.filter((p) => p.currentStock < p.minStock).length;

  // Pending / Overdue revisions
  const pendingRevisionsCount = warrantyRevisions.filter((r) => !r.completed).length;

  // Overdue revisions for seller alert
  const overdueRevisionsCount = warrantyRevisions.filter((r) => !r.completed && r.status === 'ATRASADA').length;

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrador Geral', short: 'Admin', color: 'text-red-400 bg-red-950/60 border-red-800/40' };
      case 'vendedor':
        return { label: 'Vendedor', short: 'Vendas', color: 'text-blue-400 bg-blue-950/60 border-blue-800/40' };
      case 'recepcionista':
      case 'staff':
        return { label: 'Recepcionista', short: 'Recepção', color: 'text-purple-400 bg-purple-950/60 border-purple-800/40' };
      case 'mecanico':
        return { label: 'Mecânico', short: 'Oficina', color: 'text-amber-400 bg-amber-950/60 border-amber-800/40' };
      default:
        return { label: 'Colaborador', short: 'Equipe', color: 'text-slate-400 bg-slate-800 border-slate-700' };
    }
  };

  const roleInfo = getRoleBadge(currentUser?.role);

  // Menu is built from a single canonical item list, then filtered per the
  // current user's role using role_permissions (admin-configurable via
  // Configurações → Permissões). Labels stay a little personalized per role
  // where that's genuinely useful (e.g. "Meus Clientes" for vendedor), but
  // visibility itself now comes entirely from the permission table instead
  // of being hardcoded per role.
  const role = currentUser?.role;
  const dashboardLabel =
    isVendedor ? 'Meu Painel' : isMecanico ? 'Painel da Oficina' : 'Dashboard Geral';
  const clientesLabel = isVendedor ? 'Meus Clientes' : 'Clientes';
  const motosLabel = isVendedor ? 'Minhas Motos Vendidas' : isMecanico ? 'Motos Cadastradas' : 'Motos Vendidas';
  const ordensLabel = isVendedor ? 'Minhas Ordens de Serviço' : 'Ordens de Serviço';
  const estoqueLabel = isVendedor ? 'Consulta de Peças' : 'Estoque de Peças';

  const allSections: { title: string; items: any[] }[] = [
    {
      title: 'VISÃO GERAL',
      items: [{ id: 'dashboard', label: dashboardLabel, icon: LayoutDashboard }],
    },
    {
      title: 'GESTÃO COMERCIAL',
      items: [
        { id: 'clientes', label: clientesLabel, icon: Users },
        { id: 'motos', label: motosLabel, icon: Bike },
        {
          id: 'revisoes',
          label: isVendedor ? 'Revisões (Avisar Clientes)' : 'Revisões de Garantia',
          icon: CalendarClock,
          highlight: !isVendedor,
          badge: overdueRevisionsCount > 0 && isVendedor
            ? `${overdueRevisionsCount} atrasadas`
            : pendingRevisionsCount > 0
            ? pendingRevisionsCount
            : undefined,
          badgeColor: overdueRevisionsCount > 0 && isVendedor ? 'bg-rose-600 text-white font-bold animate-pulse' : 'bg-amber-500 text-slate-950',
        },
      ],
    },
    {
      title: 'OFICINA & SERVIÇOS',
      items: [
        {
          id: 'ordens',
          label: ordensLabel,
          icon: ClipboardList,
          badge: openOrdersCount > 0 ? openOrdersCount : undefined,
          badgeColor: 'bg-red-600 text-white',
        },
        { id: 'servicos', label: 'Tabela de Serviços', icon: Wrench },
      ],
    },
    {
      title: 'ESTOQUE & PEÇAS',
      items: [
        {
          id: 'estoque',
          label: estoqueLabel,
          icon: Package,
          badge: lowStockCount > 0 ? `${lowStockCount} baixo` : undefined,
          badgeColor: 'bg-rose-600 text-white',
        },
        { id: 'movimentacoes', label: 'Movimentações', icon: History },
      ],
    },
    {
      title: 'ANÁLISE & RELATÓRIOS',
      items: [{ id: 'relatorios', label: 'Relatórios Gerenciais', icon: BarChart3 }],
    },
  ];

  const getMenuSections = () => {
    return allSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => canViewSection(role, item.id)),
      }))
      .filter((section) => section.items.length > 0);
  };

  const menuSections = getMenuSections();

  const handleItemClick = (tabId: string) => {
    onNavigate(tabId);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 bottom-0 left-0 z-40 h-screen bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-all duration-300 ease-in-out select-none shadow-xl lg:shadow-none shrink-0 ${
          isMobileOpen
            ? 'translate-x-0 w-64'
            : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-3.5 flex items-center justify-between border-b border-slate-800 bg-slate-950/60">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
              <div className="p-1.5 bg-white rounded-xl shadow-xs shrink-0 flex items-center justify-center">
                <ShinerayLogo variant="icon" size="sm" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-white text-sm tracking-tight truncate">
                    {settings.storeName || 'Vitta Motos'}
                  </span>
                </div>
                <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider block leading-none truncate">
                  Shineray Oficial
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto p-1.5 bg-white rounded-xl shadow-xs flex items-center justify-center">
              <ShinerayLogo variant="icon" size="sm" />
            </div>
          )}

          {/* Collapse/Expand Toggle */}
          <div className="flex items-center">
            <button
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-red-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-400 hover:text-white" />
              )}
            </button>

            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
              title="Fechar Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation items scroll area */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          {menuSections.map((section) => (
            <div key={section.title}>
              {!isCollapsed && (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {section.title}
                </div>
              )}
              {isCollapsed && (
                <div className="w-full h-px bg-slate-800/80 my-2" />
              )}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center ${
                        isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3 py-2'
                      } rounded-xl text-xs font-semibold transition-all group relative cursor-pointer ${
                        isActive
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {/* Badge in expanded view */}
                      {!isCollapsed && item.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md shrink-0 ${
                            item.badgeColor || 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Badge indicator dot in collapsed view */}
                      {isCollapsed && item.badge !== undefined && (
                        <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-slate-900" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Admin exclusive section */}
          {isAdmin && (
            <div>
              {!isCollapsed ? (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                  <span>ADMINISTRAÇÃO</span>
                  <span className="text-[9px] bg-red-950/60 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded font-bold">
                    ADMIN
                  </span>
                </div>
              ) : (
                <div className="w-full h-px bg-slate-800/80 my-2" />
              )}

              <div className="space-y-1">
                <button
                  onClick={() => handleItemClick('configuracoes')}
                  title={isCollapsed ? 'Configurações & Loja' : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3 py-2'
                  } rounded-xl text-xs font-semibold transition-all group relative cursor-pointer ${
                    currentView === 'configuracoes'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                    {!isCollapsed && <span className="truncate">Configurações & Loja</span>}
                  </div>

                  {/* Badge if pending user approvals */}
                  {!isCollapsed && pendingApprovalCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-slate-950 rounded-md shrink-0 animate-pulse">
                      {pendingApprovalCount} pendente(s)
                    </span>
                  )}
                  {isCollapsed && pendingApprovalCount > 0 && (
                    <span className="absolute top-1.5 right-2 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-slate-900 animate-pulse" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Footer Profile & Logout */}
        <div className="p-2 border-t border-slate-800 bg-slate-950/60">
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-xs shrink-0 border border-red-500/30">
                  {currentUser?.name.charAt(0) || 'U'}
                </div>
                <div className="truncate min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{currentUser?.name}</p>
                  <p className="text-[10px] font-medium truncate text-slate-400">
                    {roleInfo.label}
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                title="Sair do Sistema"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                title={`${currentUser?.name} (${roleInfo.label})`}
                className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-xs border border-red-500/30 cursor-default"
              >
                {currentUser?.name.charAt(0) || 'U'}
              </div>
              <button
                onClick={logout}
                title="Sair do Sistema"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
