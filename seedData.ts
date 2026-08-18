import {
  AuditLog,
  Client,
  ErrorReport,
  Motorcycle,
  Part,
  ServiceOrder,
  StockMovement,
  StoreSettings,
  SystemNotification,
  User,
  WarrantyRevision,
  WorkshopService,
} from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    name: 'Administrador Geral',
    email: 'admin@vittamotos.com.br',
    password: 'admin',
    role: 'admin',
    status: 'approved',
    emailVerified: true,
    phone: '(27) 99999-0002',
    active: true,
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    approvedBy: 'Sistema',
  },
  {
    id: 'user-vendedor',
    name: 'Lucas Vendas',
    email: 'vendedor@vittamotos.com.br',
    password: '123',
    role: 'vendedor',
    status: 'approved',
    emailVerified: true,
    phone: '(27) 99888-1122',
    active: true,
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    approvedBy: 'Administrador Geral',
  },
  {
    id: 'user-recepcao',
    name: 'Mariana Recepção',
    email: 'recepcao@vittamotos.com.br',
    password: '123',
    role: 'recepcionista',
    status: 'approved',
    emailVerified: true,
    phone: '(27) 3756-1234',
    active: true,
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    approvedBy: 'Administrador Geral',
  },
  {
    id: 'user-mecanico',
    name: 'Carlos Mecânico Chefe',
    email: 'mecanico@vittamotos.com.br',
    password: '123',
    role: 'mecanico',
    status: 'approved',
    emailVerified: true,
    phone: '(27) 99777-3344',
    active: true,
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    approvedBy: 'Administrador Geral',
  },
];

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'VITTA COMÉRCIO DE VEÍCULOS LTDA.',
  legalName: 'VITTA COMÉRCIO DE VEÍCULOS LTDA.',
  cnpj: '54.315.550/0002-00',
  phone: '(27) 3756-1234',
  whatsapp: '(27) 99999-0002',
  email: 'contato@vittamotos.com.br',
  cep: '29800-000',
  address: 'Avenida Jones dos Santos Neves',
  number: '222',
  neighborhood: 'Centro',
  city: 'Barra de São Francisco',
  state: 'ES',
  warrantyRules: {
    skipFirst1000Km: false,
    firstRevisionKm: 1000,
    subsequentIntervalKm: 3000,
    intervalMonths: 6,
    alertDaysTolerance: 30,
    alertKmTolerance: 500,
  },
  defaultMarkupPercent: 40,
  autoApplyMarkup: true,
};

// 100% clean production state - Ready for real data entry
export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_MOTORCYCLES: Motorcycle[] = [];

export const INITIAL_PARTS: Part[] = [];

export const INITIAL_SERVICES: WorkshopService[] = [
  {
    id: 'srv-1',
    name: '1ª Revisão de Garantia Shineray (1.000 km)',
    description: 'Inspeção geral, reaperto de chassi, regulagem inicial de válvulas, verificação do sistema elétrico, freios, cabos e teste de rodagem.',
    defaultPrice: 120.0,
    estimatedMinutes: 60,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-2',
    name: 'Revisão Periódica de Garantia (3.000 km / 4.000 km / 7.000 km)',
    description: 'Checklist completo com 30+ itens de inspeção: motor, carburação/injeção, transmissão, suspensão e freios.',
    defaultPrice: 160.0,
    estimatedMinutes: 90,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-3',
    name: 'Troca de Óleo do Motor e Filtro',
    description: 'Drenagem do óleo usado, troca de filtro/anel de vedação e abastecimento de lubrificante novo conforme manual.',
    defaultPrice: 40.0,
    estimatedMinutes: 20,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-4',
    name: 'Limpeza e Regulagem de Carburador / TBI Injeção',
    description: 'Descarbonização, limpeza química de bico/giclês, calibração de mistura e marcha lenta.',
    defaultPrice: 110.0,
    estimatedMinutes: 60,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-5',
    name: 'Substituição de Pastilhas / Sapatas de Freio',
    description: 'Instalação de novas pastilhas/sapatas, limpeza das pinças e sangria do fluido de freio.',
    defaultPrice: 60.0,
    estimatedMinutes: 30,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-6',
    name: 'Troca do Kit de Transmissão (Corrente, Coroa e Pinhão)',
    description: 'Substituição da relação completa, alinhamento da roda traseira e lubrificação da corrente.',
    defaultPrice: 80.0,
    estimatedMinutes: 45,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-7',
    name: 'Alinhamento e Balanceamento de Rodas',
    description: 'Checagem de raiação/empenamento e balanceamento fino das rodas dianteira e traseira.',
    defaultPrice: 70.0,
    estimatedMinutes: 40,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'srv-8',
    name: 'Diagnóstico e Revisão do Sistema Elétrico',
    description: 'Teste de bateria, estator, retificador/regulador de voltagem e chicote principal.',
    defaultPrice: 90.0,
    estimatedMinutes: 45,
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_WARRANTY_REVISIONS: WarrantyRevision[] = [];

export const INITIAL_SERVICE_ORDERS: ServiceOrder[] = [];

export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [];

export const INITIAL_NOTIFICATIONS: SystemNotification[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_ERROR_REPORTS: ErrorReport[] = [
  {
    id: 'err-1',
    userId: 'user-mecanico',
    userName: 'Carlos Mecânico',
    userEmail: 'mecanico@vittamotos.com.br',
    userRole: 'mecanico',
    title: 'Dúvida no torque de aperto da porca traseira Jet 125',
    description: 'Ao registrar revisão técnica, gostaria de confirmar se a especificação da chave é 19mm ou 22mm para o modelo Jet 125 2X.',
    category: 'ORDEM_SERVICO',
    severity: 'BAIXA',
    status: 'EM_ANALISE',
    screenOrModule: 'Ordens de Serviço > Checklists',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    adminResponse: 'Verificando o manual de fábrica Shineray 2026.',
  },
];
