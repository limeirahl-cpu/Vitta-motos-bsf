import React, { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Edit2,
  Package,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { Part } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { ImportPartsNfeModal } from './ImportPartsNfeModal';
import { StockEntryModal } from './StockEntryModal';
import { StockExitModal } from './StockExitModal';

interface PartsListProps {
  onOpenMovementsHistory?: () => void;
}

export const PartsList: React.FC<PartsListProps> = ({ onOpenMovementsHistory }) => {
  const { parts, addPart, updatePart, deletePart, settings, recalculateAllPartsPrices } = useStore();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'LOW' | 'NORMAL'>('ALL');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<Part | null>(null);
  const [partToDelete, setPartToDelete] = useState<Part | null>(null);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isImportNfeModalOpen, setIsImportNfeModalOpen] = useState(false);
  const [selectedPartForAction, setSelectedPartForAction] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  // Form input states
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Revisão');
  const [location, setLocation] = useState('');
  const [purchaseCost, setPurchaseCost] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [markupPercent, setMarkupPercent] = useState<number>(settings.defaultMarkupPercent || 40);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(5);
  const [unit, setUnit] = useState('UN');
  const [supplier, setSupplier] = useState('');
  const [description, setDescription] = useState('');

  const filteredParts = useMemo(() => {
    return parts.filter((p) => {
      if (!showInactive && p.active === false) return false;

      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.location.toLowerCase().includes(term);

      const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;

      let matchesStockStatus = true;
      if (stockStatusFilter === 'LOW') {
        matchesStockStatus = p.currentStock < p.minStock;
      } else if (stockStatusFilter === 'NORMAL') {
        matchesStockStatus = p.currentStock >= p.minStock;
      }

      return matchesSearch && matchesCategory && matchesStockStatus;
    });
  }, [parts, searchTerm, categoryFilter, stockStatusFilter, showInactive]);

  const categories = Array.from(new Set(parts.map((p) => p.category)));

  const handleOpenCreate = () => {
    const defaultMarkup = settings.defaultMarkupPercent ?? 40;
    const initialCost = 30;
    const initialPrice = Math.round(initialCost * (1 + defaultMarkup / 100) * 100) / 100;
    setPartToEdit(null);
    setSku('PEC-' + Math.floor(1000 + Math.random() * 9000));
    setName('');
    setBrand('Genuíno');
    setCategory('Revisão');
    setLocation('Prateleira A-1');
    setPurchaseCost(initialCost);
    setMarkupPercent(defaultMarkup);
    setSalePrice(initialPrice);
    setCurrentStock(10);
    setMinStock(5);
    setUnit('UN');
    setSupplier('');
    setDescription('');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (p: Part) => {
    setPartToEdit(p);
    setSku(p.sku);
    setName(p.name);
    setBrand(p.brand);
    setCategory(p.category);
    setLocation(p.location);
    setPurchaseCost(p.purchaseCost);
    setSalePrice(p.salePrice);
    const calculatedMargin =
      p.purchaseCost > 0
        ? Math.round(((p.salePrice - p.purchaseCost) / p.purchaseCost) * 100)
        : settings.defaultMarkupPercent ?? 40;
    setMarkupPercent(calculatedMargin);
    setCurrentStock(p.currentStock);
    setMinStock(p.minStock);
    setUnit(p.unit);
    setSupplier(p.supplier || '');
    setDescription(p.description || '');
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // When purchase cost changes, auto calculate sale price if markup is present
  const handleCostChange = (newCost: number) => {
    setPurchaseCost(newCost);
    if (newCost > 0 && markupPercent >= 0) {
      const calculatedPrice = Math.round(newCost * (1 + markupPercent / 100) * 100) / 100;
      setSalePrice(calculatedPrice);
    }
  };

  // When markup percentage changes, calculate new sale price
  const handleMarkupChange = (newMarkup: number) => {
    setMarkupPercent(newMarkup);
    if (purchaseCost > 0) {
      const calculatedPrice = Math.round(purchaseCost * (1 + newMarkup / 100) * 100) / 100;
      setSalePrice(calculatedPrice);
    }
  };

  // When sale price changes manually, calculate resulting markup percentage
  const handlePriceChange = (newPrice: number) => {
    setSalePrice(newPrice);
    if (purchaseCost > 0) {
      const margin = Math.round(((newPrice - purchaseCost) / purchaseCost) * 100);
      setMarkupPercent(margin);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) return;
    setFormError(null);

    if (partToEdit) {
      await updatePart(partToEdit.id, {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        brand: brand.trim(),
        category: category.trim(),
        location: location.trim(),
        purchaseCost: Number(purchaseCost),
        salePrice: Number(salePrice),
        currentStock: Number(currentStock),
        minStock: Number(minStock),
        unit: unit.trim().toUpperCase(),
        supplier: supplier.trim(),
        description: description.trim(),
      });
    } else {
      // addPart rejects duplicate SKUs - check the result so the form stays
      // open (with the user's data intact) and shows the error instead of
      // silently closing as if the part had been saved.
      const res = await addPart({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        brand: brand.trim(),
        category: category.trim(),
        location: location.trim(),
        purchaseCost: Number(purchaseCost),
        salePrice: Number(salePrice),
        currentStock: Number(currentStock),
        minStock: Number(minStock),
        unit: unit.trim().toUpperCase(),
        supplier: supplier.trim(),
        description: description.trim(),
        active: true,
      });
      if (!res.success) {
        setFormError(res.message || 'Não foi possível cadastrar a peça.');
        return;
      }
    }

    setIsFormModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!partToDelete) return;
    const res = await deletePart(partToDelete.id);
    // deletePart soft-deactivates (instead of removing) parts with stock/OS
    // history; surface that explicitly so it doesn't look like the delete
    // silently did nothing.
    if (res.message) {
      setDeleteNotice(res.message);
      setTimeout(() => setDeleteNotice(null), 6000);
    }
    setPartToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Deactivation notice (shown after "deleting" a part that has history) */}
      {deleteNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-medium flex items-center justify-between">
          <span>{deleteNotice}</span>
          <button onClick={() => setDeleteNotice(null)} className="text-amber-600 hover:text-amber-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="w-6 h-6 text-indigo-600" />
            Estoque de Peças & Almoxarifado
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Controle de saldo, custos, precificação e alertas de estoque mínimo
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportNfeModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Importar via Nota Fiscal (PDF / XML)</span>
          </button>

          <button
            onClick={() => {
              setSelectedPartForAction(undefined);
              setIsEntryModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Entrada de Estoque</span>
          </button>

          <button
            onClick={() => {
              setSelectedPartForAction(undefined);
              setIsExitModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
          >
            <ArrowUpFromLine className="w-4 h-4" />
            <span>Saída Manual</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Peça</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, SKU, marca..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Stock filter */}
          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value as 'ALL' | 'LOW' | 'NORMAL')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Todos os Níveis de Estoque</option>
            <option value="LOW">Estoque Baixo (Alerta)</option>
            <option value="NORMAL">Estoque Regular</option>
          </select>

          <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-3.5 h-3.5 text-indigo-600 rounded-sm border-slate-300 cursor-pointer"
            />
            Mostrar inativas
          </label>
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Código / Peça</th>
                <th className="py-3.5 px-3">Categoria & Marca</th>
                <th className="py-3.5 px-3">Localização</th>
                <th className="py-3.5 px-3 text-center">Saldo Atual</th>
                <th className="py-3.5 px-3 text-right">Custo / Venda</th>
                <th className="py-3.5 px-3 text-center">Margem</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhuma peça encontrada.
                  </td>
                </tr>
              ) : (
                filteredParts.map((p) => {
                  const isLow = p.currentStock < p.minStock;
                  const margin = p.purchaseCost > 0 ? ((p.salePrice - p.purchaseCost) / p.purchaseCost) * 100 : 0;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        p.active === false ? 'opacity-50' : isLow ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Name & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          {p.name}
                          {p.active === false && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[9px] font-bold uppercase tracking-wider">
                              Inativa
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 font-semibold">
                          SKU: {p.sku}
                        </span>
                      </td>

                      {/* Category & Brand */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700 text-[10px]">
                          {p.category}
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                          {p.brand}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-3 text-slate-600 font-medium">
                        {p.location || 'Oficina'}
                      </td>

                      {/* Stock Level */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                              isLow
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {p.currentStock} {p.unit}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Mínimo: {p.minStock}
                          </span>
                        </div>
                      </td>

                      {/* Prices */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-bold text-slate-900 text-sm">
                          {formatCurrency(p.salePrice)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Custo: {formatCurrency(p.purchaseCost)}
                        </span>
                      </td>

                      {/* Margin */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="text-xs font-bold text-indigo-700">
                          +{margin.toFixed(0)}%
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedPartForAction(p.id);
                              setIsEntryModalOpen(true);
                            }}
                            title="Dar Entrada"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <ArrowDownToLine className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPartForAction(p.id);
                              setIsExitModalOpen(true);
                            }}
                            title="Dar Saída Manual"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <ArrowUpFromLine className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Editar Peça"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setPartToDelete(p)}
                              title="Excluir Peça"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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

      {/* Part Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">
                {partToEdit ? 'Editar Cadastro de Peça' : 'Nova Peça / Produto'}
              </h3>
              <button
                onClick={() => {
                  setIsFormModalOpen(false);
                  setFormError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Código SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold focus:outline-hidden"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Descrição da Peça *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Filtro de Óleo HF116"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fabricante / Marca
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Shineray / Motul / Mobil"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Lubrificantes, Freios..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unidade
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="UN">UN (Unidade)</option>
                    <option value="L">L (Litro)</option>
                    <option value="JOGO">JOGO (Jogo)</option>
                    <option value="PAR">PAR (Par)</option>
                    <option value="MT">MT (Metro)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={purchaseCost}
                    onChange={(e) => handleCostChange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Margem / Markup (%)
                    </label>
                    <span className="text-[10px] text-indigo-600 font-bold">
                      Lucro: R$ {Math.max(0, salePrice - purchaseCost).toFixed(2)}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={markupPercent}
                      onChange={(e) => handleMarkupChange(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold pr-8 focus:outline-hidden font-mono text-amber-700"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    required
                    value={salePrice}
                    onChange={(e) => handlePriceChange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-300 rounded-xl text-xs font-black text-emerald-800 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Botões rápidos de margem */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-600">Margem Rápida:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[30, 40, 50, 60, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleMarkupChange(pct)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                        markupPercent === pct
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Localização / Prateleira
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Prateleira B-04"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estoque Atual
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={currentStock}
                    onChange={(e) => setCurrentStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-rose-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fornecedor Principal
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Nome da distribuidora ou fábrica"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Descrição / Compatibilidade
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Compatibilidade com modelos de moto..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormModalOpen(false);
                    setFormError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md cursor-pointer"
                >
                  Salvar Peça
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entry Modal */}
      {isEntryModalOpen && (
        <StockEntryModal
          isOpen={isEntryModalOpen}
          onClose={() => {
            setIsEntryModalOpen(false);
            setSelectedPartForAction(undefined);
          }}
          defaultPartId={selectedPartForAction}
        />
      )}

      {/* Import Parts NFe (PDF / XML) Modal */}
      {isImportNfeModalOpen && (
        <ImportPartsNfeModal
          isOpen={isImportNfeModalOpen}
          onClose={() => setIsImportNfeModalOpen(false)}
        />
      )}

      {/* Exit Modal */}
      {isExitModalOpen && (
        <StockExitModal
          isOpen={isExitModalOpen}
          onClose={() => {
            setIsExitModalOpen(false);
            setSelectedPartForAction(undefined);
          }}
          defaultPartId={selectedPartForAction}
        />
      )}

      {/* Delete Confirmation */}
      {partToDelete && (
        <ConfirmationModal
          isOpen={!!partToDelete}
          onClose={() => setPartToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Excluir Peça"
          message={`Tem certeza que deseja excluir "${partToDelete.name}" (SKU: ${partToDelete.sku})?`}
          confirmText="Sim, Excluir"
        />
      )}
    </div>
  );
};
