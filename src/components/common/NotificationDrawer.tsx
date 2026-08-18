import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Bug,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Package,
  UserPlus,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { formatDateTime } from '../../utils/formatters';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, entityId?: string) => void;
}

// Notification types meant only for the Administrator (user approvals, error
// reports awaiting triage). Hidden from other roles to avoid confusing staff
// with alerts they have no permission to act on, and to avoid leaking who
// reported what before an admin has reviewed it.
const ADMIN_ONLY_NOTIF_TYPES = ['USER_PENDING_APPROVAL', 'ERROR_REPORT'];

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } =
    useStore();
  const { isAdmin } = useAuth();

  if (!isOpen) return null;

  const visibleNotifications = isAdmin
    ? notifications
    : notifications.filter((n) => !ADMIN_ONLY_NOTIF_TYPES.includes(n.type));

  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'ERROR_REPORT':
        return <Bug className="w-5 h-5 text-red-600 shrink-0" />;
      case 'ERROR_RESOLVED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
      case 'USER_PENDING_APPROVAL':
        return <UserPlus className="w-5 h-5 text-amber-600 shrink-0" />;
      case 'REVISAO_ATRASADA':
        return <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
      case 'REVISAO_PROXIMA':
        return <Clock className="w-5 h-5 text-amber-600 shrink-0" />;
      case 'ESTOQUE_BAIXO':
        return <Package className="w-5 h-5 text-purple-600 shrink-0" />;
      case 'OS_NOVA':
      case 'OS_STATUS':
      default:
        return <Wrench className="w-5 h-5 text-sky-600 shrink-0" />;
    }
  };

  const getNotifBg = (type: string, read: boolean) => {
    if (read) return 'bg-white hover:bg-slate-50 border-slate-200';
    switch (type) {
      case 'ERROR_REPORT':
        return 'bg-red-50/80 hover:bg-red-50 border-red-300';
      case 'ERROR_RESOLVED':
        return 'bg-emerald-50/70 hover:bg-emerald-50 border-emerald-300';
      case 'USER_PENDING_APPROVAL':
        return 'bg-amber-50/70 hover:bg-amber-50 border-amber-300';
      case 'REVISAO_ATRASADA':
        return 'bg-rose-50/50 hover:bg-rose-50 border-rose-200';
      case 'REVISAO_PROXIMA':
        return 'bg-amber-50/50 hover:bg-amber-50 border-amber-200';
      case 'ESTOQUE_BAIXO':
        return 'bg-purple-50/50 hover:bg-purple-50 border-purple-200';
      default:
        return 'bg-sky-50/50 hover:bg-sky-50 border-sky-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Central de Alertas</h3>
              <p className="text-xs text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} alerta(s) não lido(s)`
                  : 'Nenhum alerta pendente'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                title="Marcar todas como lidas"
                className="p-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Lidas</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {visibleNotifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="text-sm font-medium text-slate-600">Tudo limpo!</p>
              <p className="text-xs text-slate-400 mt-1">
                Você não possui nenhuma notificação no momento.
              </p>
            </div>
          ) : (
            visibleNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl border transition-all ${getNotifBg(
                  n.type,
                  n.read
                )} relative group`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getNotifIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {n.title}
                      </h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatDateTime(n.createdAt)}</span>
                      <div className="flex items-center gap-2">
                        {n.linkTarget && (
                          <button
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              onNavigate(n.linkTarget!, n.linkId);
                              onClose();
                            }}
                            className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            Ver detalhes <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(n.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
