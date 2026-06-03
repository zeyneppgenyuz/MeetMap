import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import { MapPin, Users, Plus, Home, Map, User, ChevronRight, Compass } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Group, Screen } from '../types';

interface GroupsListScreenProps {
  onNavigate: (screen: Screen) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  onSelectGroup: (groupId: string) => void;
}

export default function GroupsListScreen({ onNavigate, showToast, onSelectGroup }: GroupsListScreenProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync groups list on load
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const path = 'groups';
    setLoading(true);
    
    // Query groups where current user is a member
    const q = query(
      collection(db, path),
      where('members', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Group[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Group);
      });
      // Sort in-memory if needed, or default
      list.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setGroups(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGroupClick = (groupId: string) => {
    onSelectGroup(groupId);
    onNavigate('GROUP_DETAIL');
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
        className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors text-[#7C3AED]"
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
        className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors text-gray-400 hover:text-[#7C3AED]"
      >
        <User className="w-5.5 h-5.5 mb-0.5" />
        <span className="text-[10px] font-medium font-sans">Profil</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#F5F5FA] flex flex-col font-sans select-none relative">
      {/* Header */}
      <header className="h-16 w-full bg-white px-5 flex items-center sticky top-0 z-40 border-b border-gray-100">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 font-display">Gruplarım</h1>
      </header>

      {/* Main Container */}
      <main className="flex-1 px-5 pt-5 pb-24 max-w-xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-3 border-gray-200 border-t-[#6C3CE1] animate-spin" />
            <p className="text-xs text-gray-400">Gruplarınız aranıyor...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-3xl border border-gray-100 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center text-[#6C3CE1] mb-4">
              <Users className="w-8 h-8 stroke-[1.5px]" />
            </div>
            <h3 className="text-base font-bold text-gray-800">Henüz grubun yok</h3>
            <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed">
              Arkadaşlarınla harika mekanlar keşfetmek için ilk grubunu şimdi oluştur!
            </p>
            <button
              onClick={() => onNavigate('CREATE_GROUP')}
              className="mt-6 bg-[#6C3CE1] hover:bg-[#5930C2] transition-colors text-white text-sm font-semibold py-3 px-6 rounded-2xl shadow-md cursor-pointer"
            >
              İlk Grubunu Oluştur
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-2">
              <Compass className="w-4 h-4 text-gray-400" />
              <span>Buluşma Planları ({groups.length})</span>
            </div>
            
            {groups.map((group) => {
              const emoji = getCategoryEmoji(group.foodCategory);
              return (
                <motion.article
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleGroupClick(group.id)}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100/80 hover:shadow-md hover:border-gray-200/90 hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-1.5 flex-1 pr-4">
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-[#6C3CE1] transition-colors leading-snug">
                      {group.name}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium font-sans">
                      <span className="flex items-center gap-0.5">
                        📍 {group.targetDistrict}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span>
                        {emoji} {group.foodCategory}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 bg-violet-50 px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#6C3CE1]">
                      <Users className="w-3.5 h-3.5" />
                      <span>{getMemberCount(group.members)} Üye</span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#6C3CE1] group-hover:translate-x-0.5 transition-all shrink-0" />
                </motion.article>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => onNavigate('CREATE_GROUP')}
        className="fixed bottom-20 right-5 w-14 h-14 bg-[#FF6B35] hover:bg-[#E2531E] active:scale-95 transition-all rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 font-semibold z-40 text-2xl cursor-pointer"
        title="Grup Oluştur"
      >
        <Plus className="w-6 h-6 stroke-[3px]" />
      </button>

      {/* Bottom Nav */}
      {renderBottomNav()}
    </div>
  );
}
