import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bike,
  CalendarClock,
  CheckCircle2,
  Clock,
  MessageCircle,
  Package,
  PlusCircle,
  Shield,
  TrendingUp,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, formatDate, formatKm } from '../../utils/formatters';
import { RevisionStatusBadge, ServiceOrderStatusBadge } from '../common/Badge';
import { StatCard } from '../common/StatCard';

interface DashboardViewProps {
  onNavigate: (tab: string, entityId?: string) => void;
  onOpenNewOS?: () => void;
  onOpenNewMoto?: () => void;
  onOpenNewClient?: () => void;
  onOpenNewStockEntry?: () => void;
  onOpenRegisterRevision?: (motoId?: string) => void;
  onRegisterRevision?: (motoId?: string) => void;
  onSelectOrder?: (orderId: string) => void;
  onSelectMoto?: (motoId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenNewOS,
  onOpenNewMoto,
  onOpenNewClient,
  onOpenNewStockEntry,
  onOpenRegisterRevision,
  onRegisterRevision,
  onSelectOrder,
  onSelectMoto,
}) => {
  const {
    currentUser,
    isAdmin,
    isVendedor,
    isRecepcionista,
    isMecanico,
  } = useAuth();

  const handleRegisterRevision = (motoId?: string) => {
    if (onOpenRegisterRevision) {
      onOpenRegisterRevision(motoId);
    } else if (onRegisterRevision) {
      onRegisterRevision(motoId);
    } else {
      onNavigate('revisoes');
    }
  };

  const handleOpenOS = () => {
    if (onOpenNewOS) {
      onOpenNewOS();
    } else {
      onNavigate('ordens');
    }
  };

  const handleOpenMoto = () => {
    if (onOpenNewMoto) {
      onOpenNewMoto();
    } else {
      onNavigate('motos');
    }
  };

  const handleSelectMoto = (motoId: string) => {
    if (onSelectMoto) {
      onSelectMoto(motoId);
    } else {
      onNavigate('motos', motoId);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    if (onSelectOrder) {
      onSelectOrder(orderId);
    } else {
      onNavigate('ordens', orderId);
    }
  };

  const {
    motorcycles,
    clients,
    serviceOrders,
    parts,
    warrantyRevisions,
    getMotorcycleNextRevision,
    getClientById,
    settings,
  } = useStore();

  // Role-filtered datasets
  const sellerClients = isVendedor && currentUser
    ? clients.filter((c) => c.sellerId === currentUser.id || c.createdBy === currentUser.id)
    : clients;

  const sellerMotos = isVendedor && currentUser
    ? motorcycles.filter(
        (m) =>
          m.sellerId === currentUser.id ||
          m.createdBy === currentUser.id ||
          sellerClients.some((c) => c.id === m.clientId)
      )
    : motorcycles;

  const displayOrders = isVendedor && currentUser
    ? serviceOrders.filter(
        (o) =>
          o.sellerId === currentUser.id ||
          o.createdBy === currentUser.id ||
          sellerClients.some((c) => c.id === o.clientId) ||
          sellerMotos.some((m) => m.id === o.motorcycleId)
      )
    : serviceOrders;

  // Compute metrics
  const totalMotos = sellerMotos.length;
  const totalClients = sellerClients.length;
  const lowStockParts = parts.filter((p) => p.active !== false && p.currentStock < p.minStock);

  const openOrders = displayOrders.filter(
    (o) => o.status === 'ABERTA' || o.status === 'AGUARDANDO_DIAGNOSTICO' || o.status === 'AGUARDANDO_APROVACAO'
  );
  const inProgressOrders = displayOrders.filter(
    (o) => o.status === 'EM_ANDAMENTO' || o.status === 'AGUARDANDO_PECA'
  );
  const completedOrders = displayOrders.filter(
    (o) => o.status === 'FINALIZADA' || o.status === 'ENTREGUE'
  );

  // Compute revisions status
  const motoRevisionStatusList = sellerMotos.map((m) => {
    const nextRev = getMotorcycleNextRevision(m);
    const client = getClientById(m.clientId);
    return {
      motorcycle: m,
      client,
      nextRev,
    };
  });

  // Most urgent first, so the dashboard's "at a glance" widget actually
  // surfaces what needs attention instead of just the first 5 bikes ever
  // registered.
  const REVISION_URGENCY_RANK: Record<string, number> = {
    ATRASADA: 0,
    VENCENDO: 1,
    PROXIMA: 2,
    DISTANTE: 3,
    REALIZADA: 4,
  };
  const sortedMotoRevisionStatusList = [...motoRevisionStatusList].sort(
    (a, b) => REVISION_URGENCY_RANK[a.nextRev.status] - REVISION_URGENCY_RANK[b.nextRev.status]
  );

  const overdueRevisions = motoRevisionStatusList.filter(
    (r) => r.nextRev.status === 'ATRASADA'
  );
  const upcomingRevisions = motoRevisionStatusList.filter(
    (r) => r.nextRev.status === 'PROXIMA' || r.nextRev.status === 'VENCENDO'
  );

  // Quick WhatsApp message for sellers
  const sendWhatsAppReminder = (clientPhone?: string, clientName?: string, model?: string, targetKm?: number) => {
    if (!clientPhone) return;
    const cleanPhone = clientPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(
      `Olá ${clientName || 'Cliente'}! Aqui é ${currentUser?.name || 'da Concessionária'} Shineray Vitta Motos. Notamos que sua moto ${model || 'Shineray'} está com a revisão de garantia (${targetKm || ''} km) prevista/atrasada. Vamos agendar para manter a garantia de fábrica em dia?`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-red-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-3 py-1 bg-red-600/40 border border-red-500/40 text-red-200 text-xs font-bold rounded-full">
              {isVendedor
                ? 'Painel do Vendedor'
                : isMecanico
                ? 'Painel da Oficina Mecânica'
                : isRecepcionista
                ? 'Painel Operacional'
                : 'Painel Geral de Administração'}
            </span>
            <span className="text-xs text-slate-300">
              Olá, <strong className="text-white">{currentUser?.name.split(' ')[0]}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {settings.storeName || 'Vitta Motos'}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            {isVendedor
              ? 'Acompanhe seus clientes cadastrados, motos vendidas, suas OS e envie avisos de revisões.'
              : isMecanico
              ? 'Fila de execução da oficina, diagnósticos, apontamento de peças e revisões.'
              : 'Controle integrado de vendas, oficina mecânica, revisões de garantia e estoque.'}
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          {!isMecanico && (
            <button
              onClick={handleOpenMoto}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Bike className="w-4 h-4" />
              <span>Nova Venda / Moto</span>
            </button>
          )}

          <button
            onClick={handleOpenOS}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shadow-md transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Abrir OS</span>
          </button>

          <button
            onClick={() => handleRegisterRevision()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <CalendarClock className="w-4 h-4" />
            <span>Registrar Revisão</span>
          </button>
        </div>
      </div>

      {/* Critical Alert Banners (Interactive) */}
      {(overdueRevisions.length > 0 || upcomingRevisions.length > 0 || (!isVendedor && lowStockParts.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Overdue revisions alert */}
          {overdueRevisions.length > 0 ? (
            <div
              onClick={() => onNavigate('revisoes')}
              className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start justify-between cursor-pointer hover:shadow-md hover:border-rose-300 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                  <AlertCircle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                    {isVendedor ? 'Suas Revisões Atrasadas' : 'Revisões Atrasadas'}
                  </h4>
                  <p className="text-sm font-extrabold text-rose-700 mt-0.5">
                    {overdueRevisions.length} revisão(ões) vencida(s)!
                  </p>
                  <p className="text-xs text-rose-600 mt-1">
                    {isVendedor ? 'Envie aviso via WhatsApp para seus clientes.' : 'Excederam KM ou limite de 6 meses.'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 group-hover:text-rose-600 transition-transform" />
            </div>
          ) : null}

          {/* Upcoming revisions alert */}
          {upcomingRevisions.length > 0 ? (
            <div
              onClick={() => onNavigate('revisoes')}
              className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start justify-between cursor-pointer hover:shadow-md hover:border-amber-300 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Revisões Próximas
                  </h4>
                  <p className="text-sm font-extrabold text-amber-700 mt-0.5">
                    {upcomingRevisions.length} moto(s) em período de revisão
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Dentro de 30 dias ou 500 km do limite.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 group-hover:text-amber-600 transition-transform" />
            </div>
          ) : null}

          {/* Low stock alert */}
          {!isVendedor && lowStockParts.length > 0 ? (
            <div
              onClick={() => onNavigate('estoque')}
              className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-start justify-between cursor-pointer hover:shadow-md hover:border-purple-300 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                    Estoque Crítico
                  </h4>
                  <p className="text-sm font-extrabold text-purple-700 mt-0.5">
                    {lowStockParts.length} peça(s) abaixo do mínimo
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Reposição necessária na oficina.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 group-hover:text-purple-600 transition-transform" />
            </div>
          ) : null}
        </div>
      )}

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title={isVendedor ? 'Minhas Motos Vendidas' : 'Motos Vendidas'}
          value={totalMotos}
          subtitle="Base cadastrada"
          icon={Bike}
          color="blue"
          onClick={() => onNavigate('motos')}
        />
        <StatCard
          title={isVendedor ? 'Minhas OS Abertas' : 'OS Abertas / Fila'}
          value={openOrders.length}
          subtitle="Aguardando diagnóstico/peça"
          icon={Clock}
          color="amber"
          onClick={() => onNavigate('ordens')}
        />
        <StatCard
          title="OS em Andamento"
          value={inProgressOrders.length}
          subtitle="Na bancada da oficina"
          icon={Wrench}
          color="purple"
          onClick={() => onNavigate('ordens')}
        />
        <StatCard
          title="OS Concluídas"
          value={completedOrders.length}
          subtitle="Finalizadas e entregues"
          icon={CheckCircle2}
          color="emerald"
          onClick={() => onNavigate('ordens')}
        />
        <StatCard
          title={isVendedor ? 'Meus Clientes' : 'Clientes Ativos'}
          value={totalClients}
          subtitle="Base comercial"
          icon={Users}
          color="slate"
          onClick={() => onNavigate('clientes')}
        />
      </div>

      {/* Two Column Layout: Upcoming Revisions Schedule & Recent Service Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Warranty Revisions Timeline (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {isVendedor ? 'Revisões dos Seus Clientes' : 'Cronograma de Revisões de Garantia'}
                </h3>
                <p className="text-xs text-slate-500">
                  Próximos vencimentos calculados por KM e Prazo (6 meses)
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('revisoes')}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
            >
              Ver Todas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-bold uppercase tracking-wider text-[10px] pb-2">
                  <th className="py-2.5 pr-2">Moto & Placa</th>
                  <th className="py-2.5 px-2">Cliente</th>
                  <th className="py-2.5 px-2">KM Atual / Alvo</th>
                  <th className="py-2.5 px-2">Data Limite</th>
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 pl-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedMotoRevisionStatusList.slice(0, 5).map(({ motorcycle: m, client, nextRev }) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 pr-2 font-medium">
                      <div
                        onClick={() => handleSelectMoto(m.id)}
                        className="font-bold text-slate-800 hover:text-red-600 cursor-pointer"
                      >
                        {m.brand} {m.model}
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 font-semibold">
                        {m.plate}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-600 truncate max-w-[120px]">
                      {client?.name.split(' ')[0]} {client?.name.split(' ')[1]}
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-semibold text-slate-800">
                        {formatKm(m.currentKm)}
                      </div>
                      <div className="text-[10px] text-red-600 font-medium">
                        Meta: {formatKm(nextRev.targetKm)}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-slate-600 font-medium whitespace-nowrap">
                      {formatDate(nextRev.maxDate)}
                    </td>
                    <td className="py-3 px-2">
                      <RevisionStatusBadge status={nextRev.status} />
                    </td>
                    <td className="py-3 pl-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* WhatsApp button if revision is overdue/upcoming */}
                        {client?.phone && (
                          <button
                            onClick={() =>
                              sendWhatsAppReminder(client.phone, client.name, m.model, nextRev.targetKm)
                            }
                            title="Avisar cliente via WhatsApp"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRegisterRevision(m.id)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                        >
                          Dar Baixa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Service Orders (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {isVendedor ? 'Suas Ordens de Serviço' : 'Ordens de Serviço Recentes'}
                </h3>
                <p className="text-xs text-slate-500">Últimas movimentações na oficina</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('ordens')}
              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
            >
              Ver Todas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {displayOrders.slice(0, 4).map((os) => {
              const moto = motorcycles.find((m) => m.id === os.motorcycleId);
              return (
                <div
                  key={os.id}
                  onClick={() => handleSelectOrder(os.id)}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-red-300 hover:bg-red-50/20 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                        {os.orderNumber}
                      </span>
                      <ServiceOrderStatusBadge status={os.status} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {moto ? `${moto.brand} ${moto.model}` : 'Motocicleta'} ({moto?.plate})
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {os.entryReason}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-slate-900">
                      {formatCurrency(os.finalTotal)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatDate(os.openedAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
