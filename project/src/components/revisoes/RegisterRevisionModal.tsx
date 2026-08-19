import React, { useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Plus,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { OSPartItem, OSServiceItem } from '../../types';
import { formatCurrency, formatDate, formatKm } from '../../utils/formatters';

interface RegisterRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMotorcycleId?: string;
  onComplete?: () => void;
}

export const RegisterRevisionModal: React.FC<RegisterRevisionModalProps> = ({
  isOpen,
  onClose,
  defaultMotorcycleId,
  onComplete,
}) => {
  const {
    motorcycles,
    parts,
    services: servicesCatalog,
    getClientById,
    getMotorcycleNextRevision,
    registerCompletedRevision,
    createServiceOrder,
  } = useStore();
  const { currentUser } = useAuth();

  const [motorcycleId, setMotorcycleId] = useState(
    defaultMotorcycleId || motorcycles[0]?.id || ''
  );

  const selectedMoto = motorcycles.find((m) => m.id === motorcycleId);
  const selectedClient = selectedMoto ? getClientById(selectedMoto.clientId) : null;
  const nextRev = selectedMoto ? getMotorcycleNextRevision(selectedMoto) : null;

  const [revisionNumber, setRevisionNumber] = useState<number>(
    nextRev?.revisionNumber || 1
  );
  const [completedKm, setCompletedKm] = useState<number>(
    selectedMoto ? Math.max(selectedMoto.currentKm, nextRev?.targetKm || 1000) : 1000
  );
  const [completedDate, setCompletedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [mechanicName, setMechanicName] = useState<string>(currentUser?.name || 'Mecânico Chefe');
  const [notes, setNotes] = useState<string>('Revisão periódica de garantia realizada conforme manual do fabricante.');

  // Checklist items
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({
    'Troca de óleo do motor e anel de vedação': true,
    'Verificação e ajuste da folga de válvulas': true,
    'Inspeção do sistema de freios e pastilhas': true,
    'Ajuste, lubrificação e tensão da corrente de transmissão': true,
    'Checagem da pressão e desgaste dos pneus': true,
    'Verificação do sistema elétrico e aperto de conexões': true,
    'Inspeção do filtro de ar e velas de ignição': true,
  });

  // Parts and services used in revision
  const [selectedParts, setSelectedParts] = useState<OSPartItem[]>([]);
  const [partPickerId, setPartPickerId] = useState<string>('');
  const [partPickerQty, setPartPickerQty] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync revision number when moto changes
  const handleMotoChange = (id: string) => {
    setMotorcycleId(id);
    const moto = motorcycles.find((m) => m.id === id);
    if (moto) {
      const nr = getMotorcycleNextRevision(moto);
      setRevisionNumber(nr.revisionNumber);
      setCompletedKm(Math.max(moto.currentKm, nr.targetKm));
    }
  };

  const handleAddPart = () => {
    if (!partPickerId) return;
    const part = parts.find((p) => p.id === partPickerId);
    if (!part) return;

    if (partPickerQty > part.currentStock) {
      setError(`Estoque insuficiente de ${part.name}. Disponível: ${part.currentStock}`);
      return;
    }

    setError(null);
    const existingIndex = selectedParts.findIndex((p) => p.partId === part.id);
    if (existingIndex >= 0) {
      const updated = [...selectedParts];
      updated[existingIndex].quantity += partPickerQty;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setSelectedParts(updated);
    } else {
      setSelectedParts([
        ...selectedParts,
        {
          id: 'rev-part-' + Date.now(),
          partId: part.id,
          sku: part.sku,
          name: part.name,
          quantity: partPickerQty,
          unitPrice: part.salePrice,
          total: part.salePrice * partPickerQty,
        },
      ]);
    }
    setPartPickerId('');
    setPartPickerQty(1);
  };

  const handleRemovePart = (index: number) => {
    setSelectedParts(selectedParts.filter((_, i) => i !== index));
  };

  const toggleChecklistItem = (item: string) => {
    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motorcycleId || !selectedMoto) {
      setError('Selecione uma motocicleta.');
      return;
    }

    const checklistItemsChecked = Object.entries(checklist)
      .filter(([_, checked]) => checked)
      .map(([k]) => k);

    const fullNotes = `${notes}\n\nItens Inspecionados:\n- ${checklistItemsChecked.join('\n- ')}`;

    // Calculate totals
    const servicesList: OSServiceItem[] = [
      {
        id: 'rev-serv-1',
        name: `Revisão Obrigatória de Garantia ${revisionNumber}ª (${formatKm(completedKm)})`,
        price: 0, // Revision labor is free under warranty terms
      },
    ];

    const partsTotal = selectedParts.reduce((acc, p) => acc + p.total, 0);

    setIsSaving(true);

    // Create OS for revision
    const osRes = await createServiceOrder({
      clientId: selectedMoto.clientId,
      motorcycleId: selectedMoto.id,
      currentKm: Number(completedKm),
      serviceType: 'REVISAO_GARANTIA',
      status: 'FINALIZADA',
      entryReason: `Revisão de Garantia ${revisionNumber}ª - ${formatKm(completedKm)}`,
      diagnosis: 'Revisão periódica programada executada conforme manual de garantia do fabricante.',
      notes: fullNotes,
      mechanicName,
      services: servicesList,
      parts: selectedParts,
      servicesTotal: 0,
      partsTotal,
      generalDiscount: 0,
      finalTotal: partsTotal,
    });

    if (!osRes.success) {
      // Stop here instead of registering the revision anyway - e.g. if stock
      // ran out for one of the picked parts between selection and submit.
      setIsSaving(false);
      setError(osRes.message || 'Erro ao registrar a Ordem de Serviço da revisão.');
      return;
    }

    const serviceOrderId = osRes.order ? osRes.order.id : undefined;

    const res = await registerCompletedRevision({
      motorcycleId,
      revisionNumber,
      completedDate,
      completedKm: Number(completedKm),
      mechanicName,
      notes: fullNotes,
      serviceOrderId,
    });

    setIsSaving(false);

    if (!res.success) {
      setError(res.message || 'Erro ao registrar revisão');
      return;
    }

    if (onComplete) onComplete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">
                Registrar Revisão de Garantia
              </h3>
              <p className="text-xs text-slate-500">
                Inspeção periódica, baixa de peças e emissão de OS de Garantia
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

          {/* Motorcycle selection & Client display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Motocicleta *
              </label>
              <select
                required
                value={motorcycleId}
                onChange={(e) => handleMotoChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:border-indigo-500"
              >
                {motorcycles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.brand} {m.model} ({m.plate}) - {m.chassis.substring(0, 8)}...
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cliente Proprietário
              </label>
              <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold truncate">
                {selectedClient ? `${selectedClient.name} (${selectedClient.phone})` : 'Selecione a moto'}
              </div>
            </div>
          </div>

          {/* Revision Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl">
            <div>
              <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                Nº da Revisão
              </label>
              <select
                value={revisionNumber}
                onChange={(e) => setRevisionNumber(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-indigo-700"
              >
                <option value={1}>1ª Revisão (1.000 KM)</option>
                <option value={2}>2ª Revisão (4.000 KM)</option>
                <option value={3}>3ª Revisão (7.000 KM)</option>
                <option value={4}>4ª Revisão (10.000 KM)</option>
                <option value={5}>5ª Revisão (13.000 KM)</option>
                <option value={6}>6ª Revisão (16.000 KM)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                Quilometragem Atual (KM) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={completedKm}
                onChange={(e) => setCompletedKm(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-indigo-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">
                Data de Realização *
              </label>
              <input
                type="date"
                required
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
              />
            </div>
          </div>

          {/* Mechanic & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mecânico Responsável *
              </label>
              <input
                type="text"
                required
                value={mechanicName}
                onChange={(e) => setMechanicName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Observações Técnicas
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Inspection Checklist */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Checklist de Itens Inspecionados Obrigatórios</span>
              <span className="text-[10px] text-emerald-600 font-bold lowercase">
                ({Object.values(checklist).filter(Boolean).length} de {Object.keys(checklist).length} verificados)
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {Object.entries(checklist).map(([item, checked]) => (
                <label
                  key={item}
                  onClick={() => toggleChecklistItem(item)}
                  className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {}}
                    className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className={checked ? 'font-semibold text-slate-900' : 'text-slate-500'}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Parts Used */}
          <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-purple-600" />
                Peças / Insumos Aplicados na Revisão (Óleo, Filtros, etc)
              </h4>
              <span className="text-xs font-bold text-purple-700">
                Total Peças: {formatCurrency(selectedParts.reduce((acc, p) => acc + p.total, 0))}
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
                Adicionar
              </button>
            </div>

            {selectedParts.length > 0 && (
              <div className="divide-y divide-slate-100 border border-slate-200 bg-white rounded-xl overflow-hidden">
                {selectedParts.map((p, idx) => (
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

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? 'Salvando...' : 'Concluir & Registrar Revisão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
