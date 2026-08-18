import React, { useEffect, useMemo, useState } from 'react';
import {
  Bike,
  FileText,
  Package,
  Search,
  User as UserIcon,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency, formatKm } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient?: (clientId: string) => void;
  onSelectMotorcycle?: (motoId: string) => void;
  onSelectServiceOrder?: (osId: string) => void;
  onSelectPart?: (partId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectClient,
  onSelectMotorcycle,
  onSelectServiceOrder,
  onSelectPart,
}) => {
  const { clients, motorcycles, serviceOrders, parts } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return { clients: [], motorcycles: [], orders: [], parts: [] };

    const matchedClients = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.cpfCnpj.replace(/\D/g, '').includes(term.replace(/\D/g, '')) ||
        c.phone.replace(/\D/g, '').includes(term.replace(/\D/g, '')) ||
        c.email.toLowerCase().includes(term)
    );

    const matchedMotos = motorcycles.filter(
      (m) =>
        m.plate.toLowerCase().includes(term) ||
        m.model.toLowerCase().includes(term) ||
        m.brand.toLowerCase().includes(term) ||
        m.chassis.toLowerCase().includes(term) ||
        m.renavam.toLowerCase().includes(term)
    );

    const matchedOrders = serviceOrders.filter(
      (os) =>
        os.orderNumber.toLowerCase().includes(term) ||
        os.entryReason.toLowerCase().includes(term) ||
        os.mechanicName.toLowerCase().includes(term)
    );

    const matchedParts = parts.filter(
      (p) =>
        p.active !== false &&
        (p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term))
    );

    return {
      clients: matchedClients.slice(0, 4),
      motorcycles: matchedMotos.slice(0, 4),
      orders: matchedOrders.slice(0, 4),
      parts: matchedParts.slice(0, 4),
    };
  }, [searchTerm, clients, motorcycles, serviceOrders, parts]);

  const totalResults =
    results.clients.length +
    results.motorcycles.length +
    results.orders.length +
    results.parts.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 md:p-20">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-slate-200 bg-slate-50/70">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar cliente, CPF, placa, chassi, nº da OS, peça ou SKU..."
            className="w-full py-4 text-base bg-transparent border-none text-slate-800 placeholder-slate-400 focus:outline-hidden"
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!searchTerm && (
            <div className="py-12 text-center text-slate-400">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-indigo-400 opacity-60" />
              <p className="text-sm font-medium text-slate-600">Busca Global Unificada</p>
              <p className="text-xs text-slate-400 mt-1">
                Digite um termo para pesquisar em toda a concessionária (Clientes, Motos, Ordens de Serviço e Estoque).
              </p>
            </div>
          )}

          {searchTerm && totalResults === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">
              Nenhum resultado encontrado para &quot;<span className="font-semibold">{searchTerm}</span>&quot;.
            </div>
          )}

          {/* Clientes */}
          {results.clients.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" /> Clientes ({results.clients.length})
              </div>
              <div className="space-y-1.5">
                {results.clients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => {
                      onSelectClient?.(client.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 cursor-pointer group transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600">
                        {client.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        CPF: {client.cpfCnpj} • Tel: {client.phone} • {client.city}/{client.state}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Motos */}
          {results.motorcycles.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5" /> Motos Vendidas ({results.motorcycles.length})
              </div>
              <div className="space-y-1.5">
                {results.motorcycles.map((moto) => (
                  <div
                    key={moto.id}
                    onClick={() => {
                      onSelectMotorcycle?.(moto.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 cursor-pointer group transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600">
                        {moto.brand} {moto.model} ({moto.year})
                      </p>
                      <p className="text-xs text-slate-500">
                        Placa: <span className="font-mono font-bold text-slate-700">{moto.plate}</span> • Chassi: {moto.chassis} • {formatKm(moto.currentKm)}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ordens de Serviço */}
          {results.orders.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Ordens de Serviço ({results.orders.length})
              </div>
              <div className="space-y-1.5">
                {results.orders.map((os) => (
                  <div
                    key={os.id}
                    onClick={() => {
                      onSelectServiceOrder?.(os.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 cursor-pointer group transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {os.orderNumber}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">{os.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {os.entryReason} • Total: {formatCurrency(os.finalTotal)} • Mecânico: {os.mechanicName}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Peças & Estoque */}
          {results.parts.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Peças no Estoque ({results.parts.length})
              </div>
              <div className="space-y-1.5">
                {results.parts.map((part) => (
                  <div
                    key={part.id}
                    onClick={() => {
                      onSelectPart?.(part.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 cursor-pointer group transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600">
                        {part.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        SKU: <span className="font-mono font-medium text-slate-700">{part.sku}</span> • Estoque: {part.currentStock} {part.unit} • {formatCurrency(part.salePrice)}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between px-4">
          <span>Pressione <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded-md font-mono text-[10px]">ESC</kbd> para fechar</span>
          <span>{totalResults} resultado(s) encontrado(s)</span>
        </div>
      </div>
    </div>
  );
};
