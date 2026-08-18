import React, { useState } from 'react';
import {
  Clock,
  Edit2,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { WorkshopService } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const ServicesCatalogView: React.FC = () => {
  const { services, addService, updateService, deleteService } = useStore();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<WorkshopService | null>(null);
  const [itemToDelete, setItemToDelete] = useState<WorkshopService | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [defaultPrice, setDefaultPrice] = useState<number>(100);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(60);
  const [description, setDescription] = useState('');

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setItemToEdit(null);
    setName('');
    setDefaultPrice(120);
    setEstimatedMinutes(60);
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: WorkshopService) => {
    setItemToEdit(item);
    setName(item.name);
    setDefaultPrice(item.defaultPrice);
    setEstimatedMinutes(item.estimatedMinutes);
    setDescription(item.description);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (itemToEdit) {
      await updateService(itemToEdit.id, {
        name: name.trim(),
        defaultPrice: Number(defaultPrice),
        estimatedMinutes: Number(estimatedMinutes),
        description: description.trim(),
      });
    } else {
      await addService({
        name: name.trim(),
        defaultPrice: Number(defaultPrice),
        estimatedMinutes: Number(estimatedMinutes),
        description: description.trim(),
        active: true,
      });
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    await deleteService(itemToDelete.id);
    setItemToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-indigo-600" />
            Tabela & Catálogo de Serviços
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Preços padrão de mão de obra e tempos estimados de execução na oficina
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Serviço
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar serviço ou procedimento..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:border-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total: <strong>{filteredServices.length}</strong> serviços cadastrados
        </div>
      </div>

      {/* Grid of Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-md">
                  Mão de Obra
                </span>
                <div className="flex items-center gap-1 text-slate-400 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{service.estimatedMinutes} min</span>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 text-base mb-1">
                {service.name}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2">
                {service.description || 'Sem descrição cadastrada.'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Mão de Obra</span>
                <span className="text-base font-extrabold text-slate-900">
                  {formatCurrency(service.defaultPrice)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(service)}
                  title="Editar Serviço"
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setItemToDelete(service)}
                    title="Excluir Serviço"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">
                {itemToEdit ? 'Editar Serviço' : 'Novo Serviço de Oficina'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Troca de Relação Completa"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tempo Estimado (min)
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Preço Sugerido (R$) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    required
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-indigo-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Descrição dos Procedimentos
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Itens inspecionados ou passos de execução..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {itemToDelete && (
        <ConfirmationModal
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Excluir Serviço"
          message={`Tem certeza que deseja excluir o serviço "${itemToDelete.name}"?`}
          confirmText="Sim, Excluir"
        />
      )}
    </div>
  );
};
