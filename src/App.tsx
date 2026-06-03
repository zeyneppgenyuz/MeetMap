import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { AnimatePresence } from 'motion/react';
import { MapPin } from 'lucide-react';
import { auth, db } from './firebase';
import { Screen } from './types';

// Importing Screens
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';
import DashboardScreen from './components/DashboardScreen';
import CreateGroupScreen from './components/CreateGroupScreen';
import GroupsListScreen from './components/GroupsListScreen';
import GroupDetailScreen from './components/GroupDetailScreen';
import ProfileScreen from './components/ProfileScreen';
import MapScreen from './components/MapScreen';
import Toast from './components/Toast';
import ScreenTransition from './components/ScreenTransition';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('LOGIN');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Toast systems
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // Auth Status Watcher (Required by Technical Guidelines)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // Safe check to avoid overriding active deep screen (like GROUP_DETAIL) on refresh if state persists
        if (currentScreen === 'LOGIN' || currentScreen === 'SIGNUP') {
          setCurrentScreen('DASHBOARD');
        }
      } else {
        setCurrentScreen('LOGIN');
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, [currentScreen]);

  // Handle Joining Group via invite link (FEATURE 2)
  useEffect(() => {
    if (authChecking) return;

    const handleJoinLogic = async () => {
      const params = new URLSearchParams(window.location.search);
      let joinGroupId = params.get('joinGroup');

      if (!currentUser) {
        if (joinGroupId) {
          localStorage.setItem('pendingJoin', joinGroupId);
          // Clean URL so they don't see it trailing or re-triggering unexpectedly
          window.history.replaceState({}, '', window.location.pathname);
          showToast('Gruba katılmak için lütfen giriş yapın.', 'success');
        }
        return;
      }

      // Check localStorage first
      const pendingJoin = localStorage.getItem('pendingJoin');
      if (pendingJoin) {
        joinGroupId = pendingJoin;
        localStorage.removeItem('pendingJoin');
      }

      if (joinGroupId) {
        try {
          const groupRef = doc(db, 'groups', joinGroupId);
          const groupSnap = await getDoc(groupRef);
          
          if (groupSnap.exists()) {
            await updateDoc(groupRef, {
              members: arrayUnion(
                currentUser.uid,
                {
                  uid: currentUser.uid,
                  displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Kullanıcı',
                  photoURL: currentUser.photoURL || null,
                  joinedAt: new Date().toISOString()
                }
              )
            });

            showToast('Gruba başarıyla katıldınız! 🎉', 'success');
            setSelectedGroupId(joinGroupId);
            setCurrentScreen('GROUP_DETAIL');
          } else {
            showToast('Katılmak istediğiniz grup bulunamadı.', 'error');
          }
        } catch (err) {
          console.error("Error joining group via link:", err);
          showToast('Gruba katılırken hata oluştu.', 'error');
        } finally {
          // Clean search params if any
          if (params.get('joinGroup')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      }
    };

    handleJoinLogic();
  }, [currentUser, authChecking]);

  // Navigate utility
  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleGroupCreated = (groupId: string) => {
    setSelectedGroupId(groupId);
    setCurrentScreen('GROUP_DETAIL');
  };

  const isMainTab = ['DASHBOARD', 'GROUPS_LIST', 'MAP', 'PROFILE'].includes(currentScreen);

  // Render current active screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'LOGIN':
        return (
          <LoginScreen
            onNavigate={handleNavigate}
            showToast={showToast}
            onLoginSuccess={() => handleNavigate('DASHBOARD')}
          />
        );
      case 'SIGNUP':
        return (
          <SignupScreen
            onNavigate={handleNavigate}
            showToast={showToast}
            onSignupSuccess={() => handleNavigate('DASHBOARD')}
          />
        );
      case 'DASHBOARD':
        return (
          <ScreenTransition>
            <DashboardScreen
              onNavigate={handleNavigate}
              showToast={showToast}
            />
          </ScreenTransition>
        );
      case 'CREATE_GROUP':
        return (
          <ScreenTransition>
            <CreateGroupScreen
              onNavigate={handleNavigate}
              showToast={showToast}
              onGroupCreated={handleGroupCreated}
            />
          </ScreenTransition>
        );
      case 'GROUPS_LIST':
        return (
          <ScreenTransition>
            <GroupsListScreen
              onNavigate={handleNavigate}
              showToast={showToast}
              onSelectGroup={setSelectedGroupId}
            />
          </ScreenTransition>
        );
      case 'GROUP_DETAIL':
        return (
          <ScreenTransition>
            <GroupDetailScreen
              groupId={selectedGroupId}
              onNavigate={handleNavigate}
              showToast={showToast}
            />
          </ScreenTransition>
        );
      case 'PROFILE':
        return (
          <ScreenTransition>
            <ProfileScreen
              onNavigate={handleNavigate}
              showToast={showToast}
              onSelectGroup={setSelectedGroupId}
            />
          </ScreenTransition>
        );
      default:
        return (
          <LoginScreen
            onNavigate={handleNavigate}
            showToast={showToast}
            onLoginSuccess={() => handleNavigate('DASHBOARD')}
          />
        );
    }
  };

  if (authChecking) {
    return (
      <div 
        className="min-h-screen w-full flex flex-col items-center justify-center p-5 relative select-none overflow-hidden"
        style={{
          background: 'linear-gradient(to bottom, #6C3CE1, #C06090, #E8805A)'
        }}
      >
        <div className="flex flex-col items-center gap-4 text-white z-10">
          <div className="bg-white/25 p-3 rounded-2xl animate-pulse">
            <MapPin className="w-10 h-10 text-white fill-white/10" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-display animate-pulse">MeetMap</h1>
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#F5F5FA] text-gray-900 overflow-x-hidden antialiased">
      {isMainTab ? (
        <div className="w-full min-h-screen">
          <div className={currentScreen === 'DASHBOARD' ? '' : 'hidden'}>
            <DashboardScreen onNavigate={handleNavigate} showToast={showToast} />
          </div>
          <div className={currentScreen === 'GROUPS_LIST' ? '' : 'hidden'}>
            <GroupsListScreen onNavigate={handleNavigate} showToast={showToast} onSelectGroup={setSelectedGroupId} />
          </div>
          <div className={currentScreen === 'MAP' ? '' : 'hidden'}>
            <MapScreen onNavigate={handleNavigate} showToast={showToast} />
          </div>
          <div className={currentScreen === 'PROFILE' ? '' : 'hidden'}>
            <ProfileScreen onNavigate={handleNavigate} showToast={showToast} onSelectGroup={setSelectedGroupId} />
          </div>
        </div>
      ) : (
        renderScreen()
      )}

      {/* Global alert messages */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
