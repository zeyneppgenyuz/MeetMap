import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { ArrowLeft, MapPin, ClipboardList, Utensils, Sparkles } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Screen } from '../types';

interface CreateGroupScreenProps {
  onNavigate: (screen: Screen) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  onGroupCreated: (groupId: string) => void;
}

export default function CreateGroupScreen({ onNavigate, showToast, onGroupCreated }: CreateGroupScreenProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetDistrict, setTargetDistrict] = useState<'Beşiktaş' | 'Kadıköy' | 'Üsküdar' | 'Şişli' | 'Taksim'>('Beşiktaş');
  const [foodCategory, setFoodCategory] = useState<'Sushi' | 'Kafe' | 'Pizza' | 'Burger' | 'Türk Mutfağı'>('Sushi');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const districts = ['Beşiktaş', 'Kadıköy', 'Üsküdar', 'Şişli', 'Taksim'] as const;
  const categories = [
    { id: 'Sushi', label: '🍱 Sushi' },
    { id: 'Kafe', label: '☕ Kafe' },
    { id: 'Pizza', label: '🍕 Pizza' },
    { id: 'Burger', label: '🍔 Burger' },
    { id: 'Türk Mutfağı', label: '🥘 Türk Mutfağı' }
  ] as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showToast('Grup oluşturmak için lütfen giriş yapın.', 'error');
      return;
    }
    if (!name.trim()) {
      showToast('Lütfen grup adını boş bırakmayın.', 'error');
      return;
    }

    setSubmitting(true);
    const path = 'groups';

    try {
      const groupData = {
        name: name.trim(),
        description: description.trim(),
        targetDistrict,
        foodCategory,
        meetingDate,
        meetingTime,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Kullanıcı',
        members: [currentUser.uid],
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, path), groupData);
      showToast('Grup oluşturuldu! 🎉', 'success');
      onGroupCreated(docRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F5FA] flex flex-col font-sans select-none">
      {/* Upper Header */}
      <header className="h-16 w-full bg-white px-4 flex items-center justify-between sticky top-0 z-30 border-b border-gray-100">
        <button
          onClick={() => onNavigate('DASHBOARD')}
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 font-display">Grup Oluştur</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Main Container */}
      <main className="flex-1 px-5 pt-5 pb-12 max-w-xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Basic details */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
              <ClipboardList className="w-4 h-4 text-violet-500" />
              <span>Grup Özet Bilgileri</span>
            </h2>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Grup Adı</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Cuma Akşamı Kadrosu"
                className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 text-sm focus:border-violet-300 focus:bg-white focus:outline-none transition-all"
                required
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">Açıklama</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Grup hakkında kısa bir bilgi..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 text-sm focus:border-violet-300 focus:bg-white focus:outline-none transition-all resize-none"
                maxLength={150}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">📅 Buluşma Tarihi</label>
              <input
                type="date"
                id="meetingDate"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 text-sm focus:border-violet-300 focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">🕐 Buluşma Saati</label>
              <input
                type="time"
                id="meetingTime"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 text-sm focus:border-violet-300 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Section 2: District Selection */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
              <MapPin className="w-4 h-4 text-orange-500" />
              <span>Hedef Semt</span>
            </h2>

            <div className="flex flex-wrap gap-2">
              {districts.map((district) => (
                <button
                  key={district}
                  type="button"
                  onClick={() => setTargetDistrict(district)}
                  className={`px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    targetDistrict === district
                      ? 'bg-[#6C3CE1] text-white shadow-md shadow-indigo-600/10'
                      : 'bg-gray-100/80 text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
                  }`}
                >
                  {district}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Food Category Selection */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
              <Utensils className="w-4 h-4 text-rose-500" />
              <span>Ne yemek istiyorsunuz?</span>
            </h2>

            <div className="flex flex-wrap gap-2.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFoodCategory(cat.id)}
                  className={`px-4.5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    foodCategory === cat.id
                      ? 'bg-[#6C3CE1] text-white shadow-md shadow-indigo-600/10'
                      : 'bg-gray-100/80 text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions / Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-[#6C3CE1] to-[#FF6B35] hover:opacity-95 active:scale-[0.99] transition-all text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-orange-500/10 hover:shadow-orange-500/15 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4.5 h-4.5" />
            <span>{submitting ? 'Grup Oluşturuluyor...' : 'Grubu Oluştur'}</span>
          </button>
        </form>
      </main>
    </div>
  );
}
