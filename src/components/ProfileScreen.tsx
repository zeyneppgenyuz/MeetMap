import React, { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, 
  Users, 
  Home, 
  Map, 
  ClipboardList, 
  User, 
  X, 
  Camera 
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Group, Screen } from '../types';

interface ProfileScreenProps {
  onNavigate: (screen: Screen) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  onSelectGroup: (groupId: string) => void;
}

export default function ProfileScreen({ onNavigate, showToast, onSelectGroup }: ProfileScreenProps) {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    groupCount: 0,
    rsvpCount: 0,
    voteCount: 0
  });

  const [userProfile, setUserProfile] = useState<{ displayName?: string; photoURL?: string | null }>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const currentUser = auth.currentUser;

  // Real-time listener for current user profile details
  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile({
          displayName: data.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Kullanıcı',
          photoURL: data.photoURL || currentUser.photoURL || null
        });
      } else {
        setUserProfile({
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Kullanıcı',
          photoURL: currentUser.photoURL || null
        });
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Load user groups, RSVPs, and Votes stats
  const loadProfilePage = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);

      // 1. Fetch groups where current user is a member
      const qGroups = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));
      const groupsSnap = await getDocs(qGroups);
      const groupsList: Group[] = [];
      
      groupsSnap.forEach((docSnap) => {
        groupsList.push({ id: docSnap.id, ...docSnap.data() } as Group);
      });

      // Sort groups by seconds descending
      groupsList.sort((a, b) => {
        const bSec = b.createdAt?.seconds || 0;
        const aSec = a.createdAt?.seconds || 0;
        return bSec - aSec;
      });

      setMyGroups(groupsList);

      // 2. Fetch stats
      let rsvpGoingCounter = 0;
      let voteCounter = 0;

      await Promise.all(groupsList.map(async (group) => {
        try {
          // Check RSVP status in group subcollection
          const rsvpDocRef = doc(db, 'groups', group.id, 'rsvp', currentUser.uid);
          const rsvpDocSnap = await getDoc(rsvpDocRef);
          if (rsvpDocSnap.exists() && rsvpDocSnap.data().status === 'going') {
            rsvpGoingCounter++;
          }

          // Check votes cast in group subcollection
          const votesColRef = collection(db, 'groups', group.id, 'votes');
          const votesColSnap = await getDocs(votesColRef);
          votesColSnap.forEach((voteDoc) => {
            const voteData = voteDoc.data();
            const upList = Array.isArray(voteData.up) ? voteData.up : [];
            const downList = Array.isArray(voteData.down) ? voteData.down : [];
            if (upList.includes(currentUser.uid) || downList.includes(currentUser.uid)) {
              voteCounter++;
            }
          });
        } catch (innerErr) {
          console.error("Error loading subcollection details for statistics:", innerErr);
        }
      }));

      setStats({
        groupCount: groupsList.length,
        rsvpCount: rsvpGoingCounter,
        voteCount: voteCounter
      });

    } catch (err) {
      console.error("Error loading Profile screen data:", err);
      showToast('Profil istatistikleri yüklenirken hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadProfilePage();
    }
  }, [currentUser]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (file.size > 1024 * 1024 * 2) {
      showToast('Profil fotoğrafı 2MB boyutundan küçük olmalıdır.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            photoURL: base64,
            displayName: userProfile.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Kullanıcı'
          }, { merge: true });

          showToast('Fotoğraf güncellendi ✓', 'success');
          loadProfilePage();
        } catch (error) {
          console.error("Error updating avatar photo:", error);
          showToast('Fotoğraf yüklenirken bir hata oluştu.', 'error');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenEditModal = () => {
    setEditName(userProfile.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || '');
    setIsEditModalOpen(true);
  };

  const saveProfile = async () => {
    const name = editName.trim();
    if (!name) {
      showToast('Lütfen geçerli bir isim girin.', 'error');
      return;
    }

    if (!currentUser) return;

    try {
      setSavingProfile(true);
      await updateProfile(currentUser, { displayName: name });
      await setDoc(doc(db, 'users', currentUser.uid), {
        displayName: name
      }, { merge: true });

      showToast('Profil güncellendi ✓', 'success');
      setIsEditModalOpen(false);
      loadProfilePage();
    } catch (err) {
      console.error("Error updating profile details:", err);
      showToast('Profil kaydedilemedi.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      showToast('Güvenli çıkış yapıldı! Görüşmek üzere. 👋', 'success');
      onNavigate('LOGIN');
    } catch (err) {
      showToast('Çıkış yaparken bir hata yaşandı.', 'error');
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'Sushi': return '🍱';
      case 'Kafe': return '☕';
      case 'Pizza': return '🍕';
      case 'Burger': return '🍔';
      case 'Türk Mutfağı': return '🥘';
      default: return '🍔';
    }
  };

  const getMemberCount = (membersList?: any[]) => {
    if (!membersList) return 0;
    const uids = new Set(membersList.map(m => (m && typeof m === 'object' ? m.uid : m)));
    return uids.size;
  };

  const renderBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around z-30 shadow-lg px-4">
      <button 
        onClick={() => onNavigate('DASHBOARD')}
        className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors text-gray-400 hover:text-[#7C3AED]"
      >
        <Home className="w-5.5 h-5.5 mb-0.5" />
        <span className="text-[10px] font-medium font-sans">Home</span>
      </button>
      <button 
        onClick={() => onNavigate('GROUPS_LIST')}
        className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors text-gray-400 hover:text-[#7C3AED]"
      >
        <Users className="w-5.5 h-5.5 mb-0.5" />
        <span className="text-[10px] font-medium font-sans">Gruplar</span>
      </button>
      <button 
        onClick={() => onNavigate('MAP')}
        className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors text-gray-400 hover:text-[#7C3AED]"
      >
        <Map className="w-5.5 h-5.5 mb-0.5" />
        <span className="text-[10px] font-medium font-sans">Harita</span>
      </button>
      <button 
        onClick={() => onNavigate('PROFILE')}
        className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors text-[#7C3AED]"
      >
        <User className="w-5.5 h-5.5 mb-0.5" />
        <span className="text-[10px] font-medium font-sans">Profil</span>
      </button>
    </div>
  );

  const email = currentUser?.email || 'e-posta yok';
  const displayName = userProfile.displayName || 'Kullanıcı';
  const photoURL = userProfile.photoURL;

  return (
    <div className="min-h-screen w-full bg-[#F5F5FA] flex flex-col font-sans select-none relative pb-24">
      
      {/* HEADER CARD Container */}
      <div className="w-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] p-8 text-center flex flex-col items-center justify-center rounded-b-[24px] relative shadow-md">
        
        {/* Profile Photo Group */}
        <div className="relative w-20 h-20 mb-3">
          {photoURL ? (
            <img 
              src={photoURL} 
              alt={displayName} 
              className="w-20 h-20 rounded-full object-cover ring-4 ring-white/30 shadow-lg"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white text-[#7C3AED] flex items-center justify-center font-bold text-[32px] shadow-lg ring-4 ring-white/30">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* Circular Change Photo Action Button */}
          <button
            onClick={() => document.getElementById('photoUpload')?.click()}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white text-gray-700 shadow-md flex items-center justify-center text-xs hover:scale-110 active:scale-95 transition-all border border-gray-100 cursor-pointer"
            title="Fotoğraf Değiştir"
          >
            🔄
          </button>
          
          <input 
            type="file" 
            accept="image/*" 
            id="photoUpload" 
            className="hidden" 
            onChange={handlePhotoUpload} 
          />
        </div>

        {/* Info */}
        <h2 className="text-[20px] font-bold text-white tracking-tight leading-snug">{displayName}</h2>
        <p className="text-[14px] text-white/80 font-medium mt-1">{email}</p>

        {/* Outline Pill Button to change name or photo */}
        <button
          onClick={handleOpenEditModal}
          className="mt-4 border border-white/40 hover:border-white/80 text-white rounded-full px-5 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 active:scale-97 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span>✏️</span> Profili Düzenle
        </button>
      </div>

      {/* Main Container */}
      <main className="flex-1 px-5 pt-6 max-w-xl mx-auto w-full space-y-6">
        
        {/* STATS SECTION */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-[12px] p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-[#7C3AED] leading-none">{stats.groupCount}</span>
            <span className="text-gray-400 text-[12px] font-medium mt-1.5">Grup Sayısı</span>
          </div>
          <div className="bg-white rounded-[12px] p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-[#7C3AED] leading-none">{stats.rsvpCount}</span>
            <span className="text-gray-400 text-[12px] font-medium mt-1.5">Katıldığım</span>
          </div>
          <div className="bg-white rounded-[12px] p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-[#7C3AED] leading-none">{stats.voteCount}</span>
            <span className="text-gray-400 text-[12px] font-medium mt-1.5">Oylama</span>
          </div>
        </div>

        {/* MY GROUPS SECTION */}
        <div className="space-y-3.5">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider pl-1 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#7C3AED]" />
            <span>Gruplarım ({myGroups.length})</span>
          </h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-[#7C3AED] animate-spin" />
            </div>
          ) : myGroups.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100/80 text-gray-400 text-xs shadow-sm">
              Katıldığın veya oluşturduğun aktif bir toplantı bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3">
              {myGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => {
                    onSelectGroup(group.id);
                    onNavigate('GROUP_DETAIL');
                  }}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-gray-900 leading-snug">{group.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                      <span>📍 {group.targetDistrict}</span>
                      <span>•</span>
                      <span>{getCategoryEmoji(group.foodCategory)} {group.foodCategory}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#7C3AED] bg-violet-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {getMemberCount(group.members)} Üye
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LOGOUT BUTTON */}
        <div className="pt-4 pb-2">
          <button
            onClick={handleSignOut}
            className="w-full bg-white hover:bg-rose-50 text-[#DC2626] font-bold py-3.5 rounded-[12px] flex items-center justify-center gap-2 text-sm transition-colors border-[1.5px] border-[#FCA5A5] cursor-pointer"
          >
            🚪 Çıkış Yap
          </button>
        </div>

      </main>

      {/* EDIT PROFILE MODAL */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[20px] p-6 w-[90%] max-w-[400px] shadow-2xl relative space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="font-bold text-gray-900 text-base">Profili Düzenle</span>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-105 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Upload Section in Modal */}
              <div className="flex flex-col items-center space-y-2">
                <div 
                  onClick={() => document.getElementById('modalPhotoUpload')?.click()}
                  className="relative group cursor-pointer"
                >
                  {photoURL ? (
                    <img 
                      src={photoURL} 
                      alt={displayName} 
                      className="w-18 h-18 rounded-full object-cover ring-2 ring-violet-100 group-hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="w-18 h-18 rounded-full bg-violet-50 text-[#7C3AED] flex items-center justify-center font-bold text-2xl group-hover:opacity-80 transition-opacity">
                      {displayName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/25 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  id="modalPhotoUpload" 
                  className="hidden" 
                  onChange={handlePhotoUpload} 
                />
                <span className="text-[11px] text-gray-400 font-medium">Fotoğrafı değiştirmek için tıklayın</span>
              </div>

              {/* Form Input */}
              <div className="space-y-1.5">
                <label htmlFor="editName" className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Ad Soyad</label>
                <input
                  type="text"
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="İsminizi yazın"
                  className="w-full px-4 py-3 rounded-xl border border-gray-250 focus:border-violet-300 focus:outline-none text-sm transition-all text-gray-900 font-medium font-sans"
                  maxLength={40}
                />
              </div>

              {/* Save Trigger Button */}
              <button
                type="button"
                onClick={saveProfile}
                disabled={savingProfile}
                className="w-full bg-[#7C3AED] hover:bg-[#6c33cf] text-white font-bold py-3.5 rounded-xl text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {savingProfile ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : null}
                <span>Kaydet</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Navigator Bottom Bar */}
      {renderBottomNav()}
    </div>
  );
}
