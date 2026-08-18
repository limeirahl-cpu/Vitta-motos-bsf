import React, { useMemo, useState } from 'react';
import {
  Bike,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  FileText,
  Filter,
  Plus,
  Printer,
  Search,
  Trash2,
  User,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { ServiceOrder, ServiceOrderStatus } from '../../types';
import { formatCurrency, formatDate, formatKm, formatPaymentMethod } from '../../utils/formatters';
import { ServiceOrderStatusBadge, ServiceTypeBadge } from '../common/Badge';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { PrintServiceOrderModal } from './PrintServiceOrderModal';
import { ServiceOrderDetailModal } from './ServiceOrderDetailModal';
import { ServiceOrderFormModal } from './ServiceOrderFormModal';

interface ServiceOrdersListProps {
  onSelectClient?: (clientId: string) => void;
  onSelectMoto?: (motoId: string) => void;
  selectedOrderId?: string | null;
  onClearSelectedOrder?: () => void;
}

export const ServiceOrdersList: React.FC<ServiceOrdersListProps> = ({
  onSelectClient,
  onSelectMoto,
  selectedOrderId,
  onClearSelectedOrder,
}) => {
  const handleSelectClient = (clientId: string) => {
    if (onSelectClient) onSelectClient(clientId);
  };

  const handleSelectMoto = (motoId: string) => {
    if (onSelectMoto) onSelectMoto(motoId);
  };
  const {
    serviceOrders,
    deleteServiceOrder,
    getClientById,
    getMotorcycleById,
  } = useStore();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<ServiceOrder | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<ServiceOrder | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<ServiceOrder | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<ServiceOrder | null>(null);

  // If a selectedOrderId is passed from parent (e.g. dashboard), open detail modal
  React.useEffect(() => {
    if (selectedOrderId) {
      const found = serviceOrders.find((o) => o.id === selectedOrderId);
      if (found) {
        setSelectedOrderForDetail(found);
      }
      if (onClearSelectedOrder) onClearSelectedOrder();
    }
  }, [selectedOrderId, serviceOrders, onClearSelectedOrder]);

  const filteredOrders = useMemo(() => {
    return serviceOrders.filter((os) => {
      const term = searchTerm.toLowerCase().trim();
      const client = getClientById(os.clientId);
      const moto = getMotorcycleById(os.motorcycleId);

      const matchesSearch =
        !term ||
        os.orderNumber.toLowerCase().includes(term) ||
        os.entryReason.toLowerCase().includes(term) ||
        os.mechanicName.toLowerCase().includes(term) ||
        (client && client.name.toLowerCase().includes(term)) ||
        (moto &&
          (moto.plate.toLowerCase().includes(term) ||
            moto.model.toLowerCase().includes(term) ||
            moto.brand.toLowerCase().includes(term)));

      const matchesStatus = statusFilter === 'ALL' || os.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || os.serviceType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [serviceOrders, searchTerm, statusFilter, typeFilter, getClientById, getMotorcycleById]);

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    const res = await deleteServiceOrder(orderToDelete.id);
    if (!res.success) {
      alert(res.message);
    }
    setOrderToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-indigo-600" />
            Ordens de Serviço (Oficina)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Diagnóstico, serviços, aplicação de peças e faturamento da oficina mecânica
          </p>
        </div>

        <button
          onClick={() => {
            setOrderToEdit(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Ordem de Serviço
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nº OS, cliente, placa..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ABERTA">Aberta</option>
            <option value="AGUARDANDO_DIAGNOSTICO">Aguardando Diagnóstico</option>
            <option value="AGUARDANDO_APROVACAO">Aguardando Aprovação</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="AGUARDANDO_PECA">Aguardando Peça</option>
            <option value="FINALIZADA">Finalizada</option>
            <option value="ENTREGUE">Entregue</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="MANUTENCAO_PREVENTIVA">Manutenção Preventiva</option>
            <option value="REVISAO_GARANTIA">Revisão de Garantia</option>
            <option value="MANUTENCAO_CORRETIVA">Manutenção Corretiva</option>
            <option value="OUTRO">Outro / Acessórios</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Nº OS & Tipo</th>
                <th className="py-3.5 px-3">Cliente & Contato</th>
                <th className="py-3.5 px-3">Veículo & Placa</th>
                <th className="py-3.5 px-3">Motivo / Entrada</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3 text-right">Total Final</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhuma ordem de serviço encontrada.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((os) => {
                  const client = getClientById(os.clientId);
                  const moto = getMotorcycleById(os.motorcycleId);

                  return (
                    <tr key={os.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* OS Number & Type */}
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => setSelectedOrderForDetail(os)}
                          className="font-mono font-bold text-indigo-700 text-sm hover:underline cursor-pointer"
                        >
                          {os.orderNumber}
                        </div>
                        <div className="mt-1">
                          <ServiceTypeBadge type={os.serviceType} />
                        </div>
                        <div className="space-y-0.5 mt-1 text-[10px]">
                          <span className="text-slate-400 block">
                            Entrada: {formatDate(os.openedAt)}
                          </span>
                          {os.finishedAt && (
                            <span className="text-emerald-600 font-semibold block">
                              Finalizada: {formatDate(os.finishedAt)}
                            </span>
                          )}
                          {os.deliveredAt && (
                            <span className="text-teal-600 font-semibold block">
                              Saída: {formatDate(os.deliveredAt)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-3">
                        <div
                          onClick={() => client && handleSelectClient(client.id)}
                          className="font-bold text-slate-800 hover:text-indigo-600 cursor-pointer text-xs truncate max-w-[150px]"
                        >
                          {client?.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {client?.phone}
                        </div>
                      </td>

                      {/* Motorcycle */}
                      <td className="py-3.5 px-3">
                        <div
                          onClick={() => moto && handleSelectMoto(moto.id)}
                          className="font-semibold text-slate-800 hover:text-indigo-600 cursor-pointer"
                        >
                          {moto ? `${moto.brand} ${moto.model}` : 'Moto'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[11px] text-slate-500">
                          <span className="font-bold text-slate-700">{moto?.plate}</span>
                          <span>•</span>
                          <span>{formatKm(os.currentKm)}</span>
                        </div>
                      </td>

                      {/* Entry Reason */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <p className="text-xs text-slate-700 font-medium truncate">
                          {os.entryReason}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Mecânico: {os.mechanicName}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <ServiceOrderStatusBadge status={os.status} />
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-bold text-slate-900 text-sm">
                          {formatCurrency(os.finalTotal)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {os.services.length} serv • {os.parts.length} peças
                        </span>
                        {os.paymentMethod && (
                          <span className="text-[10px] text-indigo-600 font-semibold block">
                            {formatPaymentMethod(os.paymentMethod)}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setOrderToPrint(os)}
                            title="Imprimir OS (Padrão PDF)"
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedOrderForDetail(os)}
                            title="Ver Detalhes da OS"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setOrderToEdit(os);
                              setIsFormOpen(true);
                            }}
                            title="Editar Ordem de Serviço"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setOrderToDelete(os)}
                              title="Excluir OS"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Form Modal */}
      {isFormOpen && (
        <ServiceOrderFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setOrderToEdit(null);
          }}
          initialData={orderToEdit}
        />
      )}

      {/* Detail Modal */}
      {selectedOrderForDetail && (
        <ServiceOrderDetailModal
          isOpen={!!selectedOrderForDetail}
          order={selectedOrderForDetail}
          onClose={() => setSelectedOrderForDetail(null)}
          onEdit={(ord) => {
            setSelectedOrderForDetail(null);
            setOrderToEdit(ord);
            setIsFormOpen(true);
          }}
          onSelectClient={handleSelectClient}
          onSelectMoto={handleSelectMoto}
        />
      )}

      {/* Dedicated Print Modal */}
      {orderToPrint && (
        <PrintServiceOrderModal
          order={orderToPrint}
          onClose={() => setOrderToPrint(null)}
        />
      )}

      {/* Delete Confirmation */}
      {orderToDelete && (
        <ConfirmationModal
          isOpen={!!orderToDelete}
          onClose={() => setOrderToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Excluir Ordem de Serviço"
          message={`Tem certeza que deseja excluir a ${orderToDelete.orderNumber}? Esta ação registrará log de auditoria.`}
          confirmText="Sim, Excluir"
        />
      )}
    </div>
  );
};
