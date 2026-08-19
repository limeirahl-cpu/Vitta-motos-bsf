import React, { useRef, useState } from 'react';
import { Check, Download, FileText, Loader2, Printer, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ServiceOrder } from '../../types';
import { ShinerayLogo } from '../common/ShinerayLogo';
import { downloadElementAsPDF } from '../../utils/pdfGenerator';
import { formatPaymentMethod } from '../../utils/formatters';

interface PrintServiceOrderModalProps {
  order: ServiceOrder;
  onClose: () => void;
  initialMode?: 'os' | 'orcamento';
}

export const PrintServiceOrderModal: React.FC<PrintServiceOrderModalProps> = ({
  order,
  onClose,
  initialMode,
}) => {
  const { getClientById, getMotorcycleById, settings } = useStore();
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Auto-detect if it's an estimate/budget or let user toggle
  const defaultMode = initialMode || (order.status === 'AGUARDANDO_APROVACAO' ? 'orcamento' : 'os');
  const [docType, setDocType] = useState<'os' | 'orcamento'>(defaultMode);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  const client = getClientById(order.clientId);
  const moto = getMotorcycleById(order.motorcycleId);

  const handlePrint = () => {
    document.body.classList.add('printing-active-doc');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-active-doc');
    }, 1000);
  };

  const handleDownloadPDF = async () => {
    if (!printContainerRef.current) return;
    try {
      setIsGeneratingPDF(true);
      const prefix = docType === 'orcamento' ? 'Orcamento' : 'Ordem_Servico';
      const cleanNumber = order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const clientName = (client?.name || 'Cliente').substring(0, 15).replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${prefix}_${cleanNumber}_${clientName}.pdf`;

      await downloadElementAsPDF(printContainerRef.current, {
        fileName,
        orientation: 'portrait',
      });

      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Houve um erro ao gerar o arquivo PDF. Tente usar a opção "Imprimir" e selecionar "Salvar como PDF".');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '__/__/____';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return isoStr;
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || isNaN(val)) return '0,00';
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calculate validity date (15 days from openedAt)
  const getValidityDate = () => {
    try {
      const d = new Date(order.openedAt || new Date());
      d.setDate(d.getDate() + 15);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return '__/__/____';
    }
  };

  // Dynamic row count budgeted to maintain exact 1-page A4 proportion
  const minRows = 3;
  const totalServiceRows = Math.max(order.services.length, minRows);
  const totalPartRows = Math.max(order.parts.length, minRows);

  const isOrcamento = docType === 'orcamento';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      {/* Container Dialog */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:rounded-none">
        
        {/* Modal Action Toolbar (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-800/90 border-b border-slate-700/80 print:hidden text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 text-red-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{isOrcamento ? 'Orçamento / Proposta Comercial' : 'Ordem de Serviço Oficial'}</span>
                <span className="text-xs font-mono bg-slate-700 text-slate-200 px-2 py-0.5 rounded-lg border border-slate-600">
                  {order.orderNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Padrão A4 calibrado para impressão e exportação PDF sem cortes
              </p>
            </div>
          </div>

          {/* Format Switcher & Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Toggle OS / Orçamento */}
            <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-700 flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setDocType('os')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  !isOrcamento
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ordem de Serviço
              </button>
              <button
                type="button"
                onClick={() => setDocType('orcamento')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  isOrcamento
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Orçamento
              </button>
            </div>

            {/* Direct Download PDF Button */}
            <button
              type="button"
              disabled={isGeneratingPDF}
              onClick={handleDownloadPDF}
              title="Baixar arquivo PDF formatado para A4"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all ${
                pdfSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              } disabled:opacity-50`}
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando PDF...</span>
                </>
              ) : pdfSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Baixado!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar PDF</span>
                </>
              )}
            </button>

            {/* Print / Save as PDF Browser Dialog */}
            <button
              type="button"
              onClick={handlePrint}
              title="Abrir diálogo de impressão do navegador"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700/50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Page (A4 Form View) */}
        <div className="overflow-y-auto p-2 sm:p-6 bg-slate-950/70 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={printContainerRef}
            id="printable-service-order-document"
            data-pdf-content="true"
            className="printable-document-page bg-white text-black rounded-sm shadow-xl border border-slate-300 print:shadow-none print:border-none print:p-0"
            style={{
              width: '794px',
              minWidth: '794px',
              maxWidth: '794px',
              boxSizing: 'border-box',
              padding: '14px 20px',
              margin: '0 auto',
              fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
              fontSize: '10px',
              lineHeight: '1.4',
              color: '#000000',
              backgroundColor: '#ffffff',
            }}
          >
            {/* Header: Brand and Company Details */}
            <div style={{ borderBottom: '2px solid #000000', paddingBottom: '6px', marginBottom: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '38%', verticalAlign: 'middle' }}>
                      <ShinerayLogo variant="horizontal" theme="dark" size="md" />
                    </td>
                    <td style={{ width: '62%', textAlign: 'right', verticalAlign: 'top', fontSize: '9.5px', lineHeight: '1.35' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '11.5px', textTransform: 'uppercase', color: '#000000' }}>
                        {settings.legalName || settings.storeName || 'VITTA COMÉRCIO DE VEÍCULOS LTDA.'}
                      </div>
                      <div style={{ fontWeight: 'bold', color: '#111827', marginTop: '1px' }}>
                        CNPJ: {settings.cnpj || '54.315.550/0002-00'}
                      </div>
                      <div style={{ color: '#374151' }}>
                        {settings.address || 'Avenida Jones dos Santos Neves'}, nº {settings.number || '222'} - {settings.neighborhood || 'Centro'}
                      </div>
                      <div style={{ color: '#374151' }}>
                        {settings.city || 'Barra de São Francisco'} - {settings.state || 'ES'} • Tel: {settings.phone || '(27) 3756-1234'}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Document Title Banner */}
            <div
              style={{
                backgroundColor: '#1e293b',
                color: '#ffffff',
                textAlign: 'center',
                padding: '5px 8px',
                fontWeight: 'bold',
                fontSize: '12px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                borderRadius: '2px',
                marginBottom: '6px',
              }}
            >
              {isOrcamento ? 'ORÇAMENTO DE SERVIÇOS E PEÇAS' : 'ORDEM DE SERVIÇO DE MANUTENÇÃO'}
            </div>

            {/* Number & Date Metadata Bar */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #000000',
                backgroundColor: '#f8fafc',
                fontSize: '10px',
                lineHeight: '1.35',
                marginBottom: '6px',
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #000000', width: '38%', verticalAlign: 'middle' }}>
                    <strong>{isOrcamento ? 'Nº do Orçamento:' : 'Nº da Ordem de Serviço:'}</strong>{' '}
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px' }}>
                      {order.orderNumber}
                    </span>
                  </td>
                  <td style={{ padding: '4px 8px', borderRight: '1px solid #000000', width: '32%', verticalAlign: 'middle' }}>
                    <strong>Data de Emissão:</strong> {formatDate(order.openedAt)}
                  </td>
                  <td style={{ padding: '4px 8px', width: '30%', textAlign: 'right', verticalAlign: 'middle' }}>
                    {isOrcamento ? (
                      <span>
                        <strong>Validade da Proposta:</strong> {getValidityDate()}
                      </span>
                    ) : (
                      <span>
                        <strong>Status:</strong> {order.status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 1. DADOS DO CLIENTE / SOLICITANTE */}
            <div style={{ marginBottom: '6px' }}>
              <div
                style={{
                  backgroundColor: '#e2e8f0',
                  border: '1px solid #000000',
                  borderBottom: 'none',
                  padding: '3px 8px',
                  fontWeight: 'bold',
                  fontSize: '9.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                }}
              >
                1. Dados do Cliente / Solicitante
              </div>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #000000',
                  fontSize: '9.5px',
                  lineHeight: '1.35',
                  backgroundColor: '#ffffff',
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', width: '65%', verticalAlign: 'middle' }}>
                      <strong>Nome:</strong> {client?.name || '________________________________________________'}
                    </td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #cbd5e1', width: '35%', verticalAlign: 'middle' }}>
                      <strong>CPF/CNPJ:</strong> {client?.cpfCnpj || '_________________________'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', borderRight: '1px solid #cbd5e1', width: '65%', verticalAlign: 'middle' }}>
                      <strong>Endereço:</strong>{' '}
                      {client?.address
                        ? `${client.address}, ${client.number || 'S/N'} - ${client.neighborhood || ''} - ${client.city || ''}/${client.state || ''}`
                        : '________________________________________________'}
                    </td>
                    <td style={{ padding: '4px 8px', width: '35%', verticalAlign: 'middle' }}>
                      <strong>Telefone/WhatsApp:</strong> {client?.phone || client?.whatsapp || '_________________________'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. DADOS DA MOTOCICLETA / VEÍCULO */}
            <div style={{ marginBottom: '6px' }}>
              <div
                style={{
                  backgroundColor: '#e2e8f0',
                  border: '1px solid #000000',
                  borderBottom: 'none',
                  padding: '3px 8px',
                  fontWeight: 'bold',
                  fontSize: '9.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                }}
              >
                2. Dados da Motocicleta / Veículo e Prazos
              </div>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #000000',
                  fontSize: '9.5px',
                  lineHeight: '1.35',
                  backgroundColor: '#ffffff',
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', width: '25%', verticalAlign: 'middle' }}>
                      <strong>Marca:</strong> {moto?.brand || 'Shineray'}
                    </td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', width: '35%', verticalAlign: 'middle' }}>
                      <strong>Modelo:</strong> {moto?.model || '__________________'}
                    </td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', width: '20%', verticalAlign: 'middle' }}>
                      <strong>Ano/Mod:</strong> {moto?.year || '______'}
                    </td>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #cbd5e1', width: '20%', verticalAlign: 'middle' }}>
                      <strong>Cor:</strong> {moto?.color || '________'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                      <strong>Placa:</strong>{' '}
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {moto?.plate || '_________'}
                      </span>
                    </td>
                    <td colSpan={3} style={{ padding: '4px 8px', borderBottom: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                      <strong>Chassi (VIN):</strong>{' '}
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {moto?.chassis || '__________________________________'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', borderRight: '1px solid #cbd5e1', width: '25%', verticalAlign: 'middle' }}>
                      <strong>KM Entrada:</strong>{' '}
                      <span style={{ fontWeight: 'bold' }}>
                        {(order.currentKm || moto?.currentKm || 0).toLocaleString('pt-BR')} km
                      </span>
                    </td>
                    <td style={{ padding: '4px 8px', borderRight: '1px solid #cbd5e1', width: '25%', verticalAlign: 'middle' }}>
                      <strong>Data Entrada:</strong> {formatDate(order.openedAt)}
                    </td>
                    <td style={{ padding: '4px 8px', borderRight: '1px solid #cbd5e1', width: '25%', verticalAlign: 'middle' }}>
                      <strong>Data Finalizada:</strong>{' '}
                      <span style={{ fontWeight: order.finishedAt ? 'bold' : 'normal' }}>
                        {order.finishedAt ? formatDate(order.finishedAt) : (isOrcamento ? '—' : 'Pendente')}
                      </span>
                    </td>
                    <td style={{ padding: '4px 8px', width: '25%', verticalAlign: 'middle' }}>
                      <strong>{isOrcamento ? 'Previsão Entrega:' : 'Data Saída:'}</strong>{' '}
                      <span style={{ fontWeight: order.deliveredAt ? 'bold' : 'normal' }}>
                        {order.deliveredAt
                          ? formatDate(order.deliveredAt)
                          : order.estimatedCompletionAt
                          ? 'Prev: ' + formatDate(order.estimatedCompletionAt)
                          : isOrcamento
                          ? getValidityDate()
                          : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. SERVIÇOS EXECUTADOS / MÃO DE OBRA */}
            <div style={{ marginBottom: '6px' }}>
              <div
                style={{
                  backgroundColor: '#e2e8f0',
                  border: '1px solid #000000',
                  borderBottom: 'none',
                  padding: '3px 8px',
                  fontWeight: 'bold',
                  fontSize: '9.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>3. Serviços Realizados / Mão de Obra</span>
                <span>Subtotal Serviços: R$ {formatCurrency(order.servicesTotal)}</span>
              </div>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #000000',
                  fontSize: '9.5px',
                  lineHeight: '1.35',
                  tableLayout: 'fixed',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000000' }}>
                    <th style={{ width: '35px', padding: '4px 4px', textAlign: 'center', borderRight: '1px solid #000000', verticalAlign: 'middle' }}>Item</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', borderRight: '1px solid #000000', verticalAlign: 'middle' }}>Descrição do Serviço</th>
                    <th style={{ width: '100px', padding: '4px 8px', textAlign: 'right', verticalAlign: 'middle' }}>Valor (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: totalServiceRows }).map((_, index) => {
                    const item = order.services[index];
                    return (
                      <tr
                        key={`srv-${index}`}
                        style={{
                          borderBottom: index === totalServiceRows - 1 ? 'none' : '1px solid #e2e8f0',
                        }}
                      >
                        <td style={{ textAlign: 'center', borderRight: '1px solid #000000', fontFamily: 'monospace', color: '#475569', padding: '3.5px 4px', verticalAlign: 'middle' }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '3.5px 8px', borderRight: '1px solid #000000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          {item ? item.name : ''}
                        </td>
                        <td style={{ padding: '3.5px 8px', textAlign: 'right', fontFamily: 'monospace', verticalAlign: 'middle' }}>
                          {item ? formatCurrency(item.price) : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4. PEÇAS E MATERIAIS APLICADOS */}
            <div style={{ marginBottom: '6px' }}>
              <div
                style={{
                  backgroundColor: '#e2e8f0',
                  border: '1px solid #000000',
                  borderBottom: 'none',
                  padding: '3px 8px',
                  fontWeight: 'bold',
                  fontSize: '9.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>4. Peças e Materiais Utilizados</span>
                <span>Subtotal Peças: R$ {formatCurrency(order.partsTotal)}</span>
              </div>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #000000',
                  fontSize: '9.5px',
                  lineHeight: '1.35',
                  tableLayout: 'fixed',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000000' }}>
                    <th style={{ width: '35px', padding: '4px 4px', textAlign: 'center', borderRight: '1px solid #000000', verticalAlign: 'middle' }}>Item</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left', borderRight: '1px solid #000000', verticalAlign: 'middle' }}>Descrição da Peça / Código</th>
                    <th style={{ width: '45px', padding: '4px 4px', textAlign: 'center', borderRight: '1px solid #000000', verticalAlign: 'middle' }}>Qtd.</th>
                    <th style={{ width: '85px', padding: '4px 8px', textAlign: 'right', borderRight: '1px solid #000000', verticalAlign: 'middle' }}>Valor Unit.</th>
                    <th style={{ width: '95px', padding: '4px 8px', textAlign: 'right', verticalAlign: 'middle' }}>Total (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: totalPartRows }).map((_, index) => {
                    const item = order.parts[index];
                    return (
                      <tr
                        key={`prt-${index}`}
                        style={{
                          borderBottom: index === totalPartRows - 1 ? 'none' : '1px solid #e2e8f0',
                        }}
                      >
                        <td style={{ textAlign: 'center', borderRight: '1px solid #000000', fontFamily: 'monospace', color: '#475569', padding: '3.5px 4px', verticalAlign: 'middle' }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '3.5px 8px', borderRight: '1px solid #000000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          {item ? item.name : ''}
                        </td>
                        <td style={{ textAlign: 'center', borderRight: '1px solid #000000', fontFamily: 'monospace', padding: '3.5px 4px', verticalAlign: 'middle' }}>
                          {item ? item.quantity : ''}
                        </td>
                        <td style={{ padding: '3.5px 8px', textAlign: 'right', fontFamily: 'monospace', verticalAlign: 'middle' }}>
                          {item ? formatCurrency(item.unitPrice) : ''}
                        </td>
                        <td style={{ padding: '3.5px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', verticalAlign: 'middle' }}>
                          {item ? formatCurrency(item.total) : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 5. RESUMO FINANCEIRO (TOTAIS, DESCONTOS & FORMA DE PAGAMENTO) */}
            <div style={{ marginBottom: '6px' }}>
              <div
                style={{
                  backgroundColor: '#e2e8f0',
                  border: '1px solid #000000',
                  borderBottom: 'none',
                  padding: '3px 8px',
                  fontWeight: 'bold',
                  fontSize: '9.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                }}
              >
                5. Resumo Financeiro
              </div>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #000000',
                  fontSize: '10px',
                  lineHeight: '1.35',
                  backgroundColor: '#ffffff',
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ width: '16%', padding: '4px 6px', borderRight: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '8.5px', color: '#475569' }}>Total Peças:</div>
                      <div style={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '10.5px' }}>
                        R$ {formatCurrency(order.partsTotal)}
                      </div>
                    </td>
                    <td style={{ width: '16%', padding: '4px 6px', borderRight: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '8.5px', color: '#475569' }}>Total Serviços:</div>
                      <div style={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '10.5px' }}>
                        R$ {formatCurrency(order.servicesTotal)}
                      </div>
                    </td>
                    <td style={{ width: '15%', padding: '4px 6px', borderRight: '1px solid #cbd5e1', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '8.5px', color: '#475569' }}>Descontos:</div>
                      <div style={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '10.5px', color: '#047857' }}>
                        - R$ {formatCurrency(order.generalDiscount || 0)}
                      </div>
                    </td>
                    <td style={{ width: '28%', padding: '4px 7px', borderRight: '1px solid #000000', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '8.5px', color: '#475569', marginBottom: '1px' }}>Forma de Pagamento:</div>
                      <div style={{ fontWeight: 'bold', fontSize: '9.5px', color: '#0f172a', lineHeight: '1.25', wordBreak: 'normal', whiteSpace: 'normal' }}>
                        {formatPaymentMethod(order.paymentMethod)}
                      </div>
                    </td>
                    <td style={{ width: '25%', padding: '4px 8px', backgroundColor: '#f1f5f9', textAlign: 'right', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '8.5px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        {isOrcamento ? 'Total Orçamento:' : 'Total da OS:'}
                      </div>
                      <div style={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '12.5px', color: '#000000' }}>
                        R$ {formatCurrency(order.finalTotal)}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 6. OBSERVAÇÕES E CONDIÇÕES */}
            <div style={{ marginBottom: '6px' }}>
              <div
                style={{
                  backgroundColor: '#e2e8f0',
                  border: '1px solid #000000',
                  borderBottom: 'none',
                  padding: '3px 8px',
                  fontWeight: 'bold',
                  fontSize: '9.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                }}
              >
                6. Observações e Termos
              </div>
              <div
                style={{
                  border: '1px solid #000000',
                  padding: '5px 8px',
                  fontSize: '9px',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  lineHeight: '1.35',
                }}
              >
                <div>
                  <strong>Relato / Diagnóstico Técnico:</strong>{' '}
                  {order.reportedProblem || order.diagnosis
                    ? `${order.reportedProblem || ''} ${order.diagnosis ? ' • Diagnóstico: ' + order.diagnosis : ''}`
                    : 'Revisão e manutenção técnica periódica executada conforme especificações da montadora Shineray.'}
                </div>
                <div style={{ marginTop: '3px', fontSize: '8.5px', color: '#4b5563' }}>
                  {isOrcamento
                    ? 'Proposta comercial válida por 15 dias. Os preços e prazos orçados poderão sofrer alterações caso sejam constatadas necessidades adicionais de peças ou serviços durante a desmontagem técnica, mediante prévia autorização do cliente.'
                    : 'Garantia legal de 90 (noventa) dias para os serviços e peças aplicados, contados a partir da data de entrega, cobrindo exclusivamente defeitos de montagem ou fabricação. A garantia não cobre desgaste natural, mau uso ou intervenção de terceiros.'}
                </div>
              </div>
            </div>

            {/* 7. DUAL SIGNATURES (Anchored to footer) */}
            <div style={{ marginTop: '12px', paddingTop: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '46%', verticalAlign: 'top', padding: '0 10px' }}>
                      <div style={{ borderTop: '1px solid #000000', paddingTop: '4px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '9.5px' }}>
                          {isOrcamento ? 'De acordo do Cliente (Aprovação)' : 'Assinatura do Cliente / Proprietário'}
                        </div>
                        <div style={{ fontSize: '8.5px', color: '#4b5563', marginTop: '1px' }}>
                          {client?.name || 'Cliente'}
                        </div>
                      </div>
                    </td>
                    <td style={{ width: '8%' }}></td>
                    <td style={{ width: '46%', verticalAlign: 'top', padding: '0 10px' }}>
                      <div style={{ borderTop: '1px solid #000000', paddingTop: '4px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '9.5px' }}>
                          {isOrcamento ? 'Responsável Técnico / Orçamentista' : 'Assinatura / Carimbo da Concessionária'}
                        </div>
                        <div style={{ fontSize: '8.5px', color: '#4b5563', marginTop: '1px' }}>
                          {settings.legalName || settings.storeName || 'VITTA Comércio de Veículos Ltda.'}
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
