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
  SafeAreaView
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
    );
  }

  // Main app screens
  const renderGardenScreen = () => (
    <ScrollView style={styles.screen}>
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
  );

  const renderPlantCatalog = (category: string) => {
    const [plants, setPlants] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      fetchPlants();
    }, []);

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

    return (
      <ScrollView style={styles.screen}>
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
    );
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
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
  },
  
  // Auth styles
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
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
    color: '#fff',
    marginBottom: 24,
  },

  // Garden screen
  gardenSections: {
    gap: 16,
    marginBottom: 32,
  },
  gardenCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  gardenCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
  },
  gardenCardDesc: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },

  // Scanner screen
  scannerContainer: {
    alignItems: 'center',
    gap: 24,
  },
  scannerPlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  scannerText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  scannerSubtext: {
    fontSize: 14,
    color: '#999',
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
    color: '#fff',
    marginBottom: 16,
  },
  recommendationCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  recommendationDesc: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },

  // Premium prompt
  premiumPrompt: {
    alignItems: 'center',
    padding: 24,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
  },
  premiumDesc: {
    fontSize: 16,
    color: '#999',
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
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
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
    color: '#fff',
  },
  postTime: {
    fontSize: 12,
    color: '#999',
  },
  postContent: {
    fontSize: 16,
    color: '#fff',
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
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  profileEmail: {
    fontSize: 16,
    color: '#999',
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
  },
  profileOption: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },

  // Bottom navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
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
});