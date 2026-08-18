import React, { useMemo, useState } from 'react';
import {
  Bike,
  CalendarClock,
  Edit2,
  Eye,
  FileCode,
  Filter,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { Motorcycle, RevisionStatus } from '../../types';
import { formatDate, formatKm } from '../../utils/formatters';
import { RevisionStatusBadge } from '../common/Badge';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { ImportNfeModal } from './ImportNfeModal';
import { MotorcycleDetailModal } from './MotorcycleDetailModal';
import { MotorcycleFormModal } from './MotorcycleFormModal';

interface MotorcyclesListProps {
  onSelectClient: (clientId: string) => void;
  onSelectMoto?: (motoId: string) => void;
  onSelectOrder?: (orderId: string) => void;
  onOpenNewOS?: (motoId: string) => void;
  onCreateOrder?: (motoId: string) => void;
  onOpenRegisterRevision?: (motoId: string) => void;
  onRegisterRevision?: (motoId: string) => void;
}

export const MotorcyclesList: React.FC<MotorcyclesListProps> = ({
  onSelectClient,
  onSelectMoto,
  onSelectOrder,
  onOpenNewOS,
  onCreateOrder,
  onOpenRegisterRevision,
  onRegisterRevision,
}) => {
  const handleRegisterRevision = (motoId: string) => {
    if (onOpenRegisterRevision) {
      onOpenRegisterRevision(motoId);
    } else if (onRegisterRevision) {
      onRegisterRevision(motoId);
    }
  };

  const handleCreateOrder = (motoId: string) => {
    if (onOpenNewOS) {
      onOpenNewOS(motoId);
    } else if (onCreateOrder) {
      onCreateOrder(motoId);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    if (onSelectOrder) {
      onSelectOrder(orderId);
    }
  };
  const {
    motorcycles,
    clients,
    addMotorcycle,
    updateMotorcycle,
    deleteMotorcycle,
    getMotorcycleNextRevision,
    getClientById,
  } = useStore();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMotoForDetail, setSelectedMotoForDetail] = useState<Motorcycle | null>(null);
  const [motoToEdit, setMotoToEdit] = useState<Motorcycle | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportNfeOpen, setIsImportNfeOpen] = useState(false);
  const [motoToDelete, setMotoToDelete] = useState<Motorcycle | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filter and enrich
  const filteredMotos = useMemo(() => {
    return motorcycles.filter((m) => {
      const term = searchTerm.toLowerCase().trim();
      const client = getClientById(m.clientId);
      const nextRev = getMotorcycleNextRevision(m);

      const matchesSearch =
        !term ||
        m.plate.toLowerCase().includes(term) ||
        m.model.toLowerCase().includes(term) ||
        m.brand.toLowerCase().includes(term) ||
        m.chassis.toLowerCase().includes(term) ||
        m.renavam.toLowerCase().includes(term) ||
        (client && client.name.toLowerCase().includes(term));

      const matchesBrand = brandFilter === 'ALL' || m.brand === brandFilter;

      const matchesStatus =
        statusFilter === 'ALL' || nextRev.status === statusFilter;

      return matchesSearch && matchesBrand && matchesStatus;
    });
  }, [motorcycles, searchTerm, brandFilter, statusFilter, getClientById, getMotorcycleNextRevision]);

  const uniqueBrands = Array.from(new Set(motorcycles.map((m) => m.brand)));

  const handleSaveMoto = async (motoData: Omit<Motorcycle, 'id' | 'createdAt'>) => {
    if (motoToEdit) {
      await updateMotorcycle(motoToEdit.id, motoData);
    } else {
      const res = await addMotorcycle(motoData);
      if (!res.success) {
        // Returning the failure lets the form modal stay open with the
        // user's data intact instead of closing and losing everything typed.
        return res;
      }
    }
    setMotoToEdit(null);
    return { success: true };
  };

  const handleConfirmDelete = async () => {
    if (!motoToDelete) return;
    const res = await deleteMotorcycle(motoToDelete.id);
    if (!res.success) {
      setDeleteError(res.message || 'Erro ao excluir');
    } else {
      setMotoToDelete(null);
      setDeleteError(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bike className="w-6 h-6 text-indigo-600" />
            Motos Vendidas & Fichas Técnicas
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Controle de veículos 0km, quilometragens e status da garantia de fábrica
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsImportNfeOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            Importar via Nota Fiscal (PDF / XML)
          </button>

          <button
            type="button"
            onClick={() => {
              setMotoToEdit(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Moto Manual
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
            placeholder="Buscar por placa, modelo, chassi ou cliente..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Shineray Brand Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            Concessionária Shineray
          </div>

          {/* Status select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Todos os Status de Revisão</option>
            <option value="DISTANTE">Em Dia / Distante</option>
            <option value="PROXIMA">Próximas</option>
            <option value="VENCENDO">Vencendo em Breve</option>
            <option value="ATRASADA">Atrasadas</option>
          </select>
        </div>
      </div>

      {/* Grid of Motorcycles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMotos.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
            <Bike className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium text-slate-600">Nenhuma motocicleta encontrada</p>
            <p className="text-xs text-slate-400 mt-1">Ajuste os filtros de pesquisa acima.</p>
          </div>
        ) : (
          filteredMotos.map((moto) => {
            const client = getClientById(moto.clientId);
            const nextRev = getMotorcycleNextRevision(moto);

            return (
              <div
                key={moto.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top bar with brand & plate */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {moto.brand}
                      </span>
                      <h3
                        onClick={() => setSelectedMotoForDetail(moto)}
                        className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 cursor-pointer"
                      >
                        {moto.model} ({moto.year})
                      </h3>
                    </div>
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-900 text-white tracking-wider">
                      {moto.plate}
                    </span>
                  </div>

                  {/* Owner and details */}
                  <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs text-slate-600 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Proprietário:</span>
                      <span
                        onClick={() => client && onSelectClient(client.id)}
                        className="font-bold text-slate-800 hover:text-indigo-600 cursor-pointer truncate max-w-[150px]"
                      >
                        {client?.name || 'Cliente'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">KM Atual:</span>
                      <span className="font-bold text-indigo-700 font-mono">
                        {formatKm(moto.currentKm)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Data da Venda:</span>
                      <span>{formatDate(moto.saleDate)}</span>
                    </div>

                    {moto.sellerName && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400">Vendedor:</span>
                        <span className="font-semibold text-indigo-700">{moto.sellerName}</span>
                      </div>
                    )}
                  </div>

                  {/* Next Revision Status Card */}
                  <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 mb-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Próxima Revisão
                      </span>
                      <RevisionStatusBadge status={nextRev.status} />
                    </div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        {nextRev.revisionNumber}ª Rev: {formatKm(nextRev.targetKm)}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Até {formatDate(nextRev.maxDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCreateOrder(moto.id)}
                      title="Abrir Ordem de Serviço"
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>OS</span>
                    </button>
                    <button
                      onClick={() => handleRegisterRevision(moto.id)}
                      title="Registrar Revisão de Garantia"
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      <span>Revisão</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (onSelectMoto) {
                          onSelectMoto(moto.id);
                        } else {
                          setSelectedMotoForDetail(moto);
                        }
                      }}
                      title="Ver Histórico & Dossiê"
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setMotoToEdit(moto);
                        setIsFormOpen(true);
                      }}
                      title="Editar Dados da Moto"
                      className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setMotoToDelete(moto);
                          setDeleteError(null);
                        }}
                        title="Excluir Moto"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <MotorcycleFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setMotoToEdit(null);
          }}
          onSave={handleSaveMoto}
          initialData={motoToEdit}
        />
      )}

      {/* Import NF-e Modal */}
      {isImportNfeOpen && (
        <ImportNfeModal
          isOpen={isImportNfeOpen}
          onClose={() => setIsImportNfeOpen(false)}
        />
      )}

      {/* Detail Modal */}
      {selectedMotoForDetail && (
        <MotorcycleDetailModal
          isOpen={!!selectedMotoForDetail}
          motorcycle={selectedMotoForDetail}
          onClose={() => setSelectedMotoForDetail(null)}
          onSelectClient={onSelectClient}
          onSelectOrder={handleSelectOrder}
          onCreateOrder={handleCreateOrder}
          onRegisterRevision={handleRegisterRevision}
        />
      )}

      {/* Delete Confirmation Modal */}
      {motoToDelete && (
        <ConfirmationModal
          isOpen={!!motoToDelete}
          onClose={() => {
            setMotoToDelete(null);
            setDeleteError(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Excluir Motocicleta"
          message={
            deleteError ||
            `Tem certeza que deseja excluir a moto "${motoToDelete.brand} ${motoToDelete.model}" (Placa: ${motoToDelete.plate})?`
          }
          confirmText="Sim, Excluir"
        />
      )}
    </div>
  );
};
