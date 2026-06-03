import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Edit2, Trash2, MapPin, Compass, Star, Settings, X, RefreshCw, CheckCircle } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Group, Venue, Screen } from '../types';

interface GroupDetailScreenProps {
  groupId: string;
  onNavigate: (screen: Screen) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function GroupDetailScreen({ groupId, onNavigate, showToast }: GroupDetailScreenProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [matchedVenues, setMatchedVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [votes, setVotes] = useState<Record<string, { up: string[]; down: string[] }>>({});
  const [rsvpList, setRsvpList] = useState<{
    going: any[];
    maybe: any[];
    notgoing: any[];
  }>({ going: [], maybe: [], notgoing: [] });
  const [myRsvpStatus, setMyRsvpStatus] = useState<string | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(true);
  
  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDistrict, setEditDistrict] = useState<'Beşiktaş' | 'Kadıköy' | 'Üsküdar' | 'Şişli' | 'Taksim'>('Beşiktaş');
  const [editCategory, setEditCategory] = useState<'Sushi' | 'Kafe' | 'Pizza' | 'Burger' | 'Türk Mutfağı'>('Sushi');
  const [savingEdit, setSavingEdit] = useState(false);

  const districts = ['Beşiktaş', 'Kadıköy', 'Üsküdar', 'Şişli', 'Taksim'] as const;
  const categories = [
    { id: 'Sushi', label: '🍱 Sushi' },
    { id: 'Kafe', label: '☕ Kafe' },
    { id: 'Pizza', label: '🍕 Pizza' },
    { id: 'Burger', label: '🍔 Burger' },
    { id: 'Türk Mutfağı', label: '🥘 Türk Mutfağı' }
  ] as const;

  const currentUser = auth.currentUser;
  const isCreator = group?.createdBy === currentUser?.uid;

  // Member helpers
  const getMemberCount = (membersList?: any[]) => {
    if (!membersList) return 0;
    const uids = new Set(membersList.map(m => (m && typeof m === 'object' ? m.uid : m)));
    return uids.size;
  };

  const isUserMember = (membersList?: any[], uid?: string) => {
    if (!membersList || !uid) return false;
    return membersList.some(m => {
      if (m && typeof m === 'object') {
        return m.uid === uid;
      }
      return m === uid;
    });
  };

  const getUniqueMembers = (membersList?: any[]) => {
    if (!membersList) return [];
    const uniqueMap = new Map<string, any>();
    
    // First pass: add objects
    membersList.forEach((m) => {
      if (m && typeof m === 'object' && m.uid) {
        uniqueMap.set(m.uid, m);
      }
    });
    
    // Second pass: add raw UIDs if not present
    membersList.forEach((m) => {
      if (typeof m === 'string' && m && !uniqueMap.has(m)) {
        uniqueMap.set(m, {
          uid: m,
          displayName: m === group?.createdBy ? (group?.createdByName || 'Grup Lideri') : 'Kullanıcı',
          photoURL: null,
          joinedAt: ''
        });
      }
    });
    
    return Array.from(uniqueMap.values());
  };

  // Vote display loader
  const loadVotesForGroup = async (gId: string) => {
    try {
      const qSnap = await getDocs(collection(db, 'groups', gId, 'votes'));
      const votesData: Record<string, { up: string[]; down: string[] }> = {};
      qSnap.forEach((doc) => {
        const data = doc.data();
        votesData[doc.id] = {
          up: Array.isArray(data.up) ? data.up : [],
          down: Array.isArray(data.down) ? data.down : []
        };
      });
      setVotes(votesData);
    } catch (err) {
      console.error("Error loading votes:", err);
    }
  };

  // RSVP display state and logic (FEATURE 2)
  const loadRSVP = async (gId: string) => {
    if (!currentUser) return;
    try {
      setRsvpLoading(true);
      const rsvpSnap = await getDocs(collection(db, 'groups', gId, 'rsvp'));
      
      const going: any[] = [];
      const maybe: any[] = [];
      const notgoing: any[] = [];
      let currentUserStatus: string | null = null;

      rsvpSnap.forEach((doc) => {
        const r = doc.data();
        const rsvpItem = {
          uid: doc.id,
          displayName: r.displayName || 'Kullanıcı',
          photoURL: r.photoURL || null,
          status: r.status,
          updatedAt: r.updatedAt
        };

        if (r.status === 'going') {
          going.push(rsvpItem);
        } else if (r.status === 'maybe') {
          maybe.push(rsvpItem);
        } else if (r.status === 'notgoing') {
          notgoing.push(rsvpItem);
        }

        if (doc.id === currentUser.uid) {
          currentUserStatus = r.status;
        }
      });

      setRsvpList({ going, maybe, notgoing });
      setMyRsvpStatus(currentUserStatus);
    } catch (err) {
      console.error("Error loading RSVP:", err);
    } finally {
      setRsvpLoading(false);
    }
  };

  const setRSVPStatus = async (gId: string, status: 'going' | 'maybe' | 'notgoing') => {
    if (!currentUser) {
      showToast('Katılım durumunu belirtmek için giriş yapmalısınız.', 'error');
      return;
    }
    try {
      const rsvpRef = doc(db, 'groups', gId, 'rsvp', currentUser.uid);
      await setDoc(rsvpRef, {
        status: status,
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Kullanıcı',
        photoURL: currentUser.photoURL || null,
        updatedAt: new Date().toISOString()
      });
      showToast('Katılım durumunuz güncellendi! ✓', 'success');
      await loadRSVP(gId);
    } catch (error) {
      console.error("Error setting RSVP:", error);
      showToast("Katılım durumu kaydedilirken hata oluştu.", "error");
    }
  };

  // Vote logic (FEATURE 4)
  const castVote = async (gId: string, venueId: string, type: 'up' | 'down') => {
    if (!currentUser) {
      showToast('Oy vermek için giriş yapmalısınız.', 'error');
      return;
    }
    
    const path = `groups/${gId}/votes/${venueId}`;
    try {
      const voteRef = doc(db, 'groups', gId, 'votes', venueId);
      const voteSnap = await getDoc(voteRef);
      const uid = currentUser.uid;
      
      if (!voteSnap.exists()) {
        await setDoc(voteRef, {
          up: type === 'up' ? [uid] : [],
          down: type === 'down' ? [uid] : []
        });
      } else {
        const data = voteSnap.data();
        const inUp = data.up?.includes(uid);
        const inDown = data.down?.includes(uid);
        
        // Toggle off if already voted same
        if (type === 'up' && inUp) {
          await updateDoc(voteRef, { up: arrayRemove(uid) });
        } else if (type === 'down' && inDown) {
          await updateDoc(voteRef, { down: arrayRemove(uid) });
        } else {
          // Switch vote
          await updateDoc(voteRef, {
            up: type === 'up' 
              ? arrayUnion(uid) 
              : arrayRemove(uid),
            down: type === 'down' 
              ? arrayUnion(uid) 
              : arrayRemove(uid)
          });
        }
      }
      
      // Refresh vote display
      await loadVotesForGroup(gId);
    } catch (error) {
      console.error("Error casting vote:", error);
      showToast("Oy kaydedilirken bir hata oluştu.", "error");
    }
  };

  // 1. Fetch group details
  const fetchGroup = async () => {
    if (!groupId) return;
    setLoading(true);
    const path = `groups/${groupId}`;
    try {
      const docRef = doc(db, 'groups', groupId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const groupData = { id: snapshot.id, ...snapshot.data() } as Group;
        setGroup(groupData);
        setEditName(groupData.name);
        setEditDescription(groupData.description);
        // Force Cast safely
        setEditDistrict(groupData.targetDistrict as any);
        setEditCategory(groupData.foodCategory as any);
        
        // Fetch matching venues
        await fetchMatchingVenues(groupData.targetDistrict, groupData.foodCategory);
        // Load votes
        await loadVotesForGroup(groupId);
        // Load RSVPs
        await loadRSVP(groupId);
      } else {
        showToast('Grup bulunamadı.', 'error');
        onNavigate('GROUPS_LIST');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch matched venues based on district & category
  const fetchMatchingVenues = async (district: string, category: string) => {
    setVenuesLoading(true);
    const path = 'venues';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      const allVenues: any[] = [];
      querySnapshot.forEach((doc) => {
        allVenues.push({ id: doc.id, ...doc.data() });
      });
      console.log("[GroupDetail] Tüm Mekanlar (Filtresiz):", allVenues);

      // Client-side robust matching for district and category (supports both category and foodCategory, as well as district and targetDistrict)
      const matched = allVenues.filter(v => {
        const vDistrict = (v.district || v.targetDistrict || '').toString().trim().toLowerCase();
        const vCategory = (v.category || v.foodCategory || '').toString().trim().toLowerCase();
        
        const targetD = (district || '').toString().trim().toLowerCase();
        const targetC = (category || '').toString().trim().toLowerCase();

        return vDistrict === targetD && vCategory === targetC;
      });

      setMatchedVenues(matched as Venue[]);
    } catch (error) {
      console.error("Firestore bağlantısı kurulduktan sonra eşleşen mekanları çekerken hata oluştu:", error);
      showToast("Eşleşen mekanlar yüklenirken bir bağlantı hatası oluştu.", "error");
    } finally {
      setVenuesLoading(false);
    }
  };

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  // Handle Edit update
  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !group) return;
    if (!editName.trim()) {
      showToast('Grup adı boş bırakılamaz.', 'error');
      return;
    }

    setSavingEdit(true);
    const path = `groups/${groupId}`;

    try {
      const docRef = doc(db, 'groups', groupId);
      await updateDoc(docRef, {
        name: editName.trim(),
        description: editDescription.trim(),
        targetDistrict: editDistrict,
        foodCategory: editCategory,
      });

      showToast('Grup başarıyla güncellendi! ✏️', 'success');
      setIsEditModalOpen(false);
      
      // Refresh current details
      await fetchGroup();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Cancellation (Delete group)
  const handleDeleteGroup = async () => {
    if (!groupId) return;
    const confirmDelete = window.confirm('Bu buluşmayı iptal etmek istediğinizden emin misiniz? Grup tamamen silinecektir.');
    if (!confirmDelete) return;

    const path = `groups/${groupId}`;
    try {
      await deleteDoc(doc(db, 'groups', groupId));
      showToast('Buluşma başarıyla iptal edildi.', 'success');
      onNavigate('GROUPS_LIST');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Join group function (if the user opens a group but is not yet in members)
  const handleJoinGroup = async () => {
    if (!groupId || !group || !currentUser) return;
    if (isUserMember(group.members, currentUser.uid)) return;

    const path = `groups/${groupId}`;
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayUnion(
          currentUser.uid,
          {
            uid: currentUser.uid,
            displayName: currentUser.displayName || currentUser.email || 'Kullanıcı',
            photoURL: currentUser.photoURL || null,
            joinedAt: new Date().toISOString()
          }
        )
      });
      showToast('Gruba başarıyla katıldınız! 🎉', 'success');
      fetchGroup();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Mock Vote Handler
  const handleMockVote = (venueName: string) => {
    showToast(`"${venueName}" mekanı için oyunuz kaydedildi! 👍`, 'success');
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

  return (
    <div className="min-h-screen w-full bg-[#F5F5FA] flex flex-col font-sans select-none relative">
      {/* Header */}
      <header className="h-16 w-full bg-white px-4 flex items-center justify-between sticky top-0 z-30 border-b border-gray-100">
        <button
          onClick={() => onNavigate('GROUPS_LIST')}
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="text-base font-bold text-gray-900 truncate max-w-xs font-display">
          {loading ? 'Yükleniyor...' : group?.name}
        </span>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Main Container */}
      <main className="flex-1 px-5 pt-5 pb-12 max-w-xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-3 border-gray-200 border-t-[#6C3CE1] animate-spin" />
            <p className="text-xs text-gray-400">Grup ayrıntıları alınıyor...</p>
          </div>
        ) : !group ? (
          <div className="text-center py-10 text-gray-500">Grup bulunamadı.</div>
        ) : (
          <div className="space-y-6">
            {/* 1. Group info card */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-snug">{group.name}</h2>
                  {group.description && (
                    <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">{group.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Oluşturan: <span className="font-semibold text-gray-600">{group.createdByName}</span>
                  </p>
                </div>
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50">
                <span className="inline-flex items-center gap-1 bg-violet-50 text-[#6C3CE1] text-xs font-semibold px-3.5 py-1.5 rounded-full">
                  📍 {group.targetDistrict}
                </span>
                <span className="inline-flex items-center gap-1 bg-orange-50 text-[#FF6B35] text-xs font-semibold px-3.5 py-1.5 rounded-full">
                  {getCategoryEmoji(group.foodCategory)} {group.foodCategory}
                </span>
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-semibold px-3.5 py-1.5 rounded-full">
                  👥 {getMemberCount(group.members)} Üye
                </span>
              </div>

              {/* Group Invite Link (FEATURE 1) */}
              <div className="bg-violet-50/50 rounded-xl p-3 border border-violet-100/50 mt-4">
                <span className="text-xs font-bold text-[#7239ea] uppercase tracking-wider block mb-1.5">
                  🔗 Grup Davet Linki
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}?joinGroup=${groupId}`}
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 focus:outline-none select-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}?joinGroup=${groupId}`;
                      navigator.clipboard.writeText(url)
                        .then(() => showToast('Link kopyalandı! ✓', 'success'));
                    }}
                    className="bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 text-[#7C3AED] text-xs font-bold px-3.5 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    🔗 Linki Kopyala
                  </button>
                </div>
              </div>

              {/* Non-member joining option */}
              {currentUser && !isUserMember(group.members, currentUser.uid) && (
                <button
                  type="button"
                  onClick={handleJoinGroup}
                  className="w-full bg-[#6C3CE1] hover:bg-[#5930C2] text-white text-sm font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-3"
                >
                  <CheckCircle className="w-4.5 h-4.5" />
                  <span>Bu Gruba Katıl</span>
                </button>
              )}
            </div>

            {/* Meeting Date & Time Card (FEATURE 1) */}
            <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">📅</span>
                <span className="font-semibold text-gray-950 text-sm">
                  {group.meetingDate ? formatTurkishDate(group.meetingDate) : (
                    <span className="text-gray-400 font-normal">Tarih belirlenmedi</span>
                  )}
                </span>
              </div>
              {group.meetingDate && group.meetingTime ? (
                <div className="flex items-center gap-3">
                  <span className="text-xl">🕐</span>
                  <span className="font-semibold text-gray-950 text-sm">{group.meetingTime}</span>
                </div>
              ) : null}
            </div>

            {/* RSVP Section (FEATURE 2) */}
            <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 p-5 space-y-4">
              <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider">Katılım Durumu</h3>
              
              {/* Three RSVP Buttons Row */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRSVPStatus(groupId, 'going')}
                  className="flex-1 transition-all"
                  style={{
                    background: '#D1FAE5',
                    color: '#065F46',
                    border: myRsvpStatus === 'going' ? '3px solid #059669' : '2px solid #6EE7B7',
                    borderRadius: '10px',
                    padding: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transform: myRsvpStatus === 'going' ? 'scale(1.03)' : 'scale(1)'
                  }}
                >
                  ✅ Gidiyorum
                </button>

                <button
                  type="button"
                  onClick={() => setRSVPStatus(groupId, 'maybe')}
                  className="flex-1 transition-all"
                  style={{
                    background: '#FEF3C7',
                    color: '#92400E',
                    border: myRsvpStatus === 'maybe' ? '3px solid #D97706' : '2px solid #FCD34D',
                    borderRadius: '10px',
                    padding: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transform: myRsvpStatus === 'maybe' ? 'scale(1.03)' : 'scale(1)'
                  }}
                >
                  ❓ Belki
                </button>

                <button
                  type="button"
                  onClick={() => setRSVPStatus(groupId, 'notgoing')}
                  className="flex-1 transition-all"
                  style={{
                    background: '#FEE2E2',
                    color: '#991B1B',
                    border: myRsvpStatus === 'notgoing' ? '3px solid #DC2626' : '2px solid #FCA5A5',
                    borderRadius: '10px',
                    padding: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transform: myRsvpStatus === 'notgoing' ? 'scale(1.03)' : 'scale(1)'
                  }}
                >
                  ❌ Gitmiyorum
                </button>
              </div>

              {/* RSVP Count Row */}
              <div className="flex items-center justify-around text-xs font-semibold py-1 border-t border-b border-gray-50">
                <span id="goingCount" className="text-emerald-700">
                  ✅ {rsvpList.going.length} kişi gidiyor
                </span>
                <span id="maybeCount" className="text-amber-700">
                  ❓ {rsvpList.maybe.length} kişi belki
                </span>
                <span id="notgoingCount" className="text-red-700">
                  ❌ {rsvpList.notgoing.length} kişi gitmiyor
                </span>
              </div>

              {/* Going Member Avatars */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-800">Gidenler 🎉</h4>
                {rsvpList.going.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Henüz giden yok.</p>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                    {rsvpList.going.map((member) => {
                      const firstLetter = (member.displayName || 'K').charAt(0).toUpperCase();
                      const shortName = member.displayName && member.displayName.length > 10
                        ? member.displayName.substring(0, 10) + '...'
                        : member.displayName;

                      return (
                        <div key={member.uid} className="memberItem">
                          {member.photoURL ? (
                            <img
                              src={member.photoURL}
                              alt={member.displayName}
                              className="memberAvatar"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="memberInitial">
                              {firstLetter}
                            </div>
                          )}
                          <span className="text-[11px] text-gray-500 font-medium truncate max-w-[64px] text-center mt-1">
                            {shortName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 1.5. Group Members display (FEATURE 3) */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <span>👥 Üyeler</span>
                  <span className="inline-flex items-center justify-center bg-[#7C3AED] text-white text-[10px] font-black h-4.5 min-w-4.5 px-1.5 rounded-full">
                    {getMemberCount(group.members)}
                  </span>
                </h3>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
                {getUniqueMembers(group.members).map((member) => {
                  const isUserCreator = member.uid === group.createdBy;
                  const firstLetter = (member.displayName || 'K').charAt(0).toUpperCase();
                  const shortName = member.displayName && member.displayName.length > 10
                    ? member.displayName.substring(0, 10) + '...'
                    : (member.displayName || 'Kullanıcı');

                  return (
                    <div key={member.uid} className="memberItem relative">
                      <div className="h-4 flex items-center justify-center">
                        {isUserCreator && <span className="text-xs" title="Grup Oluşturan">👑</span>}
                      </div>
                      {member.photoURL ? (
                        <img
                          src={member.photoURL}
                          alt={member.displayName}
                          className="memberAvatar"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="memberInitial">
                          {firstLetter}
                        </div>
                      )}
                      <span className="text-[12px] text-gray-600 font-medium truncate max-w-[64px] text-center mt-1">
                        {shortName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Custom Matching Venues collection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-[#6C3CE1]" />
                  <span>Önerilen Mekanlar</span>
                </h3>
                <span className="text-xs font-medium text-gray-400">{matchedVenues.length} Seçenek</span>
              </div>

              {venuesLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                  <p className="text-xs text-gray-400">Eşleşen mekanlar yükleniyor...</p>
                </div>
              ) : matchedVenues.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center shadow-sm">
                  <span className="text-3xl block mb-2">🍽️</span>
                  <p className="text-sm font-semibold text-gray-700">Bu semtte henüz mekan eklenmedi</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Bu semt ({group.targetDistrict}) ve kategori ({group.foodCategory}) için henüz uygun mekan bulunmamaktadır.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matchedVenues.map((v) => (
                    <article
                      key={v.id}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100/80 p-3.5 flex gap-4 hover:shadow-md transition-shadow"
                    >
                      {/* Left Thumbnail photo */}
                      <div className="h-28 w-28 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
                        <img
                          src={v.imageUrl}
                          alt={v.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Right Details */}
                      <div className="flex-1 flex flex-col justify-between pt-0.5">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 leading-tight line-clamp-1">{v.name}</h4>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="text-xs font-bold text-gray-700">{v.rating.toFixed(1)}</span>
                            <span className="text-[10px] text-gray-400">({v.ratingCount})</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                            {v.description}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2 mt-3">
                          {/* Interactive Voting Row (FEATURE 4) */}
                          <div className="flex gap-2">
                            {(() => {
                              const venueVotes = votes[v.id] || { up: [], down: [] };
                              const upCount = venueVotes.up.length;
                              const downCount = venueVotes.down.length;
                              const isUpvoted = currentUser ? venueVotes.up.includes(currentUser.uid) : false;
                              const isDownvoted = currentUser ? venueVotes.down.includes(currentUser.uid) : false;

                              return (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => castVote(groupId, v.id, 'up')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer border rounded-lg`}
                                    style={{ 
                                      padding: '6px 12px', 
                                      borderRadius: '8px', 
                                      fontWeight: 600,
                                      background: isUpvoted ? '#D1FAE5' : '#fff',
                                      color: isUpvoted ? '#065F46' : '#4B5563',
                                      borderColor: isUpvoted ? '#A7F3D0' : '#E5E7EB'
                                    }}
                                  >
                                    <span>👍</span>
                                    <span>{upCount}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => castVote(groupId, v.id, 'down')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer border rounded-lg`}
                                    style={{ 
                                      padding: '6px 12px', 
                                      borderRadius: '8px', 
                                      fontWeight: 600,
                                      background: isDownvoted ? '#FEE2E2' : '#fff',
                                      color: isDownvoted ? '#991B1B' : '#4B5563',
                                      borderColor: isDownvoted ? '#FCA5A5' : '#E5E7EB'
                                    }}
                                  >
                                    <span>👎</span>
                                    <span>{downCount}</span>
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                const url = v.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.name + ' ' + (v.district || v.targetDistrict || ''))}`;
                                window.open(url, '_blank');
                              }}
                              className="bg-[#E8F0FE] hover:bg-[#D7E6FD] active:scale-95 transition-all text-[11px] font-bold py-2 rounded-lg text-[#6C3CE1] text-center cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>🗺️ Haritada Gör</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(v.name + ' ' + (v.district || v.targetDistrict || '') + ' Istanbul')}&travelmode=transit`;
                                window.open(url, '_blank');
                              }}
                              className="bg-[#F3F4F6] hover:bg-[#E5E7EB] active:scale-95 transition-all text-[11px] font-bold py-2 rounded-lg text-gray-700 text-center cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>🚗 Yol Tarifi</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Creator Actions block */}
            {isCreator && (
              <div className="bg-rose-50/20 rounded-2xl p-4.5 border border-rose-100/50 flex flex-col gap-3">
                <span className="text-xs font-bold text-[#6C3CE1] uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Settings className="w-3.5 h-3.5 text-[#6C3CE1]" />
                  <span>Buluşma Yöneticisi Kontrolleri</span>
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-[#6C3CE1]/35 hover:bg-violet-50/50 text-[#6C3CE1] text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>✏️ Grubu Düzenle</span>
                  </button>

                  <button
                    onClick={handleDeleteGroup}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>✕ Buluşmayı İptal Et</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit Group Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-md rounded-t-[24px] sm:rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto"
            >
              {/* Close Button & Header */}
              <div className="flex justify-between items-center mb-5 pb-2 border-b border-gray-50">
                <h3 className="text-lg font-bold text-gray-900 font-display">✏️ Grubu Düzenle</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form inside modal */}
              <form onSubmit={handleUpdateGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Grup Adı</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Grup ismi..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300 transition-all font-medium text-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Açıklama</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Grup açıklaması..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-300 transition-all text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">Hedef Semt</label>
                  <div className="flex flex-wrap gap-1.5">
                    {districts.map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => setEditDistrict(d)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          editDistrict === d
                            ? 'bg-[#6C3CE1] text-white shadow'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">Yiyecek Kategorisi</label>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setEditCategory(c.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          editCategory === c.id
                            ? 'bg-[#6C3CE1] text-white shadow'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="w-full bg-[#6C3CE1] hover:bg-[#5930C2] text-white text-sm font-bold py-3 px-6 rounded-xl transition-all cursor-pointer mt-4"
                >
                  {savingEdit ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTurkishDate(dateStr: string) {
  if (!dateStr) return "Tarih belirlenmedi";
  const months = ["Ocak","Şubat","Mart","Nisan",
    "Mayıs","Haziran","Temmuz","Ağustos",
    "Eylül","Ekim","Kasım","Aralık"];
  
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(monthIndex) && monthIndex >= 0 && monthIndex < 12) {
      return day + " " + months[monthIndex] + " " + year;
    }
  }
  
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Tarih belirlenmedi";
  return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
}
