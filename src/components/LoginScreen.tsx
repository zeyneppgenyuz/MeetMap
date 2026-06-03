import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Mail, Lock, LogIn, Chrome } from 'lucide-react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, signInWithGoogle } from '../firebase';
import { Screen } from '../types';

interface LoginScreenProps {
  onNavigate: (screen: Screen) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onNavigate, showToast, onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Lütfen e-posta ve şifrenizi girin.', 'error');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast('Giriş başarılı! Hoş geldiniz. 🎉', 'success');
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Giriş yapılamadı. Bilgilerinizi kontrol edin.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = 'E-posta veya şifre hatalı.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Geçersiz e-posta adresi.';
      }
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      showToast('Google ile başarıyla giriş yapıldı! 🎉', 'success');
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast('Google girişinde bir hata oluştu.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      showToast('Şifre sıfırlamak için lütfen önce e-postanızı yazın.', 'error');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showToast('Şifre sıfırlama e-postası gönderildi! ✉️', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Şifre sıfırlama talebi gönderilemedi.', 'error');
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-5 select-none relative overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, #6C3CE1, #C06090, #E8805A)'
      }}
    >
      {/* Decorative Orbs */}
      <div className="absolute top-10 left-10 w-48 h-48 rounded-full bg-indigo-500/30 blur-2xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass-panel w-full max-w-md p-8 rounded-[24px] text-white z-10"
      >
        {/* Header Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="bg-white/25 p-2 rounded-2xl">
              <MapPin className="w-8 h-8 text-white fill-white/10" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight font-display">MeetMap</h1>
          </div>
          <span className="text-sm italic text-white/90 font-light">nerede buluşma derdine son</span>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-white/80 uppercase mb-2">E-posta</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Mail className="w-4 h-4 text-white/60" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="glass-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm transition-all focus:ring-2 focus:ring-white/20"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold tracking-wider text-white/80 uppercase">Şifre</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-white/80 hover:text-white underline cursor-pointer"
              >
                Şifremi Unuttum
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Lock className="w-4 h-4 text-white/60" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input w-full pl-10 pr-4 py-3 rounded-2xl text-sm transition-all focus:ring-2 focus:ring-white/20"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6C3CE1] hover:bg-[#5930C2] disabled:opacity-55 active:scale-[0.98] transition-all text-white font-semibold py-3.5 px-6 rounded-[25px] flex items-center justify-center gap-2 text-sm shadow-md mt-6 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Yükleniyor...' : 'Giriş Yap'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-white/20"></div>
          <span className="px-3 text-xs tracking-widest text-white/65 uppercase select-none">veya</span>
          <div className="flex-1 border-t border-white/20"></div>
        </div>

        {/* Google Authentication Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-transparent hover:bg-white/10 active:scale-[0.98] transition-all border border-white/40 text-white font-medium py-3.5 px-6 rounded-[25px] flex items-center justify-center gap-3 text-sm cursor-pointer"
        >
          <Chrome className="w-4 h-4 text-white" />
          <span>Google ile Giriş Yap</span>
        </button>

        {/* Alternative Actions */}
        <div className="text-center mt-7 text-sm">
          <span className="text-white/80">Hesabınız yok mu? </span>
          <button
            onClick={() => onNavigate('SIGNUP')}
            className="text-white font-bold underline ml-1 hover:text-[#6C3CE1] transition-colors cursor-pointer"
          >
            Kayıt Ol
          </button>
        </div>
      </motion.div>
    </div>
  );
}
