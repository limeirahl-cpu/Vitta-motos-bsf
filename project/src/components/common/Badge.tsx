import React from 'react';
import { RevisionStatus, ServiceOrderStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  }[size];

  const variantClasses = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    neutral: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full tracking-tight whitespace-nowrap ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
};

export const ServiceOrderStatusBadge: React.FC<{ status: ServiceOrderStatus }> = ({ status }) => {
  switch (status) {
    case 'ABERTA':
      return <Badge variant="info">Aberta</Badge>;
    case 'AGUARDANDO_DIAGNOSTICO':
      return <Badge variant="warning">Aguardando Diagnóstico</Badge>;
    case 'AGUARDANDO_APROVACAO':
      return <Badge variant="warning">Aguardando Aprovação</Badge>;
    case 'EM_ANDAMENTO':
      return <Badge variant="purple">Em Andamento</Badge>;
    case 'AGUARDANDO_PECA':
      return <Badge variant="warning">Aguardando Peça</Badge>;
    case 'FINALIZADA':
      return <Badge variant="success">Finalizada</Badge>;
    case 'ENTREGUE':
      return <Badge variant="success">Entregue</Badge>;
    case 'CANCELADA':
      return <Badge variant="danger">Cancelada</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};

export const ServiceTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'REVISAO_GARANTIA':
      return <Badge variant="purple">Revisão de Garantia</Badge>;
    case 'MANUTENCAO_PREVENTIVA':
      return <Badge variant="info">Manutenção Preventiva</Badge>;
    case 'MANUTENCAO_CORRETIVA':
      return <Badge variant="danger">Manutenção Corretiva</Badge>;
    case 'OUTRO':
      return <Badge variant="default">Outro / Acessórios</Badge>;
    default:
      return <Badge variant="default">{type}</Badge>;
  }
};

export const RevisionStatusBadge: React.FC<{ status: RevisionStatus }> = ({ status }) => {
  switch (status) {
    case 'DISTANTE':
      return (
        <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
          Em Dia / Distante
        </Badge>
      );
    case 'PROXIMA':
      return (
        <Badge variant="warning" className="bg-amber-50 text-amber-700 border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
          Próxima
        </Badge>
      );
    case 'VENCENDO':
      return (
        <Badge variant="warning" className="bg-orange-50 text-orange-700 border-orange-200 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5" />
          Vencendo em Breve
        </Badge>
      );
    case 'ATRASADA':
      return (
        <Badge variant="danger" className="bg-rose-50 text-rose-700 border-rose-200 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-ping" />
          Atrasada
        </Badge>
      );
    case 'REALIZADA':
      return (
        <Badge variant="info">
          Realizada
        </Badge>
      );
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};
