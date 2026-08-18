import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { LoginView } from './components/auth/LoginView';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { DashboardView } from './components/dashboard/DashboardView';
import { WarrantyRevisionsView } from './components/revisoes/WarrantyRevisionsView';
import { RegisterRevisionModal } from './components/revisoes/RegisterRevisionModal';
import { ServiceOrdersList } from './components/orders/ServiceOrdersList';
import { ServiceOrderFormModal } from './components/orders/ServiceOrderFormModal';
import { MotorcyclesList } from './components/motorcycles/MotorcyclesList';
import { MotorcycleDetailModal } from './components/motorcycles/MotorcycleDetailModal';
import { ClientsList } from './components/clients/ClientsList';
import { ClientDetailModal } from './components/clients/ClientDetailModal';
import { PartsList } from './components/stock/PartsList';
import { StockMovementsView } from './components/stock/StockMovementsView';
import { ServicesCatalogView } from './components/services/ServicesCatalogView';
import { ReportsView } from './components/reports/ReportsView';
import { AdminSettingsView } from './components/admin/AdminSettingsView';
import { Motorcycle, Client, SectionKey } from './types';

const LoadingScreen: React.FC<{ label: string }> = ({ label }) => (
  <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3">
    <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
    <p className="text-sm font-semibold text-slate-500">{label}</p>
  </div>
);

const MainLayout: React.FC = () => {
  const { isAuthenticated, isAdmin, isAuthReady, currentUser } = useAuth();
  const { motorcycles, clients, isDataReady, canViewSection } = useStore();

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vitta_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Global search & notifications
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Global modals triggered from other screens
  const [registerRevisionMotoId, setRegisterRevisionMotoId] = useState<string | null>(null);
  const [newOrderMotoId, setNewOrderMotoId] = useState<string | null>(null);
  const [newOrderClientId, setNewOrderClientId] = useState<string | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  const [selectedClientDetail, setSelectedClientDetail] = useState<Client | null>(null);
  const [selectedMotoDetail, setSelectedMotoDetail] = useState<Motorcycle | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // If the current section becomes unavailable for this role - either at
  // load time, or live if an admin revokes access while the person is
  // already on that screen - bounce to Dashboard instead of showing a
  // section they're not supposed to see.
  useEffect(() => {
    if (!isDataReady || !currentUser) return;
    const isAdminOnlySection = currentView === 'configuracoes';
    if (isAdminOnlySection) {
      if (!isAdmin) setCurrentView('dashboard');
      return;
    }
    const allowed = canViewSection(currentUser.role, currentView as SectionKey);
    if (!allowed) setCurrentView('dashboard');
  }, [currentView, isDataReady, currentUser, isAdmin, canViewSection]);

  // Avoid a flash of the login screen while a stored session is still
  // being restored/validated against Supabase on first load.
  if (!isAuthReady) {
    return <LoadingScreen label="Carregando sessão..." />;
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Once authenticated, wait for the initial data fetch so screens don't
  // briefly render as if the dealership had zero clients/motos/etc.
  if (!isDataReady) {
    return <LoadingScreen label="Carregando dados do sistema..." />;
  }

  // Toggle sidebar collapse state
  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('vitta_sidebar_collapsed', String(next));
        } catch {
          // ignore localStorage failure
        }
        return next;
      });
    }
  };

  // Handlers
  const handleOpenClientDetail = (clientId: string) => {
    const c = clients.find((item) => item.id === clientId);
    if (c) setSelectedClientDetail(c);
  };

  const handleOpenMotoDetail = (motoId: string) => {
    const m = motorcycles.find((item) => item.id === motoId);
    if (m) setSelectedMotoDetail(m);
  };

  const handleOpenRevisionModal = (motoId: string) => {
    setRegisterRevisionMotoId(motoId);
  };

  const handleCreateOrderForMoto = (motoId: string) => {
    const m = motorcycles.find((item) => item.id === motoId);
    setNewOrderMotoId(motoId);
    setNewOrderClientId(m ? m.clientId : null);
    setIsNewOrderModalOpen(true);
  };

  const handleCreateOrderForClient = (clientId: string) => {
    setNewOrderClientId(clientId);
    const m = motorcycles.find((item) => item.clientId === clientId);
    setNewOrderMotoId(m ? m.id : null);
    setIsNewOrderModalOpen(true);
  };

  const handleSelectOrderFromDashboard = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCurrentView('ordens');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={handleToggleSidebar}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onNavigate={(view) => {
          setCurrentView(view);
          setIsMobileSidebarOpen(false);
        }}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sliding / Collapsible Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={(view) => {
            setCurrentView(view);
            setIsMobileSidebarOpen(false);
          }}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => {
            setIsSidebarCollapsed((prev) => {
              const next = !prev;
              try {
                localStorage.setItem('vitta_sidebar_collapsed', String(next));
              } catch {
                // ignore
              }
              return next;
            });
          }}
        />

        {/* Main Content Area - Expands automatically when sidebar slides/collapses */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full transition-all duration-300">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentView}
              onSelectOrder={handleSelectOrderFromDashboard}
              onRegisterRevision={handleOpenRevisionModal}
            />
          )}

          {currentView === 'revisoes' && (
            <WarrantyRevisionsView
              onSelectClient={handleOpenClientDetail}
              onSelectMoto={handleOpenMotoDetail}
              onRegisterRevision={handleOpenRevisionModal}
            />
          )}

          {currentView === 'ordens' && (
            <ServiceOrdersList
              onSelectClient={handleOpenClientDetail}
              onSelectMoto={handleOpenMotoDetail}
              selectedOrderId={selectedOrderId}
              onClearSelectedOrder={() => setSelectedOrderId(null)}
            />
          )}

          {currentView === 'motos' && (
            <MotorcyclesList
              onSelectClient={handleOpenClientDetail}
              onSelectMoto={handleOpenMotoDetail}
              onRegisterRevision={handleOpenRevisionModal}
              onCreateOrder={handleCreateOrderForMoto}
            />
          )}

          {currentView === 'clientes' && (
            <ClientsList
              onSelectClient={handleOpenClientDetail}
              onSelectMoto={handleOpenMotoDetail}
              onCreateOrder={handleCreateOrderForClient}
            />
          )}

          {currentView === 'estoque' && (
            <PartsList onOpenMovementsHistory={() => setCurrentView('movimentacoes')} />
          )}

          {currentView === 'movimentacoes' && <StockMovementsView />}

          {currentView === 'servicos' && <ServicesCatalogView />}

          {currentView === 'relatorios' && <ReportsView />}

          {currentView === 'configuracoes' &&
            (isAdmin ? (
              <AdminSettingsView />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <h2 className="text-lg font-extrabold text-slate-900">Acesso Restrito</h2>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                  Esta área é exclusiva para Administradores.
                </p>
              </div>
            ))}
        </main>
      </div>

      {/* Unified Global Search Modal (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectClient={(id) => {
          handleOpenClientDetail(id);
          setCurrentView('clientes');
        }}
        onSelectMotorcycle={(id) => {
          handleOpenMotoDetail(id);
          setCurrentView('motos');
        }}
        onSelectServiceOrder={(id) => {
          setSelectedOrderId(id);
          setCurrentView('ordens');
        }}
        onSelectPart={() => {
          setCurrentView('estoque');
        }}
      />

      {/* Unified Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigate={(tab, entityId) => {
          setCurrentView(tab);
          if (entityId && tab === 'ordens') {
            setSelectedOrderId(entityId);
          } else if (entityId && tab === 'motos') {
            handleOpenMotoDetail(entityId);
          }
        }}
      />

      {/* Global Quick Action Modals */}
      {registerRevisionMotoId && (
        <RegisterRevisionModal
          isOpen={!!registerRevisionMotoId}
          onClose={() => setRegisterRevisionMotoId(null)}
          defaultMotorcycleId={registerRevisionMotoId}
        />
      )}

      {isNewOrderModalOpen && (
        <ServiceOrderFormModal
          isOpen={isNewOrderModalOpen}
          onClose={() => {
            setIsNewOrderModalOpen(false);
            setNewOrderMotoId(null);
            setNewOrderClientId(null);
          }}
          defaultMotorcycleId={newOrderMotoId || undefined}
          defaultClientId={newOrderClientId || undefined}
        />
      )}

      {selectedClientDetail && (
        <ClientDetailModal
          isOpen={!!selectedClientDetail}
          client={selectedClientDetail}
          onClose={() => setSelectedClientDetail(null)}
          onSelectMoto={handleOpenMotoDetail}
          onCreateOrder={handleCreateOrderForClient}
        />
      )}

      {selectedMotoDetail && (
        <MotorcycleDetailModal
          isOpen={!!selectedMotoDetail}
          motorcycle={selectedMotoDetail}
          onClose={() => setSelectedMotoDetail(null)}
          onSelectClient={handleOpenClientDetail}
          onRegisterRevision={handleOpenRevisionModal}
          onCreateOrder={handleCreateOrderForMoto}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <MainLayout />
      </StoreProvider>
    </AuthProvider>
  );
}
