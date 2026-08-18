import React, { useState } from 'react';
import { ArrowUpFromLine, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { StockExitReason } from '../../types';

interface StockExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPartId?: string;
}

export const StockExitModal: React.FC<StockExitModalProps> = ({
  isOpen,
  onClose,
  defaultPartId,
}) => {
  const { parts, addStockExit } = useStore();

  const [partId, setPartId] = useState(defaultPartId || parts[0]?.id || '');
  const selectedPart = parts.find((p) => p.id === partId);

  const [quantity, setQuantity] = useState<number>(1);
  const [exitReason, setExitReason] = useState<StockExitReason>('DEFEITO');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partId || !selectedPart) {
      setError('Selecione uma peça.');
      return;
    }
    if (quantity <= 0) {
      setError('A quantidade deve ser maior que zero.');
      return;
    }

    if (quantity > selectedPart.currentStock) {
      setError(
        `Operação Bloqueada: Saldo insuficiente (${selectedPart.currentStock} ${selectedPart.unit} disponíveis). O sistema não permite estoque negativo.`
      );
      return;
    }

    const res = await addStockExit({
      partId,
      quantity: Number(quantity),
      exitReason,
      notes: notes.trim(),
    });

    if (!res.success) {
      setError(res.message || 'Erro ao registrar saída');
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
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowUpFromLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                Saída Manual de Estoque
              </h3>
              <p className="text-xs text-slate-500">
                Baixa por avaria, perda, uso interno ou ajuste de inventário
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
              onChange={(e) => {
                setPartId(e.target.value);
                setError(null);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:border-indigo-500"
            >
              {parts.filter((p) => p.active !== false).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) - Saldo Atual: {p.currentStock} {p.unit}
                </option>
              ))}
            </select>
          </div>

          {selectedPart && (
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs flex items-center justify-between text-amber-900">
              <span>Saldo Disponível: <strong className="text-amber-950 font-bold">{selectedPart.currentStock} {selectedPart.unit}</strong></span>
              <span className="text-[11px] text-amber-800 font-medium">Estoque Mínimo: {selectedPart.minStock}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Quantidade a Baixar *
              </label>
              <input
                type="number"
                min={1}
                max={selectedPart?.currentStock || 1}
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-rose-700 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Motivo da Saída *
              </label>
              <select
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value as StockExitReason)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden"
              >
                <option value="DEFEITO">Peça com Defeito / Avariada</option>
                <option value="USO_OS">Uso em Oficina</option>
                <option value="PERDA">Perda / Extravio</option>
                <option value="AJUSTE">Ajuste de Inventário</option>
                <option value="VENDA">Balcão / Venda Direta</option>
                <option value="OUTRO">Outro Motivo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Justificativa / Observações
            </label>
            <textarea
              rows={2}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva o motivo da baixa manual..."
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
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md cursor-pointer"
            >
              Confirmar Saída
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
