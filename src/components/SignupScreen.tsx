import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, User, Mail, Lock, UserPlus, Chrome } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, signInWithGoogle } from '../firebase';
import { Screen } from '../types';

interface SignupScreenProps {
  onNavigate: (screen: Screen) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  onSignupSuccess: () => void;
}

export default function SignupScreen({ onNavigate, showToast, onSignupSuccess }: SignupScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !passwordConfirm) {
      showToast('Lütfen tüm alanları doldurun.', 'error');
      return;
    }
    if (password !== passwordConfirm) {
      showToast('Şifreler uyuşmuyor.', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Şifreniz en az 6 karakter olmalıdır.', 'error');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: fullName });
      showToast('Hesabınız başarıyla oluşturuldu! 🎉', 'success');
      onSignupSuccess();
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Kayıt işlemi başarısız oldu.';
      if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Bu e-posta adresi zaten kullanılıyor.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Geçersiz e-posta adresi.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Lütfen daha güçlü bir şifre girin.';
      }
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      showToast('Google ile başarıyla kayıt olundu! 🎉', 'success');
      onSignupSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast('Google ile giriş yaparken bir hata oluştu.', 'error');
      }
    } finally {
      setLoading(false);
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
      <div className="absolute top-10 right-10 w-48 h-48 rounded-full bg-rose-500/30 blur-2xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

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

        <h2 className="text-xl font-bold mb-5 text-center text-white/90">Hesap Oluştur</h2>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-white/80 uppercase mb-1.5">Ad Soyad</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <User className="w-4 h-4 text-white/60" />
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm transition-all focus:ring-2 focus:ring-white/20"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-white/80 uppercase mb-1.5">E-posta</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Mail className="w-4 h-4 text-white/60" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm transition-all focus:ring-2 focus:ring-white/20"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-white/80 uppercase mb-1.5">Şifre</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Lock className="w-4 h-4 text-white/60" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm transition-all focus:ring-2 focus:ring-white/20"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-white/80 uppercase mb-1.5">Şifre Tekrar</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Lock className="w-4 h-4 text-white/60" />
              </span>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm transition-all focus:ring-2 focus:ring-white/20"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6C3CE1] hover:bg-[#5930C2] disabled:opacity-55 active:scale-[0.98] transition-all text-white font-semibold py-3 px-6 rounded-[25px] flex items-center justify-center gap-2 text-sm shadow-md mt-6 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? 'Hesap Oluşturuluyor...' : 'Kayıt Ol'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="flex-1 border-t border-white/20"></div>
          <span className="px-3 text-xs tracking-widest text-white/65 uppercase select-none">veya</span>
          <div className="flex-1 border-t border-white/20"></div>
        </div>

        {/* Google Registration Button */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full bg-transparent hover:bg-white/10 active:scale-[0.98] transition-all border border-white/40 text-white font-medium py-3 px-6 rounded-[25px] flex items-center justify-center gap-3 text-sm cursor-pointer"
        >
          <Chrome className="w-4 h-4 text-white" />
          <span>Google ile Kayıt Ol</span>
        </button>

        {/* Alternative Actions */}
        <div className="text-center mt-6 text-sm">
          <span className="text-white/80">Zaten hesabınız var mı? </span>
          <button
            onClick={() => onNavigate('LOGIN')}
            className="text-white font-bold underline ml-1 hover:text-[#6C3CE1] transition-colors cursor-pointer"
          >
            Giriş Yap
          </button>
        </div>
      </motion.div>
    </div>
  );
}
