import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Venue } from './types';

export const SEED_VENUES: Omit<Venue, 'id'>[] = [
  // BEŞİKTAŞ - SUSHİ
  {
    name: "Miyabi Sushi",
    description: "Kuruçeşme sahilinde modern füzyon mutfağı ve özel hazırlanan imza rulolar.",
    foodCategory: "Sushi",
    targetDistrict: "Beşiktaş",
    imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800",
    rating: 4.8,
    ratingCount: 892,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Miyabi+Sushi+Be%C5%9Fikta%C5%9F+%C4%B0stanbul"
  },
  {
    name: "Inari Omakase",
    description: "Şef masasında 12 kişilik omakase deneyimi, mevsimlik Japon malzemeleri.",
    foodCategory: "Sushi",
    targetDistrict: "Beşiktaş",
    imageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800",
    rating: 4.9,
    ratingCount: 431,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Inari+Omakase+Be%C5%9Fikta%C5%9F+%C4%B0stanbul"
  },
  {
    name: "Tanuki Ramen & Sushi",
    description: "Ramen ve sushi bir arada, canlı müzik eşliğinde akşam yemeği.",
    foodCategory: "Sushi",
    targetDistrict: "Beşiktaş",
    imageUrl: "https://images.unsplash.com/photo-1582450871972-ab5ca641643d?w=800",
    rating: 4.6,
    ratingCount: 1204,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Tanuki+Ramen+Be%C5%9Fikta%C5%9F+%C4%B0stanbul"
  },

  // BEŞİKTAŞ - BURGER
  {
    name: "Shake Shack Beşiktaş",
    description: "New York kökenli ikonik burger zinciri, crispy fries ve özel ShackSauce.",
    foodCategory: "Burger",
    targetDistrict: "Beşiktaş",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
    rating: 4.6,
    ratingCount: 3241,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Shake+Shack+Be%C5%9Fikta%C5%9F+%C4%B0stanbul"
  },
  {
    name: "Bareburger Beşiktaş",
    description: "Organik ve serbest dolaşan hayvanlardan elde edilen malzemelerle gurme burgerler.",
    foodCategory: "Burger",
    targetDistrict: "Beşiktaş",
    imageUrl: "https://images.unsplash.com/photo-1551782450-17144efb9c50?w=800",
    rating: 4.5,
    ratingCount: 1876,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Bareburger+Be%C5%9Fikta%C5%9F+%C4%B0stanbul"
  },
  {
    name: "Black Tap Beşiktaş",
    description: "Dev milkshake ve smash burger kombinasyonu, Instagram'ın en çok paylaşılan burgeri.",
    foodCategory: "Burger",
    targetDistrict: "Beşiktaş",
    imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800",
    rating: 4.7,
    ratingCount: 2103,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Black+Tap+Be%C5%9Fikta%C5%9F+%C4%B0stanbul"
  },

  // BEŞİKTAŞ - KAFE
  {
    name: "Petra Coffee Beşiktaş",
    description: "Boğaz manzaralı butik kahveci, özel bölge single origin kahveler.",
    foodCategory: "Kafe",
    targetDistrict: "Beşiktaş",
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
    rating: 4.7,
    ratingCount: 654,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Petra+Coffee+Be%C5%9Fikta%C5%9F+%C4%B0stanbul"
  },
  {
    name: "Walter's Coffee Beşiktaş",
    description: "Breaking Bad temalı eğlenceli kafe, özel kimyasal görünümlü içecekler.",
    foodCategory: "Kafe",
    targetDistrict: "Beşiktaş",
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
    rating: 4.5,
    ratingCount: 2341,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Walters+Coffee+Be%C5%9Fikta%C5%9F+%C4%B0stanbul"
  },
  {
    name: "Kronotrop Beşiktaş",
    description: "Türkiye'nin en iyi spesialty kahvecilerinden, pour-over ve chemex uzmanı.",
    foodCategory: "Kafe",
    targetDistrict: "Beşiktaş",
    imageUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800",
    rating: 4.8,
    ratingCount: 987,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Kronotrop+Be%C5%9Fikta%C5%9F+%C4%B0stanbul"
  },

  // BEŞİKTAŞ - PİZZA
  {
    name: "Conscious Pizza Beşiktaş",
    description: "Sourdough hamurlu, doğal malzemeli Napoli usulü pizzalar.",
    foodCategory: "Pizza",
    targetDistrict: "Beşiktaş",
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
    rating: 4.7,
    ratingCount: 743,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Conscious+Pizza+Be%C5%9Fikta%C5%9F+%C4%B0stanbul"
  },
  {
    name: "Pizzeria Güllüoğlu Beşiktaş",
    description: "Yerli malzeme ve ince hamurlu geleneksel İstanbul pizzası.",
    foodCategory: "Pizza",
    targetDistrict: "Beşiktaş",
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
    rating: 4.4,
    ratingCount: 1532,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Pizzeria+Be%C5%9Fikta%C5%9F+%C4%B0stanbul"
  },
  {
    name: "Namo Pizza Beşiktaş",
    description: "Odun ateşinde 90 saniyede pişen otantik Napolitana pizzalar.",
    foodCategory: "Pizza",
    targetDistrict: "Beşiktaş",
    imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800",
    rating: 4.6,
    ratingCount: 891,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Namo+Pizza+Be%C5%9Fikta%C5%9F+%C4%B0stanbul"
  },

  // KADIKÖY - SUSHİ
  {
    name: "Fujiya Sushi Kadıköy",
    description: "Kadıköy'ün kalbinde otantik Japon mutfağı, taze balık garantisi.",
    foodCategory: "Sushi",
    targetDistrict: "Kadıköy",
    imageUrl: "https://images.unsplash.com/photo-1559410545-0bdcd187e0a6?w=800",
    rating: 4.7,
    ratingCount: 1123,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Fujiya+Sushi+Kad%C4%B1k%C3%B6y+%C4%B0stanbul"
  },
  {
    name: "Umami Sushi Bar",
    description: "Minimalist dekor, maksimum lezzet. Şef önerisiyle omakase seçeneği mevcut.",
    foodCategory: "Sushi",
    targetDistrict: "Kadıköy",
    imageUrl: "https://images.unsplash.com/photo-1617196034099-b37e13b31b0d?w=800",
    rating: 4.8,
    ratingCount: 567,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Umami+Sushi+Kad%C4%B1k%C3%B6y+%C4%B0stanbul"
  },
  {
    name: "Sakura Japanese Kitchen",
    description: "Sushi, ramen ve gyoza bir arada, Japon sokak yemeği kültürü.",
    foodCategory: "Sushi",
    targetDistrict: "Kadıköy",
    imageUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800",
    rating: 4.5,
    ratingCount: 2034,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Sakura+Japanese+Kad%C4%B1k%C3%B6y+%C4%B0stanbul"
  },

  // KADIKÖY - BURGER
  {
    name: "Kalın Burger Kadıköy",
    description: "Smash burger ustası, günlük çekilen dana eti ve ev yapımı soslar.",
    foodCategory: "Burger",
    targetDistrict: "Kadıköy",
    imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800",
    rating: 4.8,
    ratingCount: 4521,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Kal%C4%B1n+Burger+Kad%C4%B1k%C3%B6y+%C4%B0stanbul"
  },
  {
    name: "Burger No:1 Kadıköy",
    description: "Tek malzeme takıntısı: en iyi et, en taze sebze, en lezzetli burger.",
    foodCategory: "Burger",
    targetDistrict: "Kadıköy",
    imageUrl: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=800",
    rating: 4.6,
    ratingCount: 2876,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Burger+No1+Kad%C4%B1k%C3%B6y+%C4%B0stanbul"
  },
  {
    name: "Meşhur Filizler Kadıköy",
    description: "50 yıllık geçmişiyle Kadıköy'ün efsane köftecisi, ıslak burger versiyonu.",
    foodCategory: "Burger",
    targetDistrict: "Kadıköy",
    imageUrl: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800",
    rating: 4.5,
    ratingCount: 6234,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Filizler+Kad%C4%B1k%C3%B6y+%C4%B0stanbul"
  },

  // KADIKÖY - KAFE
  {
    name: "Gram Coffee Kadıköy",
    description: "Specialty kahve hareketi öncüsü, haftalık değişen single origin seçenekleri.",
    foodCategory: "Kafe",
    targetDistrict: "Kadıköy",
    imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800",
    rating: 4.8,
    ratingCount: 1432,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Gram+Coffee+Kad%C4%B1k%C3%B6y+%C4%B0stanbul"
  },
  {
    name: "Fazıl Bey Türk Kahvesi",
    description: "1923'ten beri aynı reçete, İstanbul'un en ünlü Türk kahvesi durağı.",
    foodCategory: "Kafe",
    targetDistrict: "Kadıköy",
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800",
    rating: 4.7,
    ratingCount: 8932,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Faz%C4%B1l+Bey+Kad%C4%B1k%C3%B6y+%C4%B0stanbul"
  },
  {
    name: "Kuzguncuk Bostanı Kafe",
    description: "Organik bahçe içinde kafe, ev yapımı pastalar ve sakin atmosfer.",
    foodCategory: "Kafe",
    targetDistrict: "Kadıköy",
    imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800",
    rating: 4.6,
    ratingCount: 876,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Kafe+Kad%C4%B1k%C3%B6y+%C4%B0stanbul"
  },

  // KADIKÖY - PİZZA
  {
    name: "Pizza Mola Kadıköy",
    description: "İnce tabanlı Roma usulü dilim pizza, öğle arası vazgeçilmezi.",
    foodCategory: "Pizza",
    targetDistrict: "Kadıköy",
    imageUrl: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800",
    rating: 4.5,
    ratingCount: 3241,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Pizza+Mola+Kad%C4%B1k%C3%B6y+%C4%B0stanbul"
  },
  {
    name: "Mezzaluna Kadıköy",
    description: "İtalyan şef tarafından yönetilen restoran, haftalık değişen pizza menüsü.",
    foodCategory: "Pizza",
    targetDistrict: "Kadıköy",
    imageUrl: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800",
    rating: 4.7,
    ratingCount: 1654,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Mezzaluna+Kad%C4%B1k%C3%B6y+%C4%B0stanbul"
  },
  {
    name: "Forno Pizza Kadıköy",
    description: "Taş fırında pişen Sicilya usulü kalın tabanlı pizza çeşitleri.",
    foodCategory: "Pizza",
    targetDistrict: "Kadıköy",
    imageUrl: "https://images.unsplash.com/photo-1548369937-47519962c11a?w=800",
    rating: 4.4,
    ratingCount: 2109,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Forno+Pizza+Kad%C4%B1k%C3%B6y+%C4%B0stanbul"
  },

  // BEYOĞLU - SUSHİ
  {
    name: "Zuma Istanbul",
    description: "Dünyaca ünlü Zuma zincirinin İstanbul şubesi, izakaya tarzı fine dining.",
    foodCategory: "Sushi",
    targetDistrict: "Beyoğlu",
    imageUrl: "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800",
    rating: 4.9,
    ratingCount: 2341,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Zuma+Istanbul+Beyo%C4%9Flu"
  },
  {
    name: "Heyamo Sushi Beyoğlu",
    description: "İstiklal yakınında modern Japon-Türk füzyon mutfağı.",
    foodCategory: "Sushi",
    targetDistrict: "Beyoğlu",
    imageUrl: "https://images.unsplash.com/photo-1617196034302-fc1e46c1b85a?w=800",
    rating: 4.6,
    ratingCount: 987,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Heyamo+Sushi+Beyo%C4%9Flu+%C4%B0stanbul"
  },
  {
    name: "Niko Romito Beyoğlu",
    description: "Michelin yıldızlı şefin İstanbul yorumu, Japon-İtalyan füzyon konsept.",
    foodCategory: "Sushi",
    targetDistrict: "Beyoğlu",
    imageUrl: "https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=800",
    rating: 4.8,
    ratingCount: 543,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Niko+Romito+Beyo%C4%9Flu+%C4%B0stanbul"
  },

  // BEYOĞLU - BURGER
  {
    name: "Nusr-Et Burger Beyoğlu",
    description: "Salt Bae'nin burger konsepti, wagyu et ve altın sarısı sunumlar.",
    foodCategory: "Burger",
    targetDistrict: "Beyoğlu",
    imageUrl: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=800",
    rating: 4.5,
    ratingCount: 5432,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Nusr-Et+Burger+Beyo%C4%9Flu+%C4%B0stanbul"
  },
  {
    name: "Bun & Co Beyoğlu",
    description: "El yapımı brioche ekmek ve günlük kesim dana ile özel smash burger.",
    foodCategory: "Burger",
    targetDistrict: "Beyoğlu",
    imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800",
    rating: 4.7,
    ratingCount: 1876,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Bun+Co+Beyo%C4%9Flu+%C4%B0stanbul"
  },
  {
    name: "Çılgın Burger Beyoğlu",
    description: "Cihangir'in sevilen burgercisi, double smash ve özel acı sos.",
    foodCategory: "Burger",
    targetDistrict: "Beyoğlu",
    imageUrl: "https://images.unsplash.com/photo-1542574271-7f3b92e6c821?w=800",
    rating: 4.6,
    ratingCount: 3210,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=%C3%87%C4%B1lg%C4%B1n+Burger+Beyo%C4%9Flu+%C4%B0stanbul"
  },

  // BEYOĞLU - KAFE
  {
    name: "5Kat Beyoğlu",
    description: "Boğaz manzaralı çatı katı kafe, İstanbul siluetiyle kahve keyfi.",
    foodCategory: "Kafe",
    targetDistrict: "Beyoğlu",
    imageUrl: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800",
    rating: 4.7,
    ratingCount: 4321,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=5Kat+Beyo%C4%9Flu+%C4%B0stanbul"
  },
  {
    name: "Mandabatmaz Beyoğlu",
    description: "Tarihi ve eşsiz yoğun kıvamlı geleneksel Türk kahvesi durağı.",
    foodCategory: "Kafe",
    targetDistrict: "Beyoğlu",
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800",
    rating: 4.8,
    ratingCount: 3412,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Mandabatmaz+Beyo%C4%9Flu+%C4%B0stanbul"
  },
  {
    name: "Pera Cafe & Bistro",
    description: "Sanat galerisi atmosferinde premium kahve çeşitleri ve gurme sandviçler.",
    foodCategory: "Kafe",
    targetDistrict: "Beyoğlu",
    imageUrl: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800",
    rating: 4.6,
    ratingCount: 890,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Pera+Cafe+Bistro+Beyo%C4%9Flu+%C4%B0stanbul"
  },

  // BEYOĞLU - PİZZA
  {
    name: "Pizzeria Pera",
    description: "Tarihi Pera sokağında enfes İtalyan usulü odun ateşinde incecik pizzalar.",
    foodCategory: "Pizza",
    targetDistrict: "Beyoğlu",
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
    rating: 4.8,
    ratingCount: 1729,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Pizzeria+Pera+Beyo%C4%9Flu+%C4%B0stanbul"
  },
  {
    name: "Miss Pizza Cihangir",
    description: "Cihangir'in en ikonik butik pizzacısı, taze fesleğen ve zengin mozzarella dolgusu.",
    foodCategory: "Pizza",
    targetDistrict: "Beyoğlu",
    imageUrl: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=800",
    rating: 4.7,
    ratingCount: 2201,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Miss+Pizza+Cihangir+%C4%B0stanbul"
  },
  {
    name: "Fornello Pizza Beyoğlu",
    description: "Özel soslu ve fırından yeni çıkmış çıtır kenarlı enfes Napoliten dilimler.",
    foodCategory: "Pizza",
    targetDistrict: "Beyoğlu",
    imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800",
    rating: 4.5,
    ratingCount: 1140,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Fornello+Pizza+Beyo%C4%9Flu+%C4%B0stanbul"
  }
];

export async function seedVenuesIfEmpty() {
  const venuesRef = collection(db, 'venues');
  try {
    const s = await getDocs(venuesRef);
    if (s.empty) {
      console.log('Seeding venues database initially...');
      await seedAllVenuesToFirestore();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'venues');
  }
}

export async function seedAllVenuesToFirestore() {
  const venuesRef = collection(db, 'venues');
  console.log('Clearing old venues database and seeding 25 hand-crafted venues...');
  
  try {
    // 1. Get all current files & delete to avoid stale entries
    const s = await getDocs(venuesRef);
    for (const docSnapshot of s.docs) {
      await deleteDoc(doc(db, 'venues', docSnapshot.id));
    }
    
    // 2. Build 25 premium documents with both field sets to support all schemas seamlessly
    for (const v of SEED_VENUES) {
      // Create document id based on name (sluggified)
      const docId = v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const payload = {
        ...v,
        // Dual-compatibility fields
        category: v.foodCategory,
        district: v.targetDistrict,
        reviewCount: v.ratingCount,
      };

      await setDoc(doc(db, 'venues', docId), payload);
    }
    console.log('Database successfully re-seeded with 25 venues!');
  } catch (error) {
    console.error("Mekan yüklenirken bir sorun oluştu:", error);
    throw error;
  }
}
