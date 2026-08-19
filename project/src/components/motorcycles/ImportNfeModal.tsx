import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bike,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  FileCode,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Info,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Upload,
  User,
  UserCheck,
  UserPlus,
  Wrench,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, formatDate, formatKm, maskCpfCnpj, maskPhone, maskPlate } from '../../utils/formatters';
import {
  generateWarrantySchedule,
  parseNfeXml,
  ParsedNfeData,
  SAMPLE_SHINERAY_NFES,
} from '../../utils/nfeParser';
import { extractTextFromPdf, parseDanfePdfText } from '../../utils/pdfNfeExtractor';

interface ImportNfeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (count: number) => void;
}

export const ImportNfeModal: React.FC<ImportNfeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { clients, motorcycles, importMotorcyclesFromNfe, settings } = useStore();

  const [inputTab, setInputTab] = useState<'upload' | 'paste' | 'samples'>('upload');
  const [xmlInputText, setXmlInputText] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedNfeData[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount: number;
    createdClientsCount: number;
    errors: string[];
  } | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  // Enrich parsed items with check against existing database
  const enrichWithDbStatus = (items: ParsedNfeData[]): ParsedNfeData[] => {
    return items.map((item) => {
      const cleanCpf = item.client.cpfCnpj.replace(/\D/g, '');
      const existingClient = clients.find(
        (c) => c.cpfCnpj.replace(/\D/g, '') === cleanCpf && cleanCpf.length > 0
      );

      const cleanChassis = item.vehicle.chassis.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const cleanPlate = item.vehicle.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const motoExists = motorcycles.some(
        (m) =>
          (m.chassis.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanChassis && cleanChassis.length > 0) ||
          (m.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanPlate && cleanPlate.length > 0)
      );

      return {
        ...item,
        clientExists: !!existingClient,
        existingClientId: existingClient?.id,
        motoExists,
        selected: !motoExists, // Auto-unselect if already in database
      };
    });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setParseError(null);
    setImportResult(null);

    const allParsed: ParsedNfeData[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      try {
        if (isPdf) {
          const arrayBuffer = await file.arrayBuffer();
          const extractedText = await extractTextFromPdf(arrayBuffer);
          const items = parseDanfePdfText(extractedText, file.name);
          if (items.length === 0) {
            errors.push(`Nenhuma moto ou dados de nota fiscal identificados no PDF "${file.name}".`);
          } else {
            allParsed.push(...items);
          }
        } else {
          const text = await file.text();
          const items = parseNfeXml(text, file.name);
          if (items.length === 0) {
            errors.push(`Nenhuma moto ou veículo identificado no arquivo "${file.name}".`);
          } else {
            allParsed.push(...items);
          }
        }
      } catch (err: any) {
        errors.push(`Erro ao processar "${file.name}": ${err?.message || 'Formato não reconhecido'}`);
      }
    }

    setIsProcessing(false);

    if (errors.length > 0 && allParsed.length === 0) {
      setParseError(errors.join(' | '));
      return;
    }

    if (allParsed.length > 0) {
      const enriched = enrichWithDbStatus(allParsed);
      setParsedItems(enriched);
    }
  };

  const handlePasteProcess = () => {
    if (!xmlInputText.trim()) {
      setParseError('Por favor, cole o conteúdo XML da NF-e.');
      return;
    }

    setIsProcessing(true);
    setParseError(null);
    setImportResult(null);

    try {
      const items = parseNfeXml(xmlInputText, 'XML Colado');
      if (items.length === 0) {
        setParseError('Nenhum dado de motocicleta ou venda encontrado no XML fornecido.');
      } else {
        const enriched = enrichWithDbStatus(items);
        setParsedItems(enriched);
      }
    } catch (err: any) {
      setParseError(`Falha ao analisar XML: ${err?.message || 'Formato inválido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = (sampleXml: string) => {
    setIsProcessing(true);
    setParseError(null);
    setImportResult(null);

    try {
      const items = parseNfeXml(sampleXml, 'Exemplo Shineray');
      const enriched = enrichWithDbStatus(items);
      setParsedItems(enriched);
    } catch (err: any) {
      setParseError(`Erro ao carregar exemplo: ${err?.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.motoExists ? item : { ...item, selected: select }))
    );
  };

  // Warranty configuration change
  const handleUpdateBillingDate = (id: string, newDate: string) => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newSchedule = generateWarrantySchedule(
            newDate,
            item.warrantyConfig.planMonths,
            settings.warrantyRules
          );
          return {
            ...item,
            invoiceDate: newDate,
            warrantyConfig: {
              ...item.warrantyConfig,
              startDate: newDate,
              schedule: newSchedule,
            },
          };
        }
        return item;
      })
    );
  };

  const handleUpdatePlanMonths = (id: string, months: number) => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newSchedule = generateWarrantySchedule(
            item.warrantyConfig.startDate,
            months,
            settings.warrantyRules
          );
          return {
            ...item,
            warrantyConfig: {
              ...item.warrantyConfig,
              planMonths: months,
              schedule: newSchedule,
            },
          };
        }
        return item;
      })
    );
  };

  const handleUpdateField = (
    id: string,
    section: 'client' | 'vehicle',
    field: string,
    value: any
  ) => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [section]: {
              ...item[section],
              [field]: value,
            },
          };
        }
        return item;
      })
    );
  };

  const handleExecuteImport = async () => {
    const selectedItems = parsedItems.filter((i) => i.selected);
    if (selectedItems.length === 0) {
      alert('Selecione ao menos uma motocicleta para importar.');
      return;
    }

    const res = await importMotorcyclesFromNfe(selectedItems);
    setImportResult(res);

    if (res.success) {
      if (onSuccess) onSuccess(res.importedCount);
    }
  };

  const selectedCount = parsedItems.filter((i) => i.selected).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                  Importação de Motos Vendidas via Nota Fiscal (PDF / XML)
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  DANFE PDF & XML 4.0
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Importa automaticamente os dados da venda via DANFE em PDF ou XML SEFAZ e configura o plano completo de garantia
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Step 1: Input / Upload Methods */}
          {parsedItems.length === 0 ? (
            <div className="space-y-5">
              {/* Tabs */}
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  type="button"
                  onClick={() => setInputTab('upload')}
                  className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                    inputTab === 'upload'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload de Arquivos (PDF / XML)
                </button>

                <button
                  type="button"
                  onClick={() => setInputTab('paste')}
                  className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                    inputTab === 'paste'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  Colar Conteúdo do XML
                </button>

                <button
                  type="button"
                  onClick={() => setInputTab('samples')}
                  className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                    inputTab === 'samples'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  Exemplos Shineray Prontos (1 Clique)
                </button>
              </div>

              {/* Tab 1: Upload */}
              {inputTab === 'upload' && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFileUpload(e.dataTransfer.files);
                  }}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                      : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                  }`}
                >
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800 mb-1">
                    Arraste seus documentos PDF (DANFE) ou arquivos XML aqui
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
                    Você pode selecionar arquivos em PDF (DANFE oficial) ou arquivos XML das notas fiscais de venda emitidas para faturamento das motos Shineray 0km.
                  </p>

                  <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all">
                    <FileText className="w-4 h-4" />
                    Selecionar Arquivos (PDF ou XML) do Computador
                    <input
                      type="file"
                      accept=".pdf,.xml,.txt,application/pdf,text/xml,application/xml"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                  </label>
                  <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold">.PDF (DANFE)</span>
                    <span>ou</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold">.XML (SEFAZ)</span>
                  </div>
                </div>
              )}

              {/* Tab 2: Paste */}
              {inputTab === 'paste' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600">
                    Abra o arquivo da Nota Fiscal Eletrônica no seu computador, copie todo o texto XML e cole no campo abaixo:
                  </p>
                  <textarea
                    rows={8}
                    value={xmlInputText}
                    onChange={(e) => setXmlInputText(e.target.value)}
                    placeholder="<nfeProc xmlns='http://www.portalfiscal.inf.br/nfe' ...> ... </nfeProc>"
                    className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handlePasteProcess}
                      disabled={isProcessing || !xmlInputText.trim()}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Processar XML da NF-e
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Samples */}
              {inputTab === 'samples' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 mb-3">
                    Clique em um dos modelos abaixo para simular a importação imediata de uma venda de moto Shineray com nota fiscal e configuração de garantia:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {SAMPLE_SHINERAY_NFES.map((sample, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/40 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs mb-1">
                            <Bike className="w-4 h-4" />
                            {sample.name}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {sample.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLoadSample(sample.xml)}
                          className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Testar com esta NF-e
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error alert */}
              {parseError && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Aviso de Importação:</strong>
                    <span>{parseError}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Review & Warranty Configuration */
            <div className="space-y-6">
              {/* Summary Bar */}
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-950">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold block text-sm">
                      {parsedItems.length} {parsedItems.length === 1 ? 'Motocicleta Identificada' : 'Motocicletas Identificadas'} nas Notas Fiscais
                    </span>
                    <span className="text-indigo-800 text-[11px]">
                      A garantia e o cronograma de revisões foram calculados automaticamente a partir da data de faturamento.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="px-2.5 py-1.5 bg-white border border-indigo-200 text-indigo-900 rounded-lg font-bold text-[11px] hover:bg-indigo-100"
                  >
                    Marcar Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedItems([]);
                      setImportResult(null);
                      setParseError(null);
                    }}
                    className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] hover:bg-slate-300"
                  >
                    Carregar Outro Arquivo
                  </button>
                </div>
              </div>

              {/* Import Result Notification */}
              {importResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                    importResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {importResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <strong className="block font-bold text-sm">
                      {importResult.success
                        ? `Sucesso! ${importResult.importedCount} ${
                            importResult.importedCount === 1 ? 'moto importada' : 'motos importadas'
                          } com plano de garantia configurado.`
                        : 'Falha na importação'}
                    </strong>
                    {importResult.createdClientsCount > 0 && (
                      <p>
                        ✓ {importResult.createdClientsCount} novos clientes cadastrados automaticamente no sistema.
                      </p>
                    )}
                    {importResult.errors.length > 0 && (
                      <ul className="list-disc list-inside text-rose-700 pt-1">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* List of Parsed Motorcycles and Warranty Schedules */}
              <div className="space-y-5">
                {parsedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`rounded-3xl border transition-all overflow-hidden ${
                      item.selected
                        ? 'border-indigo-300 bg-white shadow-md'
                        : 'border-slate-200 bg-slate-50/80 opacity-75'
                    }`}
                  >
                    {/* Item Top Bar */}
                    <div className="p-4 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          disabled={item.motoExists}
                          onChange={() => handleToggleSelect(item.id)}
                          className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-base">
                            Item {index + 1}: {item.vehicle.brand} {item.vehicle.model}
                          </span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-900 text-white">
                            {item.vehicle.plate}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-slate-200 font-semibold text-slate-700">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          NF-e: <strong>{item.invoiceNumber}</strong> (Série {item.series})
                        </div>

                        <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-slate-200 font-semibold text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          Faturamento: <strong>{formatDate(item.invoiceDate)}</strong>
                        </div>

                        {item.totalInvoiceValue > 0 && (
                          <div className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200 font-bold">
                            {formatCurrency(item.totalInvoiceValue)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Item Content Grid */}
                    <div className="p-5 space-y-5">
                      {/* Already in database warning */}
                      {item.motoExists && (
                        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          Esta motocicleta (Chassi ou Placa) já consta como cadastrada no sistema.
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Section A: Customer / Owner Details */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <User className="w-4 h-4 text-indigo-600" />
                              Dados do Comprador (Destinatário da NF-e)
                            </h5>
                            {item.clientExists ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                                <UserCheck className="w-3 h-3" />
                                Cliente Já Cadastrado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold rounded-md">
                                <UserPlus className="w-3 h-3" />
                                Novo Cliente (Auto-cadastro)
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                Nome / Razão Social
                              </label>
                              <input
                                type="text"
                                value={item.client.name}
                                onChange={(e) =>
                                  handleUpdateField(item.id, 'client', 'name', e.target.value)
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                CPF / CNPJ
                              </label>
                              <input
                                type="text"
                                value={item.client.cpfCnpj}
                                onChange={(e) =>
                                  handleUpdateField(
                                    item.id,
                                    'client',
                                    'cpfCnpj',
                                    maskCpfCnpj(e.target.value)
                                  )
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-slate-800 focus:outline-hidden focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                Telefone / WhatsApp
                              </label>
                              <input
                                type="text"
                                value={item.client.phone}
                                onChange={(e) =>
                                  handleUpdateField(
                                    item.id,
                                    'client',
                                    'phone',
                                    maskPhone(e.target.value)
                                  )
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-indigo-500"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                Endereço Completo
                              </label>
                              <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                                {item.client.address}, {item.client.number} - {item.client.neighborhood} • {item.client.city}/{item.client.state} (CEP: {item.client.cep})
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Section B: Motorcycle Technical Details */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                          <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Bike className="w-4 h-4 text-indigo-600" />
                            Ficha do Veículo 0km
                          </h5>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                Modelo da Motocicleta
                              </label>
                              <input
                                type="text"
                                value={item.vehicle.model}
                                onChange={(e) =>
                                  handleUpdateField(item.id, 'vehicle', 'model', e.target.value)
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                Chassi (VIN 17 Dígitos)
                              </label>
                              <input
                                type="text"
                                value={item.vehicle.chassis}
                                onChange={(e) =>
                                  handleUpdateField(
                                    item.id,
                                    'vehicle',
                                    'chassis',
                                    e.target.value.toUpperCase()
                                  )
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 uppercase"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                Número do Motor
                              </label>
                              <input
                                type="text"
                                value={item.vehicle.engineNumber}
                                onChange={(e) =>
                                  handleUpdateField(
                                    item.id,
                                    'vehicle',
                                    'engineNumber',
                                    e.target.value.toUpperCase()
                                  )
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-slate-800 focus:outline-hidden focus:border-indigo-500 uppercase"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                Placa / Identificação
                              </label>
                              <input
                                type="text"
                                value={item.vehicle.plate}
                                onChange={(e) =>
                                  handleUpdateField(
                                    item.id,
                                    'vehicle',
                                    'plate',
                                    maskPlate(e.target.value)
                                  )
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-indigo-700 focus:outline-hidden focus:border-indigo-500 uppercase"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                  Ano Mod.
                                </label>
                                <input
                                  type="number"
                                  value={item.vehicle.year}
                                  onChange={(e) =>
                                    handleUpdateField(
                                      item.id,
                                      'vehicle',
                                      'year',
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase">
                                  Cor
                                </label>
                                <input
                                  type="text"
                                  value={item.vehicle.color}
                                  onChange={(e) =>
                                    handleUpdateField(item.id, 'vehicle', 'color', e.target.value)
                                  }
                                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section C: Full Warranty Configuration generated from Billing Date */}
                      <div className="p-4 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 rounded-2xl border border-indigo-100 space-y-3.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                              <Shield className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-extrabold uppercase tracking-wider text-indigo-950">
                                Configuração de Garantia de Fábrica (Calculada do Faturamento)
                              </h5>
                              <span className="text-[11px] text-indigo-800">
                                A contar da data de emissão/faturamento da NF-e ({formatDate(item.invoiceDate)})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-0.5">
                                Início da Garantia (Data NF-e)
                              </label>
                              <input
                                type="date"
                                value={item.invoiceDate}
                                onChange={(e) => handleUpdateBillingDate(item.id, e.target.value)}
                                className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-950"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-0.5">
                                Plano de Garantia
                              </label>
                              <select
                                value={item.warrantyConfig.planMonths}
                                onChange={(e) =>
                                  handleUpdatePlanMonths(item.id, Number(e.target.value))
                                }
                                className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-950"
                              >
                                <option value={12}>12 Meses (1 Ano - 2 Revisões)</option>
                                <option value={24}>24 Meses (2 Anos - 4 Revisões - Padrão)</option>
                                <option value={36}>36 Meses (3 Anos - 6 Revisões)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Visual timeline of scheduled warranty revisions */}
                        <div className="pt-2 border-t border-indigo-100">
                          <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block mb-2">
                            Cronograma de Revisões Previstas para esta Moto:
                          </span>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {item.warrantyConfig.schedule.map((milestone) => (
                              <div
                                key={milestone.revisionNumber}
                                className={`p-2.5 rounded-xl border text-center space-y-1 ${
                                  milestone.revisionNumber === 1
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                    : 'bg-white text-slate-800 border-indigo-100'
                                }`}
                              >
                                <div
                                  className={`text-[10px] font-extrabold uppercase ${
                                    milestone.revisionNumber === 1
                                      ? 'text-indigo-100'
                                      : 'text-indigo-600'
                                  }`}
                                >
                                  {milestone.revisionNumber}ª Revisão
                                </div>
                                <div className="text-xs font-black font-mono">
                                  {formatKm(milestone.targetKm)}
                                </div>
                                <div
                                  className={`text-[10px] font-medium ${
                                    milestone.revisionNumber === 1
                                      ? 'text-indigo-200'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  Até {formatDate(milestone.maxDate)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            {parsedItems.length > 0 && (
              <span className="text-xs font-bold text-slate-600">
                {selectedCount} de {parsedItems.length} selecionadas para importação
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Fechar
            </button>

            {parsedItems.length > 0 && (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={selectedCount === 0}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Concluir Importação ({selectedCount})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
