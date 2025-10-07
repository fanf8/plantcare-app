import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Image,
  ImageBackground,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Background Images
const BACKGROUND_IMAGES = {
  auth: 'https://images.unsplash.com/photo-1542157565-4607d82cf417?w=1200&q=80',
  garden: 'https://images.unsplash.com/photo-1657043496762-89aca96457a0?w=1200&q=80',
  encyclopedia: 'https://images.unsplash.com/photo-1613388585392-8ff61e5cfc3a?w=1200&q=80',
  details: 'https://images.unsplash.com/photo-1602500491514-ed552dd7ab64?w=1200&q=80',
  scanner: 'https://images.unsplash.com/photo-1595570909880-9e8f4b72a418?w=1200&q=80',
  recommendations: 'https://images.unsplash.com/photo-1651760548421-f9c28517a955?w=1200&q=80',
  community: 'https://images.unsplash.com/photo-1492496913980-501348b61469?w=1200&q=80',
  profile: 'https://images.unsplash.com/photo-1717607423584-49450c57d361?w=1200&q=80',
};

interface User {
  id: string;
  name: string;
  email: string;
  is_premium: boolean;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface PlantInfo {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  photo_url: string;
  description: string;
  common_name: string;
  scientific_name: string;
  sunlight: string;
  watering: string;
  soil_type: string;
  monthly_watering: string;
  difficulty: string;
  growing_season: string[];
}

interface WateringSchedule {
  id: string;
  user_id: string;
  user_plant_id: string;
  schedule_type: string; // "auto" ou "custom"
  custom_days?: number[]; // [1,3,5] pour lundi, mercredi, vendredi
  auto_frequency?: number; // nombre d'arrosages par semaine
  created_at: string;
  updated_at: string;
}

interface WeekDay {
  day: string;
  date: number;
  dayIndex: number;
  needsWatering: boolean;
}

export default function PlantWellnessApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState('garden');
  const [currentSection, setCurrentSection] = useState('');
  const [selectedPlant, setSelectedPlant] = useState<PlantInfo | null>(null);
  const [filterText, setFilterText] = useState('');
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [currentPlantIndex, setCurrentPlantIndex] = useState(0);
  const [plantsDatabase, setPlantsDatabase] = useState<PlantInfo[]>([]);
  const [plantsLoading, setPlantsLoading] = useState(true);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Watering calendar states
  const [showWateringCalendar, setShowWateringCalendar] = useState<string | null>(null);
  const [wateringSchedules, setWateringSchedules] = useState<{[key: string]: WateringSchedule}>({});
  const [calendarMode, setCalendarMode] = useState<'auto' | 'custom'>('auto');

  // Plant database with detailed information
  // Fetch plants from API
  const loadPlantsFromAPI = async () => {
    try {
      setPlantsLoading(true);
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/plants`);
      if (response.ok) {
        const apiPlants = await response.json();
        // Transform API data to PlantInfo format
        const transformedPlants: PlantInfo[] = apiPlants.map((plant: any) => ({
          id: plant.id,
          name: plant.variety || plant.name_fr,
          category: plant.category,
          subcategory: plant.subcategory,
          photo_url: plant.image_url || '',
          description: plant.description || '',
          common_name: plant.name_fr,
          scientific_name: plant.name_latin,
          sunlight: plant.sunlight || '',
          watering: plant.watering || '',
          soil_type: plant.soil_type || '',
          monthly_watering: plant.monthly_watering || '',
          difficulty: plant.difficulty || 'Moyen',
          growing_season: plant.growing_season || []
        }));
        setPlantsDatabase(transformedPlants);
      }
    } catch (error) {
      console.error('Error loading plants:', error);
    } finally {
      setPlantsLoading(false);
    }
  };

  // ============= WATERING CALENDAR FUNCTIONS =============

  // Générer les 7 jours de la semaine (lundi à dimanche)
  const generateWeekDays = (): WeekDay[] => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const today = new Date();
    
    // Trouver le lundi de cette semaine
    const monday = new Date(today);
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // dimanche = 0, lundi = 1
    monday.setDate(today.getDate() + diffToMonday);
    
    return days.map((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        day,
        date: date.getDate(),
        dayIndex: index + 1, // 1 = lundi, 7 = dimanche
        needsWatering: false // sera calculé plus tard
      };
    });
  };

  // Calculer les jours d'arrosage automatique basé sur la fréquence
  const calculateAutoWateringDays = (frequency: number): number[] => {
    if (frequency <= 1) return [1]; // lundi seulement
    if (frequency === 2) return [2, 5]; // mardi et vendredi
    if (frequency === 3) return [1, 3, 6]; // lundi, mercredi, samedi
    if (frequency >= 4) return [1, 3, 5, 7]; // lundi, mercredi, vendredi, dimanche
    return [1, 4]; // défaut
  };

  // Récupérer ou créer le calendrier d'arrosage
  const getWateringSchedule = async (userPlantId: string): Promise<WateringSchedule | null> => {
    if (!user) return null;
    
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/watering-schedule/${userPlantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const schedule = await response.json();
        return schedule;
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération du calendrier:', error);
      return null;
    }
  };

  // Créer un calendrier d'arrosage
  const createWateringSchedule = async (userPlantId: string, scheduleType: string, customDays?: number[]): Promise<void> => {
    if (!user) return;
    
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/watering-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_plant_id: userPlantId,
          schedule_type: scheduleType,
          custom_days: customDays,
        }),
      });
      
      if (response.ok) {
        const schedule = await response.json();
        setWateringSchedules(prev => ({
          ...prev,
          [userPlantId]: schedule
        }));
      }
    } catch (error) {
      console.error('Erreur lors de la création du calendrier:', error);
    }
  };

  // Mettre à jour un calendrier d'arrosage
  const updateWateringSchedule = async (userPlantId: string, scheduleType: string, customDays?: number[]): Promise<void> => {
    if (!user) return;
    
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/watering-schedule/${userPlantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          schedule_type: scheduleType,
          custom_days: customDays,
        }),
      });
      
      if (response.ok) {
        const schedule = await response.json();
        setWateringSchedules(prev => ({
          ...prev,
          [userPlantId]: schedule
        }));
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du calendrier:', error);
    }
  };

  // LEGACY: Old hardcoded database (keep as fallback)
  const legacyPlantsDatabase: PlantInfo[] = [
    // LÉGUMES
    {
      id: 'leg-1',
      name: 'Carotte',
      category: 'potager',
      subcategory: 'legumes',
      photo_url: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=300&q=80',
      description: 'Légume racine orange riche en vitamines',
      common_name: 'Carotte',
      scientific_name: 'Daucus carota',
      sunlight: 'Plein soleil à mi-ombre (6-8h de soleil)',
      watering: 'Arrosage régulier, maintenir le sol humide',
      soil_type: 'Sol profond, bien drainé, sablonneux',
      monthly_watering: 'Décembre: 1-2 fois par semaine selon température',
      difficulty: 'Facile',
      growing_season: ['printemps', 'été', 'automne']
    },
    {
      id: 'leg-2',
      name: 'Tomate',
      category: 'potager',
      subcategory: 'legumes',
      photo_url: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=300&q=80',
      description: 'Fruit-légume rouge juteux, indispensable au potager',
      common_name: 'Tomate',
      scientific_name: 'Solanum lycopersicum',
      sunlight: 'Plein soleil (8h minimum par jour)',
      watering: 'Arrosage au pied, éviter les feuilles',
      soil_type: 'Sol riche, bien drainé, légèrement acide',
      monthly_watering: 'Décembre: Repos végétatif, arrosage minimal',
      difficulty: 'Moyen',
      growing_season: ['printemps', 'été']
    },
    {
      id: 'leg-3',
      name: 'Courgette',
      category: 'potager',
      subcategory: 'legumes',
      photo_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&q=80',
      description: 'Légume vert très productif, facile à cultiver',
      common_name: 'Courgette',
      scientific_name: 'Cucurbita pepo',
      sunlight: 'Plein soleil, exposition chaude',
      watering: 'Arrosage abondant au pied, paillis recommandé',
      soil_type: 'Sol riche en humus, bien amendé',
      monthly_watering: 'Décembre: Hors saison, récolte terminée',
      difficulty: 'Facile',
      growing_season: ['printemps', 'été']
    },
    {
      id: 'leg-4',
      name: 'Radis',
      category: 'potager',
      subcategory: 'legumes',
      photo_url: 'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=300&q=80',
      description: 'Petit légume racine croquant à croissance rapide',
      common_name: 'Radis',
      scientific_name: 'Raphanus sativus',
      sunlight: 'Soleil à mi-ombre, tolère l\'ombre partielle',
      watering: 'Arrosage léger mais régulier',
      soil_type: 'Sol meuble, frais, pas trop riche',
      monthly_watering: 'Décembre: 1 fois par semaine si plantation d\'hiver',
      difficulty: 'Très facile',
      growing_season: ['printemps', 'automne', 'hiver']
    },
    {
      id: 'leg-5',
      name: 'Laitue',
      category: 'potager',
      subcategory: 'legumes',
      photo_url: 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?w=300&q=80',
      description: 'Salade verte fraîche, base de nombreux plats',
      common_name: 'Laitue',
      scientific_name: 'Lactuca sativa',
      sunlight: 'Mi-ombre en été, soleil en hiver',
      watering: 'Arrosage délicat, éviter de mouiller les feuilles',
      soil_type: 'Sol frais, riche en matière organique',
      monthly_watering: 'Décembre: 2-3 fois par semaine, variétés d\'hiver',
      difficulty: 'Facile',
      growing_season: ['printemps', 'automne', 'hiver']
    },

    // FRUITS
    {
      id: 'fruit-1',
      name: 'Fraise',
      category: 'potager',
      subcategory: 'fruits',
      photo_url: 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=300&q=80',
      description: 'Petit fruit rouge sucré, parfumé et vitaminé',
      common_name: 'Fraise',
      scientific_name: 'Fragaria × ananassa',
      sunlight: 'Soleil à mi-ombre (6h de soleil minimum)',
      watering: 'Arrosage au pied, paillis conseillé',
      soil_type: 'Sol légèrement acide, bien drainé',
      monthly_watering: 'Décembre: Arrosage réduit, protection hivernale',
      difficulty: 'Facile',
      growing_season: ['printemps', 'été']
    },
    {
      id: 'fruit-2',
      name: 'Framboise',
      category: 'potager',
      subcategory: 'fruits',
      photo_url: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=300&q=80',
      description: 'Fruit rouge délicat aux arômes intenses',
      common_name: 'Framboise',
      scientific_name: 'Rubus idaeus',
      sunlight: 'Soleil à mi-ombre, éviter soleil brûlant',
      watering: 'Arrosage régulier, maintenir fraîcheur',
      soil_type: 'Sol frais, humifère, légèrement acide',
      monthly_watering: 'Décembre: Arrosage minimal, taille d\'hiver',
      difficulty: 'Moyen',
      growing_season: ['été', 'automne']
    },
    {
      id: 'fruit-3',
      name: 'Groseille',
      category: 'potager',
      subcategory: 'fruits',
      photo_url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=300&q=80',
      description: 'Petits fruits rouges acidulés en grappes',
      common_name: 'Groseille rouge',
      scientific_name: 'Ribes rubrum',
      sunlight: 'Mi-ombre, éviter le plein soleil',
      watering: 'Sol toujours frais, arrosage régulier',
      soil_type: 'Sol riche, frais, bien drainé',
      monthly_watering: 'Décembre: Arrosage espacé, période de repos',
      difficulty: 'Facile',
      growing_season: ['été']
    },
    {
      id: 'fruit-4',
      name: 'Cassis',
      category: 'potager',
      subcategory: 'fruits',
      photo_url: 'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=300&q=80',
      description: 'Baies noires parfumées riches en vitamine C',
      common_name: 'Cassis',
      scientific_name: 'Ribes nigrum',
      sunlight: 'Mi-ombre à ombre légère',
      watering: 'Sol constamment frais, paillis indispensable',
      soil_type: 'Sol profond, riche, bien amendé',
      monthly_watering: 'Décembre: Réduire arrosage, protection du gel',
      difficulty: 'Facile',
      growing_season: ['été']
    }
  ];

  useEffect(() => {
    checkAuthStatus();
    loadPlantsFromAPI();
  }, []);

  // Reset plant index when section changes
  useEffect(() => {
    setCurrentPlantIndex(0);
  }, [currentSection, filterText]);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data: AuthResponse = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('access_token', data.access_token);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        
        setUser(data.user);
        setIsLoggedIn(true);
        setEmail('');
        setPassword('');
        
        Alert.alert('Succès', 'Connexion réussie !');
      } else {
        Alert.alert('Erreur', data.detail || 'Erreur de connexion');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Erreur', 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data: AuthResponse = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('access_token', data.access_token);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        
        setUser(data.user);
        setIsLoggedIn(true);
        setEmail('');
        setPassword('');
        setName('');
        
        Alert.alert('Succès', 'Compte créé avec succès !');
      } else {
        Alert.alert('Erreur', data.detail || 'Erreur lors de la création du compte');
      }
    } catch (error) {
      console.error('Register error:', error);
      Alert.alert('Erreur', 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('user_data');
      setUser(null);
      setIsLoggedIn(false);
      setCurrentTab('garden');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: AuthResponse = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('access_token', data.access_token);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        
        setUser(data.user);
        setIsLoggedIn(true);
        
        Alert.alert('Connexion Admin', 'Connecté en tant qu\'administrateur avec accès premium !');
      } else {
        Alert.alert('Erreur', 'Erreur de connexion admin');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      Alert.alert('Erreur', 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleTitleTap = () => {
    setAdminTapCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        Alert.alert(
          'Connexion Administrateur', 
          'Voulez-vous vous connecter en tant qu\'administrateur ?',
          [
            { text: 'Annuler', style: 'cancel', onPress: () => setAdminTapCount(0) },
            { text: 'Admin Login', onPress: handleAdminLogin }
          ]
        );
        return 0;
      }
      setTimeout(() => setAdminTapCount(0), 3000);
      return newCount;
    });
  };

  const handlePremiumAction = () => {
    if (!user?.is_premium) {
      Alert.alert(
        'Abonnement Premium Requis', 
        'Cette fonctionnalité nécessite un abonnement Premium à 9,99€/mois pour accéder aux recommandations IA de soins des plantes.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'S\'abonner', onPress: () => Alert.alert('Bientôt disponible', 'L\'intégration Stripe sera bientôt disponible !') }
        ]
      );
      return false;
    }
    return true;
  };

  const filteredPlants = plantsDatabase.filter(plant => 
    plant.name.toLowerCase().includes(filterText.toLowerCase()) ||
    plant.description.toLowerCase().includes(filterText.toLowerCase())
  );

  // Render auth screen
  if (!isLoggedIn) {
    return (
      <ImageBackground 
        source={{ uri: BACKGROUND_IMAGES.auth }} 
        style={styles.container}
        resizeMode="cover"
      >
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <StatusBar style="light" />
          <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.authContainer}>
              <View style={styles.header}>
                <Ionicons name="leaf" size={60} color="#4CAF50" />
                <TouchableOpacity onPress={handleTitleTap} activeOpacity={0.8}>
                  <Text style={styles.title}>Le potager malin</Text>
                </TouchableOpacity>
                <Text style={styles.subtitle}>
                  Votre assistant IA pour le jardinage
                </Text>
              </View>

              <View style={styles.form}>
                {isRegistering && (
                  <TextInput
                    style={styles.input}
                    placeholder="Nom complet"
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                )}
                
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="Mot de passe"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />

                <TouchableOpacity 
                  style={[styles.button, styles.primaryButton]} 
                  onPress={isRegistering ? handleRegister : handleLogin}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Chargement...' : (isRegistering ? 'Créer un compte' : 'Se connecter')}
                  </Text>
                </TouchableOpacity>

                {email.toLowerCase().includes('admin') && (
                  <TouchableOpacity 
                    style={[styles.button, styles.adminButton]}
                    onPress={handleAdminLogin}
                    disabled={loading}
                  >
                    <Ionicons name="shield-checkmark" size={20} color="#000" style={{ marginRight: 10 }} />
                    <Text style={[styles.buttonText, { color: '#000' }]}>
                      Connexion Admin
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.linkButton}
                  onPress={() => setIsRegistering(!isRegistering)}
                >
                  <Text style={styles.linkText}>
                    {isRegistering ? 'Déjà un compte ? Se connecter' : 'Nouveau ? Créer un compte'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </ImageBackground>
    );
  }

  // Render plant detail screen
  if (selectedPlant) {
    return (
      <ImageBackground 
        source={{ uri: BACKGROUND_IMAGES.details }} 
        style={styles.container}
        resizeMode="cover"
      >
        <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
          <StatusBar style="dark" />
          
          <ScrollView style={styles.screen}>
          <View style={styles.detailHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setSelectedPlant(null)}
            >
              <Ionicons name="arrow-back" size={24} color="#4CAF50" />
              <Text style={styles.backText}>Retour</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.plantDetailCard}>
            <Image 
              source={{ uri: selectedPlant.photo_url }}
              style={styles.plantDetailImage}
              resizeMode="cover"
            />
            
            <View style={styles.plantDetailContent}>
              <Text style={styles.plantDetailTitle}>{selectedPlant.name}</Text>
              <Text style={styles.plantScientificName}>{selectedPlant.scientific_name}</Text>
              
              <View style={styles.plantInfoSection}>
                <Text style={styles.sectionTitle}>☀️ Ensoleillement</Text>
                <Text style={styles.sectionContent}>{selectedPlant.sunlight}</Text>
              </View>

              <View style={styles.plantInfoSection}>
                <Text style={styles.sectionTitle}>💧 Arrosage</Text>
                <Text style={styles.sectionContent}>{selectedPlant.watering}</Text>
              </View>

              <View style={styles.plantInfoSection}>
                <Text style={styles.sectionTitle}>🌱 Type de terre</Text>
                <Text style={styles.sectionContent}>{selectedPlant.soil_type}</Text>
              </View>

              <View style={styles.plantInfoSection}>
                <Text style={styles.sectionTitle}>📅 Arrosage ce mois-ci</Text>
                <Text style={styles.sectionContent}>{selectedPlant.monthly_watering}</Text>
              </View>

              <View style={styles.plantInfoSection}>
                <Text style={styles.sectionTitle}>📊 Difficulté</Text>
                <Text style={[styles.sectionContent, styles.difficultyText]}>{selectedPlant.difficulty}</Text>
              </View>

              <TouchableOpacity 
                style={styles.addToGardenButton}
                onPress={() => Alert.alert('Ajouté !', `${selectedPlant.name} ajouté à votre jardin`)}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addToGardenText}>Ajouter à mon jardin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // ============= WATERING CALENDAR COMPONENT =============
  
  const renderWateringCalendar = (plantId: string, plantName: string) => {
    const weekDays = generateWeekDays();
    const schedule = wateringSchedules[plantId];
    
    // Calculer quels jours nécessitent un arrosage
    let wateringDays: number[] = [];
    if (schedule) {
      if (schedule.schedule_type === 'custom' && schedule.custom_days) {
        wateringDays = schedule.custom_days;
      } else if (schedule.schedule_type === 'auto' && schedule.auto_frequency) {
        wateringDays = calculateAutoWateringDays(schedule.auto_frequency);
      }
    }
    
    return (
      <View style={styles.wateringCalendar}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarTitle}>Calendrier d'arrosage - {plantName}</Text>
          <View style={styles.calendarModeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                calendarMode === 'auto' && styles.modeButtonActive
              ]}
              onPress={async () => {
                setCalendarMode('auto');
                if (schedule) {
                  await updateWateringSchedule(plantId, 'auto');
                } else {
                  await createWateringSchedule(plantId, 'auto');
                }
              }}
            >
              <Text style={[
                styles.modeButtonText,
                calendarMode === 'auto' && styles.modeButtonTextActive
              ]}>Auto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modeButton,
                calendarMode === 'custom' && styles.modeButtonActive
              ]}
              onPress={() => {
                setCalendarMode('custom');
              }}
            >
              <Text style={[
                styles.modeButtonText,
                calendarMode === 'custom' && styles.modeButtonTextActive
              ]}>Personnalisé</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.weekContainer}>
          {weekDays.map((dayInfo, index) => {
            const needsWatering = wateringDays.includes(dayInfo.dayIndex);
            const isCustomMode = calendarMode === 'custom';
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayContainer,
                  needsWatering && styles.dayContainerWatering
                ]}
                onPress={async () => {
                  if (isCustomMode) {
                    // Toggle ce jour dans le mode personnalisé
                    let newCustomDays = [...(schedule?.custom_days || [])];
                    if (needsWatering) {
                      newCustomDays = newCustomDays.filter(day => day !== dayInfo.dayIndex);
                    } else {
                      newCustomDays.push(dayInfo.dayIndex);
                      newCustomDays.sort();
                    }
                    
                    if (schedule) {
                      await updateWateringSchedule(plantId, 'custom', newCustomDays);
                    } else {
                      await createWateringSchedule(plantId, 'custom', newCustomDays);
                    }
                  }
                }}
                disabled={!isCustomMode}
              >
                <Text style={[
                  styles.dayText,
                  needsWatering && styles.dayTextWatering
                ]}>
                  {dayInfo.day}
                </Text>
                <Text style={[
                  styles.dateText,
                  needsWatering && styles.dateTextWatering
                ]}>
                  {dayInfo.date}
                </Text>
                {needsWatering && (
                  <View style={styles.waterDropContainer}>
                    <Ionicons name="water" size={16} color="#007AFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {calendarMode === 'custom' && (
          <Text style={styles.calendarHint}>
            Cliquez sur les jours pour programmer l'arrosage
          </Text>
        )}

        {calendarMode === 'auto' && schedule?.auto_frequency && (
          <Text style={styles.calendarInfo}>
            Arrosage automatique : {schedule.auto_frequency} fois par semaine
          </Text>
        )}
      </View>
    );
  };

  // Main app screens
  const renderGardenScreen = () => (
    <ImageBackground 
      source={{ uri: BACKGROUND_IMAGES.garden }} 
      style={styles.container}
      resizeMode="cover"
    >
      <ScrollView style={styles.screen}>
        <Text style={styles.screenTitle}>Mon Jardin</Text>
        
        <View style={styles.gardenSections}>
          <TouchableOpacity 
            style={styles.gardenCard}
            onPress={() => setCurrentTab('encyclopedia')}
          >
            <Ionicons name="library" size={40} color="#4CAF50" />
            <Text style={styles.gardenCardTitle}>Encyclopédie des Plantes</Text>
            <Text style={styles.gardenCardDesc}>
              Guide complet avec photos et conseils
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.gardenCard}
            onPress={() => setCurrentTab('my-plants')}
          >
            <Ionicons name="leaf" size={40} color="#2196F3" />
            <Text style={styles.gardenCardTitle}>Mes Plants</Text>
            <Text style={styles.gardenCardDesc}>
              Mes plantes ajoutées et suivies
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickStats}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Plantes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>À arroser</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>En bonne santé</Text>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );

  const renderEncyclopediaScreen = () => {
    const currentCategoryPlants = filteredPlants.filter(plant => 
      !currentSection || plant.subcategory === currentSection
    );
    
    const currentPlant = currentCategoryPlants[currentPlantIndex] || currentCategoryPlants[0];

    const nextPlant = () => {
      if (currentPlantIndex < currentCategoryPlants.length - 1) {
        setCurrentPlantIndex(currentPlantIndex + 1);
      }
    };

    const prevPlant = () => {
      if (currentPlantIndex > 0) {
        setCurrentPlantIndex(currentPlantIndex - 1);
      }
    };

    const addCurrentPlantToGarden = async () => {
      if (!currentPlant) return;
      
      try {
        const token = await AsyncStorage.getItem('access_token');
        const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/my-garden`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            plant_id: currentPlant.id,
            custom_name: currentPlant.name,
            location: 'extérieur',
            notes: `Ajouté depuis l'encyclopédie - ${currentPlant.subcategory}`
          }),
        });

        if (response.ok) {
          Alert.alert('Succès !', `${currentPlant.name} ajouté à votre potager !`);
        } else {
          Alert.alert('Erreur', 'Impossible d\'ajouter la plante');
        }
      } catch (error) {
        console.error('Error adding plant:', error);
        Alert.alert('Erreur', 'Erreur de connexion');
      }
    };

    return (
      <ImageBackground 
        source={{ uri: BACKGROUND_IMAGES.encyclopedia }} 
        style={styles.container}
        resizeMode="cover"
      >
        <ScrollView style={styles.screen}>
          <View style={styles.encyclopediaHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setCurrentTab('garden')}
            >
              <Ionicons name="arrow-back" size={24} color="#4CAF50" />
              <Text style={styles.backText}>Retour</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Encyclopédie des Plantes</Text>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une plante..."
              placeholderTextColor="#666"
              value={filterText}
              onChangeText={setFilterText}
            />
          </View>

          <View style={styles.categoryTabs}>
            <TouchableOpacity 
              style={[
                styles.categoryTab,
                currentSection === 'legumes' && styles.categoryTabActive
              ]}
              onPress={() => {
                setCurrentSection('legumes');
                setCurrentPlantIndex(0);
              }}
            >
              <Text style={[
                styles.categoryTabText,
                currentSection === 'legumes' && styles.categoryTabTextActive
              ]}>
                🥕 Légumes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.categoryTab,
                currentSection === 'fruits' && styles.categoryTabActive
              ]}
              onPress={() => {
                setCurrentSection('fruits');
                setCurrentPlantIndex(0);
              }}
            >
              <Text style={[
                styles.categoryTabText,
                currentSection === 'fruits' && styles.categoryTabTextActive
              ]}>
                🍓 Fruits
              </Text>
            </TouchableOpacity>
          </View>

          {/* CARROUSEL DE PLANTES */}
          {currentPlant && (
            <View style={styles.carouselContainer}>
              <View style={styles.carouselCard}>
                <Image 
                  source={{ uri: currentPlant.photo_url }}
                  style={styles.carouselImage}
                  resizeMode="cover"
                />
                
                <View style={styles.carouselContent}>
                  <Text style={styles.carouselTitle}>{currentPlant.name}</Text>
                  <Text style={styles.carouselScientific}>{currentPlant.scientific_name}</Text>
                  <Text style={styles.carouselDescription}>{currentPlant.description}</Text>
                  
                  <View style={styles.carouselInfoRow}>
                    <View style={styles.carouselInfoItem}>
                      <Ionicons name="sunny" size={16} color="#FF9800" />
                      <Text style={styles.carouselInfoText}>
                        {currentPlant.sunlight.split(' ').slice(0, 3).join(' ')}
                      </Text>
                    </View>
                    <View style={styles.carouselInfoItem}>
                      <Ionicons name="water" size={16} color="#2196F3" />
                      <Text style={styles.carouselInfoText}>
                        {currentPlant.watering.split(' ').slice(0, 2).join(' ')}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.addToGardenButton}
                    onPress={addCurrentPlantToGarden}
                  >
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.addToGardenText}>Ajouter à mon potager</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Navigation du carrousel */}
              <View style={styles.carouselNavigation}>
                <TouchableOpacity 
                  style={[styles.carouselButton, currentPlantIndex === 0 && styles.carouselButtonDisabled]}
                  onPress={prevPlant}
                  disabled={currentPlantIndex === 0}
                >
                  <Ionicons 
                    name="chevron-back" 
                    size={24} 
                    color={currentPlantIndex === 0 ? '#ccc' : '#4CAF50'} 
                  />
                </TouchableOpacity>

                <View style={styles.carouselIndicator}>
                  <Text style={styles.carouselIndicatorText}>
                    {currentPlantIndex + 1} / {currentCategoryPlants.length}
                  </Text>
                  <Text style={styles.carouselCategoryText}>
                    {currentSection === 'legumes' ? 'Légumes' : 
                     currentSection === 'fruits' ? 'Fruits' : 
                     'Toutes catégories'}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={[styles.carouselButton, currentPlantIndex === currentCategoryPlants.length - 1 && styles.carouselButtonDisabled]}
                  onPress={nextPlant}
                  disabled={currentPlantIndex === currentCategoryPlants.length - 1}
                >
                  <Ionicons 
                    name="chevron-forward" 
                    size={24} 
                    color={currentPlantIndex === currentCategoryPlants.length - 1 ? '#ccc' : '#4CAF50'} 
                  />
                </TouchableOpacity>
              </View>

              {/* Bouton pour voir les détails complets */}
              <TouchableOpacity 
                style={styles.detailsButton}
                onPress={() => setSelectedPlant(currentPlant)}
              >
                <Ionicons name="information-circle" size={20} color="#4CAF50" />
                <Text style={styles.detailsButtonText}>Voir fiche complète</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentCategoryPlants.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={60} color="#666" />
              <Text style={styles.emptyStateText}>
                Aucune plante trouvée
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Essayez de modifier votre recherche
              </Text>
            </View>
          )}
        </ScrollView>
      </ImageBackground>
    );
  };

  const renderScannerScreen = () => (
    <ImageBackground 
      source={{ uri: BACKGROUND_IMAGES.scanner }} 
      style={styles.container}
      resizeMode="cover"
    >
      <ScrollView style={styles.screen}>
        <Text style={styles.screenTitle}>Scanner IA</Text>
      
      <View style={styles.scannerContainer}>
        <View style={styles.scannerPlaceholder}>
          <Ionicons name="camera" size={60} color="#4CAF50" />
          <Text style={styles.scannerText}>
            Prenez une photo de votre plante
          </Text>
          <Text style={styles.scannerSubtext}>
            Identification automatique par IA
          </Text>
        </View>

        <TouchableOpacity style={[styles.button, styles.primaryButton]}>
          <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.buttonText}>Prendre une photo</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setCurrentTab('encyclopedia')}
        >
          <Ionicons name="images" size={20} color="#4CAF50" style={{ marginRight: 10 }} />
          <Text style={[styles.buttonText, { color: '#4CAF50' }]}>
            Choisir de la galerie
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </ImageBackground>
  );

  const renderRecommendationsScreen = () => (
    <ImageBackground 
      source={{ uri: BACKGROUND_IMAGES.recommendations }} 
      style={styles.container}
      resizeMode="cover"
    >
      <ScrollView style={styles.screen}>
        <Text style={styles.screenTitle}>Recommandations</Text>
      
      {user?.is_premium ? (
        <View style={styles.recommendationsContainer}>
          <Text style={styles.recommendationsSectionTitle}>Soins Personnalisés</Text>
          <View style={styles.recommendationCard}>
            <Ionicons name="water" size={24} color="#2196F3" />
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>Arrosage recommandé</Text>
              <Text style={styles.recommendationDesc}>
                3 plantes ont besoin d'eau aujourd'hui
              </Text>
            </View>
          </View>
          
          <View style={styles.recommendationCard}>
            <Ionicons name="sunny" size={24} color="#FF9800" />
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationTitle}>Exposition solaire</Text>
              <Text style={styles.recommendationDesc}>
                Déplacez vos géraniums vers plus de lumière
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.premiumPrompt}>
          <Ionicons name="star" size={60} color="#FFD700" />
          <Text style={styles.premiumTitle}>
            Accès Premium Requis
          </Text>
          <Text style={styles.premiumDesc}>
            Obtenez des recommandations personnalisées par IA pour optimiser la santé de vos plantes
          </Text>
          
          <View style={styles.premiumFeatures}>
            <Text style={styles.featureItem}>✓ Diagnostic IA des maladies</Text>
            <Text style={styles.featureItem}>✓ Calendrier de soins intelligent</Text>
            <Text style={styles.featureItem}>✓ Recommandations personnalisées</Text>
            <Text style={styles.featureItem}>✓ Support prioritaire</Text>
          </View>

          <TouchableOpacity 
            style={[styles.button, styles.premiumButton]}
            onPress={handlePremiumAction}
          >
            <Text style={styles.buttonText}>
              S'abonner - 9,99€/mois
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
    </ImageBackground>
  );

  const renderCommunityScreen = () => (
    <ImageBackground 
      source={{ uri: BACKGROUND_IMAGES.community }} 
      style={styles.container}
      resizeMode="cover"
    >
      <ScrollView style={styles.screen}>
      <Text style={styles.screenTitle}>Communauté</Text>
      
      <TouchableOpacity style={[styles.button, styles.primaryButton, { marginBottom: 20 }]}>
        <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 10 }} />
        <Text style={styles.buttonText}>Partager une photo</Text>
      </TouchableOpacity>

      <View style={styles.communityPost}>
        <View style={styles.postHeader}>
          <Ionicons name="person-circle" size={40} color="#4CAF50" />
          <View style={styles.postAuthor}>
            <Text style={styles.authorName}>Marie G.</Text>
            <Text style={styles.postTime}>Il y a 2h</Text>
          </View>
        </View>
        <Text style={styles.postContent}>
          Mes tomates cerises commencent à rougir ! Première récolte de la saison 🍅
        </Text>
        <View style={styles.postActions}>
          <TouchableOpacity style={styles.postAction}>
            <Ionicons name="heart-outline" size={20} color="#666" />
            <Text style={styles.actionText}>12</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.postAction}>
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.actionText}>3</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
    </ImageBackground>
  );

  const renderProfileScreen = () => (
    <ImageBackground 
      source={{ uri: BACKGROUND_IMAGES.profile }} 
      style={styles.container}
      resizeMode="cover"
    >
      <ScrollView style={styles.screen}>
        <Text style={styles.screenTitle}>Profil</Text>
      
      <View style={styles.profileHeader}>
        <Ionicons name="person-circle" size={80} color="#4CAF50" />
        <Text style={styles.profileName}>{user?.name}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        {user?.is_premium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.premiumBadgeText}>Premium</Text>
          </View>
        )}
      </View>

      <View style={styles.profileOptions}>
        <TouchableOpacity style={styles.profileOption}>
          <Ionicons name="settings" size={24} color="#666" />
          <Text style={styles.profileOptionText}>Paramètres</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.profileOption}>
          <Ionicons name="help-circle" size={24} color="#666" />
          <Text style={styles.profileOptionText}>Aide</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.profileOption}
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={24} color="#FF6B35" />
          <Text style={[styles.profileOptionText, { color: '#FF6B35' }]}>
            Se déconnecter
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </ImageBackground>
  );

  const renderMyPlantsScreen = () => (
    <ImageBackground 
      source={{ uri: BACKGROUND_IMAGES.garden }} 
      style={styles.container}
      resizeMode="cover"
    >
      <ScrollView style={styles.screen}>
        <View style={styles.screenHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setCurrentTab('garden')}
          >
            <Ionicons name="arrow-back" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Mes Plants</Text>
        </View>

        {/* Exemple de plantes utilisateur - à remplacer par les vraies données */}
        <View style={styles.myPlantsContainer}>
          <TouchableOpacity 
            style={styles.myPlantCard}
            onPress={async () => {
              const plantId = 'user-plant-1';
              if (showWateringCalendar === plantId) {
                setShowWateringCalendar(null);
              } else {
                setShowWateringCalendar(plantId);
                // Charger le calendrier si pas déjà fait
                if (!wateringSchedules[plantId]) {
                  const schedule = await getWateringSchedule(plantId);
                  if (schedule) {
                    setWateringSchedules(prev => ({
                      ...prev,
                      [plantId]: schedule
                    }));
                  }
                }
              }
            }}
          >
            <Image 
              source={{ uri: 'https://terrabacchus.fr/wp-content/uploads/sites/25/2016/09/basilic-botte-600-web.jpg' }} 
              style={styles.myPlantImage} 
            />
            <View style={styles.myPlantInfo}>
              <Text style={styles.myPlantName}>Basilic de mon jardin</Text>
              <Text style={styles.myPlantDetails}>Ajouté le 15 octobre</Text>
              <Text style={styles.myPlantStatus}>État: Bonne santé</Text>
            </View>
          </TouchableOpacity>

          {showWateringCalendar === 'user-plant-1' && 
            renderWateringCalendar('user-plant-1', 'Basilic de mon jardin')
          }

          <TouchableOpacity 
            style={styles.myPlantCard}
            onPress={async () => {
              const plantId = 'user-plant-2';
              if (showWateringCalendar === plantId) {
                setShowWateringCalendar(null);
              } else {
                setShowWateringCalendar(plantId);
                // Charger le calendrier si pas déjà fait
                if (!wateringSchedules[plantId]) {
                  const schedule = await getWateringSchedule(plantId);
                  if (schedule) {
                    setWateringSchedules(prev => ({
                      ...prev,
                      [plantId]: schedule
                    }));
                  }
                }
              }
            }}
          >
            <Image 
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Cherry_tomatoes_red_and_yellow.jpg/800px-Cherry_tomatoes_red_and_yellow.jpg' }} 
              style={styles.myPlantImage} 
            />
            <View style={styles.myPlantInfo}>
              <Text style={styles.myPlantName}>Tomate Cerise</Text>
              <Text style={styles.myPlantDetails}>Ajouté le 12 octobre</Text>
              <Text style={styles.myPlantStatus}>État: Excellente</Text>
            </View>
          </TouchableOpacity>

          {showWateringCalendar === 'user-plant-2' && 
            renderWateringCalendar('user-plant-2', 'Tomate Cerise')
          }

          <TouchableOpacity 
            style={styles.myPlantCard}
            onPress={async () => {
              const plantId = 'user-plant-3';
              if (showWateringCalendar === plantId) {
                setShowWateringCalendar(null);
              } else {
                setShowWateringCalendar(plantId);
                // Charger le calendrier si pas déjà fait
                if (!wateringSchedules[plantId]) {
                  // Créer un calendrier par défaut avec arrosage le lundi pour test
                  const mockSchedule = {
                    id: 'mock-schedule-3',
                    user_id: 'current-user',
                    user_plant_id: plantId,
                    schedule_type: 'custom',
                    custom_days: [1], // Lundi seulement
                    auto_frequency: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                  setWateringSchedules(prev => ({
                    ...prev,
                    [plantId]: mockSchedule
                  }));
                }
              }
            }}
          >
            <Image 
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Zucchini_in_bloom.jpg/800px-Zucchini_in_bloom.jpg' }} 
              style={styles.myPlantImage} 
            />
            <View style={styles.myPlantInfo}>
              <Text style={styles.myPlantName}>Courgette Verte</Text>
              <Text style={styles.myPlantDetails}>Ajouté le 10 octobre</Text>
              <Text style={styles.myPlantStatus}>État: Bonne</Text>
            </View>
          </TouchableOpacity>

          {showWateringCalendar === 'user-plant-3' && 
            renderWateringCalendar('user-plant-3', 'Courgette Verte')
          }
        </View>

        <TouchableOpacity 
          style={[styles.button, styles.primaryButton, { marginTop: 20 }]}
          onPress={() => setCurrentTab('encyclopedia')}
        >
          <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.buttonText}>Ajouter une nouvelle plante</Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );

  const renderCurrentScreen = () => {
    switch (currentTab) {
      case 'garden':
        return renderGardenScreen();
      case 'my-plants':
        return renderMyPlantsScreen();
      case 'encyclopedia':
        return renderEncyclopediaScreen();
      case 'scanner':
        return renderScannerScreen();
      case 'recommendations':
        return renderRecommendationsScreen();
      case 'community':
        return renderCommunityScreen();
      case 'profile':
        return renderProfileScreen();
      default:
        return renderGardenScreen();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.content}>
        {renderCurrentScreen()}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'garden' && styles.navItemActive]}
          onPress={() => setCurrentTab('garden')}
        >
          <Ionicons 
            name={currentTab === 'garden' ? 'home' : 'home-outline'} 
            size={24} 
            color={currentTab === 'garden' ? '#4CAF50' : '#666'} 
          />
          <Text style={[
            styles.navLabel, 
            currentTab === 'garden' && { color: '#4CAF50' }
          ]}>
            Mon Jardin
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'scanner' && styles.navItemActive]}
          onPress={() => setCurrentTab('scanner')}
        >
          <Ionicons 
            name={currentTab === 'scanner' ? 'camera' : 'camera-outline'} 
            size={24} 
            color={currentTab === 'scanner' ? '#4CAF50' : '#666'} 
          />
          <Text style={[
            styles.navLabel, 
            currentTab === 'scanner' && { color: '#4CAF50' }
          ]}>
            Scanner
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'recommendations' && styles.navItemActive]}
          onPress={() => setCurrentTab('recommendations')}
        >
          <Ionicons 
            name={currentTab === 'recommendations' ? 'star' : 'star-outline'} 
            size={24} 
            color={currentTab === 'recommendations' ? '#4CAF50' : '#666'} 
          />
          <Text style={[
            styles.navLabel, 
            currentTab === 'recommendations' && { color: '#4CAF50' }
          ]}>
            Soins
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'community' && styles.navItemActive]}
          onPress={() => setCurrentTab('community')}
        >
          <Ionicons 
            name={currentTab === 'community' ? 'people' : 'people-outline'} 
            size={24} 
            color={currentTab === 'community' ? '#4CAF50' : '#666'} 
          />
          <Text style={[
            styles.navLabel, 
            currentTab === 'community' && { color: '#4CAF50' }
          ]}>
            Communauté
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentTab === 'profile' && styles.navItemActive]}
          onPress={() => setCurrentTab('profile')}
        >
          <Ionicons 
            name={currentTab === 'profile' ? 'person' : 'person-outline'} 
            size={24} 
            color={currentTab === 'profile' ? '#4CAF50' : '#666'} 
          />
          <Text style={[
            styles.navLabel, 
            currentTab === 'profile' && { color: '#4CAF50' }
          ]}>
            Profil
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  
  // Background styles
  authBackground: {
    backgroundColor: '#E8F5E8',
  },
  gardenBackground: {
    backgroundColor: '#C8E6C9',
  },
  encyclopediaBackground: {
    backgroundColor: '#FFF3E0',
  },
  potagerBackground: {
    backgroundColor: '#E8F5E8',
  },
  
  // Auth styles
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  premiumButton: {
    backgroundColor: '#FFD700',
  },
  adminButton: {
    backgroundColor: '#FFD700',
    borderWidth: 2,
    borderColor: '#FFA000',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  linkButton: {
    padding: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#4CAF50',
    fontSize: 16,
  },

  // Screen styles
  screen: {
    flex: 1,
    padding: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 24,
    textAlign: 'center',
  },

  // Garden screen
  gardenSections: {
    gap: 16,
    marginBottom: 32,
  },
  gardenCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gardenCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 12,
  },
  gardenCardDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

  // Encyclopedia screen
  encyclopediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  backText: {
    color: '#4CAF50',
    fontSize: 16,
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  categoryTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  categoryTab: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryTabActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  categoryTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#fff',
  },

  // Plants list
  plantsList: {
    gap: 12,
  },
  plantListItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  plantListImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  plantListContent: {
    flex: 1,
  },
  plantListName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 2,
  },
  plantListScientific: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 4,
  },
  plantListDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  plantListTags: {
    flexDirection: 'row',
    gap: 8,
  },
  plantListDifficulty: {
    fontSize: 12,
    backgroundColor: '#E8F5E8',
    color: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '500',
  },
  plantListSeason: {
    fontSize: 12,
    backgroundColor: '#FFF3E0',
    color: '#F57C00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '500',
  },

  // Plant detail screen
  detailHeader: {
    marginBottom: 20,
  },
  plantDetailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  plantDetailImage: {
    width: '100%',
    height: 200,
  },
  plantDetailContent: {
    padding: 20,
  },
  plantDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  plantScientificName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 20,
  },
  plantInfoSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 6,
  },
  sectionContent: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  difficultyText: {
    fontWeight: '600',
    color: '#4CAF50',
  },
  addToGardenButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  addToGardenText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Scanner screen
  scannerContainer: {
    alignItems: 'center',
    gap: 24,
    paddingTop: 40,
  },
  scannerPlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: 'rgba(245, 245, 245, 0.95)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  scannerText: {
    fontSize: 18,
    color: '#2E7D32',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  scannerSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },

  // Recommendations screen
  recommendationsContainer: {
    gap: 16,
  },
  recommendationsSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 16,
  },
  recommendationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  recommendationDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  // Premium prompt
  premiumPrompt: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    margin: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginTop: 16,
  },
  premiumDesc: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  premiumFeatures: {
    alignSelf: 'stretch',
    marginTop: 32,
    marginBottom: 32,
    gap: 12,
  },
  featureItem: {
    fontSize: 16,
    color: '#4CAF50',
    textAlign: 'center',
  },

  // Community screen
  communityPost: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAuthor: {
    marginLeft: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  postTime: {
    fontSize: 12,
    color: '#666',
  },
  postContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },

  // Profile screen
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 16,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  profileOptions: {
    gap: 1,
    margin: 16,
  },
  profileOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  profileOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },

  // Carrousel styles
  carouselContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  carouselCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginHorizontal: 4,
  },
  carouselImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#f0f0f0',
  },
  carouselContent: {
    padding: 20,
  },
  carouselTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
    textAlign: 'center',
  },
  carouselScientific: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  carouselDescription: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  carouselInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  carouselInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  carouselInfoText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  carouselNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  carouselButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  carouselButtonDisabled: {
    borderColor: '#ccc',
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
  },
  carouselIndicator: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  carouselIndicatorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  carouselCategoryText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  detailsButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  detailsButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },

  // Bottom navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    // Active state styles handled by color changes
  },
  navLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

  // Watering Calendar Styles
  wateringCalendar: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 12,
    textAlign: 'center',
  },
  calendarModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dayContainerWatering: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  dayTextWatering: {
    color: '#1976D2',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  dateTextWatering: {
    color: '#1976D2',
  },
  waterDropContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 2,
  },
  calendarHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  calendarInfo: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
  },

  // My Plants Screen Styles
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 12,
    marginRight: 16,
  },
  myPlantsContainer: {
    gap: 16,
  },
  myPlantCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  myPlantImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginRight: 16,
  },
  myPlantInfo: {
    flex: 1,
  },
  myPlantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4,
  },
  myPlantDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  myPlantStatus: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
});