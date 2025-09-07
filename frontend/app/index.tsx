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
  ImageBackground,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

export default function PlantWellnessApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState('garden');
  const [adminTapCount, setAdminTapCount] = useState(0);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

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
      // Reset count after 3 seconds
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

  // Render auth screen
  if (!isLoggedIn) {
    return (
      <View style={[styles.container, styles.authBackground]}>
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
                  <Text style={styles.title}>Plant Wellness</Text>
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

                {/* Admin Login Button - appears when email contains "admin" */}
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
      </View>
    );
  }

  // Main app screens
  const renderGardenScreen = () => (
    <View style={[styles.screen, styles.gardenBackground]}>
      <ScrollView>
        <Text style={styles.screenTitle}>Mon Jardin</Text>
        
        <View style={styles.gardenSections}>
          <TouchableOpacity 
            style={styles.gardenCard}
            onPress={() => setCurrentTab('potager')}
          >
            <Ionicons name="nutrition" size={40} color="#FF6B35" />
            <Text style={styles.gardenCardTitle}>Mon Potager</Text>
            <Text style={styles.gardenCardDesc}>
              Légumes, herbes aromatiques
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.gardenCard}
            onPress={() => setCurrentTab('ornement')}
          >
            <Ionicons name="flower" size={40} color="#E91E63" />
            <Text style={styles.gardenCardTitle}>Mes Fleurs & Plantes</Text>
            <Text style={styles.gardenCardDesc}>
              Plantes d'ornement, fleurs
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
    </View>
  );

  const renderPlantCatalog = (category: string) => {
    const PlantCatalog = () => {
      const [plants, setPlants] = React.useState([]);
      const [scannedPlants, setScannedPlants] = React.useState([]);
      const [aiPhotosDB, setAiPhotosDB] = React.useState([]);
      const [loading, setLoading] = React.useState(true);
      const [showScanner, setShowScanner] = React.useState(false);
      const [showScannedMenu, setShowScannedMenu] = React.useState(false);
      const [showAiPhotosDB, setShowAiPhotosDB] = React.useState(false);
      const [selectedAiPlants, setSelectedAiPlants] = React.useState<string[]>([]);

      React.useEffect(() => {
        fetchPlants();
        fetchScannedPlants();
        generateAiPhotosDB();
      }, []);

      const generateAiPhotosDB = () => {
        // Complete AI photo database for each category with REAL IMAGES
        const aiPhotos = category === 'potager' ? [
          // LÉGUMES RACINES
          { id: 'ai-1', name: 'Carotte Orange', category: 'potager', confidence: 0.95, description: 'Carotte classique orange, sucrée', photo_url: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=300&q=80', ai_generated: true, tags: ['orange', 'sucré', 'racine'] },
          { id: 'ai-2', name: 'Carotte Violette', category: 'potager', confidence: 0.92, description: 'Carotte violette ancienne', photo_url: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=300&q=80', ai_generated: true, tags: ['violet', 'ancienne', 'racine'] },
          { id: 'ai-3', name: 'Radis Rouge', category: 'potager', confidence: 0.90, description: 'Radis rouge croquant', photo_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&q=80', ai_generated: true, tags: ['rouge', 'croquant', 'rapide'] },
          { id: 'ai-4', name: 'Radis Noir', category: 'potager', confidence: 0.88, description: 'Radis noir d\'hiver', photo_url: 'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=300&q=80', ai_generated: true, tags: ['noir', 'hiver', 'piquant'] },
          { id: 'ai-5', name: 'Navet Blanc', category: 'potager', confidence: 0.87, description: 'Navet blanc traditionnel', photo_url: 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?w=300&q=80', ai_generated: true, tags: ['blanc', 'traditionnel', 'doux'] },
          { id: 'ai-6', name: 'Betterave Rouge', category: 'potager', confidence: 0.93, description: 'Betterave rouge sucrée', photo_url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=300&q=80', ai_generated: true, tags: ['rouge', 'sucré', 'colorant'] },
          { id: 'ai-7', name: 'Panais', category: 'potager', confidence: 0.85, description: 'Panais blanc savoureux', photo_url: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=300&q=80', ai_generated: true, tags: ['blanc', 'savoureux', 'hiver'] },
          
          // TOMATES
          { id: 'ai-8', name: 'Tomate Rouge Ronde', category: 'potager', confidence: 0.96, description: 'Tomate rouge classique', photo_url: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=300&q=80', ai_generated: true, tags: ['rouge', 'classique', 'juteux'] },
          { id: 'ai-9', name: 'Tomate Cerise Rouge', category: 'potager', confidence: 0.94, description: 'Petites tomates cerises', photo_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&q=80', ai_generated: true, tags: ['petit', 'rouge', 'sucré'] },
          { id: 'ai-10', name: 'Tomate Cerise Jaune', category: 'potager', confidence: 0.93, description: 'Tomates cerises jaunes', photo_url: 'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=300&q=80', ai_generated: true, tags: ['jaune', 'petit', 'doux'] },
          { id: 'ai-11', name: 'Tomate Noire de Crimée', category: 'potager', confidence: 0.91, description: 'Tomate ancienne noire', photo_url: 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?w=300&q=80', ai_generated: true, tags: ['noir', 'ancienne', 'parfumé'] },
          { id: 'ai-12', name: 'Tomate Cœur de Bœuf', category: 'potager', confidence: 0.89, description: 'Grosse tomate charnue', photo_url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=300&q=80', ai_generated: true, tags: ['gros', 'charnu', 'rouge'] },
          { id: 'ai-13', name: 'Tomate Verte Zebra', category: 'potager', confidence: 0.87, description: 'Tomate verte rayée', photo_url: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=300&q=80', ai_generated: true, tags: ['vert', 'rayé', 'original'] },
          
          // COURGETTES & COURGES
          { id: 'ai-14', name: 'Courgette Verte', category: 'potager', confidence: 0.95, description: 'Courgette verte longue', photo_url: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=300&q=80', ai_generated: true, tags: ['vert', 'long', 'productif'] },
          { id: 'ai-15', name: 'Courgette Jaune', category: 'potager', confidence: 0.93, description: 'Courgette jaune goldbar', photo_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&q=80', ai_generated: true, tags: ['jaune', 'tendre', 'original'] },
          { id: 'ai-16', name: 'Courgette Ronde', category: 'potager', confidence: 0.90, description: 'Courgette ronde à farcir', photo_url: 'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=300&q=80', ai_generated: true, tags: ['rond', 'farcir', 'pratique'] },
          { id: 'ai-17', name: 'Potiron', category: 'potager', confidence: 0.92, description: 'Gros potiron orange', photo_url: 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?w=300&q=80', ai_generated: true, tags: ['orange', 'gros', 'automne'] },
          { id: 'ai-18', name: 'Butternut', category: 'potager', confidence: 0.88, description: 'Courge butternut beige', photo_url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=300&q=80', ai_generated: true, tags: ['beige', 'sucré', 'conservation'] },
          
          // LÉGUMES VERTS
          { id: 'ai-19', name: 'Épinard', category: 'potager', confidence: 0.91, description: 'Épinards verts tendres', photo_url: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=300&q=80', ai_generated: true, tags: ['vert', 'tendre', 'fer'] },
          { id: 'ai-20', name: 'Laitue Verte', category: 'potager', confidence: 0.94, description: 'Laitue pommée verte', photo_url: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=300&q=80', ai_generated: true, tags: ['vert', 'croquant', 'salade'] },
          { id: 'ai-21', name: 'Laitue Rouge', category: 'potager', confidence: 0.90, description: 'Laitue feuille de chêne rouge', photo_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&q=80', ai_generated: true, tags: ['rouge', 'décoratif', 'salade'] },
          { id: 'ai-22', name: 'Roquette', category: 'potager', confidence: 0.87, description: 'Roquette sauvage piquante', photo_url: 'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=300&q=80', ai_generated: true, tags: ['piquant', 'sauvage', 'vert'] },
          { id: 'ai-23', name: 'Mâche', category: 'potager', confidence: 0.85, description: 'Mâche doucette d\'hiver', photo_url: 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?w=300&q=80', ai_generated: true, tags: ['doux', 'hiver', 'petit'] },
          
          // HERBES AROMATIQUES
          { id: 'ai-24', name: 'Basilic Vert', category: 'potager', confidence: 0.96, description: 'Basilic vert grand', photo_url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=300&q=80', ai_generated: true, tags: ['vert', 'parfumé', 'cuisine'] },
          { id: 'ai-25', name: 'Basilic Pourpre', category: 'potager', confidence: 0.93, description: 'Basilic pourpre décoratif', photo_url: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=300&q=80', ai_generated: true, tags: ['pourpre', 'décoratif', 'parfumé'] },
          { id: 'ai-26', name: 'Persil Plat', category: 'potager', confidence: 0.94, description: 'Persil plat géant', photo_url: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=300&q=80', ai_generated: true, tags: ['plat', 'géant', 'cuisine'] },
          { id: 'ai-27', name: 'Persil Frisé', category: 'potager', confidence: 0.92, description: 'Persil frisé décoratif', photo_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&q=80', ai_generated: true, tags: ['frisé', 'décoratif', 'vitamine'] },
          { id: 'ai-28', name: 'Ciboulette', category: 'potager', confidence: 0.90, description: 'Ciboulette fine aux fleurs', photo_url: 'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=300&q=80', ai_generated: true, tags: ['fin', 'fleur', 'oignon'] },
          { id: 'ai-29', name: 'Thym', category: 'potager', confidence: 0.88, description: 'Thym commun aromatique', photo_url: 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?w=300&q=80', ai_generated: true, tags: ['aromatique', 'méditerranéen', 'sec'] },
          { id: 'ai-30', name: 'Romarin', category: 'potager', confidence: 0.91, description: 'Romarin officinal parfumé', photo_url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=300&q=80', ai_generated: true, tags: ['parfumé', 'persistant', 'méditerranéen'] },
          
          // LÉGUMINEUSES
          { id: 'ai-31', name: 'Haricots Verts', category: 'potager', confidence: 0.95, description: 'Haricots verts filets', photo_url: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=300&q=80', ai_generated: true, tags: ['vert', 'filet', 'tendre'] },
          { id: 'ai-32', name: 'Haricots Beurre', category: 'potager', confidence: 0.92, description: 'Haricots jaunes beurre', photo_url: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=300&q=80', ai_generated: true, tags: ['jaune', 'beurre', 'sans fil'] },
          { id: 'ai-33', name: 'Petits Pois', category: 'potager', confidence: 0.93, description: 'Petits pois mangetout', photo_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&q=80', ai_generated: true, tags: ['petit', 'sucré', 'printemps'] },
          { id: 'ai-34', name: 'Fèves', category: 'potager', confidence: 0.89, description: 'Fèves de marais', photo_url: 'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=300&q=80', ai_generated: true, tags: ['gros', 'protéine', 'printemps'] },
          
          // FRUITS
          { id: 'ai-35', name: 'Fraise', category: 'potager', confidence: 0.96, description: 'Fraises des jardins', photo_url: 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=300&q=80', ai_generated: true, tags: ['rouge', 'sucré', 'parfumé'] },
          { id: 'ai-36', name: 'Framboise', category: 'potager', confidence: 0.94, description: 'Framboises rouges', photo_url: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=300&q=80', ai_generated: true, tags: ['rouge', 'parfumé', 'délicat'] },
          { id: 'ai-37', name: 'Groseille Rouge', category: 'potager', confidence: 0.91, description: 'Groseilles rouges acidulées', photo_url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=300&q=80', ai_generated: true, tags: ['rouge', 'acidulé', 'grappe'] },
          { id: 'ai-38', name: 'Cassis', category: 'potager', confidence: 0.88, description: 'Cassis noir parfumé', photo_url: 'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=300&q=80', ai_generated: true, tags: ['noir', 'parfumé', 'vitamine'] },
          
          // LÉGUMES ANCIENS
          { id: 'ai-39', name: 'Topinambour', category: 'potager', confidence: 0.85, description: 'Topinambour ancien', photo_url: 'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?w=300&q=80', ai_generated: true, tags: ['ancien', 'tubercule', 'original'] },
          { id: 'ai-40', name: 'Crosne', category: 'potager', confidence: 0.82, description: 'Crosne du Japon', photo_url: 'https://images.pexels.com/photos/1128678/pexels-photo-1128678.jpeg?w=300&q=80', ai_generated: true, tags: ['japonais', 'rare', 'croquant'] }
        ] : [
          // ROSES
          { id: 'ai-41', name: 'Rose Rouge Classique', category: 'ornement', confidence: 0.97, description: 'Rose rouge parfumée classique', photo_url: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=300&q=80', ai_generated: true, tags: ['rouge', 'parfumé', 'classique'] },
          { id: 'ai-42', name: 'Rose Blanche', category: 'ornement', confidence: 0.95, description: 'Rose blanche pure', photo_url: 'https://images.unsplash.com/photo-1541275055241-329bbdf9a191?w=300&q=80', ai_generated: true, tags: ['blanc', 'pur', 'élégant'] },
          { id: 'ai-43', name: 'Rose Jaune', category: 'ornement', confidence: 0.93, description: 'Rose jaune soleil', photo_url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300&q=80', ai_generated: true, tags: ['jaune', 'soleil', 'lumineux'] },
          { id: 'ai-44', name: 'Rose Rose', category: 'ornement', confidence: 0.94, description: 'Rose rose tendre', photo_url: 'https://images.unsplash.com/photo-1486944859394-ed1c44255713?w=300&q=80', ai_generated: true, tags: ['rose', 'tendre', 'romantique'] },
          { id: 'ai-45', name: 'Rose Grimpante', category: 'ornement', confidence: 0.91, description: 'Rose grimpante vigoureuse', photo_url: 'https://images.pexels.com/photos/56866/garden-rose-red-pink-56866.jpeg?w=300&q=80', ai_generated: true, tags: ['grimpant', 'vigoureux', 'couvrant'] },
          
          // LAVANDES
          { id: 'ai-46', name: 'Lavande de Provence', category: 'ornement', confidence: 0.96, description: 'Lavande vraie de Provence', photo_url: 'https://images.pexels.com/photos/85773/pexels-photo-85773.jpeg?w=300&q=80', ai_generated: true, tags: ['violet', 'parfumé', 'méditerranéen'] },
          { id: 'ai-47', name: 'Lavande Papillon', category: 'ornement', confidence: 0.92, description: 'Lavande papillon décorative', photo_url: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=300&q=80', ai_generated: true, tags: ['décoratif', 'papillon', 'coloré'] },
          { id: 'ai-48', name: 'Lavande Blanche', category: 'ornement', confidence: 0.88, description: 'Lavande blanche rare', photo_url: 'https://images.unsplash.com/photo-1541275055241-329bbdf9a191?w=300&q=80', ai_generated: true, tags: ['blanc', 'rare', 'original'] },
          
          // GÉRANIUMS
          { id: 'ai-49', name: 'Géranium Rouge', category: 'ornement', confidence: 0.95, description: 'Géranium rouge vif', photo_url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300&q=80', ai_generated: true, tags: ['rouge', 'vif', 'balcon'] },
          { id: 'ai-50', name: 'Géranium Rose', category: 'ornement', confidence: 0.93, description: 'Géranium rose pastel', photo_url: 'https://images.unsplash.com/photo-1486944859394-ed1c44255713?w=300&q=80', ai_generated: true, tags: ['rose', 'pastel', 'doux'] },
          { id: 'ai-51', name: 'Géranium Blanc', category: 'ornement', confidence: 0.90, description: 'Géranium blanc pur', photo_url: 'https://images.pexels.com/photos/56866/garden-rose-red-pink-56866.jpeg?w=300&q=80', ai_generated: true, tags: ['blanc', 'pur', 'lumineux'] },
          { id: 'ai-52', name: 'Géranium Lierre', category: 'ornement', confidence: 0.88, description: 'Géranium lierre retombant', photo_url: 'https://images.pexels.com/photos/85773/pexels-photo-85773.jpeg?w=300&q=80', ai_generated: true, tags: ['retombant', 'lierre', 'suspendu'] },
          
          // HORTENSIAS
          { id: 'ai-53', name: 'Hortensia Bleu', category: 'ornement', confidence: 0.94, description: 'Hortensia bleu spectaculaire', photo_url: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=300&q=80', ai_generated: true, tags: ['bleu', 'spectaculaire', 'ombre'] },
          { id: 'ai-54', name: 'Hortensia Rose', category: 'ornement', confidence: 0.92, description: 'Hortensia rose tendre', photo_url: 'https://images.unsplash.com/photo-1541275055241-329bbdf9a191?w=300&q=80', ai_generated: true, tags: ['rose', 'tendre', 'massif'] },
          { id: 'ai-55', name: 'Hortensia Blanc', category: 'ornement', confidence: 0.90, description: 'Hortensia blanc pur', photo_url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300&q=80', ai_generated: true, tags: ['blanc', 'pur', 'élégant'] },
          { id: 'ai-56', name: 'Hortensia Paniculé', category: 'ornement', confidence: 0.87, description: 'Hortensia paniculé en cônes', photo_url: 'https://images.unsplash.com/photo-1486944859394-ed1c44255713?w=300&q=80', ai_generated: true, tags: ['cône', 'paniculé', 'original'] },
          
          // FLEURS ANNUELLES
          { id: 'ai-57', name: 'Pétunia', category: 'ornement', confidence: 0.93, description: 'Pétunia multicolore', photo_url: 'https://images.pexels.com/photos/56866/garden-rose-red-pink-56866.jpeg?w=300&q=80', ai_generated: true, tags: ['multicolore', 'florifère', 'été'] },
          { id: 'ai-58', name: 'Impatiens', category: 'ornement', confidence: 0.91, description: 'Impatiens d\'ombre colorés', photo_url: 'https://images.pexels.com/photos/85773/pexels-photo-85773.jpeg?w=300&q=80', ai_generated: true, tags: ['ombre', 'coloré', 'continu'] },
          { id: 'ai-59', name: 'Bégonia', category: 'ornement', confidence: 0.89, description: 'Bégonia tubéreux', photo_url: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=300&q=80', ai_generated: true, tags: ['tubéreux', 'charnu', 'ombre'] },
          { id: 'ai-60', name: 'Pensée', category: 'ornement', confidence: 0.95, description: 'Pensées tricolores', photo_url: 'https://images.unsplash.com/photo-1541275055241-329bbdf9a191?w=300&q=80', ai_generated: true, tags: ['tricolore', 'visage', 'automne'] },
          { id: 'ai-61', name: 'Capucine', category: 'ornement', confidence: 0.92, description: 'Capucine grimpante orange', photo_url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300&q=80', ai_generated: true, tags: ['orange', 'grimpant', 'comestible'] },
          
          // PLANTES VIVACES
          { id: 'ai-62', name: 'Hosta', category: 'ornement', confidence: 0.90, description: 'Hosta panaché d\'ombre', photo_url: 'https://images.unsplash.com/photo-1486944859394-ed1c44255713?w=300&q=80', ai_generated: true, tags: ['panaché', 'ombre', 'feuillage'] },
          { id: 'ai-63', name: 'Pivoine', category: 'ornement', confidence: 0.93, description: 'Pivoine herbacée parfumée', photo_url: 'https://images.pexels.com/photos/56866/garden-rose-red-pink-56866.jpeg?w=300&q=80', ai_generated: true, tags: ['parfumé', 'herbacé', 'printemps'] },
          { id: 'ai-64', name: 'Iris', category: 'ornement', confidence: 0.91, description: 'Iris des jardins', photo_url: 'https://images.pexels.com/photos/85773/pexels-photo-85773.jpeg?w=300&q=80', ai_generated: true, tags: ['élégant', 'rhizome', 'bleu'] },
          { id: 'ai-65', name: 'Delphinium', category: 'ornement', confidence: 0.88, description: 'Delphinium bleu élevé', photo_url: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=300&q=80', ai_generated: true, tags: ['bleu', 'élevé', 'épis'] },
          
          // ARBUSTES
          { id: 'ai-66', name: 'Forsythia', category: 'ornement', confidence: 0.94, description: 'Forsythia jaune printanier', photo_url: 'https://images.unsplash.com/photo-1541275055241-329bbdf9a191?w=300&q=80', ai_generated: true, tags: ['jaune', 'printemps', 'précoce'] },
          { id: 'ai-67', name: 'Lilas', category: 'ornement', confidence: 0.96, description: 'Lilas mauve parfumé', photo_url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300&q=80', ai_generated: true, tags: ['mauve', 'parfumé', 'printemps'] },
          { id: 'ai-68', name: 'Azalée', category: 'ornement', confidence: 0.92, description: 'Azalée japonaise colorée', photo_url: 'https://images.unsplash.com/photo-1486944859394-ed1c44255713?w=300&q=80', ai_generated: true, tags: ['coloré', 'japonais', 'acidophile'] },
          { id: 'ai-69', name: 'Rhododendron', category: 'ornement', confidence: 0.89, description: 'Rhododendron à grandes fleurs', photo_url: 'https://images.pexels.com/photos/56866/garden-rose-red-pink-56866.jpeg?w=300&q=80', ai_generated: true, tags: ['grandes fleurs', 'persistant', 'acidophile'] },
          { id: 'ai-70', name: 'Camélia', category: 'ornement', confidence: 0.87, description: 'Camélia d\'hiver élégant', photo_url: 'https://images.pexels.com/photos/85773/pexels-photo-85773.jpeg?w=300&q=80', ai_generated: true, tags: ['hiver', 'élégant', 'persistant'] },
          
          // PLANTES GRIMPANTES
          { id: 'ai-71', name: 'Clématite', category: 'ornement', confidence: 0.91, description: 'Clématite à grandes fleurs', photo_url: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=300&q=80', ai_generated: true, tags: ['grandes fleurs', 'grimpant', 'violet'] },
          { id: 'ai-72', name: 'Jasmin', category: 'ornement', confidence: 0.93, description: 'Jasmin étoilé parfumé', photo_url: 'https://images.unsplash.com/photo-1541275055241-329bbdf9a191?w=300&q=80', ai_generated: true, tags: ['parfumé', 'étoilé', 'blanc'] },
          { id: 'ai-73', name: 'Glycine', category: 'ornement', confidence: 0.90, description: 'Glycine en grappes mauves', photo_url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300&q=80', ai_generated: true, tags: ['grappe', 'mauve', 'vigoureux'] },
          { id: 'ai-74', name: 'Chèvrefeuille', category: 'ornement', confidence: 0.88, description: 'Chèvrefeuille odorant', photo_url: 'https://images.unsplash.com/photo-1486944859394-ed1c44255713?w=300&q=80', ai_generated: true, tags: ['odorant', 'grimpant', 'rustique'] },
          
          // PLANTES MÉDITERRANÉENNES
          { id: 'ai-75', name: 'Olivier', category: 'ornement', confidence: 0.95, description: 'Olivier centenaire argenté', photo_url: 'https://images.pexels.com/photos/56866/garden-rose-red-pink-56866.jpeg?w=300&q=80', ai_generated: true, tags: ['argenté', 'centenaire', 'méditerranéen'] },
          { id: 'ai-76', name: 'Palmier', category: 'ornement', confidence: 0.92, description: 'Palmier phoenix résistant', photo_url: 'https://images.pexels.com/photos/85773/pexels-photo-85773.jpeg?w=300&q=80', ai_generated: true, tags: ['exotique', 'résistant', 'persistant'] },
          { id: 'ai-77', name: 'Agapanthe', category: 'ornement', confidence: 0.89, description: 'Agapanthe bleue en ombelles', photo_url: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=300&q=80', ai_generated: true, tags: ['bleu', 'ombelle', 'vivace'] },
          { id: 'ai-78', name: 'Bougainvillier', category: 'ornement', confidence: 0.86, description: 'Bougainvillier rose vif', photo_url: 'https://images.unsplash.com/photo-1541275055241-329bbdf9a191?w=300&q=80', ai_generated: true, tags: ['rose vif', 'grimpant', 'méditerranéen'] },
          
          // FOUGÈRES & PLANTES D'OMBRE
          { id: 'ai-79', name: 'Fougère Mâle', category: 'ornement', confidence: 0.87, description: 'Fougère mâle d\'ombre', photo_url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300&q=80', ai_generated: true, tags: ['ombre', 'humide', 'découpé'] },
          { id: 'ai-80', name: 'Heuchère', category: 'ornement', confidence: 0.85, description: 'Heuchère au feuillage coloré', photo_url: 'https://images.unsplash.com/photo-1486944859394-ed1c44255713?w=300&q=80', ai_generated: true, tags: ['feuillage coloré', 'ombre', 'persistant'] }
        ];
        
        setAiPhotosDB(aiPhotos);
      };

      const fetchPlants = async () => {
        try {
          const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/plants?category=${category}`);
          const data = await response.json();
          setPlants(data);
        } catch (error) {
          console.error('Error fetching plants:', error);
        } finally {
          setLoading(false);
        }
      };

      const fetchScannedPlants = async () => {
        try {
          const token = await AsyncStorage.getItem('access_token');
          const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/ai/history`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            // Filter for identification results that match the category
            const categoryScanned = data.filter((analysis: any) => 
              analysis.analysis_type === 'identification' && 
              analysis.result.category === category
            );
            setScannedPlants(categoryScanned);
          }
        } catch (error) {
          console.error('Error fetching scanned plants:', error);
        }
      };

      const toggleAiPlantSelection = (plantId: string) => {
        setSelectedAiPlants(prev => 
          prev.includes(plantId) 
            ? prev.filter(id => id !== plantId)
            : [...prev, plantId]
        );
      };

      const addSelectedAiPlantsToGarden = async () => {
        if (selectedAiPlants.length === 0) {
          Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins une plante');
          return;
        }

        try {
          const token = await AsyncStorage.getItem('access_token');
          let successCount = 0;

          for (const plantId of selectedAiPlants) {
            const aiPlant = aiPhotosDB.find((p: any) => p.id === plantId);
            if (aiPlant) {
              const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/my-garden`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  plant_id: aiPlant.id,
                  custom_name: aiPlant.name,
                  location: 'extérieur',
                  notes: `Photo IA - Confiance: ${(aiPlant.confidence * 100).toFixed(0)}% - Tags: ${aiPlant.tags.join(', ')}`,
                  image_base64: aiPlant.photo_base64
                }),
              });

              if (response.ok) {
                successCount++;
              }
            }
          }

          Alert.alert(
            'Plantes Ajoutées !', 
            `${successCount} plante(s) de la base IA ajoutée(s) à votre jardin !`,
            [{ text: 'OK', onPress: () => {
              setSelectedAiPlants([]);
              setShowAiPhotosDB(false);
            }}]
          );

        } catch (error) {
          console.error('Error adding AI plants:', error);
          Alert.alert('Erreur', 'Erreur de connexion');
        }
      };

      const addPlantToGarden = async (plant: any) => {
        try {
          const token = await AsyncStorage.getItem('access_token');
          const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/my-garden`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              plant_id: plant.id,
              custom_name: plant.name_fr,
              location: 'extérieur',
              notes: `Ajouté depuis le catalogue ${category}`
            }),
          });

          if (response.ok) {
            Alert.alert('Succès', `${plant.name_fr} ajouté à votre jardin !`);
          } else {
            Alert.alert('Erreur', 'Impossible d\'ajouter la plante');
          }
        } catch (error) {
          console.error('Error adding plant:', error);
          Alert.alert('Erreur', 'Erreur de connexion');
        }
      };

      const addScannedPlantToGarden = async (scannedPlant: any) => {
        try {
          const token = await AsyncStorage.getItem('access_token');
          const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/my-garden`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              plant_id: scannedPlant.id,
              custom_name: scannedPlant.result.plant_name,
              location: 'extérieur',
              notes: `Plante scannée par IA - Confiance: ${(scannedPlant.confidence * 100).toFixed(0)}%`,
              image_base64: scannedPlant.image_base64
            }),
          });

          if (response.ok) {
            Alert.alert('Succès', `${scannedPlant.result.plant_name} ajouté à votre jardin !`);
            setShowScannedMenu(false);
          } else {
            Alert.alert('Erreur', 'Impossible d\'ajouter la plante scannée');
          }
        } catch (error) {
          console.error('Error adding scanned plant:', error);
          Alert.alert('Erreur', 'Erreur de connexion');
        }
      };

      const handleScanPlant = async (imageBase64: string) => {
        try {
          const token = await AsyncStorage.getItem('access_token');
          const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/ai/analyze`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              image_base64: imageBase64,
              analysis_type: 'identification'
            }),
          });

          if (response.ok) {
            const result = await response.json();
            Alert.alert(
              'Plante Identifiée !', 
              `${result.plant_name}\nConfiance: ${(result.confidence * 100).toFixed(0)}%\n\n${result.description}`,
              [
                { text: 'OK', onPress: () => {
                  setShowScanner(false);
                  fetchScannedPlants();
                }}
              ]
            );
          } else {
            Alert.alert('Erreur', 'Impossible d\'identifier la plante');
          }
        } catch (error) {
          console.error('Error scanning plant:', error);
          Alert.alert('Erreur', 'Erreur de connexion');
        }
      };

      if (loading) {
        return (
          <View style={styles.screen}>
            <Text style={styles.screenTitle}>
              {category === 'potager' ? 'Catalogue Potager' : 'Catalogue Ornement'}
            </Text>
            <Text style={styles.loadingText}>Chargement des plantes...</Text>
          </View>
        );
      }

      if (showScanner) {
        return (
          <View style={styles.screen}>
            <View style={styles.catalogHeader}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setShowScanner(false)}
              >
                <Ionicons name="arrow-back" size={24} color="#4CAF50" />
                <Text style={styles.backText}>Retour</Text>
              </TouchableOpacity>
              <Text style={styles.screenTitle}>Scanner une plante</Text>
            </View>

            <View style={styles.scannerContainer}>
              <View style={styles.scannerPlaceholder}>
                <Ionicons name="camera" size={80} color="#4CAF50" />
                <Text style={styles.scannerText}>
                  Prenez une photo de votre plante
                </Text>
                <Text style={styles.scannerSubtext}>
                  L'IA identifiera automatiquement l'espèce
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]}
                onPress={() => {
                  const mockImageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD...";
                  handleScanPlant(mockImageBase64);
                }}
              >
                <Ionicons name="camera" size={20} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.buttonText}>Prendre une photo</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  const mockImageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD...";
                  handleScanPlant(mockImageBase64);
                }}
              >
                <Ionicons name="images" size={20} color="#4CAF50" style={{ marginRight: 10 }} />
                <Text style={[styles.buttonText, { color: '#4CAF50' }]}>
                  Choisir de la galerie
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      if (showScannedMenu) {
        return (
          <ScrollView style={styles.screen}>
            <View style={styles.catalogHeader}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setShowScannedMenu(false)}
              >
                <Ionicons name="arrow-back" size={24} color="#4CAF50" />
                <Text style={styles.backText}>Retour</Text>
              </TouchableOpacity>
              <Text style={styles.screenTitle}>Plantes Scannées</Text>
            </View>

            {scannedPlants.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="scan" size={60} color="#666" />
                <Text style={styles.emptyStateText}>
                  Aucune plante scannée pour {category === 'potager' ? 'le potager' : 'l\'ornement'}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Utilisez le scanner IA pour identifier vos plantes
                </Text>
              </View>
            ) : (
              <View style={styles.plantGrid}>
                {scannedPlants.map((scannedPlant: any) => (
                  <View key={scannedPlant.id} style={styles.scannedPlantCard}>
                    <View style={styles.plantCardHeader}>
                      <Ionicons name="scan-circle" size={32} color="#4CAF50" />
                      <Text style={styles.plantName}>{scannedPlant.result.plant_name}</Text>
                      <Text style={styles.confidenceText}>
                        Confiance: {(scannedPlant.confidence * 100).toFixed(0)}%
                      </Text>
                    </View>
                    
                    <Text style={styles.plantDescription}>{scannedPlant.result.description}</Text>
                    
                    <View style={styles.scannedInfo}>
                      <Text style={styles.scannedDate}>
                        Scanné le {new Date(scannedPlant.created_at).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>

                    <TouchableOpacity 
                      style={styles.addPlantButton}
                      onPress={() => addScannedPlantToGarden(scannedPlant)}
                    >
                      <Ionicons name="add-circle" size={20} color="#fff" />
                      <Text style={styles.addPlantText}>Ajouter à mon jardin</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        );
      }

      if (showAiPhotosDB) {
        return (
          <View style={[
            styles.screen, 
            category === 'potager' ? styles.potagerBackground : styles.ornementBackground
          ]}>
            <ScrollView>
              <View style={styles.catalogHeader}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setShowAiPhotosDB(false)}
                >
                  <Ionicons name="arrow-back" size={24} color="#4CAF50" />
                  <Text style={styles.backText}>Retour</Text>
                </TouchableOpacity>
                <Text style={styles.screenTitle}>Base Photos IA</Text>
              </View>

              {selectedAiPlants.length > 0 && (
                <View style={styles.selectionSummary}>
                  <Text style={styles.selectionText}>
                    {selectedAiPlants.length} plante(s) sélectionnée(s)
                  </Text>
                  <TouchableOpacity 
                    style={styles.addSelectedButton}
                    onPress={addSelectedAiPlantsToGarden}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.addSelectedText}>Ajouter la sélection</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.plantGrid}>
                {aiPhotosDB.map((aiPlant: any) => (
                  <TouchableOpacity 
                    key={aiPlant.id} 
                    style={[
                      styles.aiPlantCard,
                      selectedAiPlants.includes(aiPlant.id) && styles.aiPlantCardSelected
                    ]}
                    onPress={() => toggleAiPlantSelection(aiPlant.id)}
                  >
                    {aiPlant.photo_url && (
                      <Image 
                        source={{ uri: aiPlant.photo_url }}
                        style={styles.plantImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.plantCardHeader}>
                      <View style={styles.aiPlantHeader}>
                        <Ionicons name="image" size={32} color="#9C27B0" />
                        <View style={styles.checkboxContainer}>
                          <Ionicons 
                            name={selectedAiPlants.includes(aiPlant.id) ? "checkbox" : "square-outline"} 
                            size={24} 
                            color={selectedAiPlants.includes(aiPlant.id) ? "#4CAF50" : "#666"} 
                          />
                        </View>
                      </View>
                      <Text style={styles.plantName}>{aiPlant.name}</Text>
                      <Text style={styles.confidenceText}>
                        IA • Confiance: {(aiPlant.confidence * 100).toFixed(0)}%
                      </Text>
                    </View>
                    
                    <Text style={styles.plantDescription}>{aiPlant.description}</Text>
                    
                    <View style={styles.aiPlantTags}>
                      {aiPlant.tags.map((tag: string, index: number) => (
                        <View key={index} style={styles.tagChip}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        );
      }

      return (
        <View style={[
          styles.screen, 
          category === 'potager' ? styles.potagerBackground : styles.ornementBackground
        ]}>
          <ScrollView>
            <View style={styles.catalogHeader}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setCurrentTab('garden')}
              >
                <Ionicons name="arrow-back" size={24} color="#4CAF50" />
                <Text style={styles.backText}>Retour</Text>
              </TouchableOpacity>
              <Text style={styles.screenTitle}>
                {category === 'potager' ? 'Catalogue Potager' : 'Catalogue Ornement'}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowScanner(true)}
              >
                <Ionicons name="camera" size={24} color="#4CAF50" />
                <Text style={styles.actionButtonText}>Scanner IA</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowScannedMenu(true)}
              >
                <Ionicons name="list" size={24} color="#4CAF50" />
                <Text style={styles.actionButtonText}>
                  Mes Scans ({scannedPlants.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowAiPhotosDB(true)}
              >
                <Ionicons name="images" size={24} color="#9C27B0" />
                <Text style={[styles.actionButtonText, { color: '#9C27B0' }]}>
                  Base Photos IA
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.plantGrid}>
              {plants.map((plant: any) => (
                <View key={plant.id} style={styles.plantCard}>
                  <View style={styles.plantCardHeader}>
                    <Ionicons 
                      name={category === 'potager' ? 'nutrition' : 'flower'} 
                      size={32} 
                      color={category === 'potager' ? '#FF6B35' : '#E91E63'} 
                    />
                    <Text style={styles.plantName}>{plant.name_fr}</Text>
                    {plant.name_latin && (
                      <Text style={styles.plantLatin}>{plant.name_latin}</Text>
                    )}
                  </View>
                  
                  <Text style={styles.plantDescription}>{plant.description}</Text>
                  
                  <View style={styles.plantDetails}>
                    <Text style={styles.plantDetail}>
                      <Ionicons name="calendar" size={16} color="#999" /> 
                      {plant.growing_season?.join(', ') || 'Toute saison'}
                    </Text>
                    <Text style={styles.plantDetail}>
                      <Ionicons name="speedometer" size={16} color="#999" /> 
                      Niveau: {plant.difficulty || 'Moyen'}
                    </Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.addPlantButton}
                    onPress={() => addPlantToGarden(plant)}
                  >
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.addPlantText}>Ajouter à mon jardin</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      );
    };

    return <PlantCatalog />;
  };

  const renderScannerScreen = () => (
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

        <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
          <Ionicons name="images" size={20} color="#4CAF50" style={{ marginRight: 10 }} />
          <Text style={[styles.buttonText, { color: '#4CAF50' }]}>
            Choisir de la galerie
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderRecommendationsScreen = () => (
    <ScrollView style={styles.screen}>
      <Text style={styles.screenTitle}>Recommandations</Text>
      
      {user?.is_premium ? (
        <View style={styles.recommendationsContainer}>
          <Text style={styles.sectionTitle}>Soins Personnalisés</Text>
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
  );

  const renderCommunityScreen = () => (
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
  );

  const renderProfileScreen = () => (
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
  );

  const renderCurrentScreen = () => {
    switch (currentTab) {
      case 'garden':
        return renderGardenScreen();
      case 'potager':
        return renderPlantCatalog('potager');
      case 'ornement':
        return renderPlantCatalog('ornement');
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
      <StatusBar style="light" />
      
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
  
  // Background styles with gradients
  authBackground: {
    backgroundColor: '#E8F5E8', // Light green background for auth
  },
  gardenBackground: {
    backgroundColor: 'linear-gradient(135deg, #C8E6C9 0%, #A5D6A7 100%)', // Garden green gradient
  },
  potagerBackground: {
    backgroundColor: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', // Warm orange for vegetables
  },
  ornementBackground: {
    backgroundColor: 'linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)', // Pink gradient for flowers
  },
  
  // Background image
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
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
    backgroundColor: '#FFFFFF',
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
  sectionTitle: {
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

  // Catalog styles
  catalogHeader: {
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
  loadingText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  plantGrid: {
    gap: 16,
  },
  plantCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  plantCardHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  plantName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 8,
    textAlign: 'center',
  },
  plantLatin: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  plantDescription: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  plantDetails: {
    gap: 8,
    marginBottom: 20,
  },
  plantDetail: {
    fontSize: 14,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  addPlantButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  addPlantText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Action buttons styles
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Scanned plants styles
  scannedPlantCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confidenceText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  scannedInfo: {
    marginBottom: 16,
  },
  scannedDate: {
    fontSize: 12,
    color: '#666',
  },

  // Empty state styles
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

  // AI Photos DB styles
  selectionSummary: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    marginBottom: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectionText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  addSelectedButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  addSelectedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  aiPlantCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiPlantCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  aiPlantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  checkboxContainer: {
    marginLeft: 'auto',
  },
  aiPlantTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});