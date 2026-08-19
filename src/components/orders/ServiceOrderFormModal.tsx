import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Plus,
  Printer,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import {
  OSPartItem,
  OSServiceItem,
  ServiceOrder,
  ServiceOrderStatus,
} from '../../types';
import { formatCurrency, PAYMENT_METHOD_OPTIONS } from '../../utils/formatters';
import { REVISION_CHECKLIST_TEMPLATE } from '../../utils/revisionChecklist';
interface ServiceOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ServiceOrder | null;
  defaultMotorcycleId?: string;
  defaultClientId?: string;
}

export const ServiceOrderFormModal: React.FC<ServiceOrderFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
  defaultMotorcycleId,
  defaultClientId,
}) => {
  const {
    clients,
    motorcycles,
    parts,
    services: servicesCatalog,
    createServiceOrder,
    updateServiceOrder,
    getClientById,
    getMotorcycleById,
    userStoreAccessList,
    activeStoreId,
  } = useStore();
  const { currentUser, users } = useAuth();

  // Mechanics registered with access to the currently active store.
  const mechanics = users.filter(
    (u) =>
      u.role === 'mecanico' &&
      u.active &&
      (u.status === 'approved' || !u.status) &&
      userStoreAccessList.some((a) => a.userId === u.id && a.storeId === activeStoreId)
  );

  // State
  const [motorcycleId, setMotorcycleId] = useState<string>(
    initialData?.motorcycleId || defaultMotorcycleId || motorcycles[0]?.id || ''
  );
  const [clientId, setClientId] = useState<string>(
    initialData?.clientId ||
      defaultClientId ||
      (defaultMotorcycleId
        ? getMotorcycleById(defaultMotorcycleId)?.clientId || ''
        : clients[0]?.id || '')
  );

  const selectedMoto = motorcycles.find((m) => m.id === motorcycleId);

  const [currentKm, setCurrentKm] = useState<number>(
    initialData?.currentKm || selectedMoto?.currentKm || 0
  );
  const [serviceType, setServiceType] = useState<
    'REVISAO_GARANTIA' | 'MANUTENCAO_PREVENTIVA' | 'MANUTENCAO_CORRETIVA' | 'OUTRO'
  >(initialData?.serviceType || 'MANUTENCAO_PREVENTIVA');
  const [status, setStatus] = useState<ServiceOrderStatus>(
    initialData?.status || 'ABERTA'
  );

  // Date states (formatted as YYYY-MM-DD for date inputs)
  const [openedAt, setOpenedAt] = useState<string>(
    initialData?.openedAt ? initialData.openedAt.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [finishedAt, setFinishedAt] = useState<string>(
    initialData?.finishedAt ? initialData.finishedAt.split('T')[0] : ''
  );
  const [deliveredAt, setDeliveredAt] = useState<string>(
    initialData?.deliveredAt ? initialData.deliveredAt.split('T')[0] : ''
  );
  const [estimatedCompletionAt, setEstimatedCompletionAt] = useState<string>(
    initialData?.estimatedCompletionAt ? initialData.estimatedCompletionAt.split('T')[0] : ''
  );

  // Status change handler with auto-date setting
  const handleStatusSelectChange = (newStatus: ServiceOrderStatus) => {
    setStatus(newStatus);
    const today = new Date().toISOString().split('T')[0];

    if (newStatus === 'FINALIZADA') {
      if (!finishedAt) {
        setFinishedAt(today);
      }
    } else if (newStatus === 'ENTREGUE') {
      if (!finishedAt) {
        setFinishedAt(today);
      }
      if (!deliveredAt) {
        setDeliveredAt(today);
      }
    }
  };

  const [entryReason, setEntryReason] = useState(
    initialData?.entryReason || ''
  );
  const [reportedProblem, setReportedProblem] = useState(
    initialData?.reportedProblem || ''
  );
  const [diagnosis, setDiagnosis] = useState(
    initialData?.diagnosis || ''
  );
  const [mechanicName, setMechanicName] = useState(
    initialData?.mechanicName || currentUser?.name || 'Mecânico Chefe'
  );

  // Warranty revision checklist - shown once the entry KM is informed for a
  // REVISAO_GARANTIA order, so the mechanic can print it and take it to the
  // bay. Purely a print aid: it doesn't change what gets billed/saved on
  // the OS itself, so the note text below covers the audit trail.
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    REVISION_CHECKLIST_TEMPLATE.forEach((cat) => cat.items.forEach((item) => { initial[item.id] = true; }));
    return initial;
  });
  const toggleChecklistItem = (id: string) => {
    setChecklistState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrintChecklist = () => {
    const moto = selectedMoto;
    const client = clients.find((c) => c.id === clientId);
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const rowsHtml = REVISION_CHECKLIST_TEMPLATE.map(
      (cat) => `
        <h3 style="margin:16px 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#334155;border-bottom:1px solid #e2e8f0;padding-bottom:4px;">${cat.category}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          ${cat.items
            .map(
              (item) => `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="width:24px;padding:6px 4px;">
                <span style="display:inline-block;width:14px;height:14px;border:1.5px solid #94a3b8;border-radius:3px;${
                  checklistState[item.id] ? 'background:#334155;' : ''
                }"></span>
              </td>
              <td style="padding:6px 4px;color:#1e293b;">${item.label}</td>
              <td style="padding:6px 4px;width:90px;color:#64748b;font-weight:600;">${item.action}</td>
            </tr>`
            )
            .join('')}
        </table>`
    ).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Checklist de Revisão - ${moto?.plate || ''}</title>
          <meta charset="utf-8" />
        </head>
        <body style="font-family:Arial,Helvetica,sans-serif;padding:24px;color:#0f172a;">
          <h1 style="font-size:18px;margin:0 0 2px;">Checklist de Revisão de Garantia</h1>
          <p style="font-size:12px;color:#64748b;margin:0 0 16px;">Vitta Motos - Shineray/SBM</p>
          <table style="width:100%;font-size:12px;margin-bottom:12px;border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0;"><strong>Cliente:</strong> ${client?.name || '-'}</td>
              <td style="padding:4px 0;"><strong>Placa:</strong> ${moto?.plate || '-'}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;"><strong>Modelo:</strong> ${moto?.brand || ''} ${moto?.model || ''}</td>
              <td style="padding:4px 0;"><strong>KM de Entrada:</strong> ${currentKm}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;"><strong>Mecânico:</strong> ${mechanicName || '-'}</td>
              <td style="padding:4px 0;"><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</td>
            </tr>
          </table>
          ${rowsHtml}
          <p style="font-size:11px;color:#94a3b8;margin-top:20px;">
            Assinatura do Mecânico: _______________________________________
          </p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const [generalDiscount, setGeneralDiscount] = useState<number>(
    initialData?.generalDiscount || 0
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    initialData?.paymentMethod || 'PIX'
  );
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Dynamic services and parts lists
  const [services, setServices] = useState<OSServiceItem[]>(
    initialData?.services || []
  );
  const [orderParts, setOrderParts] = useState<OSPartItem[]>(
    initialData?.parts || []
  );

  // Pickers
  const [serviceCatalogId, setServiceCatalogId] = useState('');
  const [partPickerId, setPartPickerId] = useState('');
  const [partPickerQty, setPartPickerQty] = useState<number>(1);

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // When motorcycle changes, automatically update the client and km
  const handleMotoChange = (mId: string) => {
    setMotorcycleId(mId);
    const moto = motorcycles.find((m) => m.id === mId);
    if (moto) {
      setClientId(moto.clientId);
      setCurrentKm(moto.currentKm);
    }
  };

  // Calculate totals
  const totalServices = services.reduce((acc, s) => acc + s.price, 0);
  const totalParts = orderParts.reduce((acc, p) => acc + p.total, 0);
  const finalTotal = Math.max(0, totalServices + totalParts - generalDiscount);

  // Add service to OS
  const handleAddService = () => {
    if (!serviceCatalogId) return;
    const s = servicesCatalog.find((item) => item.id === serviceCatalogId);
    if (s) {
      setServices([
        ...services,
        {
          id: 'srv-' + Date.now(),
          serviceId: s.id,
          name: s.name,
          price: s.defaultPrice,
        },
      ]);
      setServiceCatalogId('');
    }
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  // Add part to OS
  const handleAddPart = () => {
    if (!partPickerId) return;
    const p = parts.find((item) => item.id === partPickerId);
    if (!p) return;

    if (partPickerQty > p.currentStock) {
      setError(`Estoque insuficiente de ${p.name}. Saldo: ${p.currentStock}`);
      return;
    }
    setError(null);

    const existingIndex = orderParts.findIndex((item) => item.partId === p.id);
    if (existingIndex >= 0) {
      const updated = [...orderParts];
      updated[existingIndex].quantity += partPickerQty;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setOrderParts(updated);
    } else {
      setOrderParts([
        ...orderParts,
        {
          id: 'part-item-' + Date.now(),
          partId: p.id,
          sku: p.sku,
          name: p.name,
          quantity: partPickerQty,
          unitPrice: p.salePrice,
          total: p.salePrice * partPickerQty,
        },
      ]);
    }
    setPartPickerId('');
    setPartPickerQty(1);
  };

  const handleRemovePart = (index: number) => {
    setOrderParts(orderParts.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motorcycleId || !clientId) {
      setError('Selecione a motocicleta e o cliente.');
      return;
    }
    if (!entryReason.trim()) {
      setError('Informe o motivo de entrada da moto na oficina.');
      return;
    }

    setIsSaving(true);

    if (initialData) {
      const res = await updateServiceOrder(initialData.id, {
        clientId,
        motorcycleId,
        currentKm: Number(currentKm),
        serviceType,
        status,
        entryReason: entryReason.trim(),
        reportedProblem: reportedProblem.trim(),
        diagnosis: diagnosis.trim(),
        mechanicName: mechanicName.trim(),
        services,
        parts: orderParts,
        servicesTotal: totalServices,
        partsTotal: totalParts,
        generalDiscount: Number(generalDiscount),
        paymentMethod,
        finalTotal,
        notes: notes.trim(),
        openedAt: openedAt ? new Date(openedAt + 'T12:00:00').toISOString() : undefined,
        finishedAt: finishedAt ? new Date(finishedAt + 'T12:00:00').toISOString() : undefined,
        deliveredAt: deliveredAt ? new Date(deliveredAt + 'T12:00:00').toISOString() : undefined,
        estimatedCompletionAt: estimatedCompletionAt ? new Date(estimatedCompletionAt + 'T12:00:00').toISOString() : undefined,
      });

      setIsSaving(false);
      if (!res.success) {
        setError(res.message || 'Erro ao atualizar OS');
        return;
      }
    } else {
      const res = await createServiceOrder({
        clientId,
        motorcycleId,
        currentKm: Number(currentKm),
        serviceType,
        status,
        entryReason: entryReason.trim(),
        reportedProblem: reportedProblem.trim(),
        diagnosis: diagnosis.trim(),
        mechanicName: mechanicName.trim(),
        services,
        parts: orderParts,
        servicesTotal: totalServices,
        partsTotal: totalParts,
        generalDiscount: Number(generalDiscount),
        paymentMethod,
        finalTotal,
        notes: notes.trim(),
        openedAt: openedAt ? new Date(openedAt + 'T12:00:00').toISOString() : undefined,
        finishedAt: finishedAt ? new Date(finishedAt + 'T12:00:00').toISOString() : undefined,
        deliveredAt: deliveredAt ? new Date(deliveredAt + 'T12:00:00').toISOString() : undefined,
        estimatedCompletionAt: estimatedCompletionAt ? new Date(estimatedCompletionAt + 'T12:00:00').toISOString() : undefined,
      });

      setIsSaving(false);
      if (!res.success) {
        setError(res.message || 'Erro ao criar OS');
        return;
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">
                {initialData ? `Editar ${initialData.orderNumber}` : 'Nova Ordem de Serviço'}
              </h3>
              <p className="text-xs text-slate-500">
                Abertura, diagnóstico técnico, peças e serviços da oficina
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Moto, Cliente & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Motocicleta & Cliente *
              </label>
              <select
                required
                value={motorcycleId}
                onChange={(e) => handleMotoChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              >
                <option value="">Selecione a moto...</option>
                {motorcycles.map((m) => {
                  const c = getClientById(m.clientId);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.brand} {m.model} ({m.plate}) - {c?.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status Atual da OS *
              </label>
              <select
                value={status}
                onChange={(e) => handleStatusSelectChange(e.target.value as ServiceOrderStatus)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-indigo-700 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              >
                <option value="ABERTA">Aberta</option>
                <option value="AGUARDANDO_DIAGNOSTICO">Aguardando Diagnóstico</option>
                <option value="AGUARDANDO_APROVACAO">Aguardando Aprovação</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="AGUARDANDO_PECA">Aguardando Peça</option>
                <option value="FINALIZADA">Finalizada (Baixa Estoque)</option>
                <option value="ENTREGUE">Entregue ao Cliente</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tipo de Atendimento *
              </label>
              <select
                value={serviceType}
                onChange={(e) =>
                  setServiceType(
                    e.target.value as
                      | 'REVISAO_GARANTIA'
                      | 'MANUTENCAO_PREVENTIVA'
                      | 'MANUTENCAO_CORRETIVA'
                      | 'OUTRO'
                  )
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden"
              >
                <option value="MANUTENCAO_PREVENTIVA">Manutenção Preventiva</option>
                <option value="REVISAO_GARANTIA">Revisão de Garantia</option>
                <option value="MANUTENCAO_CORRETIVA">Manutenção Corretiva</option>
                <option value="OUTRO">Outro / Acessórios</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                KM de Entrada *
              </label>
              <input
                type="number"
                min={0}
                required
                value={currentKm}
                onChange={(e) => setCurrentKm(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-indigo-700 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mecânico Responsável *
              </label>
              <select
                required
                value={mechanicName}
                onChange={(e) => setMechanicName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden"
              >
                <option value="">Selecione o mecânico...</option>
                {mechanics.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
                {/* Keeps the current value selectable even if it's a legacy
                    free-text name or a mechanic without store access. */}
                {mechanicName && !mechanics.some((m) => m.name === mechanicName) && (
                  <option value={mechanicName}>{mechanicName}</option>
                )}
              </select>
            </div>
          </div>

          {/* Checklist técnico de revisão de garantia - só aparece com o
              tipo certo e o KM de entrada já preenchido. */}
          {serviceType === 'REVISAO_GARANTIA' && currentKm > 0 && (
            <div className="border border-indigo-200 bg-indigo-50/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-bold text-indigo-950 text-xs uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-indigo-600" />
                  Checklist de Verificação da Revisão
                </h4>
                <button
                  type="button"
                  onClick={handlePrintChecklist}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir para o Mecânico
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {REVISION_CHECKLIST_TEMPLATE.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">{cat.category}</p>
                    {cat.items.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checklistState[item.id] ?? true}
                          onChange={() => toggleChecklistItem(item.id)}
                          className="w-3.5 h-3.5 text-indigo-600 rounded-sm border-slate-300 cursor-pointer"
                        />
                        <span>
                          {item.label}{' '}
                          <span className="text-slate-400 font-medium">({item.action})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Motivo & Relato */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Motivo da Entrada / Solicitação *
              </label>
              <input
                type="text"
                required
                value={entryReason}
                onChange={(e) => setEntryReason(e.target.value)}
                placeholder="Ex: Revisão periódica dos 4.000 km e troca de pastilhas"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Relato do Cliente
              </label>
              <textarea
                rows={2}
                value={reportedProblem}
                onChange={(e) => setReportedProblem(e.target.value)}
                placeholder="O cliente informou que sentiu falhas ao acelerar..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Diagnóstico Técnico da Oficina
              </label>
              <textarea
                rows={2}
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Necessária troca de velas e limpeza do corpo de injeção..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
              />
            </div>
          </div>

          {/* Datas e Prazos do Atendimento */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Datas e Prazos do Atendimento
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Data de Entrada / Abertura *
                </label>
                <input
                  type="date"
                  required
                  value={openedAt}
                  onChange={(e) => setOpenedAt(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Previsão de Conclusão
                </label>
                <input
                  type="date"
                  value={estimatedCompletionAt}
                  onChange={(e) => setEstimatedCompletionAt(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className={status === 'FINALIZADA' || status === 'ENTREGUE' || finishedAt ? 'bg-emerald-50/70 p-1.5 rounded-xl border border-emerald-200' : ''}>
                <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Data de Finalização (Estoque)
                </label>
                <input
                  type="date"
                  value={finishedAt}
                  onChange={(e) => setFinishedAt(e.target.value)}
                  placeholder="Data de finalização da OS"
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className={status === 'ENTREGUE' || deliveredAt ? 'bg-teal-50/70 p-1.5 rounded-xl border border-teal-200' : ''}>
                <label className="block text-[11px] font-bold text-teal-800 uppercase mb-1">
                  Data de Saída / Entrega
                </label>
                <input
                  type="date"
                  value={deliveredAt}
                  onChange={(e) => setDeliveredAt(e.target.value)}
                  placeholder="Data de entrega ao cliente"
                  className="w-full px-3 py-2 bg-white border border-teal-300 rounded-xl text-xs font-bold text-teal-900 focus:outline-hidden focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Mão de Obra e Serviços */}
          <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-indigo-600" />
                Mão de Obra e Serviços
              </h4>
              <span className="text-xs font-bold text-indigo-700">
                Subtotal: {formatCurrency(totalServices)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-3">
                <select
                  value={serviceCatalogId}
                  onChange={(e) => setServiceCatalogId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                >
                  <option value="">Selecione da tabela de serviços...</option>
                  {servicesCatalog.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {formatCurrency(s.defaultPrice)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddService}
                  className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Adicionar Serviço
                </button>
              </div>
            </div>

            {services.length > 0 && (
              <div className="divide-y divide-slate-100 border border-slate-200 bg-white rounded-xl overflow-hidden">
                {services.map((srv, idx) => (
                  <div key={idx} className="p-2.5 text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{srv.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">{formatCurrency(srv.price)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(idx)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Peças e Produtos */}
          <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-purple-600" />
                Peças e Materiais Utilizados
              </h4>
              <span className="text-xs font-bold text-purple-700">
                Subtotal: {formatCurrency(totalParts)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <select
                value={partPickerId}
                onChange={(e) => setPartPickerId(e.target.value)}
                className="w-full sm:flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
              >
                <option value="">Selecione peça do estoque...</option>
                {parts.filter((p) => p.active !== false).map((p) => (
                  <option key={p.id} value={p.id} disabled={p.currentStock <= 0}>
                    {p.name} ({p.sku}) • Saldo: {p.currentStock} {p.unit} • {formatCurrency(p.salePrice)}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                value={partPickerQty}
                onChange={(e) => setPartPickerQty(Number(e.target.value))}
                className="w-20 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-center font-bold"
              />

              <button
                type="button"
                onClick={handleAddPart}
                className="w-full sm:w-auto px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Adicionar Peça
              </button>
            </div>

            {orderParts.length > 0 && (
              <div className="divide-y divide-slate-100 border border-slate-200 bg-white rounded-xl overflow-hidden">
                {orderParts.map((p, idx) => (
                  <div key={idx} className="p-2.5 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-2">SKU: {p.sku}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-600">{p.quantity}x {formatCurrency(p.unitPrice)}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(p.total)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePart(idx)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagamento e Fechamento */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Desconto Geral (R$)
              </label>
              <input
                type="number"
                min={0}
                value={generalDiscount}
                onChange={(e) => setGeneralDiscount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden"
              >
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-right flex flex-col justify-end">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Final da OS</span>
              <span className="text-xl font-extrabold text-indigo-700">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Salvando...' : initialData ? 'Salvar Alterações da OS' : 'Criar Ordem de Serviço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
