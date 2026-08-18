import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  auditLogFromRow,
  clientFromRow,
  clientToRow,
  errorReportFromRow,
  motorcycleFromRow,
  motorcycleToRow,
  notificationFromRow,
  osPartItemToRow,
  osServiceItemToRow,
  partFromRow,
  partToRow,
  rolePermissionFromRow,
  serviceFromRow,
  serviceOrderFromRow,
  serviceOrderToRow,
  serviceToRow,
  settingsFromRow,
  settingsToRow,
  stockMovementFromRow,
  warrantyRevisionFromRow,
} from '../lib/mappers';
import {
  AuditLog,
  Client,
  ErrorReport,
  ErrorStatus,
  Motorcycle,
  Part,
  RevisionStatus,
  RolePermission,
  SectionKey,
  ServiceOrder,
  ServiceOrderStatus,
  StockExitReason,
  StockMovement,
  StoreSettings,
  SystemNotification,
  UserRole,
  WarrantyRevision,
  WarrantyRuleConfig,
  WorkshopService,
} from '../types';
import { ParsedNfeData } from '../utils/nfeParser';
import { computeNextScheduledRevision, DEFAULT_WARRANTY_RULES } from '../utils/warrantyCalculator';
import { useAuth } from './AuthContext';

interface StoreContextType {
  clients: Client[];
  motorcycles: Motorcycle[];
  parts: Part[];
  services: WorkshopService[];
  serviceOrders: ServiceOrder[];
  stockMovements: StockMovement[];
  warrantyRevisions: WarrantyRevision[];
  notifications: SystemNotification[];
  auditLogs: AuditLog[];
  settings: StoreSettings;
  errorReports: ErrorReport[];
  pendingErrorReportsCount: number;
  isDataReady: boolean;

  addErrorReport: (data: Omit<ErrorReport, 'id' | 'createdAt' | 'status'>) => Promise<{
    success: boolean;
    report?: ErrorReport;
    message?: string;
  }>;
  updateErrorReportStatus: (
    id: string,
    status: ErrorStatus,
    adminResponse?: string,
    resolvedBy?: string
  ) => Promise<{ success: boolean; message?: string }>;
  deleteErrorReport: (id: string) => Promise<{ success: boolean; message?: string }>;

  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<{ success: boolean; client?: Client; message?: string }>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<{ success: boolean; message?: string }>;
  deleteClient: (id: string) => Promise<{ success: boolean; message?: string }>;

  addMotorcycle: (
    moto: Omit<Motorcycle, 'id' | 'createdAt'>
  ) => Promise<{ success: boolean; motorcycle?: Motorcycle; message?: string }>;
  updateMotorcycle: (id: string, updates: Partial<Motorcycle>) => Promise<{ success: boolean; message?: string }>;
  updateMotorcycleKm: (id: string, newKm: number) => Promise<{ success: boolean; message?: string }>;
  deleteMotorcycle: (id: string) => Promise<{ success: boolean; message?: string }>;
  importMotorcyclesFromNfe: (items: ParsedNfeData[]) => Promise<{
    success: boolean;
    importedCount: number;
    createdClientsCount: number;
    errors: string[];
  }>;

  addPart: (part: Omit<Part, 'id' | 'createdAt'>) => Promise<{ success: boolean; part?: Part; message?: string }>;
  updatePart: (id: string, updates: Partial<Part>) => Promise<{ success: boolean; message?: string }>;
  deletePart: (id: string) => Promise<{ success: boolean; message?: string }>;
  recalculateAllPartsPrices: (markupPercent?: number) => Promise<{ success: boolean; count: number; markup: number }>;
  addStockEntry: (entry: {
    partId: string;
    quantity: number;
    costUnit: number;
    supplier?: string;
    invoiceNumber?: string;
    notes?: string;
    updateSalePrice?: boolean;
    customSalePrice?: number;
  }) => Promise<{ success: boolean; message?: string }>;
  addStockExit: (exit: {
    partId: string;
    quantity: number;
    exitReason: StockExitReason;
    serviceOrderId?: string;
    notes?: string;
  }) => Promise<{ success: boolean; message?: string }>;

  addService: (
    service: Omit<WorkshopService, 'id' | 'createdAt'>
  ) => Promise<{ success: boolean; service?: WorkshopService; message?: string }>;
  updateService: (id: string, updates: Partial<WorkshopService>) => Promise<{ success: boolean; message?: string }>;
  deleteService: (id: string) => Promise<{ success: boolean; message?: string }>;

  createServiceOrder: (
    osData: Omit<ServiceOrder, 'id' | 'orderNumber' | 'stockDeducted' | 'openedAt'>
  ) => Promise<{ success: boolean; order?: ServiceOrder; message?: string }>;
  updateServiceOrder: (id: string, updates: Partial<ServiceOrder>) => Promise<{ success: boolean; message?: string }>;
  changeServiceOrderStatus: (id: string, newStatus: ServiceOrderStatus) => Promise<{ success: boolean; message?: string }>;
  deleteServiceOrder: (id: string) => Promise<{ success: boolean; message?: string }>;

  registerCompletedRevision: (data: {
    motorcycleId: string;
    revisionNumber: number;
    completedKm: number;
    completedDate: string;
    mechanicName?: string;
    notes?: string;
    serviceOrderId?: string;
  }) => Promise<{ success: boolean; message?: string }>;

  getMotorcycleNextRevision: (moto: Motorcycle) => {
    revisionNumber: number;
    targetKm: number;
    maxDate: string;
    status: RevisionStatus;
  };
  getClientById: (id: string) => Client | undefined;
  getMotorcycleById: (id: string) => Motorcycle | undefined;
  getPartById: (id: string) => Part | undefined;

  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  updateSettings: (updates: Partial<StoreSettings>) => Promise<{ success: boolean; message?: string }>;
  updateWarrantyRules: (rules: WarrantyRuleConfig) => Promise<{ success: boolean; message?: string }>;
  resetDatabase: () => Promise<{ success: boolean; message?: string }>;
  exportDatabaseJSON: () => string;
  importDatabaseJSON: (jsonStr: string) => Promise<{ success: boolean; message?: string }>;

  rolePermissions: RolePermission[];
  canViewSection: (role: UserRole | undefined, sectionKey: SectionKey) => boolean;
  updateRolePermission: (role: UserRole, sectionKey: SectionKey, canView: boolean) => Promise<{ success: boolean; message?: string }>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: '',
  legalName: '',
  cnpj: '',
  phone: '',
  whatsapp: '',
  email: '',
  cep: '',
  address: '',
  number: '',
  neighborhood: '',
  city: '',
  state: '',
  warrantyRules: DEFAULT_WARRANTY_RULES,
  defaultMarkupPercent: 40,
  autoApplyMarkup: true,
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [services, setServices] = useState<WorkshopService[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [warrantyRevisions, setWarrantyRevisions] = useState<WarrantyRevision[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [isDataReady, setIsDataReady] = useState(false);

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const pendingErrorReportsCount = errorReports.filter(
    (e) => e.status === 'PENDENTE' || e.status === 'EM_ANALISE'
  ).length;

  // ---------- Fetch helpers (initial load + realtime "refetch this slice") ----------
  const refetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (data) setClients(data.map(clientFromRow));
  };
  const refetchMotorcycles = async () => {
    const { data } = await supabase.from('motorcycles').select('*').order('created_at', { ascending: false });
    if (data) setMotorcycles(data.map(motorcycleFromRow));
  };
  const refetchParts = async () => {
    const { data } = await supabase.from('parts').select('*').order('name', { ascending: true });
    if (data) setParts(data.map(partFromRow));
  };
  const refetchServices = async () => {
    const { data } = await supabase.from('workshop_services').select('*').order('created_at', { ascending: false });
    if (data) setServices(data.map(serviceFromRow));
  };
  const refetchServiceOrders = async () => {
    const { data } = await supabase
      .from('service_orders')
      .select('*, service_order_services(*), service_order_parts(*)')
      .order('opened_at', { ascending: false });
    if (data) setServiceOrders(data.map(serviceOrderFromRow));
  };
  const refetchStockMovements = async () => {
    const { data } = await supabase.from('stock_movements').select('*').order('date', { ascending: false }).limit(1000);
    if (data) setStockMovements(data.map(stockMovementFromRow));
  };
  const refetchWarrantyRevisions = async () => {
    const { data } = await supabase.from('warranty_revisions').select('*').order('created_at', { ascending: false });
    if (data) setWarrantyRevisions(data.map(warrantyRevisionFromRow));
  };
  const refetchNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(300);
    if (data) setNotifications(data.map(notificationFromRow));
  };
  const refetchAuditLogs = async () => {
    const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(1000);
    if (data) setAuditLogs(data.map(auditLogFromRow));
  };
  const refetchSettings = async () => {
    const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single();
    if (data) setSettings(settingsFromRow(data));
  };
  const refetchErrorReports = async () => {
    const { data } = await supabase.from('error_reports').select('*').order('created_at', { ascending: false });
    if (data) setErrorReports(data.map(errorReportFromRow));
  };
  const refetchRolePermissions = async () => {
    const { data } = await supabase.from('role_permissions').select('*');
    if (data) setRolePermissions(data.map(rolePermissionFromRow));
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setClients([]);
      setMotorcycles([]);
      setParts([]);
      setServices([]);
      setServiceOrders([]);
      setStockMovements([]);
      setWarrantyRevisions([]);
      setNotifications([]);
      setAuditLogs([]);
      setSettings(DEFAULT_SETTINGS);
      setErrorReports([]);
      setRolePermissions([]);
      setIsDataReady(false);
      return;
    }

    let active = true;
    (async () => {
      await Promise.all([
        refetchClients(),
        refetchMotorcycles(),
        refetchParts(),
        refetchServices(),
        refetchServiceOrders(),
        refetchStockMovements(),
        refetchWarrantyRevisions(),
        refetchNotifications(),
        refetchAuditLogs(),
        refetchSettings(),
        refetchErrorReports(),
        refetchRolePermissions(),
      ]);
      if (active) setIsDataReady(true);
    })();

    // Realtime: a change made by ANY user on ANY device refreshes the
    // relevant slice here - this is what solves the "each browser has its
    // own copy" limitation of the original localStorage version.
    const channel = supabase
      .channel('store-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, refetchClients)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motorcycles' }, refetchMotorcycles)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parts' }, refetchParts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workshop_services' }, refetchServices)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_orders' }, refetchServiceOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_order_services' }, refetchServiceOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_order_parts' }, refetchServiceOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, refetchStockMovements)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warranty_revisions' }, refetchWarrantyRevisions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, refetchNotifications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, refetchAuditLogs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, refetchSettings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'error_reports' }, refetchErrorReports)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' }, refetchRolePermissions)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // ---------- Shared helpers ----------
  const logAudit = async (action: string, details: string, affectedEntity: string, entityId?: string) => {
    await supabase.from('audit_logs').insert({
      user_id: currentUserRef.current?.id || null,
      user_name: currentUserRef.current?.name || 'Sistema',
      action,
      details,
      affected_entity: affectedEntity,
      entity_id: entityId || null,
    });
  };

  const addNotification = async (
    title: string,
    message: string,
    type: SystemNotification['type'],
    linkTarget?: string,
    linkId?: string
  ) => {
    await supabase.from('notifications').insert({
      title,
      message,
      type,
      link_target: linkTarget || null,
      link_id: linkId || null,
    });
  };

  const getMotorcycleNextRevision = (moto: Motorcycle) => {
    return computeNextScheduledRevision(moto, warrantyRevisions, settings.warrantyRules);
  };

  const getClientById = (id: string) => clients.find((c) => c.id === id);
  const getMotorcycleById = (id: string) => motorcycles.find((m) => m.id === id);
  const getPartById = (id: string) => parts.find((p) => p.id === id);

  // Admin always sees everything, regardless of what's configured in
  // role_permissions - this table only controls the OTHER roles, and
  // defaults to visible (true) if a role/section combination has no row
  // yet, so newly added sections don't silently disappear for everyone.
  const canViewSection = (role: UserRole | undefined, sectionKey: SectionKey): boolean => {
    if (!role) return false;
    if (role === 'admin') return true;
    const found = rolePermissions.find((p) => p.role === role && p.sectionKey === sectionKey);
    return found ? found.canView : true;
  };

  // ---------- CLIENTS ----------
  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    const row = clientToRow(clientData);
    row.created_by = currentUserRef.current?.id || null;
    const { data, error } = await supabase.from('clients').insert(row).select().single();
    if (error || !data) return { success: false, message: error?.message || 'Erro ao cadastrar cliente.' };
    const newClient = clientFromRow(data);
    await logAudit('Cadastro de Cliente', `Cadastrou o cliente ${newClient.name} (CPF/CNPJ: ${newClient.cpfCnpj})`, 'Clientes', newClient.id);
    return { success: true, client: newClient };
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const { error } = await supabase.from('clients').update(clientToRow(updates)).eq('id', id);
    if (error) return { success: false, message: error.message };
    await logAudit('Edição de Cliente', `Atualizou dados cadastrais do cliente ID: ${id}`, 'Clientes', id);
    return { success: true };
  };

  const deleteClient = async (id: string) => {
    const hasBikes = motorcycles.some((m) => m.clientId === id);
    if (hasBikes) {
      return {
        success: false,
        message: 'Não é possível excluir o cliente pois existem motocicletas vinculadas a ele. Transfira ou exclua as motos primeiro.',
      };
    }
    const hasOS = serviceOrders.some((os) => os.clientId === id);
    if (hasOS) {
      return {
        success: false,
        message: 'Não é possível excluir o cliente pois existem Ordens de Serviço registradas em seu nome.',
      };
    }
    const client = getClientById(id);
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) return { success: false, message: error.message };
    await logAudit('Exclusão de Cliente', `Excluiu o cliente ${client?.name || id}`, 'Clientes', id);
    return { success: true };
  };

  // ---------- MOTORCYCLES ----------
  const addMotorcycle = async (motoData: Omit<Motorcycle, 'id' | 'createdAt'>) => {
    const cleanPlate = motoData.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const plateExists = motorcycles.some(
      (m) => m.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanPlate
    );
    if (plateExists) {
      return { success: false, message: `Já existe uma motocicleta cadastrada com a placa ${motoData.plate}.` };
    }

    const row = motorcycleToRow({ ...motoData, brand: 'Shineray', plate: cleanPlate });
    row.created_by = currentUserRef.current?.id || null;

    const { data, error } = await supabase.from('motorcycles').insert(row).select().single();
    if (error) {
      if (error.code === '23505') {
        return { success: false, message: `Já existe uma motocicleta cadastrada com esta placa ou chassi.` };
      }
      return { success: false, message: error.message };
    }
    const newMoto = motorcycleFromRow(data);

    const client = getClientById(newMoto.clientId);
    await logAudit('Venda / Cadastro de Moto', `Registrou a moto ${newMoto.brand} ${newMoto.model} (Placa: ${newMoto.plate}) para ${client?.name || 'Cliente'}`, 'Motos', newMoto.id);

    const nextRev = computeNextScheduledRevision(newMoto, [], settings.warrantyRules);
    if (nextRev.status === 'PROXIMA' || nextRev.status === 'VENCENDO') {
      await addNotification(
        'Revisão Próxima',
        `${newMoto.brand} ${newMoto.model} (${newMoto.plate}) tem revisão prevista para ${nextRev.targetKm} km até ${nextRev.maxDate}.`,
        'REVISAO_PROXIMA',
        'revisoes',
        newMoto.id
      );
    }

    return { success: true, motorcycle: newMoto };
  };

  const updateMotorcycle = async (id: string, updates: Partial<Motorcycle>) => {
    const { error } = await supabase.from('motorcycles').update(motorcycleToRow(updates)).eq('id', id);
    if (error) return { success: false, message: error.message };
    await logAudit('Edição de Moto', `Atualizou informações da moto ID: ${id}`, 'Motos', id);
    return { success: true };
  };

  const updateMotorcycleKm = async (id: string, newKm: number) => {
    const moto = getMotorcycleById(id);
    if (!moto) return { success: false, message: 'Moto não encontrada.' };
    const resolvedKm = Math.max(moto.currentKm, newKm);

    const { error } = await supabase.from('motorcycles').update({ current_km: resolvedKm }).eq('id', id);
    if (error) return { success: false, message: error.message };

    const updated = { ...moto, currentKm: resolvedKm };
    const nextRev = computeNextScheduledRevision(updated, warrantyRevisions, settings.warrantyRules);
    if (nextRev.status === 'ATRASADA') {
      await addNotification(
        'Revisão Atrasada por KM',
        `${updated.brand} ${updated.model} (${updated.plate}) atingiu ${newKm} km e ultrapassou a revisão de ${nextRev.targetKm} km.`,
        'REVISAO_ATRASADA',
        'revisoes',
        updated.id
      );
    } else if (nextRev.status === 'PROXIMA' || nextRev.status === 'VENCENDO') {
      await addNotification(
        'Revisão Próxima por KM',
        `${updated.brand} ${updated.model} (${updated.plate}) está com ${newKm} km, próxima da revisão de ${nextRev.targetKm} km.`,
        'REVISAO_PROXIMA',
        'revisoes',
        updated.id
      );
    }

    await logAudit('Atualização de KM', `Atualizou quilometragem da moto ID: ${id} para ${newKm} km`, 'Motos', id);
    return { success: true };
  };

  const deleteMotorcycle = async (id: string) => {
    const hasOS = serviceOrders.some((os) => os.motorcycleId === id);
    if (hasOS) {
      return { success: false, message: 'Não é possível excluir a moto pois existem Ordens de Serviço vinculadas.' };
    }
    const moto = getMotorcycleById(id);
    const { error } = await supabase.from('motorcycles').delete().eq('id', id);
    if (error) return { success: false, message: error.message };
    await logAudit('Exclusão de Moto', `Excluiu a moto ${moto?.brand} ${moto?.model} (${moto?.plate})`, 'Motos', id);
    return { success: true };
  };

  const importMotorcyclesFromNfe = async (items: ParsedNfeData[]) => {
    let importedCount = 0;
    let createdClientsCount = 0;
    const errors: string[] = [];

    const currentClients = [...clients];
    const currentMotos = [...motorcycles];

    for (const item of items) {
      if (!item.selected) continue;

      try {
        const cleanCpf = item.client.cpfCnpj.replace(/\D/g, '');
        let targetClient = currentClients.find(
          (c) => c.cpfCnpj.replace(/\D/g, '') === cleanCpf && cleanCpf.length > 0
        );
        if (!targetClient) {
          targetClient = currentClients.find(
            (c) => c.name.trim().toLowerCase() === item.client.name.trim().toLowerCase()
          );
        }

        let clientId = targetClient?.id;

        if (!targetClient) {
          const res = await addClient({
            name: item.client.name.toUpperCase(),
            cpfCnpj: item.client.cpfCnpj,
            phone: item.client.phone,
            whatsapp: item.client.phone,
            email: item.client.email,
            cep: item.client.cep,
            address: item.client.address,
            number: item.client.number,
            complement: item.client.complement,
            neighborhood: item.client.neighborhood,
            city: item.client.city,
            state: item.client.state,
            notes: `Cadastrado automaticamente via importação da NF-e ${item.invoiceNumber}`,
          });
          if (!res.success || !res.client) {
            errors.push(`Erro ao criar cliente para "${item.vehicle.model}": ${res.message}`);
            continue;
          }
          currentClients.push(res.client);
          clientId = res.client.id;
          createdClientsCount++;
        }

        const cleanPlate = item.vehicle.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const cleanChassis = item.vehicle.chassis.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const exists = currentMotos.some(
          (m) =>
            (m.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanPlate && cleanPlate.length > 0) ||
            (m.chassis.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanChassis && cleanChassis.length > 0)
        );
        if (exists) {
          errors.push(`A moto modelo "${item.vehicle.model}" (Chassi: ${item.vehicle.chassis} / Placa: ${item.vehicle.plate}) já está cadastrada no sistema.`);
          continue;
        }

        const billingDate = item.invoiceDate || new Date().toISOString().split('T')[0];
        const warrantyStartDate = item.warrantyConfig?.startDate || billingDate;

        const res = await addMotorcycle({
          clientId: clientId!,
          brand: item.vehicle.brand || 'Shineray',
          model: item.vehicle.model,
          year: item.vehicle.year || new Date().getFullYear(),
          color: item.vehicle.color || 'Padrão',
          chassis: cleanChassis,
          engineNumber: item.vehicle.engineNumber || '',
          plate: cleanPlate,
          renavam: item.vehicle.renavam || '',
          deliveryKm: 0,
          currentKm: 0,
          saleDate: billingDate,
          warrantyStartDate,
          invoiceNumber: item.invoiceNumber,
          nfeKey: item.accessKey,
          nfeValue: item.totalInvoiceValue,
          warrantyPlanMonths: item.warrantyConfig?.planMonths || 24,
          notes: `Importado via NF-e ${item.invoiceNumber} (Série ${item.series || '1'}) com faturamento em ${billingDate}. Garantia Shineray de ${item.warrantyConfig?.planMonths || 24} meses configurada a partir da data de faturamento.`,
        });

        if (!res.success || !res.motorcycle) {
          errors.push(`Erro ao importar item ${item.invoiceNumber}: ${res.message}`);
          continue;
        }
        currentMotos.push(res.motorcycle);
        importedCount++;
      } catch (err: any) {
        errors.push(`Erro ao importar item ${item.invoiceNumber}: ${err?.message || 'Erro desconhecido'}`);
      }
    }

    if (importedCount > 0) {
      await logAudit(
        'Importação de NF-e',
        `Importou ${importedCount} motos vendidas via Notas Fiscais com configuração automática de garantia (${createdClientsCount} novos clientes cadastrados).`,
        'Motos'
      );
    }

    return { success: importedCount > 0, importedCount, createdClientsCount, errors };
  };
  // ---------- PARTS & INVENTORY ----------
  const addPart = async (partData: Omit<Part, 'id' | 'createdAt'>) => {
    const skuExists = parts.some((p) => p.sku.toLowerCase().trim() === partData.sku.toLowerCase().trim());
    if (skuExists) {
      return { success: false, message: `Já existe uma peça com o código SKU "${partData.sku}".` };
    }

    const { data, error } = await supabase.from('parts').insert(partToRow(partData)).select().single();
    if (error) {
      if (error.code === '23505') {
        return { success: false, message: `Já existe uma peça com o código SKU "${partData.sku}".` };
      }
      return { success: false, message: error.message };
    }
    const newPart = partFromRow(data);

    if (newPart.currentStock > 0) {
      await supabase.from('stock_movements').insert({
        part_id: newPart.id,
        type: 'ENTRADA',
        quantity: newPart.currentStock,
        previous_stock: 0,
        resulting_stock: newPart.currentStock,
        cost_unit: newPart.purchaseCost,
        total_cost: newPart.purchaseCost * newPart.currentStock,
        supplier: newPart.supplier,
        invoice_number: 'CADASTRO_INICIAL',
        user_id: currentUserRef.current?.id || null,
        user_name: currentUserRef.current?.name || 'Sistema',
        notes: 'Estoque inicial cadastrado',
      });
    }

    await logAudit('Cadastro de Peça', `Cadastrou a peça ${newPart.name} (${newPart.sku})`, 'Estoque', newPart.id);
    return { success: true, part: newPart };
  };

  const updatePart = async (id: string, updates: Partial<Part>) => {
    const { error } = await supabase.from('parts').update(partToRow(updates)).eq('id', id);
    if (error) return { success: false, message: error.message };
    // Low-stock notification is handled server-side by trg_notify_low_stock.
    await logAudit('Edição de Peça', `Atualizou a peça ID: ${id}`, 'Estoque', id);
    return { success: true };
  };

  const deletePart = async (id: string) => {
    const hasMovements = stockMovements.some((m) => m.partId === id);
    const hasInOS = serviceOrders.some((os) => os.parts.some((p) => p.partId === id));
    if (hasInOS || hasMovements) {
      const { error } = await supabase.from('parts').update({ active: false }).eq('id', id);
      if (error) return { success: false, message: error.message };
      await logAudit('Desativação de Peça', `Desativou a peça ID: ${id} (possui histórico)`, 'Estoque', id);
      return { success: true, message: 'A peça possui histórico de movimentação/OS e foi marcada como INATIVA.' };
    }

    const { error } = await supabase.from('parts').delete().eq('id', id);
    if (error) return { success: false, message: error.message };
    await logAudit('Exclusão de Peça', `Excluiu a peça ID: ${id}`, 'Estoque', id);
    return { success: true };
  };

  const recalculateAllPartsPrices = async (markupPercent?: number) => {
    const markup = markupPercent ?? settings.defaultMarkupPercent ?? 40;
    const toUpdate = parts.filter((p) => p.purchaseCost > 0);
    await Promise.all(
      toUpdate.map((p) => {
        const newSalePrice = Math.round(p.purchaseCost * (1 + markup / 100) * 100) / 100;
        return supabase.from('parts').update({ sale_price: newSalePrice }).eq('id', p.id);
      })
    );
    await logAudit(
      'Precificação Automática',
      `Recalculou preços de venda de ${toUpdate.length} peça(s) no estoque com margem de ${markup}%`,
      'Estoque'
    );
    return { success: true, count: toUpdate.length, markup };
  };

  const addStockEntry = async (entry: {
    partId: string;
    quantity: number;
    costUnit: number;
    supplier?: string;
    invoiceNumber?: string;
    notes?: string;
    updateSalePrice?: boolean;
    customSalePrice?: number;
  }) => {
    const part = getPartById(entry.partId);
    if (!part) return { success: false, message: 'Peça não encontrada.' };

    let newSalePrice: number | undefined;
    if (entry.customSalePrice !== undefined && entry.customSalePrice > 0) {
      newSalePrice = entry.customSalePrice;
    } else if (entry.updateSalePrice && entry.costUnit > 0) {
      const markup = settings.defaultMarkupPercent || 40;
      newSalePrice = Math.round(entry.costUnit * (1 + markup / 100) * 100) / 100;
    }

    const { error } = await supabase.rpc('add_stock_entry', {
      p_part_id: entry.partId,
      p_quantity: entry.quantity,
      p_cost_unit: entry.costUnit,
      p_supplier: entry.supplier || part.supplier,
      p_invoice_number: entry.invoiceNumber || null,
      p_notes: entry.notes || null,
      p_new_sale_price: newSalePrice ?? null,
    });
    if (error) return { success: false, message: error.message };

    await refetchParts();
    await refetchStockMovements();
    await logAudit('Entrada de Estoque', `Entrada de ${entry.quantity} ${part.unit} de "${part.name}" (NF: ${entry.invoiceNumber || '-'})`, 'Estoque', entry.partId);
    return { success: true };
  };

  const addStockExit = async (exit: {
    partId: string;
    quantity: number;
    exitReason: StockExitReason;
    serviceOrderId?: string;
    notes?: string;
  }) => {
    const part = getPartById(exit.partId);
    if (!part) return { success: false, message: 'Peça não encontrada.' };

    const { error } = await supabase.rpc('add_stock_exit', {
      p_part_id: exit.partId,
      p_quantity: exit.quantity,
      p_exit_reason: exit.exitReason,
      p_service_order_id: exit.serviceOrderId || null,
      p_notes: exit.notes || null,
    });
    if (error) return { success: false, message: error.message };

    await refetchParts();
    await refetchStockMovements();
    await logAudit('Saída de Estoque', `Saída de ${exit.quantity} ${part.unit} de "${part.name}" (Motivo: ${exit.exitReason})`, 'Estoque', exit.partId);
    return { success: true };
  };

  // ---------- SERVICES CATALOG ----------
  const addService = async (srvData: Omit<WorkshopService, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('workshop_services').insert(serviceToRow(srvData)).select().single();
    if (error) return { success: false, message: error.message };
    const newSrv = serviceFromRow(data);
    await logAudit('Cadastro de Serviço', `Cadastrou o serviço "${newSrv.name}"`, 'Serviços', newSrv.id);
    return { success: true, service: newSrv };
  };

  const updateService = async (id: string, updates: Partial<WorkshopService>) => {
    const { error } = await supabase.from('workshop_services').update(serviceToRow(updates)).eq('id', id);
    if (error) return { success: false, message: error.message };
    await logAudit('Edição de Serviço', `Atualizou serviço ID: ${id}`, 'Serviços', id);
    return { success: true };
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from('workshop_services').delete().eq('id', id);
    if (error) return { success: false, message: error.message };
    await logAudit('Exclusão de Serviço', `Excluiu o serviço ID: ${id}`, 'Serviços', id);
    return { success: true };
  };

  // ---------- SERVICE ORDERS ----------
  const createServiceOrder = async (
    osData: Omit<ServiceOrder, 'id' | 'orderNumber' | 'stockDeducted' | 'openedAt'>
  ) => {
    const moto = getMotorcycleById(osData.motorcycleId);
    if (moto && osData.currentKm > moto.currentKm) {
      await updateMotorcycleKm(moto.id, osData.currentKm);
    }

    const { data: orderId, error } = await supabase.rpc('create_service_order', {
      p_client_id: osData.clientId,
      p_motorcycle_id: osData.motorcycleId,
      p_current_km: osData.currentKm,
      p_service_type: osData.serviceType,
      p_entry_reason: osData.entryReason,
      p_reported_problem: osData.reportedProblem || null,
      p_diagnosis: osData.diagnosis || null,
      p_notes: osData.notes || null,
      p_mechanic_name: osData.mechanicName,
      p_seller_id: osData.sellerId || null,
      p_seller_name: osData.sellerName || null,
      p_status: osData.status,
      p_services: osData.services || [],
      p_parts: osData.parts || [],
      p_services_total: osData.servicesTotal,
      p_parts_total: osData.partsTotal,
      p_general_discount: osData.generalDiscount,
      p_payment_method: osData.paymentMethod || null,
      p_final_total: osData.finalTotal,
      p_opened_at: osData.openedAt || new Date().toISOString(),
      p_estimated_completion_at: osData.estimatedCompletionAt || null,
      p_finished_at: osData.finishedAt || null,
      p_delivered_at: osData.deliveredAt || null,
    });

    if (error) return { success: false, message: error.message };

    await refetchServiceOrders();
    await refetchParts();
    await refetchStockMovements();
    await refetchWarrantyRevisions();
    await refetchMotorcycles();

    const { data: orderRow } = await supabase
      .from('service_orders')
      .select('*, service_order_services(*), service_order_parts(*)')
      .eq('id', orderId)
      .single();
    const newOrder = orderRow ? serviceOrderFromRow(orderRow) : undefined;

    const client = getClientById(osData.clientId);
    await logAudit('Abertura de OS', `Abriu a ordem de serviço ${newOrder?.orderNumber || ''} para ${client?.name || 'Cliente'} (${osData.serviceType})`, 'Ordens de Serviço', orderId);

    return { success: true, order: newOrder };
  };

  const updateServiceOrder = async (id: string, updates: Partial<ServiceOrder>) => {
    const existing = serviceOrders.find((os) => os.id === id);
    if (!existing) return { success: false, message: 'OS não encontrada.' };

    const row = serviceOrderToRow(updates);

    if (row.status === 'FINALIZADA' && !updates.finishedAt) row.finished_at = new Date().toISOString();
    if (row.status === 'ENTREGUE') {
      if (!updates.finishedAt) row.finished_at = existing.finishedAt || new Date().toISOString();
      if (!updates.deliveredAt) row.delivered_at = new Date().toISOString();
    }

    const { error: updateErr } = await supabase.from('service_orders').update(row).eq('id', id);
    if (updateErr) return { success: false, message: updateErr.message };

    if (updates.services) {
      await supabase.from('service_order_services').delete().eq('service_order_id', id);
      if (updates.services.length > 0) {
        await supabase.from('service_order_services').insert(updates.services.map((s) => osServiceItemToRow(s, id)));
      }
    }
    if (updates.parts) {
      await supabase.from('service_order_parts').delete().eq('service_order_id', id);
      if (updates.parts.length > 0) {
        await supabase.from('service_order_parts').insert(updates.parts.map((p) => osPartItemToRow(p, id)));
      }
    }

    const newStatus = updates.status || existing.status;
    if ((newStatus === 'FINALIZADA' || newStatus === 'ENTREGUE') && !existing.stockDeducted) {
      const { error: deductErr } = await supabase.rpc('execute_stock_deduction_for_os', { p_order_id: id });
      if (deductErr) {
        return { success: false, message: deductErr.message };
      }
    }

    await refetchServiceOrders();
    await refetchParts();
    await refetchStockMovements();

    await logAudit('Edição de OS', `Atualizou a OS ${existing.orderNumber}`, 'Ordens de Serviço', id);
    return { success: true };
  };

  const changeServiceOrderStatus = async (id: string, newStatus: ServiceOrderStatus) => {
    const existing = serviceOrders.find((os) => os.id === id);
    if (!existing) return { success: false, message: 'OS não encontrada.' };
    if (existing.status === newStatus) return { success: true };

    const { error } = await supabase.rpc('change_service_order_status', {
      p_order_id: id,
      p_new_status: newStatus,
    });
    if (error) return { success: false, message: error.message };

    await refetchServiceOrders();
    await refetchParts();
    await refetchStockMovements();
    await refetchWarrantyRevisions();
    await refetchMotorcycles();

    await addNotification(
      'Status de OS Alterado',
      `${existing.orderNumber} teve o status alterado para "${newStatus}".`,
      'OS_STATUS',
      'ordens',
      id
    );
    await logAudit('Status de OS Alterado', `Alterou status da ${existing.orderNumber} de ${existing.status} para ${newStatus}`, 'Ordens de Serviço', id);
    return { success: true };
  };

  const deleteServiceOrder = async (id: string) => {
    const os = serviceOrders.find((o) => o.id === id);
    if (!os) return { success: false, message: 'OS não encontrada.' };
    if (os.status === 'FINALIZADA' || os.status === 'ENTREGUE') {
      return {
        success: false,
        message: 'Não é possível excluir uma Ordem de Serviço já finalizada/entregue. Altere para Cancelada se necessário.',
      };
    }
    const { error } = await supabase.from('service_orders').delete().eq('id', id);
    if (error) return { success: false, message: error.message };
    await logAudit('Exclusão de OS', `Excluiu a ${os.orderNumber}`, 'Ordens de Serviço', id);
    return { success: true };
  };
  // ---------- WARRANTY REVISIONS ----------
  const registerCompletedRevision = async (data: {
    motorcycleId: string;
    revisionNumber: number;
    completedKm: number;
    completedDate: string;
    mechanicName?: string;
    notes?: string;
    serviceOrderId?: string;
  }) => {
    const moto = getMotorcycleById(data.motorcycleId);
    if (!moto) return { success: false, message: 'Moto não encontrada.' };

    const targetKm = computeNextScheduledRevision(moto, warrantyRevisions, settings.warrantyRules).targetKm;

    const { error } = await supabase.from('warranty_revisions').insert({
      motorcycle_id: data.motorcycleId,
      revision_number: data.revisionNumber,
      target_km: targetKm,
      max_date: data.completedDate,
      status: 'REALIZADA',
      completed: true,
      completed_date: data.completedDate,
      completed_km: data.completedKm,
      service_order_id: data.serviceOrderId || null,
      mechanic_name: data.mechanicName || 'Oficina',
      notes: data.notes || `Revisão de ${targetKm} km concluída com sucesso`,
      registered_by_user_id: currentUserRef.current?.id || null,
    });
    if (error) return { success: false, message: error.message };

    const newMotorcycleKm = Math.max(moto.currentKm, data.completedKm);
    await supabase.from('motorcycles').update({ current_km: newMotorcycleKm }).eq('id', data.motorcycleId);

    await refetchWarrantyRevisions();
    await refetchMotorcycles();

    const updatedRevisions = [...warrantyRevisions, {
      id: 'temp', motorcycleId: data.motorcycleId, revisionNumber: data.revisionNumber, targetKm,
      maxDate: data.completedDate, status: 'REALIZADA' as const, completed: true,
      completedDate: data.completedDate, completedKm: data.completedKm, createdAt: new Date().toISOString(),
    }];
    const nextRevData = computeNextScheduledRevision(
      { ...moto, currentKm: newMotorcycleKm },
      updatedRevisions,
      settings.warrantyRules
    );
    await supabase
      .from('motorcycles')
      .update({ next_revision_km: nextRevData.targetKm, next_revision_date: nextRevData.maxDate })
      .eq('id', data.motorcycleId);

    await supabase
      .from('notifications')
      .delete()
      .eq('link_target', 'revisoes')
      .eq('link_id', data.motorcycleId);

    await addNotification(
      'Revisão de Garantia Registrada',
      `Revisão de ${targetKm} km registrada para ${moto.brand} ${moto.model} (${moto.plate}). Próxima revisão: ${nextRevData.targetKm} km ou até ${nextRevData.maxDate}.`,
      'REVISAO_PROXIMA',
      'revisoes',
      moto.id
    );

    await logAudit(
      'Revisão de Garantia Realizada',
      `Registrou a ${data.revisionNumber}ª revisão (${data.completedKm} km) da moto ${moto.brand} ${moto.model} (${moto.plate})`,
      'Revisões',
      moto.id
    );

    return { success: true };
  };

  // ---------- NOTIFICATIONS ----------
  const markNotificationAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };
  const markAllNotificationsAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    }
  };
  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
  };

  // ---------- SETTINGS ----------
  const updateSettings = async (updates: Partial<StoreSettings>) => {
    const { error } = await supabase.from('store_settings').update(settingsToRow(updates)).eq('id', 1);
    if (error) return { success: false, message: error.message };
    await logAudit('Configurações Atualizadas', 'Atualizou as configurações gerais da loja', 'Configurações');
    return { success: true };
  };

  const updateWarrantyRules = async (rules: WarrantyRuleConfig) => {
    const { error } = await supabase.from('store_settings').update(settingsToRow({ warrantyRules: rules })).eq('id', 1);
    if (error) return { success: false, message: error.message };
    await logAudit(
      'Regras de Revisão Atualizadas',
      `1ª revisão: ${rules.firstRevisionKm}km, Intervalo: ${rules.subsequentIntervalKm}km, Meses: ${rules.intervalMonths}m`,
      'Configurações'
    );
    return { success: true };
  };

  const updateRolePermission = async (role: UserRole, sectionKey: SectionKey, canView: boolean) => {
    if (role === 'admin') {
      return { success: false, message: 'O administrador sempre tem acesso a todas as seções.' };
    }
    const { error } = await supabase
      .from('role_permissions')
      .upsert({ role, section_key: sectionKey, can_view: canView, updated_at: new Date().toISOString() }, { onConflict: 'role,section_key' });
    if (error) return { success: false, message: error.message };

    await refetchRolePermissions();
    await logAudit(
      'Permissões de Papel Atualizadas',
      `${canView ? 'Concedeu' : 'Revogou'} acesso à seção "${sectionKey}" para o papel "${role}"`,
      'Configurações'
    );
    return { success: true };
  };

  // ---------- ERROR & BUG REPORTS ----------
  const addErrorReport = async (data: Omit<ErrorReport, 'id' | 'createdAt' | 'status'>) => {
    const { data: row, error } = await supabase
      .from('error_reports')
      .insert({
        user_id: data.userId || null,
        user_name: data.userName,
        user_email: data.userEmail,
        user_role: data.userRole,
        title: data.title,
        description: data.description,
        category: data.category,
        severity: data.severity,
        status: 'PENDENTE',
        screen_or_module: data.screenOrModule || null,
        screenshot_url: data.screenshotUrl || null,
      })
      .select()
      .single();
    if (error || !row) return { success: false, message: error?.message || 'Erro ao enviar chamado.' };
    const newReport = errorReportFromRow(row);
    await logAudit('Chamado de Erro Aberto', `Usuário ${newReport.userName} reportou: ${newReport.title} [Severidade: ${newReport.severity}]`, 'Suporte/Erros', newReport.id);
    return { success: true, report: newReport, message: 'Chamado enviado com sucesso! O administrador foi notificado.' };
  };

  const updateErrorReportStatus = async (
    id: string,
    status: ErrorStatus,
    adminResponse?: string,
    resolvedBy?: string
  ) => {
    const updates: Record<string, any> = { status };
    if (adminResponse !== undefined) updates.admin_response = adminResponse;
    if (status === 'RESOLVIDO') {
      updates.resolved_by = resolvedBy || currentUserRef.current?.name || 'Administrador';
      updates.resolved_at = new Date().toISOString();
    }
    const { error } = await supabase.from('error_reports').update(updates).eq('id', id);
    if (error) return { success: false, message: error.message };

    const target = errorReports.find((r) => r.id === id);
    await logAudit('Status do Chamado Atualizado', `Chamado "${target?.title || id}" alterado para status: ${status}.`, 'Suporte/Erros', id);
    return { success: true, message: 'Status do chamado atualizado com sucesso!' };
  };

  const deleteErrorReport = async (id: string) => {
    const { error } = await supabase.from('error_reports').delete().eq('id', id);
    if (error) return { success: false, message: error.message };
    await logAudit('Chamado de Erro Excluído', `Chamado ID ${id} excluído do histórico`, 'Suporte/Erros', id);
    return { success: true, message: 'Chamado removido com sucesso.' };
  };

  // ---------- RESET & EXPORT / IMPORT ----------
  const resetDatabase = async () => {
    // Deletes every business record permanently - order matters because of
    // foreign keys. store_settings and the user list are left untouched.
    await supabase.from('service_order_parts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('service_order_services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('stock_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('warranty_revisions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('service_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('motorcycles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('parts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    await Promise.all([
      refetchClients(), refetchMotorcycles(), refetchParts(), refetchServiceOrders(),
      refetchStockMovements(), refetchWarrantyRevisions(), refetchNotifications(), refetchAuditLogs(),
    ]);
    await logAudit('Limpeza Total de Dados', 'Apagou permanentemente todos os clientes, motos, OS, estoque e histórico do sistema', 'Sistema');
    return { success: true };
  };

  const exportDatabaseJSON = (): string => {
    const dump = {
      version: '2.0-supabase',
      exportedAt: new Date().toISOString(),
      settings,
      clients,
      motorcycles,
      parts,
      services,
      serviceOrders,
      stockMovements,
      warrantyRevisions,
      auditLogs,
    };
    return JSON.stringify(dump, null, 2);
  };

  const importDatabaseJSON = async (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.clients || !data.motorcycles || !data.parts) {
        return { success: false, message: 'Arquivo JSON inválido ou incompatível com o sistema.' };
      }
      // Re-importing directly into Supabase (rather than replacing local
      // state) means going through the normal insert paths so IDs, FKs and
      // RLS stay consistent, at the cost of not being a single atomic
      // operation. This is intended for restoring a backup into an empty
      // system, not for merging into an already-populated one.
      if (Array.isArray(data.clients)) {
        for (const c of data.clients) await addClient(c);
      }
      if (Array.isArray(data.parts)) {
        for (const p of data.parts) await addPart(p);
      }
      if (Array.isArray(data.services)) {
        for (const s of data.services) await addService(s);
      }
      await logAudit('Importação de Backup', 'Importou backup de dados com sucesso', 'Sistema');
      return { success: true, message: 'Backup importado com sucesso! (Clientes, peças e serviços)' };
    } catch {
      return { success: false, message: 'Falha ao processar o arquivo JSON.' };
    }
  };

  return (
    <StoreContext.Provider
      value={{
        clients,
        motorcycles,
        parts,
        services,
        serviceOrders,
        stockMovements,
        warrantyRevisions,
        notifications,
        auditLogs,
        settings,
        errorReports,
        pendingErrorReportsCount,
        isDataReady,
        addErrorReport,
        updateErrorReportStatus,
        deleteErrorReport,
        addClient,
        updateClient,
        deleteClient,
        addMotorcycle,
        updateMotorcycle,
        updateMotorcycleKm,
        deleteMotorcycle,
        importMotorcyclesFromNfe,
        addPart,
        updatePart,
        deletePart,
        recalculateAllPartsPrices,
        addStockEntry,
        addStockExit,
        addService,
        updateService,
        deleteService,
        createServiceOrder,
        updateServiceOrder,
        changeServiceOrderStatus,
        deleteServiceOrder,
        registerCompletedRevision,
        getMotorcycleNextRevision,
        getClientById,
        getMotorcycleById,
        getPartById,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        updateSettings,
        updateWarrantyRules,
        resetDatabase,
        exportDatabaseJSON,
        importDatabaseJSON,
        rolePermissions,
        canViewSection,
        updateRolePermission,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
