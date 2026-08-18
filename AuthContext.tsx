import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { userFromRow } from '../lib/mappers';
import { User, UserRole, UserStatus } from '../types';

export interface LoginResult {
  success: boolean;
  message?: string;
  status?: UserStatus;
  user?: User;
}

export interface RegisterResult {
  success: boolean;
  message?: string;
  user?: User;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isAuthReady: boolean;
  login: (email: string, password?: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  registerUser: (data: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    password: string;
  }) => Promise<RegisterResult>;
  verifyEmailCode: (email: string, code: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  resendVerificationCode: (email: string) => Promise<{ success: boolean; message?: string }>;
  approveUser: (id: string, roleOverride?: UserRole) => Promise<{ success: boolean; message?: string }>;
  rejectUser: (id: string, reason?: string) => Promise<{ success: boolean; message?: string }>;
  recoverPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  addUser: (user: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    password: string;
  }) => Promise<{ success: boolean; message?: string }>;
  updateUser: (id: string, updates: Partial<User>) => Promise<{ success: boolean; message?: string }>;
  toggleUserActive: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<{ success: boolean; message?: string }>;

  // Status helpers
  isAuthenticated: boolean;
  isAdmin: boolean;
  isVendedor: boolean;
  isRecepcionista: boolean;
  isMecanico: boolean;
  pendingApprovalUsers: User[];
  pendingApprovalCount: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // currentUser reflects the profile row for whoever holds a live Supabase
  // Auth session, REGARDLESS of approval status - this lets a user who is
  // still pending_approval/rejected keep seeing the right screen even after
  // a page refresh (a real gap in the old localStorage-only version, which
  // lost that context on reload).
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const mountedRef = useRef(true);

  const fetchProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error || !data) return null;
    return userFromRow(data);
  };

  const refreshUsers = async () => {
    // RLS returns every profile to an admin, and only the caller's own row
    // otherwise - so this is safe to call regardless of role.
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (!error && data && mountedRef.current) {
      setUsers(data.map(userFromRow));
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const profile = await fetchProfile(sessionData.session.user.id);
        if (mountedRef.current) setCurrentUser(profile);
        await refreshUsers();
      }
      if (mountedRef.current) setIsAuthReady(true);
    };
    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (mountedRef.current) setCurrentUser(profile);
        await refreshUsers();
      } else {
        if (mountedRef.current) {
          setCurrentUser(null);
          setUsers([]);
        }
      }
    });

    // Keep the user list (and therefore pending-approval badges) live for
    // admins without needing a manual refresh.
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        refreshUsers();
        if (currentUserIdRef.current) {
          fetchProfile(currentUserIdRef.current).then((p) => {
            if (mountedRef.current && p) setCurrentUser(p);
          });
        }
      })
      .subscribe();

    return () => {
      mountedRef.current = false;
      subscription.subscription.unsubscribe();
      supabase.removeChannel(profilesChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ref mirror of currentUser.id so the realtime subscription (set up once)
  // can always read the latest value without re-subscribing on every change.
  const currentUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentUserIdRef.current = currentUser?.id || null;
  }, [currentUser]);

  const login = async (email: string, password?: string): Promise<LoginResult> => {
    const cleanEmail = email.toLowerCase().trim();
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password || '',
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('confirm')) {
        return {
          success: false,
          status: 'pending_verification',
          message: 'Seu e-mail ainda não foi confirmado. Digite o código de verificação enviado.',
        };
      }
      return { success: false, message: 'E-mail ou senha incorretos.' };
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { success: false, message: 'Falha ao autenticar.' };

    const profile = await fetchProfile(userData.user.id);
    if (!profile) {
      await supabase.auth.signOut();
      return { success: false, message: 'Perfil de usuário não encontrado.' };
    }
    setCurrentUser(profile);
    await refreshUsers();

    if (profile.status === 'pending_approval') {
      return {
        success: false,
        status: 'pending_approval',
        user: profile,
        message: 'Seu cadastro foi realizado com sucesso e está aguardando a aprovação do Administrador.',
      };
    }
    if (profile.status === 'rejected') {
      return {
        success: false,
        status: 'rejected',
        user: profile,
        message: `Seu cadastro foi recusado pelo Administrador.${
          profile.rejectionReason ? ` Motivo: ${profile.rejectionReason}` : ''
        }`,
      };
    }
    if (!profile.active) {
      return { success: false, message: 'Esta conta de usuário está desativada no sistema.' };
    }

    return { success: true, user: profile };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUsers([]);
  };

  const registerUser = async (data: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    password: string;
  }): Promise<RegisterResult> => {
    const cleanEmail = data.email.toLowerCase().trim();
    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: data.password,
      options: {
        data: { name: data.name.trim(), phone: data.phone.trim(), role: data.role },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        return { success: false, message: 'Já existe uma conta registrada com este e-mail.' };
      }
      return { success: false, message: error.message };
    }

    return { success: true };
  };

  // Supabase's built-in signup confirmation uses a 6-digit OTP token sent by
  // email (type: 'signup'), the same UX shape the app already had - but the
  // code now really is only known to the person who owns that inbox.
  const verifyEmailCode = async (
    email: string,
    code: string
  ): Promise<{ success: boolean; message?: string; user?: User }> => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.toLowerCase().trim(),
      token: code.trim(),
      type: 'signup',
    });

    if (error || !data.user) {
      return { success: false, message: 'Código de verificação incorreto ou expirado. Tente novamente.' };
    }

    const profile = await fetchProfile(data.user.id);
    if (profile) setCurrentUser(profile);
    await refreshUsers();

    return {
      success: true,
      user: profile || undefined,
      message: 'E-mail verificado com sucesso! Seu cadastro foi encaminhado para aprovação do Administrador.',
    };
  };

  const resendVerificationCode = async (email: string): Promise<{ success: boolean; message?: string }> => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.toLowerCase().trim() });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Novo código de verificação enviado para o seu e-mail.' };
  };

  const approveUser = async (
    id: string,
    roleOverride?: UserRole
  ): Promise<{ success: boolean; message?: string }> => {
    const target = users.find((u) => u.id === id);
    const updates: Record<string, any> = {
      status: 'approved',
      active: true,
      approved_at: new Date().toISOString(),
      approved_by: currentUser?.name || 'Administrador Geral',
      rejection_reason: null,
    };
    if (roleOverride) updates.role = roleOverride;

    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (error) return { success: false, message: error.message };
    await refreshUsers();
    return { success: true, message: `Usuário ${target?.name || ''} aprovado com sucesso!` };
  };

  const rejectUser = async (id: string, reason?: string): Promise<{ success: boolean; message?: string }> => {
    const target = users.find((u) => u.id === id);
    const { error } = await supabase
      .from('profiles')
      .update({
        status: 'rejected',
        active: false,
        rejection_reason: reason || 'Cadastro recusado pela administração.',
      })
      .eq('id', id);
    if (error) return { success: false, message: error.message };
    await refreshUsers();
    return { success: true, message: `Cadastro de ${target?.name || ''} foi recusado.` };
  };

  const recoverPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim());
    if (error) return { success: false, message: error.message };
    return {
      success: true,
      message: 'Se este e-mail estiver cadastrado, enviamos um link seguro para você redefinir sua senha.',
    };
  };

  // Creating a user with a pre-set password, and permanently deleting a
  // user, both require Supabase's service-role key - which must never sit
  // in frontend code. Both actions go through the "admin-users" Edge
  // Function, which re-checks the caller is an approved admin before
  // touching anything.
  const addUser = async (data: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    password: string;
  }): Promise<{ success: boolean; message?: string }> => {
    const { data: fnData, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'create', ...data },
    });
    if (error) return { success: false, message: error.message };
    if (!fnData?.success) return { success: false, message: fnData?.message || 'Falha ao criar usuário.' };
    await refreshUsers();
    return { success: true };
  };

  const updateUser = async (id: string, updates: Partial<User>): Promise<{ success: boolean; message?: string }> => {
    const row: Record<string, any> = {};
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.phone !== undefined) row.phone = updates.phone;
    if (updates.role !== undefined) row.role = updates.role;
    if (updates.active !== undefined) row.active = updates.active;

    const { error } = await supabase.from('profiles').update(row).eq('id', id);
    if (error) return { success: false, message: error.message };

    await refreshUsers();
    if (currentUser?.id === id) {
      const fresh = await fetchProfile(id);
      if (fresh) setCurrentUser(fresh);
    }
    return { success: true };
  };

  const toggleUserActive = async (id: string) => {
    if (currentUser?.id === id) return; // Cannot deactivate self
    const target = users.find((u) => u.id === id);
    if (!target) return;
    const { error } = await supabase.from('profiles').update({ active: !target.active }).eq('id', id);
    if (!error) await refreshUsers();
  };

  const deleteUser = async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (currentUser?.id === id) {
      return { success: false, message: 'Você não pode excluir sua própria conta conectada.' };
    }
    const { data: fnData, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'delete', userId: id },
    });
    if (error) return { success: false, message: error.message };
    if (!fnData?.success) return { success: false, message: fnData?.message || 'Falha ao excluir usuário.' };
    await refreshUsers();
    return { success: true };
  };

  // Pending users
  const pendingApprovalUsers = users.filter((u) => u.status === 'pending_approval');
  const pendingApprovalCount = pendingApprovalUsers.length;

  // Only a fully approved & active session counts as "authenticated" for
  // the purposes of unlocking the app shell.
  const isAuthenticated = !!currentUser && currentUser.status === 'approved' && currentUser.active;

  const role = isAuthenticated ? currentUser?.role : undefined;
  const isAdmin = role === 'admin';
  const isVendedor = role === 'vendedor';
  const isRecepcionista = role === 'recepcionista' || role === 'staff';
  const isMecanico = role === 'mecanico';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAuthReady,
        login,
        logout,
        registerUser,
        verifyEmailCode,
        resendVerificationCode,
        approveUser,
        rejectUser,
        recoverPassword,
        addUser,
        updateUser,
        toggleUserActive,
        deleteUser,
        isAuthenticated,
        isAdmin,
        isVendedor,
        isRecepcionista,
        isMecanico,
        pendingApprovalUsers,
        pendingApprovalCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
