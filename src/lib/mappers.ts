// Converts between Supabase's snake_case table rows and the app's existing
// camelCase TypeScript types (src/types/index.ts). Keeping this translation
// in one place means every UI component keeps working against the exact
// same shapes it always has - only StoreContext/AuthContext needed to change.

import {
  AuditLog,
  Client,
  ErrorReport,
  Motorcycle,
  OSPartItem,
  OSServiceItem,
  Part,
  RolePermission,
  ServiceOrder,
  StockMovement,
  Store,
  StoreSettings,
  SystemNotification,
  User,
  UserStoreAccess,
  WarrantyRevision,
  WorkshopService,
} from '../types';

// ---------- Users / Profiles ----------
export function userFromRow(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    phone: row.phone || undefined,
    active: row.active,
    createdAt: row.created_at,
    approvedAt: row.approved_at || undefined,
    approvedBy: row.approved_by || undefined,
    rejectionReason: row.rejection_reason || undefined,
  };
}

// ---------- Clients ----------
export function clientFromRow(row: any): Client {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    cpfCnpj: row.cpf_cnpj,
    phone: row.phone,
    whatsapp: row.whatsapp || undefined,
    email: row.email || '',
    cep: row.cep || '',
    address: row.address || '',
    number: row.number || '',
    complement: row.complement || undefined,
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    state: row.state || '',
    notes: row.notes || undefined,
    sellerId: row.seller_id || undefined,
    sellerName: row.seller_name || undefined,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
  };
}

export function clientToRow(c: Partial<Client>): Record<string, any> {
  const row: Record<string, any> = {};
  if (c.storeId !== undefined) row.store_id = c.storeId;
  if (c.name !== undefined) row.name = c.name;
  if (c.cpfCnpj !== undefined) row.cpf_cnpj = c.cpfCnpj;
  if (c.phone !== undefined) row.phone = c.phone;
  if (c.whatsapp !== undefined) row.whatsapp = c.whatsapp;
  if (c.email !== undefined) row.email = c.email;
  if (c.cep !== undefined) row.cep = c.cep;
  if (c.address !== undefined) row.address = c.address;
  if (c.number !== undefined) row.number = c.number;
  if (c.complement !== undefined) row.complement = c.complement;
  if (c.neighborhood !== undefined) row.neighborhood = c.neighborhood;
  if (c.city !== undefined) row.city = c.city;
  if (c.state !== undefined) row.state = c.state;
  if (c.notes !== undefined) row.notes = c.notes;
  if (c.sellerId !== undefined) row.seller_id = c.sellerId;
  if (c.sellerName !== undefined) row.seller_name = c.sellerName;
  if (c.createdBy !== undefined) row.created_by = c.createdBy;
  return row;
}

// ---------- Motorcycles ----------
export function motorcycleFromRow(row: any): Motorcycle {
  return {
    id: row.id,
    storeId: row.store_id,
    clientId: row.client_id,
    brand: row.brand,
    model: row.model,
    year: row.year,
    color: row.color || '',
    chassis: row.chassis,
    engineNumber: row.engine_number || '',
    plate: row.plate,
    renavam: row.renavam || '',
    deliveryKm: Number(row.delivery_km) || 0,
    currentKm: Number(row.current_km) || 0,
    saleDate: row.sale_date,
    invoiceNumber: row.invoice_number || '',
    warrantyStartDate: row.warranty_start_date,
    nfeKey: row.nfe_key || undefined,
    nfeValue: row.nfe_value !== null ? Number(row.nfe_value) : undefined,
    warrantyPlanMonths: row.warranty_plan_months || undefined,
    photoUrl: row.photo_url || undefined,
    notes: row.notes || undefined,
    sellerId: row.seller_id || undefined,
    sellerName: row.seller_name || undefined,
    createdAt: row.created_at,
    nextRevisionKm: row.next_revision_km !== null ? Number(row.next_revision_km) : undefined,
    nextRevisionDate: row.next_revision_date || undefined,
  };
}

export function motorcycleToRow(m: Partial<Motorcycle> & { createdBy?: string }): Record<string, any> {
  const row: Record<string, any> = {};
  if (m.storeId !== undefined) row.store_id = m.storeId;
  if (m.clientId !== undefined) row.client_id = m.clientId;
  if (m.brand !== undefined) row.brand = m.brand;
  if (m.model !== undefined) row.model = m.model;
  if (m.year !== undefined) row.year = m.year;
  if (m.color !== undefined) row.color = m.color;
  if (m.chassis !== undefined) row.chassis = m.chassis;
  if (m.engineNumber !== undefined) row.engine_number = m.engineNumber;
  if (m.plate !== undefined) row.plate = m.plate;
  if (m.renavam !== undefined) row.renavam = m.renavam;
  if (m.deliveryKm !== undefined) row.delivery_km = m.deliveryKm;
  if (m.currentKm !== undefined) row.current_km = m.currentKm;
  if (m.saleDate !== undefined) row.sale_date = m.saleDate;
  if (m.invoiceNumber !== undefined) row.invoice_number = m.invoiceNumber;
  if (m.warrantyStartDate !== undefined) row.warranty_start_date = m.warrantyStartDate;
  if (m.nfeKey !== undefined) row.nfe_key = m.nfeKey;
  if (m.nfeValue !== undefined) row.nfe_value = m.nfeValue;
  if (m.warrantyPlanMonths !== undefined) row.warranty_plan_months = m.warrantyPlanMonths;
  if (m.photoUrl !== undefined) row.photo_url = m.photoUrl;
  if (m.notes !== undefined) row.notes = m.notes;
  if (m.sellerId !== undefined) row.seller_id = m.sellerId;
  if (m.sellerName !== undefined) row.seller_name = m.sellerName;
  if (m.createdBy !== undefined) row.created_by = m.createdBy;
  if (m.nextRevisionKm !== undefined) row.next_revision_km = m.nextRevisionKm;
  if (m.nextRevisionDate !== undefined) row.next_revision_date = m.nextRevisionDate;
  return row;
}

// ---------- Workshop Services (catalog) ----------
export function serviceFromRow(row: any): WorkshopService {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    description: row.description || '',
    defaultPrice: Number(row.default_price) || 0,
    estimatedMinutes: Number(row.estimated_minutes) || 0,
    active: row.active,
    createdAt: row.created_at,
  };
}

export function serviceToRow(s: Partial<WorkshopService>): Record<string, any> {
  const row: Record<string, any> = {};
  if (s.storeId !== undefined) row.store_id = s.storeId;
  if (s.name !== undefined) row.name = s.name;
  if (s.description !== undefined) row.description = s.description;
  if (s.defaultPrice !== undefined) row.default_price = s.defaultPrice;
  if (s.estimatedMinutes !== undefined) row.estimated_minutes = s.estimatedMinutes;
  if (s.active !== undefined) row.active = s.active;
  return row;
}

// ---------- Parts ----------
export function partFromRow(row: any): Part {
  return {
    id: row.id,
    storeId: row.store_id,
    sku: row.sku,
    name: row.name,
    category: row.category || '',
    brand: row.brand || '',
    description: row.description || '',
    unit: row.unit || 'UN',
    currentStock: Number(row.current_stock) || 0,
    minStock: Number(row.min_stock) || 0,
    purchaseCost: Number(row.purchase_cost) || 0,
    salePrice: Number(row.sale_price) || 0,
    supplier: row.supplier || '',
    location: row.location || '',
    active: row.active,
    createdAt: row.created_at,
  };
}

export function partToRow(p: Partial<Part>): Record<string, any> {
  const row: Record<string, any> = {};
  if (p.storeId !== undefined) row.store_id = p.storeId;
  if (p.sku !== undefined) row.sku = p.sku;
  if (p.name !== undefined) row.name = p.name;
  if (p.category !== undefined) row.category = p.category;
  if (p.brand !== undefined) row.brand = p.brand;
  if (p.description !== undefined) row.description = p.description;
  if (p.unit !== undefined) row.unit = p.unit;
  if (p.currentStock !== undefined) row.current_stock = p.currentStock;
  if (p.minStock !== undefined) row.min_stock = p.minStock;
  if (p.purchaseCost !== undefined) row.purchase_cost = p.purchaseCost;
  if (p.salePrice !== undefined) row.sale_price = p.salePrice;
  if (p.supplier !== undefined) row.supplier = p.supplier;
  if (p.location !== undefined) row.location = p.location;
  if (p.active !== undefined) row.active = p.active;
  return row;
}

// ---------- Stock Movements ----------
export function stockMovementFromRow(row: any): StockMovement {
  return {
    id: row.id,
    storeId: row.store_id,
    partId: row.part_id,
    type: row.type,
    quantity: Number(row.quantity),
    previousStock: Number(row.previous_stock),
    resultingStock: Number(row.resulting_stock),
    costUnit: row.cost_unit !== null ? Number(row.cost_unit) : undefined,
    totalCost: row.total_cost !== null ? Number(row.total_cost) : undefined,
    supplier: row.supplier || undefined,
    invoiceNumber: row.invoice_number || undefined,
    exitReason: row.exit_reason || undefined,
    serviceOrderId: row.service_order_id || undefined,
    userId: row.user_id || '',
    userName: row.user_name || '',
    notes: row.notes || undefined,
    date: row.date,
  };
}

// ---------- Service Order line items ----------
export function osServiceItemFromRow(row: any): OSServiceItem {
  return {
    id: row.id,
    serviceId: row.service_id || undefined,
    name: row.name,
    price: Number(row.price) || 0,
    discount: row.discount !== null ? Number(row.discount) : undefined,
    mechanicNotes: row.mechanic_notes || undefined,
  };
}

export function osPartItemFromRow(row: any): OSPartItem {
  return {
    id: row.id,
    partId: row.part_id,
    sku: row.sku || '',
    name: row.name || '',
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    discount: row.discount !== null ? Number(row.discount) : undefined,
    total: Number(row.total),
  };
}

// ---------- Service Orders ----------
export function serviceOrderFromRow(row: any): ServiceOrder {
  return {
    id: row.id,
    storeId: row.store_id,
    orderNumber: row.order_number,
    clientId: row.client_id,
    motorcycleId: row.motorcycle_id,
    currentKm: Number(row.current_km) || 0,
    serviceType: row.service_type,
    entryReason: row.entry_reason || '',
    reportedProblem: row.reported_problem || undefined,
    diagnosis: row.diagnosis || undefined,
    notes: row.notes || undefined,
    mechanicName: row.mechanic_name || '',
    sellerId: row.seller_id || undefined,
    sellerName: row.seller_name || undefined,
    createdBy: row.created_by || undefined,
    status: row.status,
    services: Array.isArray(row.service_order_services)
      ? row.service_order_services.map(osServiceItemFromRow)
      : [],
    parts: Array.isArray(row.service_order_parts)
      ? row.service_order_parts.map(osPartItemFromRow)
      : [],
    servicesTotal: Number(row.services_total) || 0,
    partsTotal: Number(row.parts_total) || 0,
    generalDiscount: Number(row.general_discount) || 0,
    paymentMethod: row.payment_method || undefined,
    finalTotal: Number(row.final_total) || 0,
    stockDeducted: row.stock_deducted,
    openedAt: row.opened_at,
    estimatedCompletionAt: row.estimated_completion_at || undefined,
    finishedAt: row.finished_at || undefined,
    deliveredAt: row.delivered_at || undefined,
    warrantyRevisionId: row.warranty_revision_id || undefined,
  };
}

export function serviceOrderToRow(
  o: Partial<ServiceOrder> & { createdBy?: string }
): Record<string, any> {
  const row: Record<string, any> = {};
  if (o.clientId !== undefined) row.client_id = o.clientId;
  if (o.motorcycleId !== undefined) row.motorcycle_id = o.motorcycleId;
  if (o.currentKm !== undefined) row.current_km = o.currentKm;
  if (o.serviceType !== undefined) row.service_type = o.serviceType;
  if (o.entryReason !== undefined) row.entry_reason = o.entryReason;
  if (o.reportedProblem !== undefined) row.reported_problem = o.reportedProblem;
  if (o.diagnosis !== undefined) row.diagnosis = o.diagnosis;
  if (o.notes !== undefined) row.notes = o.notes;
  if (o.mechanicName !== undefined) row.mechanic_name = o.mechanicName;
  if (o.sellerId !== undefined) row.seller_id = o.sellerId;
  if (o.sellerName !== undefined) row.seller_name = o.sellerName;
  if (o.createdBy !== undefined) row.created_by = o.createdBy;
  if (o.status !== undefined) row.status = o.status;
  if (o.servicesTotal !== undefined) row.services_total = o.servicesTotal;
  if (o.partsTotal !== undefined) row.parts_total = o.partsTotal;
  if (o.generalDiscount !== undefined) row.general_discount = o.generalDiscount;
  if (o.paymentMethod !== undefined) row.payment_method = o.paymentMethod;
  if (o.finalTotal !== undefined) row.final_total = o.finalTotal;
  if (o.stockDeducted !== undefined) row.stock_deducted = o.stockDeducted;
  if (o.openedAt !== undefined) row.opened_at = o.openedAt;
  if (o.estimatedCompletionAt !== undefined) row.estimated_completion_at = o.estimatedCompletionAt;
  if (o.finishedAt !== undefined) row.finished_at = o.finishedAt;
  if (o.deliveredAt !== undefined) row.delivered_at = o.deliveredAt;
  if (o.warrantyRevisionId !== undefined) row.warranty_revision_id = o.warrantyRevisionId;
  return row;
}

export function osServiceItemToRow(s: OSServiceItem, serviceOrderId: string): Record<string, any> {
  return {
    service_order_id: serviceOrderId,
    service_id: s.serviceId || null,
    name: s.name,
    price: s.price,
    discount: s.discount || 0,
    mechanic_notes: s.mechanicNotes || null,
  };
}

export function osPartItemToRow(p: OSPartItem, serviceOrderId: string): Record<string, any> {
  return {
    service_order_id: serviceOrderId,
    part_id: p.partId,
    sku: p.sku,
    name: p.name,
    quantity: p.quantity,
    unit_price: p.unitPrice,
    discount: p.discount || 0,
    total: p.total,
  };
}

// ---------- Warranty Revisions ----------
export function warrantyRevisionFromRow(row: any): WarrantyRevision {
  return {
    id: row.id,
    storeId: row.store_id,
    motorcycleId: row.motorcycle_id,
    revisionNumber: row.revision_number,
    targetKm: Number(row.target_km) || 0,
    maxDate: row.max_date,
    status: row.status,
    completed: row.completed,
    completedDate: row.completed_date || undefined,
    completedKm: row.completed_km !== null ? Number(row.completed_km) : undefined,
    serviceOrderId: row.service_order_id || undefined,
    mechanicName: row.mechanic_name || undefined,
    notes: row.notes || undefined,
    registeredByUserId: row.registered_by_user_id || undefined,
    createdAt: row.created_at,
  };
}

// ---------- Notifications ----------
export function notificationFromRow(row: any): SystemNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    linkTarget: row.link_target || undefined,
    linkId: row.link_id || undefined,
    read: row.read,
    createdAt: row.created_at,
  };
}

// ---------- Audit Logs ----------
export function auditLogFromRow(row: any): AuditLog {
  return {
    id: row.id,
    userId: row.user_id || '',
    userName: row.user_name || '',
    action: row.action,
    details: row.details || '',
    affectedEntity: row.affected_entity || '',
    entityId: row.entity_id || undefined,
    timestamp: row.timestamp,
  };
}

// ---------- Store Settings ----------
export function settingsFromRow(row: any): StoreSettings {
  return {
    storeName: row.store_name || '',
    legalName: row.legal_name || '',
    cnpj: row.cnpj || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    cep: row.cep || '',
    address: row.address || '',
    number: row.number || '',
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    state: row.state || '',
    logoUrl: row.logo_url || undefined,
    warrantyRules: {
      skipFirst1000Km: row.warranty_skip_first_1000km,
      firstRevisionKm: row.warranty_first_revision_km,
      subsequentIntervalKm: row.warranty_subsequent_interval_km,
      intervalMonths: row.warranty_interval_months,
      alertDaysTolerance: row.warranty_alert_days_tolerance,
      alertKmTolerance: row.warranty_alert_km_tolerance,
    },
    defaultMarkupPercent: row.default_markup_percent !== null ? Number(row.default_markup_percent) : undefined,
    autoApplyMarkup: row.auto_apply_markup,
  };
}

export function settingsToRow(s: Partial<StoreSettings>): Record<string, any> {
  const row: Record<string, any> = {};
  if (s.storeName !== undefined) row.store_name = s.storeName;
  if (s.legalName !== undefined) row.legal_name = s.legalName;
  if (s.cnpj !== undefined) row.cnpj = s.cnpj;
  if (s.phone !== undefined) row.phone = s.phone;
  if (s.whatsapp !== undefined) row.whatsapp = s.whatsapp;
  if (s.email !== undefined) row.email = s.email;
  if (s.cep !== undefined) row.cep = s.cep;
  if (s.address !== undefined) row.address = s.address;
  if (s.number !== undefined) row.number = s.number;
  if (s.neighborhood !== undefined) row.neighborhood = s.neighborhood;
  if (s.city !== undefined) row.city = s.city;
  if (s.state !== undefined) row.state = s.state;
  if (s.logoUrl !== undefined) row.logo_url = s.logoUrl;
  if (s.defaultMarkupPercent !== undefined) row.default_markup_percent = s.defaultMarkupPercent;
  if (s.autoApplyMarkup !== undefined) row.auto_apply_markup = s.autoApplyMarkup;
  if (s.warrantyRules) {
    const r = s.warrantyRules;
    if (r.skipFirst1000Km !== undefined) row.warranty_skip_first_1000km = r.skipFirst1000Km;
    if (r.firstRevisionKm !== undefined) row.warranty_first_revision_km = r.firstRevisionKm;
    if (r.subsequentIntervalKm !== undefined) row.warranty_subsequent_interval_km = r.subsequentIntervalKm;
    if (r.intervalMonths !== undefined) row.warranty_interval_months = r.intervalMonths;
    if (r.alertDaysTolerance !== undefined) row.warranty_alert_days_tolerance = r.alertDaysTolerance;
    if (r.alertKmTolerance !== undefined) row.warranty_alert_km_tolerance = r.alertKmTolerance;
  }
  return row;
}

// ---------- Error Reports ----------
export function errorReportFromRow(row: any): ErrorReport {
  return {
    id: row.id,
    userId: row.user_id || '',
    userName: row.user_name || '',
    userEmail: row.user_email || '',
    userRole: row.user_role,
    title: row.title,
    description: row.description,
    category: row.category,
    severity: row.severity,
    status: row.status,
    screenOrModule: row.screen_or_module || undefined,
    screenshotUrl: row.screenshot_url || undefined,
    adminResponse: row.admin_response || undefined,
    resolvedAt: row.resolved_at || undefined,
    resolvedBy: row.resolved_by || undefined,
    createdAt: row.created_at,
  };
}

// ---------- Role Permissions ----------
export function rolePermissionFromRow(row: any): RolePermission {
  return {
    role: row.role,
    sectionKey: row.section_key,
    canView: row.can_view,
  };
}

// ---------- Stores ----------
export function storeFromRow(row: any): Store {
  return {
    id: row.id,
    storeName: row.name,
    legalName: row.legal_name || '',
    cnpj: row.cnpj || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    cep: row.cep || '',
    address: row.address || '',
    number: row.number || '',
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    state: row.state || '',
    logoUrl: row.logo_url || undefined,
    warrantyRules: {
      skipFirst1000Km: row.warranty_skip_first_1000km,
      firstRevisionKm: row.warranty_first_revision_km,
      subsequentIntervalKm: row.warranty_subsequent_interval_km,
      intervalMonths: row.warranty_interval_months,
      alertDaysTolerance: row.warranty_alert_days_tolerance,
      alertKmTolerance: row.warranty_alert_km_tolerance,
    },
    defaultMarkupPercent: row.default_markup_percent !== null ? Number(row.default_markup_percent) : undefined,
    autoApplyMarkup: row.auto_apply_markup,
    active: row.active,
    createdAt: row.created_at,
  };
}

export function storeToRow(s: Partial<Store>): Record<string, any> {
  const row: Record<string, any> = {};
  if (s.storeName !== undefined) row.name = s.storeName;
  if (s.legalName !== undefined) row.legal_name = s.legalName;
  if (s.cnpj !== undefined) row.cnpj = s.cnpj;
  if (s.phone !== undefined) row.phone = s.phone;
  if (s.whatsapp !== undefined) row.whatsapp = s.whatsapp;
  if (s.email !== undefined) row.email = s.email;
  if (s.cep !== undefined) row.cep = s.cep;
  if (s.address !== undefined) row.address = s.address;
  if (s.number !== undefined) row.number = s.number;
  if (s.neighborhood !== undefined) row.neighborhood = s.neighborhood;
  if (s.city !== undefined) row.city = s.city;
  if (s.state !== undefined) row.state = s.state;
  if (s.logoUrl !== undefined) row.logo_url = s.logoUrl;
  if (s.defaultMarkupPercent !== undefined) row.default_markup_percent = s.defaultMarkupPercent;
  if (s.autoApplyMarkup !== undefined) row.auto_apply_markup = s.autoApplyMarkup;
  if (s.active !== undefined) row.active = s.active;
  if (s.warrantyRules) {
    const r = s.warrantyRules;
    if (r.skipFirst1000Km !== undefined) row.warranty_skip_first_1000km = r.skipFirst1000Km;
    if (r.firstRevisionKm !== undefined) row.warranty_first_revision_km = r.firstRevisionKm;
    if (r.subsequentIntervalKm !== undefined) row.warranty_subsequent_interval_km = r.subsequentIntervalKm;
    if (r.intervalMonths !== undefined) row.warranty_interval_months = r.intervalMonths;
    if (r.alertDaysTolerance !== undefined) row.warranty_alert_days_tolerance = r.alertDaysTolerance;
    if (r.alertKmTolerance !== undefined) row.warranty_alert_km_tolerance = r.alertKmTolerance;
  }
  return row;
}

// ---------- User Store Access ----------
export function userStoreAccessFromRow(row: any): UserStoreAccess {
  return {
    userId: row.user_id,
    storeId: row.store_id,
    grantedAt: row.granted_at,
    grantedBy: row.granted_by || undefined,
  };
}
