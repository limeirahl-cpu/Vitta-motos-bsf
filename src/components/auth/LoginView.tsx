import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { ShinerayLogo } from '../common/ShinerayLogo';

type AuthStep = 'login' | 'register' | 'verify_email' | 'pending_approval' | 'rejected_info';

export const LoginView: React.FC = () => {
  const {
    login,
    registerUser,
    verifyEmailCode,
    resendVerificationCode,
    recoverPassword,
    currentUser,
  } = useAuth();

  const [step, setStep] = useState<AuthStep>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('vendedor');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Verification state
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Pending approval / rejected user reference
  const [pendingUserData, setPendingUserData] = useState<{
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    createdAt?: string;
    rejectionReason?: string;
  } | null>(null);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoverEmailInput, setRecoverEmailInput] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  // Countdown timer for code resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // While waiting on the pending-approval screen, currentUser is kept live
  // by AuthContext's realtime subscription on profiles. If the admin
  // rejects the request while this tab is open, react immediately instead
  // of requiring a manual refresh. (Approval is handled automatically by
  // App.tsx swapping away from LoginView once isAuthenticated flips true.)
  useEffect(() => {
    if (step === 'pending_approval' && currentUser?.status === 'rejected') {
      setPendingUserData({
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        role: currentUser.role,
        createdAt: currentUser.createdAt,
        rejectionReason: currentUser.rejectionReason,
      });
      setStep('rejected_info');
    }
  }, [step, currentUser]);

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await login(loginEmail, loginPassword);

      if (!res.success) {
        if (res.status === 'pending_verification') {
          setVerifyEmail(loginEmail.toLowerCase().trim());
          setStep('verify_email');
          return;
        }

        if (res.status === 'pending_approval' && res.user) {
          setPendingUserData({
            name: res.user.name,
            email: res.user.email,
            phone: res.user.phone,
            role: res.user.role,
            createdAt: res.user.createdAt,
          });
          setStep('pending_approval');
          return;
        }

        if (res.status === 'rejected' && res.user) {
          setPendingUserData({
            name: res.user.name,
            email: res.user.email,
            phone: res.user.phone,
            role: res.user.role,
            createdAt: res.user.createdAt,
            rejectionReason: res.user.rejectionReason,
          });
          setStep('rejected_info');
          return;
        }

        setLoginError(res.message || 'Falha ao autenticar.');
      }
    } catch (err) {
      // Guarantees the button never gets stuck on "Validando..." if
      // something unexpected throws (e.g. a network hiccup) instead of
      // resolving to a normal {success:false} result.
      setLoginError(
        err instanceof Error ? err.message : 'Erro inesperado ao tentar entrar. Verifique sua conexão e tente novamente.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Registration submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regName.trim()) {
      setRegError('Por favor, informe seu nome completo.');
      return;
    }
    if (!regEmail.trim()) {
      setRegError('Por favor, informe seu e-mail.');
      return;
    }
    if (regPassword.length < 3) {
      setRegError('A senha deve conter no mínimo 3 caracteres.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('As senhas digitadas não coincidem.');
      return;
    }

    setIsRegistering(true);

    try {
      const res = await registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        role: regRole,
        password: regPassword,
      });

      if (!res.success) {
        setRegError(res.message || 'Não foi possível cadastrar o usuário.');
        return;
      }

      setVerifyEmail(regEmail.trim().toLowerCase());
      setResendCooldown(30);
      setVerifyCode('');
      setVerifyError(null);
      setVerifySuccess(null);
      setStep('verify_email');
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Erro inesperado ao cadastrar. Tente novamente.');
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle Email Verification Code submission
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    setVerifySuccess(null);

    if (!verifyCode.trim() || verifyCode.trim().length < 6) {
      setVerifyError('Digite o código de 6 dígitos completo.');
      return;
    }

    try {
      const res = await verifyEmailCode(verifyEmail, verifyCode.trim());

      if (!res.success) {
        setVerifyError(res.message || 'Código inválido.');
        return;
      }

      if (res.user) {
        setPendingUserData({
          name: res.user.name,
          email: res.user.email,
          phone: res.user.phone,
          role: res.user.role,
          createdAt: res.user.createdAt,
        });
      }

      setStep('pending_approval');
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Erro inesperado ao verificar o código. Tente novamente.');
    }
  };

  // Handle Code Resend
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    try {
      const res = await resendVerificationCode(verifyEmail);
      if (res.success) {
        setResendCooldown(30);
        setVerifySuccess('Novo código enviado com sucesso! Confira sua caixa de entrada.');
        setTimeout(() => setVerifySuccess(null), 4000);
      } else {
        setVerifyError(res.message || 'Não foi possível reenviar o código.');
      }
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Erro inesperado ao reenviar o código.');
    }
  };

  // Check if user was approved while on pending screen. currentUser is kept
  // live by realtime, so this is mostly a reassuring manual nudge - but a
  // fresh reload guarantees an up-to-date session/profile read too.
  const handleCheckApprovalStatus = () => {
    if (currentUser?.status === 'approved' && currentUser.active) {
      window.location.reload();
      return;
    }
    if (currentUser?.status === 'rejected') {
      setStep('rejected_info');
      return;
    }
    alert('Seu cadastro ainda está sob análise pelo Administrador Geral.');
  };

  // Password Recovery handler
  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverEmailInput) return;
    try {
      const res = await recoverPassword(recoverEmailInput);
      setRecoveryMessage({
        success: res.success,
        text: res.message,
      });
    } catch (err) {
      setRecoveryMessage({
        success: false,
        text: err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.',
      });
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrador Geral';
      case 'vendedor':
        return 'Vendedor / Consultor Comercial';
      case 'recepcionista':
      case 'staff':
        return 'Recepcionista / Atendimento';
      case 'mecanico':
        return 'Mecânico / Oficina';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden antialiased select-none">
      {/* Background glow accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white shadow-xl shadow-red-600/20 mb-3 border border-slate-200">
            <ShinerayLogo variant="full" theme="dark" size="md" />
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            VITTA COMÉRCIO DE VEÍCULOS LTDA.
          </h1>
          <p className="text-[11px] font-bold text-red-500 uppercase tracking-wider mt-0.5">
            Concessionária Autorizada Shineray • Sistema de Gestão
          </p>
        </div>

        {/* ========================================================= */}
        {/* SCREEN 1: LOGIN (ENTRAR NO SISTEMA) */}
        {/* ========================================================= */}
        {step === 'login' && (
          <div className="mt-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Acesso Restrito</h2>
                    <p className="text-[11px] text-slate-400">Entre com seu e-mail e senha cadastrados</p>
                  </div>
                </div>
              </div>

              {loginError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Não foi possível entrar</p>
                    <p className="text-[11px] text-rose-300/90 mt-0.5">{loginError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    E-mail
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="seu.email@vittamotos.com.br"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(true);
                        setRecoveryMessage(null);
                        setRecoverEmailInput(loginEmail);
                      }}
                      className="text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Validando Credenciais...
                    </>
                  ) : (
                    <>
                      <span>Acessar o Sistema</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Botão para solicitar cadastro */}
              <div className="pt-3 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  Novo colaborador na concessionária?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setStep('register');
                      setRegError(null);
                    }}
                    className="font-bold text-red-400 hover:text-red-300 underline underline-offset-2 cursor-pointer"
                  >
                    Solicitar Cadastro
                  </button>
                </p>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 2: CADASTRO / SOLICITAÇÃO DE ACESSO */}
        {/* ========================================================= */}
        {step === 'register' && (
          <div className="mt-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setStep('login')}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar ao Login
                </button>
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                  Passo 1 de 3
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-red-500" />
                  Solicitar Acesso à Plataforma
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Preencha seus dados para receber o código de confirmação no seu e-mail.
                </p>
              </div>

              {regError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Nome Completo *
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Ex: Roberto Alencar"
                      className="w-full pl-10 pr-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    E-mail Corporativo *
                  </label>
                  <div className="relative rounded-xl">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="seu.nome@vittamotos.com.br"
                      className="w-full pl-10 pr-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Telefone / WhatsApp
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="(27) 99999-0000"
                        className="w-full pl-8.5 pr-2.5 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Função / Perfil Solicitado *
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-hidden focus:border-red-500"
                    >
                      <option value="vendedor">Vendedor (Vendas e Clientes)</option>
                      <option value="recepcionista">Recepcionista (Atendimento)</option>
                      <option value="mecanico">Mecânico (Oficina e OS)</option>
                    </select>
                  </div>
                </div>

                {/* Role hint box */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
                  {regRole === 'vendedor' && (
                    <p>
                      <strong className="text-blue-400">Vendedor:</strong> Terá acesso a seus clientes, motos vendidas, suas OS e alertas de revisões em atraso para avisar clientes.
                    </p>
                  )}
                  {regRole === 'recepcionista' && (
                    <p>
                      <strong className="text-purple-400">Recepcionista:</strong> Terá acesso operacional amplo ao app, sem permissão para exclusões de dados do vendedor ou sistema.
                    </p>
                  )}
                  {regRole === 'mecanico' && (
                    <p>
                      <strong className="text-amber-400">Mecânico:</strong> Terá acesso às Ordens de Serviço, checklist de serviços, estoque e registro de revisões efetuadas.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Senha *
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 3 dígitos"
                      className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Confirmar Senha *
                    </label>
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-red-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-3 px-4 mt-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isRegistering ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Gerando Código de Verificação...
                    </>
                  ) : (
                    <>
                      <span>Criar Conta & Enviar Código</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 3: VERIFICAÇÃO DE E-MAIL VIA CÓDIGO */}
        {/* ========================================================= */}
        {step === 'verify_email' && (
          <div className="mt-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setStep('register')}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Corrigir Dados
                </button>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Passo 2 de 3: Validação
                </span>
              </div>

              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6 animate-bounce" />
                </div>
                <h2 className="text-base font-bold text-white">Confirmação de E-mail</h2>
                <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                  Enviamos um código de segurança de 6 dígitos para o endereço:
                </p>
                <p className="text-xs font-bold text-red-400 font-mono mt-0.5">{verifyEmail}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-300 text-xs flex items-start gap-2.5">
                <Mail className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                <span>
                  Verifique sua caixa de entrada (e a pasta de spam). O código expira em alguns minutos - use "Reenviar Código" se necessário.
                </span>
              </div>

              {verifyError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              {verifySuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{verifySuccess}</span>
                </div>
              )}

              <form onSubmit={handleVerifySubmit} className="space-y-4">
                <div>
                  <label className="block text-center text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Digite o código de 6 dígitos
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.4em] font-mono text-2xl font-bold py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white focus:outline-hidden focus:border-red-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmar E-mail & Enviar p/ Aprovação</span>
                </button>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>Não recebeu o código?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0}
                    onClick={handleResendCode}
                    className={`font-semibold transition-colors ${
                      resendCooldown > 0
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-red-400 hover:text-red-300 cursor-pointer'
                    }`}
                  >
                    {resendCooldown > 0 ? `Aguarde ${resendCooldown}s` : 'Reenviar Código'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 4: AGUARDANDO APROVAÇÃO DO ADMINISTRADOR */}
        {/* ========================================================= */}
        {step === 'pending_approval' && (
          <div className="mt-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Passo 3 de 3: Cadastro em Análise
                </span>
                <h2 className="text-base sm:text-lg font-bold text-white mt-2.5">
                  Aguardando Aprovação do Administrador
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                  Seu e-mail foi <strong>verificado com sucesso</strong>! Por motivos de segurança operacional da concessionária, este cadastro só poderá acessar o sistema após a autorização do <strong>Administrador Geral</strong>.
                </p>
              </div>

              {/* Notification balloon card */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Notificação enviada ao Administrador</span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 pl-6">
                  <p>
                    <strong>Nome:</strong> {pendingUserData?.name || 'Novo Colaborador'}
                  </p>
                  <p>
                    <strong>E-mail:</strong> {pendingUserData?.email}
                  </p>
                  <p>
                    <strong>Perfil Solicitado:</strong>{' '}
                    <span className="text-slate-200 font-semibold">
                      {pendingUserData?.role ? getRoleLabel(pendingUserData.role) : 'Vendedor'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCheckApprovalStatus}
                  className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Verificar se já fui aprovado</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('login');
                    setLoginEmail('');
                    setLoginPassword('');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar para o Login</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 5: CADASTRO RECUSADO / REJEITADO */}
        {/* ========================================================= */}
        {step === 'rejected_info' && (
          <div className="mt-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Cadastro Não Aprovado
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                  A solicitação de acesso para <strong>{pendingUserData?.email}</strong> foi recusada pela administração do sistema.
                </p>
                {pendingUserData?.rejectionReason && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                    <strong>Motivo informado:</strong> {pendingUserData.rejectionReason}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep('login')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Voltar para a Tela de Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé institucional */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Vitta Motos • Sistema de Gestão Shineray • Versão 2.4 Pro
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Recuperação de Senha</h3>
                <p className="text-xs text-slate-400">Informe seu e-mail cadastrado na Vitta Veículos</p>
              </div>
            </div>

            {recoveryMessage ? (
              <div
                className={`p-4 rounded-xl text-xs font-medium mb-4 ${
                  recoveryMessage.success
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {recoveryMessage.text}
              </div>
            ) : (
              <form onSubmit={handleRecoverSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    E-mail do Usuário
                  </label>
                  <input
                    type="email"
                    required
                    value={recoverEmailInput}
                    onChange={(e) => setRecoverEmailInput(e.target.value)}
                    placeholder="seu.email@vittamotos.com.br"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-red-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Enviar Instruções de Recuperação
                </button>
              </form>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
