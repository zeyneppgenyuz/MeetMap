import React, { useEffect, useState } from 'react';
import { Home, Users, Map, User } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Venue, Screen } from '../types';

interface MapScreenProps {
  onNavigate: (screen: Screen) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

interface Coord {
  x: number;
  y: number;
}

// Map district names to coordinates
const getDistrictCoords = (district: string): Coord => {
  const norm = district.trim().toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o');

  if (norm.includes('besiktas')) return { x: 180, y: 130 };
  if (norm.includes('beyoglu')) return { x: 230, y: 110 };
  if (norm.includes('karakoy')) return { x: 245, y: 125 };
  if (norm.includes('fatih')) return { x: 260, y: 130 };
  if (norm.includes('sisli')) return { x: 210, y: 90 };
  if (norm.includes('kadikoy')) return { x: 320, y: 155 };
  if (norm.includes('uskudar')) return { x: 300, y: 130 };
  if (norm.includes('suadiye')) return { x: 390, y: 170 };
  if (norm.includes('atasehir')) return { x: 370, y: 155 };
  if (norm.includes('beykoz')) return { x: 400, y: 90 };
  return { x: 300, y: 140 }; // Default
};

const getPinColor = (category?: string): string => {
  const cat = (category || '').trim().toLowerCase();
  if (cat === 'sushi') return '#7C3AED';
  if (cat === 'kafe') return '#3B82F6';
  if (cat === 'pizza') return '#F97316';
  if (cat === 'burger') return '#10B981';
  return '#EF4444';
};

const DEFAULT_IFRAME_SRC = "https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d96316.17!2d28.9784!3d41.0082!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1str!2str!4v1";

export default function MapScreen({ onNavigate, showToast }: MapScreenProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [iframeSrc, setIframeSrc] = useState<string>(DEFAULT_IFRAME_SRC);
  
  // Interactive Overlays State
  const [hoveredVenue, setHoveredVenue] = useState<Venue | null>(null);
  const [hoveredCoords, setHoveredCoords] = useState<Coord | null>(null);
  const [highlightedVenueId, setHighlightedVenueId] = useState<string | null>(null);

  // Fetch Firestore venues
  useEffect(() => {
    const fetchVenues = async () => {
      // Use cached window.allVenues if available
      const cached = (window as any).allVenues;
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setVenues(cached);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'venues'));
        const list: Venue[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Venue);
        });
        // Store in window.allVenues array
        (window as any).allVenues = list;
        setVenues(list);
      } catch (err) {
        console.error('Error fetching venues in MapScreen:', err);
        showToast('Mekan verileri alınırken bir hata oluştu.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, [showToast]);

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
    if (district === 'All') {
      setIframeSrc(DEFAULT_IFRAME_SRC);
    } else {
      // Zoom into specific district in standard google embed API
      setIframeSrc(`https://maps.google.com/maps?q=${encodeURIComponent(district + ', Istanbul')}&t=&z=14&ie=UTF8&iwloc=&output=embed`);
    }
  };

  const handleResetMap = () => {
    setSelectedCategory('All');
    setSelectedDistrict('All');
    setIframeSrc(DEFAULT_IFRAME_SRC);
    setHoveredVenue(null);
    setHoveredCoords(null);
    setHighlightedVenueId(null);
    showToast('Harita ve filtreler sıfırlandı 🔄', 'success');
  };

  // Filter logical categorisation
  const filteredVenues = venues.filter((venue) => {
    // Category check
    let matchesCategory = true;
    if (selectedCategory !== 'All') {
      const category = (venue.foodCategory || (venue as any).category || '').toString().trim();
      matchesCategory = category.toLowerCase() === selectedCategory.toLowerCase();
    }

    // District Check
    let matchesDistrict = true;
    if (selectedDistrict !== 'All') {
      const district = (venue.targetDistrict || (venue as any).district || '').toString().trim();
      
      const norm = (s: string) => s.toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ş/g, 's')
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o');
        
      matchesDistrict = norm(district).includes(norm(selectedDistrict));
    }

    return matchesCategory && matchesDistrict;
  });

  return (
    <div id="mapPage" className="min-h-screen w-full bg-[#F5F5FA] flex flex-col font-sans select-none relative pb-16">
      {/* TOP BAR */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-100 shadow-sm">
        <h1 className="font-bold text-gray-900 text-lg">📍 Mekan Haritası</h1>
        <span className="text-gray-500 text-xs font-semibold bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
          {filteredVenues.length} Mekan
        </span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-6">
        {/* ISTANBUL MAP IFRAME WITH SVG OVERLAY */}
        <div className="p-4 bg-white mb-2">
          <div className="relative w-full h-[280px] bg-slate-100 rounded-xl overflow-hidden shadow-inner border border-gray-100">
            <iframe
              src={iframeSrc}
              style={{ border: 0, width: '100%', height: '100%' }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Istanbul Overview Map"
            ></iframe>
            
            {/* SVG Overlay Container */}
            <svg 
              viewBox="0 0 600 280" 
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              id="pinSVG"
            >
              {filteredVenues.map((venue) => {
                const district = venue.targetDistrict || (venue as any).district || 'İstanbul';
                const coords = getDistrictCoords(district);
                const pinColor = getPinColor(venue.foodCategory || (venue as any).category || '');
                const isHovered = hoveredVenue?.id === venue.id;
                
                return (
                  <g 
                    key={venue.id} 
                    className="pointer-events-auto cursor-pointer transition-transform duration-200"
                    style={{
                      transform: isHovered 
                        ? `translate(${coords.x - 10}px, ${coords.y - 28}px) scale(1.15)` 
                        : `translate(${coords.x - 10}px, ${coords.y - 24}px) scale(1)`,
                      transformOrigin: `${coords.x}px ${coords.y}px`,
                    }}
                    onMouseEnter={() => {
                      setHoveredVenue(venue);
                      setHoveredCoords(coords);
                    }}
                    onMouseLeave={() => {
                      setHoveredVenue(null);
                      setHoveredCoords(null);
                    }}
                    onClick={() => {
                      const cardElement = document.getElementById(`venueCard${venue.id}`);
                      if (cardElement) {
                        cardElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        cardElement.style.boxShadow = '0 0 0 3px #EF4444';
                        cardElement.style.background = '#FFF5F5';
                        setTimeout(() => {
                          cardElement.style.boxShadow = '';
                          cardElement.style.background = '';
                        }, 1500);
                      }
                    }}
                  >
                    {/* Drop shadow (ellipse pointing below teardrop tip) */}
                    <ellipse 
                      cx="10" 
                      cy="26" 
                      rx="5" 
                      ry="2" 
                      fill="rgba(0,0,0,0.25)" 
                    />
                    
                    {/* Teardrop path (20x28 bounding box, tip at bottom center) */}
                    <path 
                      d="M10,0 C4.477,0 0,4.477 0,10 C0,17.5 10,26 10,26 C10,26 20,17.5 20,10 C20,4.477 15.523,0 10,0 Z"
                      fill={pinColor}
                      stroke="white"
                      strokeWidth="1.5"
                    />

                    {/* White circle hole in center */}
                    <circle 
                      cx="10" 
                      cy="10" 
                      r="4" 
                      fill="white" 
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredVenue && hoveredCoords && (
              <div 
                className="absolute bg-gray-900/90 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap z-20 flex flex-col items-center -translate-x-1/2 -translate-y-[calc(100%+32px)] transition-all"
                style={{
                  left: `${(hoveredCoords.x / 600) * 100}%`,
                  top: `${(hoveredCoords.y / 280) * 100}%`,
                }}
              >
                <span className="font-bold">{hoveredVenue.name}</span>
                <span className="text-[10px] text-gray-300">📍 {hoveredVenue.targetDistrict || (hoveredVenue as any).district || 'İstanbul'}</span>
                {/* Arrow indicator */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-900/90" />
              </div>
            )}
          </div>
        </div>

        {/* MAP NOTIFICATION NOTE & RESET BUTTON */}
        <div className="px-4 py-2 bg-amber-50/70 border border-amber-100 rounded-xl mx-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-amber-800">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">📍</span>
            <span>Pinler ilçe merkezlerini temsil eder. Haritayı kaydırınca pinler sabit kalır — mekan kartlarından Google Maps'e gidin.</span>
          </div>
          <button
            type="button"
            onClick={handleResetMap}
            className="shrink-0 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold px-3 py-1 rounded-lg active:scale-95 transition-all cursor-pointer shadow-sm text-[11px] whitespace-nowrap"
          >
            🔄 Haritayı Sıfırla
          </button>
        </div>

        {/* DISTRICT FILTER ROW */}
        <div className="bg-white border-b border-gray-100 py-2.5 px-4 flex gap-2 overflow-x-auto no-scrollbar shadow-sm sticky top-0 z-30 mb-1">
          <span className="text-[10px] font-bold text-gray-400 self-center uppercase tracking-wider mr-1">İlçe:</span>
          {[
            { label: 'Tümü', value: 'All' },
            { label: 'Beşiktaş', value: 'Beşiktaş' },
            { label: 'Beyoğlu', value: 'Beyoğlu' },
            { label: 'Karaköy', value: 'Karaköy' },
            { label: 'Fatih', value: 'Fatih' },
            { label: 'Şişli', value: 'Şişli' },
            { label: 'Kadıköy', value: 'Kadıköy' },
            { label: 'Üsküdar', value: 'Üsküdar' },
            { label: 'Suadiye', value: 'Suadiye' },
            { label: 'Ataşehir', value: 'Ataşehir' },
            { label: 'Beykoz', value: 'Beykoz' }
          ].map((pill) => {
            const isActive = selectedDistrict === pill.value;
            return (
              <button
                key={pill.value}
                onClick={() => handleDistrictChange(pill.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all border cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'bg-violet-600 border-violet-600 text-white shadow-sm font-extrabold' 
                    : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* CATEGORY FILTER ROW */}
        <div className="bg-white border-b border-gray-100 py-2.5 px-4 flex gap-2 overflow-x-auto no-scrollbar shadow-sm sticky top-10 z-30 mb-4">
          <span className="text-[10px] font-bold text-gray-400 self-center uppercase tracking-wider mr-1">Kategori:</span>
          {[
            { label: 'Tümü', value: 'All' },
            { label: '🍱 Sushi', value: 'Sushi' },
            { label: '☕ Kafe', value: 'Kafe' },
            { label: '🍕 Pizza', value: 'Pizza' },
            { label: '🍔 Burger', value: 'Burger' }
          ].map((pill) => {
            const isActive = selectedCategory === pill.value;
            return (
              <button
                key={pill.value}
                onClick={() => setSelectedCategory(pill.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all border cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-sm font-extrabold' 
                    : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* VENUE LIST */}
        <div className="px-4 mt-2">
          <h2 className="text-base font-bold text-gray-900 mb-3">Önerilen Mekanlar</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="text-gray-500 font-medium text-sm animate-pulse">
                Mekanlar yükleniyor...
              </span>
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="flex items-center justify-center py-16 bg-white border border-dashed border-gray-200 rounded-2xl">
              <span className="text-gray-400 font-semibold text-sm text-center">
                Bu kriterlere uygun mekan bulunamadı 🔍
              </span>
            </div>
          ) : (
            filteredVenues.map((venue) => {
              const district = venue.targetDistrict || (venue as any).district || 'İstanbul';
              const reviewCount = venue.ratingCount || (venue as any).reviewCount || 120;
              const isHighlighted = highlightedVenueId === venue.id;

              return (
                <div 
                  key={venue.id} 
                  id={`venueCard${venue.id}`}
                  className={`bg-white rounded-2xl overflow-hidden shadow-sm border mb-4 transition-all duration-300 ${
                    isHighlighted 
                      ? 'border-[#7C3AED] ring-2 ring-violet-200 scale-[1.01]' 
                      : 'border-gray-100'
                  }`}
                >
                  <img 
                    src={venue.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600'} 
                    alt={venue.name} 
                    className="w-full h-40 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-[16px] leading-tight mb-1">{venue.name}</h3>
                    
                    <div className="flex items-center gap-1 text-[13px] text-gray-500 mb-2">
                      <span className="text-amber-500">⭐</span>
                      <span className="font-bold text-gray-800">{venue.rating || 4.5}</span>
                      <span className="text-gray-400">({reviewCount} yorum)</span>
                    </div>

                    <div className="mb-2.5">
                      <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                        📍 {district}
                      </span>
                    </div>

                    <p className="text-gray-500 text-xs mb-3.5 leading-relaxed line-clamp-2">
                      {venue.description}
                    </p>
                    
                    <div className="flex gap-2">
                      <button 
                        className="flex-1 bg-violet-50 hover:bg-violet-100 text-[#7C3AED] font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-violet-100"
                        onClick={() => window.open(
                          venue.mapsUrl || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(venue.name + ' ' + district + ' Istanbul'),
                          '_blank'
                        )}
                      >
                        🗺️ Haritada Gör
                      </button>
                      <button 
                        className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-gray-150"
                        onClick={() => window.open(
                          'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(venue.name + ' ' + district + ' Istanbul'),
                          '_blank'
                        )}
                      >
                        Yol Tarifi Al
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around z-50 shadow-lg px-4">
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
          className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors text-[#7C3AED]"
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
      </nav>
    </div>
  );
}
