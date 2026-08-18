import React, { useState } from 'react';
import { ArrowDownToLine, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface StockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPartId?: string;
}

export const StockEntryModal: React.FC<StockEntryModalProps> = ({
  isOpen,
  onClose,
  defaultPartId,
}) => {
  const { parts, addStockEntry, settings } = useStore();

  const [partId, setPartId] = useState(defaultPartId || parts[0]?.id || '');
  const selectedPart = parts.find((p) => p.id === partId);

  const [quantity, setQuantity] = useState<number>(10);
  const [costUnit, setCostUnit] = useState<number>(selectedPart?.purchaseCost || 0);
  const [markupPercent, setMarkupPercent] = useState<number>(settings.defaultMarkupPercent || 40);
  const [updateSalePrice, setUpdateSalePrice] = useState<boolean>(settings.autoApplyMarkup !== false);
  const [supplier, setSupplier] = useState<string>(selectedPart?.supplier || '');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('Reposição de estoque / Compra com fornecedor');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const calculatedSalePrice = Math.round(costUnit * (1 + markupPercent / 100) * 100) / 100;

  const handlePartChange = (id: string) => {
    setPartId(id);
    const p = parts.find((item) => item.id === id);
    if (p) {
      setCostUnit(p.purchaseCost);
      setSupplier(p.supplier || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partId) {
      setError('Selecione uma peça.');
      return;
    }
    if (quantity <= 0) {
      setError('A quantidade de entrada deve ser maior que zero.');
      return;
    }

    const res = await addStockEntry({
      partId,
      quantity: Number(quantity),
      costUnit: Number(costUnit),
      supplier: supplier.trim(),
      invoiceNumber: invoiceNumber.trim(),
      notes: notes.trim(),
      updateSalePrice,
      customSalePrice: updateSalePrice ? calculatedSalePrice : undefined,
    });

    if (!res.success) {
      setError(res.message || 'Erro ao registrar entrada');
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Entrada de Peças no Estoque
              </h3>
              <p className="text-xs text-slate-500">
                Lançamento de compras e acréscimo de saldo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Peça / Produto *
            </label>
            <select
              required
              value={partId}
              onChange={(e) => handlePartChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:border-indigo-500"
            >
              {parts.filter((p) => p.active !== false).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) - Atual: {p.currentStock} {p.unit}
                </option>
              ))}
            </select>
          </div>

          {selectedPart && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between text-slate-600">
              <span>Saldo Atual: <strong className="text-slate-900">{selectedPart.currentStock} {selectedPart.unit}</strong></span>
              <span>Localização: <strong className="text-slate-900">{selectedPart.location || 'Oficina'}</strong></span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Quantidade a Adicionar *
              </label>
              <input
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-emerald-700 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Custo Unitário (R$)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={costUnit}
                onChange={(e) => setCostUnit(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Precificação Automática / Atualização de Preço de Venda */}
          {costUnit > 0 && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={updateSalePrice}
                    onChange={(e) => setUpdateSalePrice(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded-md border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Atualizar preço de venda da peça automaticamente
                  </span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500">Margem:</span>
                  <input
                    type="number"
                    min={0}
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(Number(e.target.value))}
                    className="w-14 px-1.5 py-0.5 bg-white border border-amber-300 rounded-lg text-xs font-bold font-mono text-center"
                  />
                  <span className="text-[10px] font-bold text-slate-500">%</span>
                </div>
              </div>

              {updateSalePrice && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/60">
                  <span className="text-slate-600">
                    Preço de Venda Sugerido ({markupPercent}%):
                  </span>
                  <span className="font-bold text-emerald-800 font-mono text-sm">
                    R$ {calculatedSalePrice.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fornecedor
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Ex: MotoParts Distribuidora"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nº Nota Fiscal Compra
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="NF-e 00921"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observações da Entrada
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md cursor-pointer"
            >
              Confirmar Entrada
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
