import React, { useState } from 'react';
import { Bike, Image as ImageIcon, UserCheck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { Motorcycle } from '../../types';
import { maskPlate } from '../../utils/formatters';

interface MotorcycleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Returning { success: false, message } keeps the modal open (with the
  // user's data intact) and shows the error inline, instead of silently
  // closing and discarding everything they typed - e.g. on a duplicate plate.
  onSave: (
    motoData: Omit<Motorcycle, 'id' | 'createdAt'>
  ) => Promise<{ success: boolean; message?: string } | void>;
  initialData?: Motorcycle | null;
  defaultClientId?: string;
}

export const MotorcycleFormModal: React.FC<MotorcycleFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultClientId,
}) => {
  const { clients } = useStore();
  const { users, currentUser } = useAuth();

  // Find all active registered sellers / collaborators
  const sellers = users.filter((u) => u.active && (u.status === 'approved' || !u.status));

  const [clientId, setClientId] = useState(
    initialData?.clientId || defaultClientId || (clients[0]?.id || '')
  );

  const [sellerId, setSellerId] = useState<string>(() => {
    if (initialData?.sellerId) return initialData.sellerId;
    if (currentUser?.role === 'vendedor') return currentUser.id;
    const firstSeller = sellers.find((s) => s.role === 'vendedor');
    return firstSeller?.id || currentUser?.id || sellers[0]?.id || '';
  });

  const [brand, setBrand] = useState('Shineray');
  const [model, setModel] = useState(initialData?.model || '');

  // Shineray Models list for fast selection
  const SHINERAY_MODELS = [
    'SH 125 Worker',
    'Jet 125 2X',
    'Jet 50',
    'Storm 200 EFI',
    'Phoenix 50',
    'Rio 125 EFI',
    'Free 150 EFI',
    'Urban 150',
    'Titanium 200',
    'Explorer 150',
    'SHE S Elétrica',
    'PT4 Scooter',
    'SE-01 Elétrica',
  ];
  const [year, setYear] = useState<number>(initialData?.year || 2026);
  const [color, setColor] = useState(initialData?.color || '');
  const [chassis, setChassis] = useState(initialData?.chassis || '');
  const [engineNumber, setEngineNumber] = useState(initialData?.engineNumber || '');
  const [plate, setPlate] = useState(initialData?.plate || '');
  const [renavam, setRenavam] = useState(initialData?.renavam || '');
  const [deliveryKm, setDeliveryKm] = useState<number>(initialData?.deliveryKm || 0);
  const [currentKm, setCurrentKm] = useState<number>(initialData?.currentKm || 0);
  const [saleDate, setSaleDate] = useState(
    initialData?.saleDate || new Date().toISOString().split('T')[0]
  );
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || '');
  const [warrantyStartDate, setWarrantyStartDate] = useState(
    initialData?.warrantyStartDate || new Date().toISOString().split('T')[0]
  );
  const [photoUrl, setPhotoUrl] = useState(initialData?.photoUrl || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError('Selecione o cliente proprietário da moto.');
      return;
    }
    if (!model.trim() || !plate.trim() || !chassis.trim()) {
      setError('Por favor, preencha Modelo, Placa e Chassi.');
      return;
    }

    const selectedSeller = sellers.find((s) => s.id === sellerId);

    setIsSaving(true);
    const res = await onSave({
      clientId,
      sellerId: sellerId || undefined,
      sellerName: selectedSeller ? selectedSeller.name : undefined,
      brand: brand.trim(),
      model: model.trim(),
      year: Number(year),
      color: color.trim(),
      chassis: chassis.trim().toUpperCase(),
      engineNumber: engineNumber.trim().toUpperCase(),
      plate: maskPlate(plate.trim()),
      renavam: renavam.trim(),
      deliveryKm: Number(deliveryKm),
      currentKm: Math.max(Number(deliveryKm), Number(currentKm)),
      saleDate,
      invoiceNumber: invoiceNumber.trim(),
      warrantyStartDate,
      photoUrl: photoUrl.trim() || undefined,
      notes: notes.trim(),
    });
    setIsSaving(false);

    if (res && res.success === false) {
      setError(res.message || 'Não foi possível salvar a motocicleta.');
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">
                {initialData ? 'Editar Moto Vendida' : 'Cadastrar Moto Vendida'}
              </h3>
              <p className="text-xs text-slate-500">
                Registro do veículo, garantia e quilometragem
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Cliente Proprietário e Vendedor Responsável */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cliente / Proprietário *
              </label>
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              >
                <option value="">Selecione o proprietário...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - CPF: {c.cpfCnpj} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                Vendedor Cadastrado
              </label>
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-indigo-200 rounded-xl text-sm font-bold text-indigo-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              >
                <option value="">Nenhum / Loja Direta</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role === 'vendedor' ? 'Vendedor' : s.role === 'admin' ? 'Admin' : s.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dados Técnicos da Moto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Marca *
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-sm font-bold text-red-700 focus:outline-hidden"
              >
                <option value="Shineray">Shineray (Oficial)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Modelo da Moto Shineray *
              </label>
              <input
                type="text"
                required
                list="shineray-models-list"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex: SH 125 Worker, Jet 125 2X, Storm 200..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-hidden focus:border-indigo-500 focus:bg-white"
              />
              <datalist id="shineray-models-list">
                {SHINERAY_MODELS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ano Fab./Mod. *
              </label>
              <input
                type="number"
                required
                min={1990}
                max={2030}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cor
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ex: Vermelho Metálico"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Placa *
              </label>
              <input
                type="text"
                required
                value={plate}
                onChange={(e) => setPlate(maskPlate(e.target.value))}
                placeholder="BRA5X26"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono uppercase font-bold focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Chassi *
              </label>
              <input
                type="text"
                required
                value={chassis}
                onChange={(e) => setChassis(e.target.value.toUpperCase())}
                placeholder="9C2PC6410NR..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono uppercase focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Número do Motor
              </label>
              <input
                type="text"
                value={engineNumber}
                onChange={(e) => setEngineNumber(e.target.value.toUpperCase())}
                placeholder="PC64E-5011928"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono uppercase focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Renavam
              </label>
              <input
                type="text"
                value={renavam}
                onChange={(e) => setRenavam(e.target.value)}
                placeholder="12849201948"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Venda, KM e Garantia */}
          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Venda, Quilometragem & Início da Garantia
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  KM na Entrega
                </label>
                <input
                  type="number"
                  min={0}
                  value={deliveryKm}
                  onChange={(e) => setDeliveryKm(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  KM Atual
                </label>
                <input
                  type="number"
                  min={deliveryKm}
                  value={currentKm}
                  onChange={(e) => setCurrentKm(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-indigo-700 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Data da Venda
                </label>
                <input
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Início da Garantia
                </label>
                <input
                  type="date"
                  required
                  value={warrantyStartDate}
                  onChange={(e) => setWarrantyStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nº da Nota Fiscal de Venda
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="NF-008491"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  URL da Foto da Moto
                </label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://exemplo.com/foto-moto.jpg"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observações / Acessórios Instalados
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Acessórios inclusos na entrega, manual entregue, chave cópia..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Buttons */}
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
              {isSaving ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Concluir Venda da Moto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
