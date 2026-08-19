import React, { useState } from 'react';
import {
  Bike,
  Calendar,
  CalendarClock,
  FileText,
  Mail,
  MapPin,
  Package,
  Phone,
  User,
  Wrench,
  X,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Client } from '../../types';
import { formatCurrency, formatDate, formatKm } from '../../utils/formatters';
import { RevisionStatusBadge, ServiceOrderStatusBadge } from '../common/Badge';

interface ClientDetailModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectMoto?: (motoId: string) => void;
  onSelectOrder?: (orderId: string) => void;
  onCreateOrder?: (clientId: string) => void;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  isOpen,
  onClose,
  onSelectMoto,
  onSelectOrder,
  onCreateOrder,
}) => {
  const handleSelectMoto = (motoId: string) => {
    if (onSelectMoto) onSelectMoto(motoId);
  };

  const handleSelectOrder = (orderId: string) => {
    if (onSelectOrder) onSelectOrder(orderId);
  };
  const { motorcycles, serviceOrders, warrantyRevisions } = useStore();
  const [activeTab, setActiveTab] = useState<'motos' | 'os' | 'revisoes' | 'pecas'>('motos');

  if (!isOpen || !client) return null;

  // Filter client's bikes
  const clientMotos = motorcycles.filter((m) => m.clientId === client.id);

  // Filter client's OSs
  const clientOrders = serviceOrders.filter((os) => os.clientId === client.id);

  // Filter client's revisions across their bikes
  const clientRevisions = warrantyRevisions.filter((r) =>
    clientMotos.some((m) => m.id === r.motorcycleId)
  );

  // Extract all parts and services used by this client across completed OSs
  const partsUsed: { name: string; sku: string; quantity: number; orderNumber: string; date: string }[] = [];
  const servicesUsed: { name: string; price: number; orderNumber: string; date: string }[] = [];

  clientOrders.forEach((os) => {
    os.parts.forEach((p) => {
      partsUsed.push({
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        orderNumber: os.orderNumber,
        date: os.openedAt,
      });
    });
    os.services.forEach((s) => {
      servicesUsed.push({
        name: s.name,
        price: s.price,
        orderNumber: os.orderNumber,
        date: os.openedAt,
      });
    });
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-600/30">
              {client.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">
                {client.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                CPF/CNPJ: {client.cpfCnpj} • Cliente desde {formatDate(client.createdAt)}
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

        {/* Client Fast Info Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-100/60 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{client.phone} {client.whatsapp && `(Zap: ${client.whatsapp})`}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{client.email || 'Sem e-mail'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{client.city}/{client.state} - {client.neighborhood}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white">
          <button
            onClick={() => setActiveTab('motos')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'motos'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bike className="w-4 h-4" />
            Motos do Cliente ({clientMotos.length})
          </button>

          <button
            onClick={() => setActiveTab('os')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'os'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Ordens de Serviço ({clientOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('revisoes')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'revisoes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            Revisões de Garantia ({clientRevisions.length})
          </button>

          <button
            onClick={() => setActiveTab('pecas')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'pecas'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            Peças & Serviços Utilizados
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: MOTOS */}
          {activeTab === 'motos' && (
            <div className="space-y-3">
              {clientMotos.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Nenhuma motocicleta vinculada a este cliente.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientMotos.map((moto) => (
                    <div
                      key={moto.id}
                      onClick={() => {
                        handleSelectMoto(moto.id);
                        onClose();
                      }}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer bg-white group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {moto.brand}
                          </span>
                          <h4 className="text-base font-bold text-slate-800 group-hover:text-indigo-600">
                            {moto.model} ({moto.year})
                          </h4>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            Placa: <strong className="text-slate-800">{moto.plate}</strong> • Cor: {moto.color}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs font-mono font-bold bg-slate-100 rounded-lg text-slate-700">
                          {formatKm(moto.currentKm)}
                        </span>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Venda: {formatDate(moto.saleDate)}</span>
                        <span className="text-indigo-600 font-semibold flex items-center gap-1 group-hover:underline">
                          Abrir ficha <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ORDENS DE SERVIÇO */}
          {activeTab === 'os' && (
            <div className="space-y-3">
              {clientOrders.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Nenhuma ordem de serviço aberta para este cliente.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {clientOrders.map((os) => (
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

          {/* TAB 3: REVISÕES */}
          {activeTab === 'revisoes' && (
            <div className="space-y-3">
              {clientRevisions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Nenhuma revisão concluída registrada para este cliente.
                </div>
              ) : (
                <div className="space-y-2">
                  {clientRevisions.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">
                            {rev.revisionNumber}ª Revisão de Garantia ({formatKm(rev.targetKm)})
                          </span>
                          <RevisionStatusBadge status={rev.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Realizada em {formatDate(rev.completedDate)} com {formatKm(rev.completedKm)} • Responsável: {rev.mechanicName || 'Oficina'}
                        </p>
                        {rev.notes && (
                          <p className="text-xs text-slate-600 italic mt-1">
                            &quot;{rev.notes}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PEÇAS & SERVIÇOS */}
          {activeTab === 'pecas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Peças */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-purple-600" /> Peças Substituídas ({partsUsed.length})
                </h4>
                {partsUsed.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">Nenhuma peça trocada.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {partsUsed.map((p, idx) => (
                      <div key={idx} className="p-3 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-800">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            SKU: {p.sku} • {p.orderNumber}
                          </p>
                        </div>
                        <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                          {p.quantity}x
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Serviços */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-indigo-600" /> Serviços Realizados ({servicesUsed.length})
                </h4>
                {servicesUsed.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">Nenhum serviço realizado.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {servicesUsed.map((s, idx) => (
                      <div key={idx} className="p-3 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-800">{s.name}</p>
                          <p className="text-[10px] text-slate-400">
                            OS: {s.orderNumber} • {formatDate(s.date)}
                          </p>
                        </div>
                        <span className="font-bold text-slate-800">
                          {formatCurrency(s.price)}
                        </span>
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
          <div className="text-xs text-slate-500">
            Endereço completo: {client.address}, {client.number} {client.complement ? `(${client.complement})` : ''} - {client.neighborhood}, {client.city}/{client.state} • CEP: {client.cep}
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
