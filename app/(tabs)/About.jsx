import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Dimensions,
  ImageBackground
} from 'react-native';
import { Entypo, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SideMenu from '../../components/SideMenu';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => Math.round(size * SCREEN_WIDTH / 375);

export default function About() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const openLink = (url) => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  return (
    <ImageBackground
      source={require('../../assets/mosque.jpg')}
      style={{ flex:1 }}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.navButton} onPress={() => setMenuOpen(true)}>
            <Entypo name="menu" size={scale(28)} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { fontSize: scale(28) }]}>За нас</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Main About Content */}
        <View style={styles.scrollContent}>

          <View style={styles.logoContainer}>
            <FontAwesome5 name="mosque" size={scale(80)} color="#38b000" />
            <Text style={styles.appName}>Времена за Намаз</Text>
            <Text style={styles.version}>Версия 1.0.0</Text>
          </View>

          <View style={styles.aboutCard}>
            <Text style={styles.aboutText}>
              Това приложение е разработено с цел да подпомогне мюсюлманската 
              общност в България да следва точно времето за своите ежедневни молитви.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Свържете се с нас</Text>

          {/* Social Media Links */}
          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialButton} onPress={() => openLink('https://facebook.com/yusuf.kapanak')}>
              <FontAwesome5 name="facebook" size={scale(30)} color="#1877f2" />
              <Text style={styles.socialText}>Facebook</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} onPress={() => openLink('https://instagram.com/y_kapanak')}>
              <FontAwesome5 name="instagram" size={scale(30)} color="#e4405f" />
              <Text style={styles.socialText}>Instagram</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} onPress={() => openLink('mailto:yusuf.kapanak@pmggd.bg')}>
              <MaterialIcons name="email" size={scale(30)} color="#fff" />
              <Text style={styles.socialText}>Email</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Контакти</Text>
            <Text style={styles.contactText}>📧 Email: yusuf.kapanak@pmggd.bg</Text>
            <Text style={styles.contactText}>🌐 Уебсайт: -</Text>
            <Text style={styles.contactText}>📍 Адрес: Гоце Делчев, България</Text>
          </View>

          <View style={styles.teamCard}>
            <Text style={styles.teamTitle}>Нашият екип</Text>
            <Text style={styles.teamText}>
              Аз съм разработчик, който цели улесняването на исляма за мюсюлманската общност.
              Моята мисия е да направя следването на религиозните задължения по-лесно
              и достъпно за всеки.
            </Text>
          </View>

        </View>
      </ScrollView>

      <SideMenu
        isVisible={menuOpen}
        onClose={() => setMenuOpen(false)}
        currentScreen="/About"
      />

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  overlay: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)'},
  container: { flex:1, backgroundColor:'transparent' },
  contentContainer: { paddingBottom:70 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom:16,
    paddingHorizontal:18,
    marginTop:20
  },
  navButton: { padding:6 },
  headerCenter: { flex:1, alignItems:'center' },
  title: { fontWeight: '700', color: '#fff', textAlign: 'center' },
  placeholder: { width: scale(28) },
  scrollContent: { padding: 20, paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  appName: { fontSize: 28, fontWeight: '800', color: '#38b000', marginTop: 16, marginBottom: 8 },
  version: { fontSize: 16, color: '#888', fontWeight: '600' },
  aboutCard: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 12, marginBottom: 30 },
  aboutText: { fontSize: 16, color: '#fff', lineHeight: 22, textAlign: 'center' },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: '#38b000', marginBottom: 20, textAlign: 'center' },
  socialContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 30 },
  socialButton: { width:'48%', backgroundColor:'rgba(255,255,255,0.1)', padding:16, borderRadius:12, alignItems:'center', marginBottom:12 },
  socialText: { color:'#fff', marginTop:8, fontWeight:'600' },
  contactCard: { backgroundColor:'rgba(255,255,255,0.1)', padding:16, borderRadius:12, marginBottom:20 },
  contactTitle: { fontSize:18, fontWeight:'700', color:'#38b000', marginBottom:12 },
  contactText: { fontSize:16, color:'#fff', marginBottom:8 },
  teamCard: { backgroundColor:'rgba(255,255,255,0.1)', padding:16, borderRadius:12 },
  teamTitle: { fontSize:18, fontWeight:'700', color:'#38b000', marginBottom:12 },
  teamText: { fontSize:16, color:'#fff', lineHeight:22 }
});

