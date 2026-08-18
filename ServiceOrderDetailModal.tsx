import React, { useState } from 'react';
import {
  Bike,
  CheckCircle2,
  Clock,
  ExternalLink,
  Fuel,
  Gauge,
  Package,
  Printer,
  Shield,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ServiceOrder, ServiceOrderStatus } from '../../types';
import { formatCurrency, formatDate, formatKm, formatPaymentMethod } from '../../utils/formatters';
import { ServiceOrderStatusBadge, ServiceTypeBadge } from '../common/Badge';
import { PrintServiceOrderModal } from './PrintServiceOrderModal';

interface ServiceOrderDetailModalProps {
  order: ServiceOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (order: ServiceOrder) => void;
  onSelectClient?: (clientId: string) => void;
  onSelectMoto?: (motoId: string) => void;
}

export const ServiceOrderDetailModal: React.FC<ServiceOrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onEdit,
  onSelectClient,
  onSelectMoto,
}) => {
  const handleSelectClient = (clientId: string) => {
    if (onSelectClient) onSelectClient(clientId);
  };

  const handleSelectMoto = (motoId: string) => {
    if (onSelectMoto) onSelectMoto(motoId);
  };
  const {
    getClientById,
    getMotorcycleById,
    changeServiceOrderStatus,
    settings,
  } = useStore();

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  if (!isOpen || !order) return null;

  const client = getClientById(order.clientId);
  const moto = getMotorcycleById(order.motorcycleId);

  const handleOpenPrint = () => {
    setIsPrintModalOpen(true);
  };

  const handleStatusChange = async (newStatus: ServiceOrderStatus) => {
    const res = await changeServiceOrderStatus(order.id, newStatus);
    if (!res.success) {
      alert(res.message);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header - Screen View */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-base font-extrabold text-red-700 bg-red-50 px-3 py-1 rounded-xl border border-red-200">
                {order.orderNumber}
              </span>
              <ServiceOrderStatusBadge status={order.status} />
              <ServiceTypeBadge type={order.serviceType} />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenPrint}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Baixar PDF</span>
              </button>
              <button
                onClick={() => onEdit(order)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Editar OS
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

        {/* Status Workflow Action Ribbon */}
        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
          <span className="font-bold text-slate-600">Avançar Fluxo da OS:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {order.status === 'ABERTA' && (
              <button
                onClick={() => handleStatusChange('EM_ANDAMENTO')}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold cursor-pointer"
              >
                Iniciar Serviço
              </button>
            )}

            {order.status === 'EM_ANDAMENTO' && (
              <button
                onClick={() => handleStatusChange('FINALIZADA')}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold cursor-pointer"
              >
                Finalizar OS (Baixar Peças)
              </button>
            )}

            {order.status === 'FINALIZADA' && (
              <button
                onClick={() => handleStatusChange('ENTREGUE')}
                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold cursor-pointer"
              >
                Marcar como Entregue ao Cliente
              </button>
            )}

            {order.status !== 'CANCELADA' &&
              order.status !== 'ENTREGUE' && (
                <button
                  onClick={() => handleStatusChange('CANCELADA')}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-rose-100 text-rose-700 rounded-lg font-bold cursor-pointer"
                >
                  Cancelar OS
                </button>
              )}
          </div>
        </div>

        {/* Printable / Viewable Document Area */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 text-slate-800 print:p-0">
          {/* Printable Store Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {settings.storeName}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                CNPJ: {settings.cnpj} • Tel: {settings.phone} • WhatsApp: {settings.whatsapp}
              </p>
              <p className="text-xs text-slate-600">
                {settings.address}, {settings.number} - {settings.city}/{settings.state}
              </p>
            </div>
            <div className="text-right space-y-0.5">
              <span className="font-mono text-xl font-extrabold text-indigo-700 block">
                {order.orderNumber}
              </span>
              <span className="text-xs text-slate-500 block">
                Entrada: {formatDate(order.openedAt)}
              </span>
              {order.finishedAt && (
                <span className="text-xs text-emerald-600 font-bold block">
                  Finalizada: {formatDate(order.finishedAt)}
                </span>
              )}
              {order.deliveredAt && (
                <span className="text-xs text-teal-600 font-bold block">
                  Saída / Entregue: {formatDate(order.deliveredAt)}
                </span>
              )}
              {order.estimatedCompletionAt && !order.finishedAt && (
                <span className="text-xs text-amber-600 font-semibold block">
                  Previsão: {formatDate(order.estimatedCompletionAt)}
                </span>
              )}
            </div>
          </div>

          {/* Client & Motorcycle Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1">
                Dados do Cliente
              </span>
              <p className="font-bold text-slate-900 text-sm">{client?.name}</p>
              <p className="text-slate-600">CPF/CNPJ: {client?.cpfCnpj}</p>
              <p className="text-slate-600">Telefone: {client?.phone} {client?.whatsapp && `(WhatsApp: ${client?.whatsapp})`}</p>
              <p className="text-slate-600">{client?.address}, {client?.number} - {client?.city}/{client?.state}</p>
            </div>

            {/* Motorcycle Info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1">
                Dados do Veículo
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {moto?.brand} {moto?.model} ({moto?.year})
              </p>
              <p className="text-slate-600">
                Placa: <strong className="font-mono text-slate-900">{moto?.plate}</strong> • Cor: {moto?.color}
              </p>
              <p className="text-slate-600">
                Chassi: <span className="font-mono">{moto?.chassis}</span>
              </p>
              <p className="text-slate-600">
                KM na Entrada: <strong className="text-indigo-700 font-mono">{formatKm(order.currentKm)}</strong>
              </p>
              <div className="pt-2 mt-2 border-t border-slate-200 grid grid-cols-2 gap-1.5 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Data de Entrada:</span>
                  <span className="font-semibold text-slate-800">{formatDate(order.openedAt)}</span>
                </div>
                {order.finishedAt && (
                  <div>
                    <span className="text-emerald-700 block text-[10px] uppercase font-bold">Finalizada em:</span>
                    <span className="font-bold text-emerald-800">{formatDate(order.finishedAt)}</span>
                  </div>
                )}
                {order.deliveredAt && (
                  <div>
                    <span className="text-teal-700 block text-[10px] uppercase font-bold">Saída / Entrega:</span>
                    <span className="font-bold text-teal-800">{formatDate(order.deliveredAt)}</span>
                  </div>
                )}
                {order.estimatedCompletionAt && !order.finishedAt && (
                  <div>
                    <span className="text-amber-700 block text-[10px] uppercase font-bold">Previsão Entrega:</span>
                    <span className="font-semibold text-amber-800">{formatDate(order.estimatedCompletionAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Entry Reason & Diagnosis */}
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-700 block mb-0.5">Motivo da Entrada / Solicitação:</strong>
              <p className="text-slate-800">{order.entryReason}</p>
            </div>

            {order.reportedProblem && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="text-slate-700 block mb-0.5">Relato do Cliente:</strong>
                <p className="text-slate-800">{order.reportedProblem}</p>
              </div>
            )}

            {order.diagnosis && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="text-slate-700 block mb-0.5">Diagnóstico Técnico da Oficina:</strong>
                <p className="text-slate-800">{order.diagnosis}</p>
              </div>
            )}
          </div>

          {/* Services Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Serviços e Mão de Obra
            </h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4">Descrição do Serviço</th>
                    <th className="py-2.5 px-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.services.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-3 px-4 text-slate-400 italic">
                        Nenhum serviço lançado.
                      </td>
                    </tr>
                  ) : (
                    order.services.map((srv, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-4 font-medium text-slate-800">{srv.name}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          {formatCurrency(srv.price)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Parts Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Peças e Materiais
            </h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4">Código / Descrição da Peça</th>
                    <th className="py-2.5 px-4 text-center">Qtd</th>
                    <th className="py-2.5 px-4 text-right">Unitário</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.parts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 px-4 text-slate-400 italic">
                        Nenhuma peça utilizada.
                      </td>
                    </tr>
                  ) : (
                    order.parts.map((p, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-slate-800 block">{p.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">SKU: {p.sku}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-700">{p.quantity}</td>
                        <td className="py-2.5 px-4 text-right font-medium text-slate-600">{formatCurrency(p.unitPrice)}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(p.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="flex justify-end">
            <div className="w-full sm:w-80 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Serviços:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(order.servicesTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Peças:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(order.partsTotal)}</span>
              </div>
              {order.generalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Desconto:</span>
                  <span className="font-semibold">- {formatCurrency(order.generalDiscount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-sm">Total Final:</span>
                <span className="text-lg font-extrabold text-indigo-700">
                  {formatCurrency(order.finalTotal)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Forma de Pagamento:</span>
                <span className="font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {formatPaymentMethod(order.paymentMethod)}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t border-slate-300 pt-2">
              <p className="font-bold text-slate-800">{settings.storeName}</p>
              <p className="text-[11px] text-slate-500">Mecânico: {order.mechanicName}</p>
            </div>
            <div className="border-t border-slate-300 pt-2">
              <p className="font-bold text-slate-800">{client?.name}</p>
              <p className="text-[11px] text-slate-500">Assinatura do Cliente / Retirada</p>
            </div>
          </div>
        </div>

        {/* Footer Screen Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center print:hidden">
          <div className="text-xs text-slate-500">
            Mecânico Responsável: <strong>{order.mechanicName}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>

    {/* Dedicated PDF Style Print Modal */}
    {isPrintModalOpen && (
      <PrintServiceOrderModal
        order={order}
        onClose={() => setIsPrintModalOpen(false)}
      />
    )}
  </>
  );
};
