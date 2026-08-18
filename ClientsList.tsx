import React, { useMemo, useState } from 'react';
import {
  Edit2,
  Eye,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { Client } from '../../types';
import { formatDate } from '../../utils/formatters';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { ClientDetailModal } from './ClientDetailModal';
import { ClientFormModal } from './ClientFormModal';

interface ClientsListProps {
  onSelectClient?: (clientId: string) => void;
  onSelectMoto?: (motoId: string) => void;
  onSelectOrder?: (orderId: string) => void;
  onOpenNewOSForClient?: (clientId: string) => void;
  onCreateOrder?: (clientId: string) => void;
}

export const ClientsList: React.FC<ClientsListProps> = ({
  onSelectClient,
  onSelectMoto,
  onSelectOrder,
  onOpenNewOSForClient,
  onCreateOrder,
}) => {
  const handleSelectMoto = (motoId: string) => {
    if (onSelectMoto) onSelectMoto(motoId);
  };

  const handleSelectOrder = (orderId: string) => {
    if (onSelectOrder) onSelectOrder(orderId);
  };

  const handleCreateOrder = (clientId: string) => {
    if (onOpenNewOSForClient) {
      onOpenNewOSForClient(clientId);
    } else if (onCreateOrder) {
      onCreateOrder(clientId);
    }
  };
  const { clients, addClient, updateClient, deleteClient, motorcycles, serviceOrders } = useStore();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<Client | null>(null);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.cpfCnpj.replace(/\D/g, '').includes(term.replace(/\D/g, '')) ||
        c.phone.replace(/\D/g, '').includes(term.replace(/\D/g, '')) ||
        c.email.toLowerCase().includes(term) ||
        c.city.toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  const handleSaveClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    if (clientToEdit) {
      await updateClient(clientToEdit.id, clientData);
    } else {
      await addClient(clientData);
    }
    setClientToEdit(null);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    const res = await deleteClient(clientToDelete.id);
    if (!res.success) {
      setDeleteError(res.message || 'Erro ao excluir');
    } else {
      setClientToDelete(null);
      setDeleteError(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600" />
            Cadastro de Clientes
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gerenciamento completo de proprietários e histórico veicular
          </p>
        </div>

        <button
          onClick={() => {
            setClientToEdit(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, CPF/CNPJ ou telefone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total: <strong className="text-slate-800">{filteredClients.length}</strong> clientes
        </div>
      </div>

      {/* Table of Clients */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-3">CPF / CNPJ</th>
                <th className="py-3.5 px-3">Contato</th>
                <th className="py-3.5 px-3">Cidade / UF</th>
                <th className="py-3.5 px-3 text-center">Motos</th>
                <th className="py-3.5 px-3 text-center">OS</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const clientBikes = motorcycles.filter((m) => m.clientId === client.id);
                  const clientOS = serviceOrders.filter((os) => os.clientId === client.id);

                  return (
                    <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => setSelectedClientForDetail(client)}
                          className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer text-sm"
                        >
                          {client.name}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {client.email || 'Sem e-mail'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono font-medium text-slate-700">
                        {client.cpfCnpj}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1 font-medium text-slate-800">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {client.phone}
                        </div>
                        {client.whatsapp && (
                          <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                            <MessageSquare className="w-3 h-3" /> {client.whatsapp}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-slate-600">
                        {client.city}/{client.state}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          onClick={() => setSelectedClientForDetail(client)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] cursor-pointer ${
                            clientBikes.length > 0
                              ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {clientBikes.length}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          onClick={() => setSelectedClientForDetail(client)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] cursor-pointer ${
                            clientOS.length > 0
                              ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {clientOS.length}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedClientForDetail(client)}
                            title="Ver Dossiê do Cliente"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setClientToEdit(client);
                              setIsFormOpen(true);
                            }}
                            title="Editar Cliente"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setClientToDelete(client);
                                setDeleteError(null);
                              }}
                              title="Excluir Cliente"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

      {/* Form Modal */}
      {isFormOpen && (
        <ClientFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setClientToEdit(null);
          }}
          onSave={handleSaveClient}
          initialData={clientToEdit}
        />
      )}

      {/* Detail Modal */}
      {selectedClientForDetail && (
        <ClientDetailModal
          isOpen={!!selectedClientForDetail}
          client={selectedClientForDetail}
          onClose={() => setSelectedClientForDetail(null)}
          onSelectMoto={handleSelectMoto}
          onSelectOrder={handleSelectOrder}
          onCreateOrder={handleCreateOrder}
        />
      )}

      {/* Delete Confirmation */}
      {clientToDelete && (
        <ConfirmationModal
          isOpen={!!clientToDelete}
          onClose={() => {
            setClientToDelete(null);
            setDeleteError(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Excluir Cliente"
          message={
            deleteError ||
            `Tem certeza que deseja excluir o cadastro de "${clientToDelete.name}"? Esta ação não pode ser desfeita.`
          }
          confirmText="Sim, Excluir"
        />
      )}
    </div>
  );
};
