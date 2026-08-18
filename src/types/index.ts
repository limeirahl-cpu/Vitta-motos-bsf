export type UserRole = 'admin' | 'vendedor' | 'recepcionista' | 'mecanico' | 'staff';
export type UserStatus = 'pending_verification' | 'pending_approval' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  active: boolean;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  phone: string;
  whatsapp?: string;
  email: string;
  cep: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  notes?: string;
  sellerId?: string;
  sellerName?: string;
  createdBy?: string;
  createdAt: string;
}

export interface Motorcycle {
  id: string;
  clientId: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  chassis: string;
  engineNumber: string;
  plate: string;
  renavam: string;
  deliveryKm: number;
  currentKm: number;
  saleDate: string;
  invoiceNumber: string;
  warrantyStartDate: string;
  nfeKey?: string;
  nfeValue?: number;
  warrantyPlanMonths?: number;
  photoUrl?: string;
  notes?: string;
  sellerId?: string;
  sellerName?: string;
  createdAt: string;
  nextRevisionKm?: number;
  nextRevisionDate?: string;
}

export interface WorkshopService {
  id: string;
  name: string;
  description: string;
  defaultPrice: number;
  estimatedMinutes: number;
  active: boolean;
  createdAt: string;
}

export interface Part {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  unit: string; // UN, L, PAR, JOGO, etc.
  currentStock: number;
  minStock: number;
  purchaseCost: number;
  salePrice: number;
  supplier: string;
  location: string;
  active: boolean;
  createdAt: string;
}

export type StockMovementType = 'ENTRADA' | 'SAIDA';
export type StockExitReason = 'USO_OS' | 'VENDA' | 'PERDA' | 'DEFEITO' | 'AJUSTE' | 'OUTRO';

export interface StockMovement {
  id: string;
  partId: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  resultingStock: number;
  costUnit?: number;
  totalCost?: number;
  supplier?: string;
  invoiceNumber?: string;
  exitReason?: StockExitReason;
  serviceOrderId?: string;
  userId: string;
  userName: string;
  notes?: string;
  date: string;
}

export type ServiceOrderStatus =
  | 'ABERTA'
  | 'AGUARDANDO_DIAGNOSTICO'
  | 'AGUARDANDO_APROVACAO'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_PECA'
  | 'FINALIZADA'
  | 'ENTREGUE'
  | 'CANCELADA';

export interface OSServiceItem {
  id: string;
  serviceId?: string;
  name: string;
  price: number;
  discount?: number;
  mechanicNotes?: string;
}

export interface OSPartItem {
  id: string;
  partId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
}

export interface ServiceOrder {
  id: string;
  orderNumber: string; // e.g. OS-00104
  clientId: string;
  motorcycleId: string;
  currentKm: number;
  serviceType: 'REVISAO_GARANTIA' | 'MANUTENCAO_PREVENTIVA' | 'MANUTENCAO_CORRETIVA' | 'OUTRO';
  entryReason: string;
  reportedProblem?: string;
  diagnosis?: string;
  notes?: string;
  mechanicName: string;
  sellerId?: string;
  sellerName?: string;
  createdBy?: string;
  status: ServiceOrderStatus;
  services: OSServiceItem[];
  parts: OSPartItem[];
  servicesTotal: number;
  partsTotal: number;
  generalDiscount: number;
  paymentMethod?: string;
  finalTotal: number;
  stockDeducted: boolean;
  openedAt: string;
  estimatedCompletionAt?: string;
  finishedAt?: string;
  deliveredAt?: string;
  warrantyRevisionId?: string;
}

export type RevisionStatus = 'DISTANTE' | 'PROXIMA' | 'VENCENDO' | 'ATRASADA' | 'REALIZADA';

export interface WarrantyRevision {
  id: string;
  motorcycleId: string;
  revisionNumber: number; // 1, 2, 3...
  targetKm: number;
  maxDate: string; // YYYY-MM-DD
  status: RevisionStatus;
  completed: boolean;
  completedDate?: string;
  completedKm?: number;
  serviceOrderId?: string;
  mechanicName?: string;
  notes?: string;
  registeredByUserId?: string;
  createdAt: string;
}

export type ErrorCategory =
  | 'SISTEMA'
  | 'ORDEM_SERVICO'
  | 'ESTOQUE'
  | 'CADASTRO'
  | 'FINANCEIRO'
  | 'OUTRO';

export type ErrorSeverity = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type ErrorStatus = 'PENDENTE' | 'EM_ANALISE' | 'RESOLVIDO' | 'IGNORADO';

export interface ErrorReport {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  title: string;
  description: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  status: ErrorStatus;
  screenOrModule?: string;
  screenshotUrl?: string;
  adminResponse?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type:
    | 'REVISAO_PROXIMA'
    | 'REVISAO_ATRASADA'
    | 'ESTOQUE_BAIXO'
    | 'OS_NOVA'
    | 'OS_STATUS'
    | 'USER_PENDING_APPROVAL'
    | 'ERROR_REPORT'
    | 'ERROR_RESOLVED';
  linkTarget?: string; // route or entity id
  linkId?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  affectedEntity: string;
  entityId?: string;
  timestamp: string;
}

export interface WarrantyRuleConfig {
  skipFirst1000Km?: boolean; // Se não conta os 1000km da 1ª revisão e começa a contar a partir de novo parâmetro
  firstRevisionKm: number; // KM da 1ª revisão (ex: 1000 ou novo parâmetro inicial ex: 3000, 4000, etc.)
  subsequentIntervalKm: number; // Intervalo subsequente de KM entre revisões (ex: 3000)
  intervalMonths: number; // Intervalo em meses (ex: 6)
  alertDaysTolerance: number; // Tolerância de dias para alerta (ex: 30)
  alertKmTolerance: number; // Tolerância de KM para alerta (ex: 500)
}

export interface StoreSettings {
  storeName: string;
  legalName: string;
  cnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  cep: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  logoUrl?: string;
  warrantyRules: WarrantyRuleConfig;
  defaultMarkupPercent?: number; // % Margem padrão para precificação automática de peças (ex: 40%)
  autoApplyMarkup?: boolean; // Se deve calcular automaticamente o preço de venda
}

export type SectionKey =
  | 'dashboard'
  | 'clientes'
  | 'motos'
  | 'revisoes'
  | 'ordens'
  | 'servicos'
  | 'estoque'
  | 'movimentacoes'
  | 'relatorios';

export interface RolePermission {
  role: UserRole;
  sectionKey: SectionKey;
  canView: boolean;
}
