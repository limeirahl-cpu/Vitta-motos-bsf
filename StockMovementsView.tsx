import React, { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Package,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatDate } from '../../utils/formatters';

export const StockMovementsView: React.FC = () => {
  const { stockMovements, parts } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ENTRADA' | 'SAIDA'>('ALL');

  const filteredMovements = useMemo(() => {
    return stockMovements.filter((m) => {
      const term = searchTerm.toLowerCase().trim();
      const part = parts.find((p) => p.id === m.partId);

      const matchesSearch =
        !term ||
        m.invoiceNumber?.toLowerCase().includes(term) ||
        m.serviceOrderId?.toLowerCase().includes(term) ||
        m.exitReason?.toLowerCase().includes(term) ||
        m.userName.toLowerCase().includes(term) ||
        (part && (part.name.toLowerCase().includes(term) || part.sku.toLowerCase().includes(term)));

      const matchesType = typeFilter === 'ALL' || m.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [stockMovements, parts, searchTerm, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <History className="w-6 h-6 text-indigo-600" />
          Histórico de Movimentações de Estoque
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Rastreabilidade completa de todas as entradas, saídas por OS e baixas manuais
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por peça, OS, nota fiscal..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | 'ENTRADA' | 'SAIDA')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Todas as Movimentações</option>
            <option value="ENTRADA">Apenas Entradas (+)</option>
            <option value="SAIDA">Apenas Saídas (-)</option>
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Data / Hora</th>
                <th className="py-3.5 px-3">Tipo</th>
                <th className="py-3.5 px-3">Peça / SKU</th>
                <th className="py-3.5 px-3 text-center">Qtd</th>
                <th className="py-3.5 px-3 text-center">Saldo Anterior / Novo</th>
                <th className="py-3.5 px-3">Motivo / Documento</th>
                <th className="py-3.5 px-4">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => {
                  const part = parts.find((p) => p.id === mov.partId);

                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {formatDate(mov.date)}
                      </td>

                      <td className="py-3.5 px-3">
                        {mov.type === 'ENTRADA' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                            <ArrowDownToLine className="w-3 h-3" /> ENTRADA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                            <ArrowUpFromLine className="w-3 h-3" /> SAÍDA
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">
                          {part?.name || 'Peça'}
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          SKU: {part?.sku || '-'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`font-bold font-mono text-sm ${
                            mov.type === 'ENTRADA'
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {mov.type === 'ENTRADA' ? `+${mov.quantity}` : `-${mov.quantity}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono">
                        <span className="text-slate-400">{mov.previousStock}</span>
                        <span className="text-slate-400 mx-1.5">→</span>
                        <span className="font-bold text-slate-800">{mov.resultingStock}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-medium text-slate-800">
                          {mov.exitReason || (mov.type === 'ENTRADA' ? 'Entrada / Compra' : 'Saída Manual')}
                        </div>
                        {mov.invoiceNumber && (
                          <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mr-1">
                            NF: {mov.invoiceNumber}
                          </span>
                        )}
                        {mov.serviceOrderId && (
                          <span className="font-mono text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                            OS #{mov.serviceOrderId}
                          </span>
                        )}
                        {mov.notes && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5">{mov.notes}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {mov.userName}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
