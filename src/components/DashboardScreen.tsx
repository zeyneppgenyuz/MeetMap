import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Star, Plus, Home, Users, Map, User, LogOut, Compass } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Venue, Screen } from '../types';
import { seedVenuesIfEmpty, seedAllVenuesToFirestore } from '../seedData';

interface DashboardScreenProps {
  onNavigate: (screen: Screen) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function DashboardScreen({ onNavigate, showToast }: DashboardScreenProps) {
  const [activeCategory, setActiveCategory] = useState<'Sushi' | 'Kafe' | 'Pizza' | 'Burger'>('Sushi');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const categories = [
    { id: 'Sushi', label: '🍱 Sushi' },
    { id: 'Kafe', label: '☕ Kafe' },
    { id: 'Pizza', label: '🍕 Pizza' },
    { id: 'Burger', label: '🍔 Burger' }
  ] as const;

  // Sign out helper
  const handleSignOut = async () => {
    try {
      await auth.signOut();
      showToast('Başarıyla çıkış yapıldı. 👋', 'success');
      onNavigate('LOGIN');
    } catch (err) {
      showToast('Çıkış yapılırken bir hata oluştu.', 'error');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sync databases and set up snapshot listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initDashboard() {
      setLoading(true);
      try {
        // Run seed check first to ensure the database is fully populated
        await seedVenuesIfEmpty();
      } catch (err) {
        console.error("Mekan veri tabanını otomatik doldurma adımında hata oluştu:", err);
      }

      const path = 'venues';
      try {
        const venuesCollection = collection(db, path);
        unsubscribe = onSnapshot(venuesCollection, (snapshot) => {
          const list: Venue[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as Venue);
          });
          // 1. Log all documents in venues collection without filter to console
          console.log("Firestore'dan Çekilen Tüm Mekanlar (Filtresiz):", list);
          setVenues(list);
          setLoading(false);
        }, (error) => {
          // 2. Turkish error log in case onSnapshot fails
          console.error("Firestore bağlantısı kurulduktan sonra canlı veri alımında hata oluştu:", error);
          showToast("Mekan verileri senkronize edilirken canlı Firestore bağlantı hatası oluştu.", "error");
          setLoading(false);
        });
      } catch (error) {
        console.error("Firestore onSnapshot dinleyicisi başlatılamadı:", error);
        showToast("Veri dinleyici başlatılamadı. Lütfen yetkilerinizi kontrol edin.", "error");
        setLoading(false);
      }
    }

    initDashboard();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Filter venues by active category (case-insensitive on both foodCategory and category fields)
  const filteredVenues = venues.filter(v => {
    const catValue = ((v as any).category || v.foodCategory || '').toString().trim().toLowerCase();
    const activeCat = activeCategory.trim().toLowerCase();
    return catValue === activeCat;
  });

  // Fallback for user name or display name split
  const user = auth.currentUser;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Kullanıcı';

  // Admin access logic
  const isAdmin = user?.email === 'zeyneppgenyuz@gmail.com' || user?.email?.includes('admin');

  // Interactive manual database trigger
  const handleTriggerSeed = async () => {
    if (seeding) return;
    setSeeding(true);
    setLoading(true);
    try {
      await seedAllVenuesToFirestore();
      showToast('25 adet premium İstanbul mekanı başarıyla Firestore veritabanına yüklendi ve canlı veriler eşitlendi! 🍱☕🍕🍔', 'success');
    } catch (err) {
      console.error('Veri yükleme işlemi sırasında beklendik hata:', err);
      showToast('Mekanlar yüklenirken bir veri tabanı hatası oluştu.', 'error');
    } finally {
      setSeeding(false);
      setLoading(false);
    }
  };

  // Get first letter of displayName for a stylish default avatar
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // Highlight/Nav item styles helper
  const renderBottomNav = (currentScreen: Screen) => (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around z-30 shadow-lg px-4">
      <button 
        onClick={() => onNavigate('DASHBOARD')}
        className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
          currentScreen === 'DASHBOARD' ? 'text-[#7C3AED]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Home className="w-5.5 h-5.5 mb-0.5" />
        <span className="text-[10px] font-medium font-sans">Home</span>
      </button>
      <button 
        onClick={() => onNavigate('GROUPS_LIST')}
        className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
          currentScreen === 'GROUPS_LIST' ? 'text-[#7C3AED]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Users className="w-5.5 h-5.5 mb-0.5" />
        <span className="text-[10px] font-medium font-sans">Gruplar</span>
      </button>
      <button 
        onClick={() => onNavigate('MAP')}
        className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
          currentScreen === 'MAP' ? 'text-[#7C3AED]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Map className="w-5.5 h-5.5 mb-0.5" />
        <span className="text-[10px] font-medium font-sans">Harita</span>
      </button>
      <button 
        onClick={() => onNavigate('PROFILE')}
        className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
          currentScreen === 'PROFILE' ? 'text-[#7C3AED]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <User className="w-5.5 h-5.5 mb-0.5" />
        <span className="text-[10px] font-medium font-sans">Profil</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#F5F5FA] flex flex-col font-sans select-none relative">
      {/* Upper Bar */}
      <header className="h-16 w-full bg-white px-5 flex items-center justify-between sticky top-0 z-40 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <MapPin className="w-5 h-5 text-[#6C3CE1] fill-[#6C3CE1]/15" />
          <span className="text-xl font-bold tracking-tight text-[#6C3CE1] font-display">MeetMap</span>
        </div>

        {/* User Account Menu with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6C3CE1] to-[#C06090] text-white flex items-center justify-center font-bold text-base shadow-sm ring-2 ring-violet-100 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            {avatarLetter}
          </button>
          
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2.5 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 p-1 index-50"
              >
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavigate('PROFILE');
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-violet-50 rounded-xl transition-all flex items-center gap-2.5 text-sm font-medium text-gray-700 cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#6C3CE1]" />
                  <span>Profil</span>
                </button>
                <div className="my-1 border-t border-gray-50" />
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleSignOut();
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2.5 text-sm font-medium text-rose-600 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Çıkış Yap</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content scrollable area */}
      <main className="flex-1 px-5 pt-5 pb-24 max-w-xl mx-auto w-full">
        {/* Welcome Text */}
        <div className="mb-6">
          <h2 className="text-[22px] font-bold text-gray-900 leading-tight">
            Merhaba, {displayName} 👋
          </h2>
          <p className="text-gray-400 text-sm mt-1">Hadi bugün arkadaşlarını harika bir yerde buluştur!</p>
        </div>

        {/* Admin Control Panel for Seeding */}
        {isAdmin && (
          <div className="mb-6 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl shadow-sm flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#6C3CE1] uppercase tracking-widest block">Sistem Yöneticisi</span>
                <h3 className="text-sm font-bold text-gray-800">Veritabanı Yönetim Paneli</h3>
              </div>
              <span className="text-[10px] bg-violet-100 text-[#6C3CE1] font-semibold px-2 py-0.5 rounded-full">Aktif</span>
            </div>
            <p className="text-xs text-gray-500 leading-snug">
              25 adet el yapımı premium Beşiktaş, Kadıköy ve Beyoğlu restoran/kafe verisini toplu olarak Firestore üzerine yükleyin.
            </p>
            <button
              onClick={handleTriggerSeed}
              disabled={seeding}
              className="w-full bg-[#6C3CE1] hover:bg-[#5229BA] disabled:bg-gray-300 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              {seeding ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                  <span>Yükleniyor... (Temizleniyor & Yazılıyor)</span>
                </>
              ) : (
                <>
                  <span>⚡ 25 Premium Mekanı Veritabanına Yükle / Sıfırla</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Categories Carousel */}
        <div className="flex gap-2.5 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2.7 rounded-full text-sm font-semibold tracking-wide shrink-0 transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-[#6C3CE1] text-white shadow-md shadow-indigo-600/10 scale-102'
                  : 'bg-white text-gray-500 hover:text-gray-800 border border-gray-100 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Category Header */}
        <div className="flex items-center justify-between mt-3 mb-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-gray-400" />
            <span>Önerilen {activeCategory} Mekanları</span>
          </h3>
          <span className="text-xs text-gray-400 font-medium">{filteredVenues.length} Mekan</span>
        </div>

        {/* Loading Spinner or Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-3 border-gray-200 border-t-[#6C3CE1] animate-spin" />
            <p className="text-xs text-gray-400">Yerler yükleniyor...</p>
          </div>
        ) : filteredVenues.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-100/85 shadow-sm mt-6">
            <span className="text-4xl block mb-2">🍽️</span>
            <p className="text-sm font-semibold text-gray-700">Bu kategoride mekan bulunamadı.</p>
            <p className="text-xs text-gray-400 mt-1">Lütfen daha sonra tekrar deneyin veya diğer kategorilere göz atın.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredVenues.map((v) => (
              <motion.article
                key={v.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow group"
              >
                {/* Image Cover and Badge */}
                <div className="relative h-[180px] w-full overflow-hidden bg-gray-100">
                  <img
                    src={v.imageUrl}
                    alt={v.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  {/* District Badge */}
                  <span className="absolute top-4 left-4 inline-flex bg-black/50 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full tracking-wide">
                    📍 {v.targetDistrict}
                  </span>
                </div>

                {/* Info and button */}
                <div className="p-5">
                  <h4 className="text-lg font-bold text-gray-900 leading-snug">{v.name}</h4>
                  
                  {/* Rating row */}
                  <div className="flex items-center gap-1.5 mt-1.5 mb-2.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-bold text-gray-800">{v.rating.toFixed(1)}</span>
                    <span className="text-gray-400 text-xs font-normal">({v.ratingCount} oy)</span>
                  </div>

                  <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">
                    {v.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const url = v.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.name + ' ' + (v.targetDistrict || ''))}`;
                        window.open(url, '_blank');
                      }}
                      className="bg-[#E8F0FE] hover:bg-[#D7E6FD] active:scale-[0.99] transition-all text-[#6C3CE1] font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1 cursor-pointer text-center"
                    >
                      <span>🗺️ Haritada Gör</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.name + ' ' + (v.targetDistrict || '') + ' Istanbul')}&travelmode=transit`;
                        window.open(url, '_blank');
                      }}
                      className="bg-[#F3F4F6] hover:bg-[#E5E7EB] active:scale-[0.99] transition-all text-gray-700 font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1 cursor-pointer text-center"
                    >
                      <span>🚗 Yol Tarifi</span>
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>

      {/* FAB (Floating Action Button) */}
      <button
        onClick={() => onNavigate('CREATE_GROUP')}
        className="fixed bottom-20 right-5 w-14 h-14 bg-[#FF6B35] hover:bg-[#E2531E] active:scale-95 transition-all rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 font-semibold z-40 text-2xl group cursor-pointer"
        title="Grup Oluştur"
      >
        <Plus className="w-6 h-6 stroke-[3px]" />
      </button>

      {/* Lower Bar Nav */}
      {renderBottomNav('DASHBOARD')}
    </div>
  );
}
