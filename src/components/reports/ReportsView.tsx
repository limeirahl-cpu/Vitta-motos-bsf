import React, { useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Check,
  DollarSign,
  Download,
  Loader2,
  Package,
  Printer,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, formatDate, formatPaymentMethod } from '../../utils/formatters';
import { StatCard } from '../common/StatCard';
import { ShinerayLogo } from '../common/ShinerayLogo';
import { downloadElementAsPDF } from '../../utils/pdfGenerator';
import { generateWarrantySchedule } from '../../utils/nfeParser';

export const ReportsView: React.FC = () => {
  const {
    serviceOrders,
    motorcycles,
    warrantyRevisions,
    getClientById,
    getMotorcycleById,
    settings,
  } = useStore();

  const reportContainerRef = useRef<HTMLDivElement>(null);
  const [activeReportTab, setActiveReportTab] = useState<'financeiro' | 'revisoes' | 'pecas' | 'servicos'>('financeiro');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Filter completed OS
  const completedOrders = useMemo(() => {
    return serviceOrders.filter((os) => os.status === 'FINALIZADA' || os.status === 'ENTREGUE');
  }, [serviceOrders]);

  // Financial aggregates
  const totalRevenue = completedOrders.reduce((acc, os) => acc + os.finalTotal, 0);
  const totalLaborRevenue = completedOrders.reduce((acc, os) => acc + os.servicesTotal, 0);
  const totalPartsRevenue = completedOrders.reduce((acc, os) => acc + os.partsTotal, 0);
  const averageTicket = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

  // Parts consumption statistics
  const partStats = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; qty: number; totalSold: number }>();
    completedOrders.forEach((os) => {
      os.parts.forEach((p) => {
        const existing = map.get(p.partId) || { name: p.name, sku: p.sku, qty: 0, totalSold: 0 };
        existing.qty += p.quantity;
        existing.totalSold += p.total;
        map.set(p.partId, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [completedOrders]);

  // Services performed statistics
  const serviceStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number; totalRevenue: number }>();
    completedOrders.forEach((os) => {
      os.services.forEach((s) => {
        const existing = map.get(s.name) || { name: s.name, count: 0, totalRevenue: 0 };
        existing.count += 1;
        existing.totalRevenue += s.price;
        map.set(s.name, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [completedOrders]);

  // Top clients by spend
  const topClients = useMemo(() => {
    const map = new Map<string, { name: string; osCount: number; totalSpent: number }>();
    completedOrders.forEach((os) => {
      const c = getClientById(os.clientId);
      const name = c ? c.name : 'Cliente';
      const existing = map.get(os.clientId) || { name, osCount: 0, totalSpent: 0 };
      existing.osCount += 1;
      existing.totalSpent += os.finalTotal;
      map.set(os.clientId, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [completedOrders, getClientById]);

  // Revisions stats
  const completedRevs = warrantyRevisions.filter((r) => r.completed).length;

  // Total revisions expected across the whole fleet's warranty plans, used to
  // compute an honest adherence rate (previously assumed a fixed "2 revisions
  // per bike", which doesn't reflect each motorcycle's actual warranty plan).
  const totalExpectedRevisions = useMemo(() => {
    return motorcycles.reduce((acc, m) => {
      const schedule = generateWarrantySchedule(
        m.warrantyStartDate || m.saleDate,
        m.warrantyPlanMonths || 24,
        settings.warrantyRules
      );
      return acc + schedule.length;
    }, 0);
  }, [motorcycles, settings.warrantyRules]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!reportContainerRef.current) return;
    try {
      setIsGeneratingPDF(true);
      const fileName = `Relatorio_Oficina_${activeReportTab}_${new Date().toISOString().split('T')[0]}.pdf`;
      await downloadElementAsPDF(reportContainerRef.current, {
        fileName,
        orientation: 'portrait',
      });
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Erro ao gerar PDF. Use a opção Imprimir > Salvar como PDF.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Numero OS;Data;Cliente;Moto;Forma Pagamento;Total Servicos;Total Pecas;Total Final\n';
    completedOrders.forEach((os) => {
      const c = getClientById(os.clientId);
      const m = getMotorcycleById(os.motorcycleId);
      const payment = formatPaymentMethod(os.paymentMethod);
      csvContent += `${os.orderNumber};${formatDate(os.openedAt)};"${c?.name || ''}";"${m?.model || ''} (${m?.plate || ''})";"${payment}";${os.servicesTotal};${os.partsTotal};${os.finalTotal}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_faturamento_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Relatórios Gerenciais & Indicadores
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Desempenho da oficina, faturamento, consumo de peças e histórico de revisões
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isGeneratingPDF}
            onClick={handleDownloadPDF}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
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
                <span>PDF Baixado!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Baixar PDF</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
          
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Hidden on Print if needed or displayed cleanly) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <StatCard
          title="Faturamento Total Oficina"
          value={formatCurrency(totalRevenue)}
          subtitle={`${completedOrders.length} ordens de serviço faturadas`}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Receita de Mão de Obra"
          value={formatCurrency(totalLaborRevenue)}
          subtitle="Serviços executados na oficina"
          icon={Wrench}
          color="blue"
        />
        <StatCard
          title="Receita com Peças"
          value={formatCurrency(totalPartsRevenue)}
          subtitle="Peças e materiais aplicados"
          icon={Package}
          color="purple"
        />
        <StatCard
          title="Ticket Médio por OS"
          value={formatCurrency(averageTicket)}
          subtitle="Média por atendimento"
          icon={TrendingUp}
          color="slate"
        />
      </div>

      {/* Report Category Navigation (Hidden in Print) */}
      <div className="flex border-b border-slate-200 gap-2 print:hidden">
        <button
          type="button"
          onClick={() => setActiveReportTab('financeiro')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'financeiro'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Faturamento por OS & Clientes
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('pecas')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'pecas'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Peças Mais Utilizadas
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('servicos')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'servicos'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Serviços Mais Realizados
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('revisoes')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'revisoes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Garantia & Revisões
        </button>
      </div>

      {/* Printable Report Wrapper Container */}
      <div
        ref={reportContainerRef}
        data-pdf-content="true"
        className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 print:border-none print:shadow-none print:p-0 print:rounded-none"
      >
        {/* Printable Header Banner */}
        <div className="hidden print:flex items-center justify-between pb-3 border-b-2 border-black mb-4">
          <div className="flex items-center gap-3">
            <ShinerayLogo variant="horizontal" theme="dark" size="sm" />
          </div>
          <div className="text-right text-[10px]">
            <div className="font-black text-black uppercase">{settings.legalName || 'VITTA COMÉRCIO DE VEÍCULOS LTDA.'}</div>
            <div className="text-slate-600">Relatório Gerencial • {new Date().toLocaleDateString('pt-BR')}</div>
          </div>
        </div>

        {/* TAB 1: FINANCEIRO & CLIENTES */}
        {activeReportTab === 'financeiro' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
            {/* Top Clients by Revenue */}
            <div className="print-section">
              <h3 className="font-bold text-slate-900 text-sm mb-3">
                Clientes com Maior Volume Financeiro
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden print:rounded-none">
                {topClients.slice(0, 10).map((c, idx) => (
                  <div key={idx} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-slate-800">{c.name}</span>
                        <span className="text-[10px] text-slate-400 block">{c.osCount} atendimentos na oficina</span>
                      </div>
                    </div>
                    <span className="font-extrabold text-slate-900">{formatCurrency(c.totalSpent)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Completed OS list */}
            <div className="print-section">
              <h3 className="font-bold text-slate-900 text-sm mb-3">
                Últimas Ordens de Serviço Faturadas
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden print:rounded-none">
                {completedOrders.slice(0, 10).map((os) => {
                  const m = getMotorcycleById(os.motorcycleId);
                  return (
                    <div key={os.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-700">{os.orderNumber}</span>
                          {os.paymentMethod && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {formatPaymentMethod(os.paymentMethod)}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600">{m?.brand} {m?.model} ({m?.plate})</p>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-slate-900">{formatCurrency(os.finalTotal)}</span>
                        <span className="text-[10px] text-slate-400 block">{formatDate(os.finishedAt || os.openedAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PEÇAS MAIS UTILIZADAS */}
        {activeReportTab === 'pecas' && (
          <div className="space-y-4 print-section">
            <h3 className="font-bold text-slate-900 text-sm">
              Ranking de Peças Consumidas em Manutenções
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Posição / Peça</th>
                    <th className="py-2.5 px-3">Código SKU</th>
                    <th className="py-2.5 px-3 text-center">Qtd Utilizada</th>
                    <th className="py-2.5 px-4 text-right">Volume Faturado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partStats.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        #{idx + 1} - {p.name}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{p.sku}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                          {p.qty} un
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        {formatCurrency(p.totalSold)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SERVIÇOS MAIS REALIZADOS */}
        {activeReportTab === 'servicos' && (
          <div className="space-y-4 print-section">
            <h3 className="font-bold text-slate-900 text-sm">
              Serviços de Oficina com Maior Demanda
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Posição / Serviço</th>
                    <th className="py-2.5 px-3 text-center">Vezes Executado</th>
                    <th className="py-2.5 px-4 text-right">Receita Gerada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceStats.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        #{idx + 1} - {s.name}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full">
                          {s.count}x
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        {formatCurrency(s.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: REVISÕES & GARANTIA */}
        {activeReportTab === 'revisoes' && (
          <div className="space-y-4 print-section">
            <h3 className="font-bold text-slate-900 text-sm">
              Histórico de Retenção & Cumprimento de Garantia
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-950">
                <span className="text-xs font-bold block uppercase text-indigo-700">Motos Vendidas</span>
                <span className="text-2xl font-extrabold">{motorcycles.length} veículos</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-950">
                <span className="text-xs font-bold block uppercase text-emerald-700">Revisões Realizadas</span>
                <span className="text-2xl font-extrabold">{completedRevs} concluídas</span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-950">
                <span className="text-xs font-bold block uppercase text-amber-700">Taxa de Adesão</span>
                <span className="text-2xl font-extrabold">
                  {totalExpectedRevisions > 0 ? ((completedRevs / totalExpectedRevisions) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
