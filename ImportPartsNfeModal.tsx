import React, { useState } from 'react';
import {
  ArrowDownToLine,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  DollarSign,
  FileCode,
  FileText,
  Layers,
  Package,
  Percent,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency } from '../../utils/formatters';
import { extractTextFromPdf } from '../../utils/pdfNfeExtractor';
import {
  ParsedPartItem,
  ParsedPartsInvoice,
  parsePartsDanfePdfText,
  parsePartsNfeXml,
  SAMPLE_SHINERAY_PARTS_NFES,
} from '../../utils/partsNfeParser';

interface ImportPartsNfeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportPartsNfeModal: React.FC<ImportPartsNfeModalProps> = ({ isOpen, onClose }) => {
  const { parts, addPart, addStockEntry } = useStore();

  const [invoices, setInvoices] = useState<ParsedPartsInvoice[]>([]);
  const [activeInvoiceIndex, setActiveInvoiceIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'samples'>('upload');
  const [globalMarkup, setGlobalMarkup] = useState<number>(60);

  if (!isOpen) return null;

  const currentInvoice = invoices[activeInvoiceIndex] || null;

  // Process files (PDF or XML)
  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setIsProcessing(true);
    setUploadErrors([]);
    setImportSuccessMessage(null);

    const files = Array.from(fileList);
    const parsedInvoices: ParsedPartsInvoice[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      try {
        if (isPdf) {
          const arrayBuffer = await file.arrayBuffer();
          const extractedText = await extractTextFromPdf(arrayBuffer);
          const invList = parsePartsDanfePdfText(extractedText, file.name, parts);
          if (invList.length === 0 || invList[0].items.length === 0) {
            errors.push(`Nenhuma peça ou item de nota fiscal identificado no PDF "${file.name}".`);
          } else {
            parsedInvoices.push(...invList);
          }
        } else {
          const text = await file.text();
          const invList = parsePartsNfeXml(text, file.name, parts);
          if (invList.length === 0 || invList[0].items.length === 0) {
            errors.push(`Nenhuma peça identificada no XML "${file.name}".`);
          } else {
            parsedInvoices.push(...invList);
          }
        }
      } catch (err: any) {
        errors.push(`Erro ao ler "${file.name}": ${err?.message || 'Formato inválido'}`);
      }
    }

    if (parsedInvoices.length > 0) {
      setInvoices((prev) => [...prev, ...parsedInvoices]);
      setActiveInvoiceIndex(invoices.length); // switch to newly added
    }

    if (errors.length > 0) {
      setUploadErrors(errors);
    }

    setIsProcessing(false);
  };

  // Load official sample
  const handleLoadSample = (sampleIndex: number) => {
    setIsProcessing(true);
    setUploadErrors([]);
    setImportSuccessMessage(null);

    try {
      const sample = SAMPLE_SHINERAY_PARTS_NFES[sampleIndex];
      const dummyPdfText = `
        DANFE DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA
        Nº 000.00${sample.invoiceNumber} SÉRIE 1 EMISSÃO: 17/08/2026
        EMITENTE: ${sample.supplier} CNPJ: ${sample.cnpj}
        VALOR TOTAL DA NOTA: R$ ${sample.totalValue.toFixed(2)}
        DADOS DOS PRODUTOS / SERVIÇOS
        SH-OLEO-10W30 Óleo Motor 10W-30 4T Mineral Shineray UN 24 22,50 540,00
        SH-PAS-WORK125 Pastilha de Freio Dianteira Shineray Worker 125 UN 10 18,90 189,00
        SH-LON-JET125 Sapata de Freio Traseira Lona Jet 125 UN 10 16,50 165,00
        SH-VEL-CPR8EA Vela de Ignição Shineray CPR8EA UN 20 14,00 280,00
        SH-FIL-JET125 Elemento Filtro de Ar Jet 125 2X UN 15 12,00 180,00
        SH-KIT-REL125 Kit Transmissão Completo Corrente/Coroa/Pinhão Shineray UN 6 75,00 450,00
        SH-BAT-12V5AH Bateria Selada 12V 5Ah Shineray Worker/Jet UN 8 95,00 760,00
        SH-CAB-ACEL Cabo do Acelerador Shineray SH 125 UN 10 11,50 115,00
        SH-CAB-EMBR Cabo de Embreagem Shineray Worker 125 UN 10 12,00 120,00
        SH-PNEU-TRAS Pneu Traseiro 80/100-14 Shineray Jet 125 UN 4 135,00 540,00
      `;

      const parsed = parsePartsDanfePdfText(dummyPdfText, sample.fileName, parts);
      setInvoices((prev) => [...prev, ...parsed]);
      setActiveInvoiceIndex(invoices.length);
    } catch (err: any) {
      setUploadErrors([`Falha ao carregar amostra: ${err?.message}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Item modification helpers
  const handleToggleItem = (itemId: string) => {
    if (!currentInvoice) return;
    setInvoices((prev) =>
      prev.map((inv, idx) => {
        if (idx !== activeInvoiceIndex) return inv;
        return {
          ...inv,
          items: inv.items.map((it) => (it.id === itemId ? { ...it, selected: !it.selected } : it)),
        };
      })
    );
  };

  const handleToggleAll = (select: boolean) => {
    if (!currentInvoice) return;
    setInvoices((prev) =>
      prev.map((inv, idx) => {
        if (idx !== activeInvoiceIndex) return inv;
        return {
          ...inv,
          items: inv.items.map((it) => ({ ...it, selected: select })),
        };
      })
    );
  };

  const handleUpdateItem = (itemId: string, updates: Partial<ParsedPartItem>) => {
    if (!currentInvoice) return;
    setInvoices((prev) =>
      prev.map((inv, idx) => {
        if (idx !== activeInvoiceIndex) return inv;
        return {
          ...inv,
          items: inv.items.map((it) => {
            if (it.id !== itemId) return it;
            const updated = { ...it, ...updates };
            if (updates.quantity !== undefined || updates.unitCost !== undefined) {
              updated.totalCost = updated.quantity * updated.unitCost;
            }
            return updated;
          }),
        };
      })
    );
  };

  const handleApplyMarkupToAll = (percent: number) => {
    setGlobalMarkup(percent);
    if (!currentInvoice) return;
    setInvoices((prev) =>
      prev.map((inv, idx) => {
        if (idx !== activeInvoiceIndex) return inv;
        return {
          ...inv,
          defaultMarkupPercent: percent,
          items: inv.items.map((it) => ({
            ...it,
            suggestedSalePrice: Math.round(it.unitCost * (1 + percent / 100) * 100) / 100,
          })),
        };
      })
    );
  };

  const handleRemoveInvoice = (indexToRemove: number) => {
    const updated = invoices.filter((_, i) => i !== indexToRemove);
    setInvoices(updated);
    if (activeInvoiceIndex >= updated.length) {
      setActiveInvoiceIndex(Math.max(0, updated.length - 1));
    }
  };

  // Perform Final Import
  const handleExecuteImport = async () => {
    if (!currentInvoice) return;

    const selectedItems = currentInvoice.items.filter((it) => it.selected);
    if (selectedItems.length === 0) {
      setUploadErrors(['Selecione pelo menos uma peça para importar.']);
      return;
    }

    let createdPartsCount = 0;
    let restockedCount = 0;
    let totalPiecesCount = 0;
    const itemErrors: string[] = [];

    for (const item of selectedItems) {
      // Check if restocking existing part
      if (item.existingPartId) {
        const res = await addStockEntry({
          partId: item.existingPartId,
          quantity: item.quantity,
          costUnit: item.unitCost,
          supplier: currentInvoice.supplier.name,
          invoiceNumber: currentInvoice.invoiceNumber,
          notes: `Entrada automática via importação de NF-e ${currentInvoice.invoiceNumber} (${currentInvoice.supplier.name})`,
        });
        if (res.success) {
          restockedCount++;
          totalPiecesCount += item.quantity;
        } else {
          itemErrors.push(`"${item.name}" (${item.sku}): ${res.message || 'falha ao repor estoque'}`);
        }
      } else {
        // Create new part in inventory
        const res = await addPart({
          sku: item.sku.trim().toUpperCase(),
          name: item.name.trim(),
          brand: item.brand || 'Shineray / Genuíno',
          category: item.category || 'Revisão',
          location: 'Prateleira Peças',
          purchaseCost: item.unitCost,
          salePrice: item.suggestedSalePrice > 0 ? item.suggestedSalePrice : item.unitCost * 1.5,
          currentStock: item.quantity,
          minStock: 5,
          unit: item.unit || 'UN',
          supplier: currentInvoice.supplier.name,
          description: `Importado via NF-e ${currentInvoice.invoiceNumber} de ${currentInvoice.invoiceDate}`,
          active: true,
        });

        if (res.success) {
          createdPartsCount++;
          totalPiecesCount += item.quantity;
        } else {
          itemErrors.push(`"${item.name}" (${item.sku}): ${res.message || 'falha ao cadastrar peça'}`);
        }
      }
    }

    // Only report success for items that actually went through - a duplicate
    // SKU or similar failure must not be counted as imported nor hidden.
    if (createdPartsCount + restockedCount > 0) {
      setImportSuccessMessage(
        `Sucesso! Foram processados ${totalPiecesCount} itens no estoque (${createdPartsCount} novas peças cadastradas e ${restockedCount} reposições de saldo).`
      );
    } else {
      setImportSuccessMessage(null);
    }
    setUploadErrors(itemErrors);

    // Remove imported invoice only if at least something succeeded; otherwise
    // keep it so the user can fix the failing item(s) and retry.
    if (createdPartsCount + restockedCount > 0) {
      handleRemoveInvoice(activeInvoiceIndex);
    }
  };

  const selectedCount = currentInvoice?.items.filter((it) => it.selected).length || 0;
  const totalPiecesSelected = currentInvoice?.items.filter((it) => it.selected).reduce((acc, it) => acc + it.quantity, 0) || 0;
  const totalCostSelected = currentInvoice?.items.filter((it) => it.selected).reduce((acc, it) => acc + it.totalCost, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                  Importação de Peças & Almoxarifado via Nota Fiscal
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  PDF / DANFE & XML
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Importa os produtos da nota fiscal, cadastra novas peças ou abastece o saldo de estoque automaticamente
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

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Notifications / Alerts */}
          {importSuccessMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs font-semibold">{importSuccessMessage}</div>
            </div>
          )}

          {uploadErrors.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-2 text-rose-700">
                <span>Erros encontrados:</span>
              </div>
              {uploadErrors.map((e, idx) => (
                <p key={idx}>• {e}</p>
              ))}
            </div>
          )}

          {/* Mode Selector Tabs if no invoice loaded or uploading more */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Upload de Documentos (PDF / XML)
            </button>
            <button
              onClick={() => setActiveTab('samples')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'samples'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              Lotes de Demonstração Shineray
            </button>
          </div>

          {/* Tab 1: Upload Drag & Drop Area */}
          {activeTab === 'upload' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileUpload(e.dataTransfer.files);
              }}
              className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 rounded-3xl p-6 text-center transition-all"
            >
              <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl shadow-sm border border-indigo-100 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-800 mb-1">
                Arraste suas Notas Fiscais de Peças em PDF (DANFE) ou XML
              </h4>
              <p className="text-xs text-slate-500 max-w-lg mx-auto mb-4">
                Selecione as notas fiscais de compra com fornecedores e distribuidoras de motopeças Shineray. O sistema extrairá códigos, quantidades e valores unitários.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all">
                  <FileText className="w-4 h-4" />
                  Selecionar PDF ou XML do Computador
                  <input
                    type="file"
                    accept=".pdf,.xml,application/pdf,text/xml,application/xml"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                </label>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-bold">.PDF (DANFE)</span>
                <span>ou</span>
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-bold">.XML (SEFAZ)</span>
              </div>
            </div>
          )}

          {/* Tab 2: Sample Invoices */}
          {activeTab === 'samples' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SAMPLE_SHINERAY_PARTS_NFES.map((sample, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/20 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-[10px] font-extrabold uppercase">
                        NF-e {sample.invoiceNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {formatCurrency(sample.totalValue)}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-800">{sample.supplier}</h5>
                    <p className="text-[11px] text-slate-500 mt-1">{sample.description}</p>
                  </div>
                  <button
                    onClick={() => handleLoadSample(idx)}
                    className="mt-3 w-full py-2 bg-white hover:bg-indigo-600 hover:text-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Carregar Lote de Exemplo
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Active Invoices Tabs (if multiple loaded) */}
          {invoices.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {invoices.map((inv, idx) => (
                    <button
                      key={inv.id}
                      onClick={() => setActiveInvoiceIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                        activeInvoiceIndex === idx
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>NF {inv.invoiceNumber} ({inv.items.length} itens)</span>
                      <X
                        className="w-3.5 h-3.5 hover:text-rose-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveInvoice(idx);
                        }}
                      />
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setInvoices([])}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Todos
                </button>
              </div>

              {/* Invoice Meta Card */}
              {currentInvoice && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Fornecedor / Emitente</span>
                    <span className="font-bold text-slate-800 block truncate">{currentInvoice.supplier.name}</span>
                    <span className="text-slate-500 text-[11px]">CNPJ: {currentInvoice.supplier.cnpj}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Nota Fiscal / Emissão</span>
                    <span className="font-bold text-slate-800">NF-e {currentInvoice.invoiceNumber} (Série {currentInvoice.series})</span>
                    <span className="text-slate-500 block text-[11px]">Data: {currentInvoice.invoiceDate}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Total da Nota Fiscal</span>
                    <span className="font-extrabold text-emerald-700 text-sm block">
                      {formatCurrency(currentInvoice.totalValue)}
                    </span>
                    <span className="text-slate-500 text-[11px]">{currentInvoice.items.length} itens faturados</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <span className="text-slate-500 font-bold text-[10px] uppercase">Margem de Lucro Global (%)</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Percent className="w-3.5 h-3.5 text-indigo-600" />
                      <input
                        type="number"
                        min={0}
                        max={300}
                        value={globalMarkup}
                        onChange={(e) => handleApplyMarkupToAll(Number(e.target.value))}
                        className="w-16 px-2 py-0.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                      />
                      <span className="text-[10px] text-slate-400">aplicar a todos</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Table */}
              {currentInvoice && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={currentInvoice.items.every((it) => it.selected)}
                          onChange={(e) => handleToggleAll(e.target.checked)}
                          className="rounded-sm text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>Selecionar Todos ({currentInvoice.items.length})</span>
                      </label>
                    </div>

                    <div className="text-xs text-slate-500">
                      <strong>{selectedCount}</strong> selecionados para entrada
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[360px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10 uppercase text-[10px]">
                        <tr>
                          <th className="p-3 w-10 text-center">Sel.</th>
                          <th className="p-3">Código / SKU</th>
                          <th className="p-3">Descrição da Peça</th>
                          <th className="p-3">Categoria</th>
                          <th className="p-3 text-center">Qtd</th>
                          <th className="p-3 text-right">Custo Un.</th>
                          <th className="p-3 text-right">Total Custo</th>
                          <th className="p-3 text-right">Preço Venda</th>
                          <th className="p-3 text-center">Ação no Estoque</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {currentInvoice.items.map((item) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              item.selected ? 'bg-white' : 'bg-slate-50/50 opacity-60'
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => handleToggleItem(item.id)}
                                className="rounded-sm text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                              />
                            </td>

                            <td className="p-3 font-mono font-bold text-slate-900">
                              <input
                                type="text"
                                value={item.sku}
                                onChange={(e) => handleUpdateItem(item.id, { sku: e.target.value })}
                                className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:bg-white"
                              />
                            </td>

                            <td className="p-3 font-medium text-slate-900">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                                className="w-full min-w-[200px] px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white"
                              />
                            </td>

                            <td className="p-3">
                              <select
                                value={item.category}
                                onChange={(e) => handleUpdateItem(item.id, { category: e.target.value })}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white"
                              >
                                <option value="Óleos e Fluidos">Óleos e Fluidos</option>
                                <option value="Freios">Freios</option>
                                <option value="Transmissão">Transmissão</option>
                                <option value="Motor">Motor</option>
                                <option value="Elétrica">Elétrica</option>
                                <option value="Pneus">Pneus</option>
                                <option value="Suspensão">Suspensão</option>
                                <option value="Revisão">Revisão</option>
                                <option value="Geral">Geral</option>
                              </select>
                            </td>

                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(item.id, { quantity: Number(e.target.value) })}
                                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center text-emerald-700"
                              />
                            </td>

                            <td className="p-3 text-right font-medium">
                              <input
                                type="number"
                                step={0.01}
                                min={0}
                                value={item.unitCost}
                                onChange={(e) => handleUpdateItem(item.id, { unitCost: Number(e.target.value) })}
                                className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right font-medium"
                              />
                            </td>

                            <td className="p-3 text-right font-bold text-slate-800">
                              {formatCurrency(item.totalCost)}
                            </td>

                            <td className="p-3 text-right">
                              <input
                                type="number"
                                step={0.01}
                                min={0}
                                value={item.suggestedSalePrice}
                                onChange={(e) => handleUpdateItem(item.id, { suggestedSalePrice: Number(e.target.value) })}
                                className="w-20 px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs text-right font-bold"
                              />
                            </td>

                            <td className="p-3 text-center">
                              {item.existingPartId ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                                  <RefreshCw className="w-3 h-3" />
                                  Repor Estoque (+{item.quantity} {item.unit})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold">
                                  <Plus className="w-3 h-3" />
                                  Cadastrar Nova
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Totals & Execution Button */}
        {currentInvoice && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Peças Selecionadas</span>
                <span className="font-extrabold text-slate-900 text-sm">{selectedCount} de {currentInvoice.items.length}</span>
              </div>
              <div className="h-6 w-px bg-slate-200"></div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Qtd Total de Unidades</span>
                <span className="font-extrabold text-emerald-700 text-sm">+{totalPiecesSelected} itens</span>
              </div>
              <div className="h-6 w-px bg-slate-200"></div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Custo Total Faturado</span>
                <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(totalCostSelected)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={handleExecuteImport}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Entrada de Peças no Estoque</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
