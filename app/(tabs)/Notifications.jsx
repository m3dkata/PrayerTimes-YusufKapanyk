import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Dimensions,
  ImageBackground,
  Platform
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Entypo, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { scheduleNotifications } from '../../utils/notificationScheduler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size) => Math.round(size * SCREEN_WIDTH / 375);

const getWeekday = (date) => {
  return date.toLocaleDateString("bg-BG", { weekday: "long" });
};

const getPrayerDisplayName = (prayerKey, date = new Date()) => {
  const isFriday = getWeekday(date) === 'петък';

  const prayerMap = {
    "Зора": "Зора",
    "Изгрев": "Изгрев",
    "Обяд": isFriday ? "Джума" : "Обедна",
    "Следобяд": "Следобедна",
    "Залез": "Вечерна",
    "Нощ": "Нощна"
  };

  return prayerMap[prayerKey] || prayerKey;
};

const order = ["Зора", "Изгрев", "Обяд", "Следобяд", "Залез", "Нощ"];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function NotificationsScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [prayerSettings, setPrayerSettings] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("София");

  const sliderValuesRef = useRef({});
  const forceUpdate = useRef(0);

  useEffect(() => {
    loadNotificationSettings();
    loadSelectedCity();
    setupNotifications();
  }, []);

  useEffect(() => {
    if (notificationsEnabled) {
      scheduleNotifications();
    } else {
      Notifications.cancelAllScheduledNotificationsAsync();
    }
  }, [notificationsEnabled, selectedCity, prayerSettings]);

  const loadSelectedCity = async () => {
    try {
      const city = await AsyncStorage.getItem("selectedCity");
      if (city) setSelectedCity(city);
    } catch (error) {
      console.log("Error loading city", error);
    }
  };

  const setupNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('prayer-times', {
          name: 'Prayer Times Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }
    } catch (error) {
      console.log('Error setting up notifications:', error);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem('notificationsEnabled');
      const settings = await AsyncStorage.getItem('prayerSettings');

      setNotificationsEnabled(enabled === 'true');

      if (settings) {
        const parsedSettings = JSON.parse(settings);
        setPrayerSettings(parsedSettings);

        order.forEach(prayer => {
          sliderValuesRef.current[prayer] = parsedSettings[prayer]?.minutesBefore ?? 5;
        });
      } else {
        const defaultSettings = {};
        order.forEach(prayer => {
          defaultSettings[prayer] = {
            enabled: false,
            minutesBefore: 5
          };
          sliderValuesRef.current[prayer] = 5;
        });
        setPrayerSettings(defaultSettings);
        await AsyncStorage.setItem('prayerSettings', JSON.stringify(defaultSettings));
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const toggleNotifications = async (value) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem('notificationsEnabled', value.toString());

    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Разрешенията за известия са необходими');
        setNotificationsEnabled(false);
      } else {
        scheduleNotifications();
      }
    } else {
      Notifications.cancelAllScheduledNotificationsAsync();
    }
  };

  const togglePrayerNotification = async (prayerName, value) => {
    const newSettings = {
      ...prayerSettings,
      [prayerName]: {
        ...prayerSettings[prayerName],
        enabled: value
      }
    };

    setPrayerSettings(newSettings);
    await AsyncStorage.setItem('prayerSettings', JSON.stringify(newSettings));
    if (notificationsEnabled) scheduleNotifications();
  };

  const updateMinutesBefore = async (prayerName, minutes) => {
    const newSettings = {
      ...prayerSettings,
      [prayerName]: {
        ...prayerSettings[prayerName],
        minutesBefore: minutes
      }
    };

    setPrayerSettings(newSettings);
    await AsyncStorage.setItem('prayerSettings', JSON.stringify(newSettings));
    if (notificationsEnabled) scheduleNotifications();
  };

  const handleSliderValueChange = (prayerName, value) => {
    const roundedValue = Math.round(value);
    sliderValuesRef.current[prayerName] = roundedValue;
    forceUpdate.current += 1;
  };

  const handleSliderComplete = async (prayerName, value) => {
    const roundedValue = Math.round(value);
    await updateMinutesBefore(prayerName, roundedValue);
  };

  const getSliderValue = (prayerName) => {
    return sliderValuesRef.current[prayerName] ?? prayerSettings[prayerName]?.minutesBefore ?? 5;
  };

  const sendTestNotification = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Тест на известията',
          body: 'Известията работят правилно! Ще получавате напомняния за молитвите.',
          sound: true,
        },
        trigger: { seconds: 2 },
      });
      Alert.alert('Успех', 'Тестово известие е изпратено!');
    } catch (error) {
      Alert.alert('Грешка', 'Неуспешно изпращане на тестово известие.');
    }
  };

  const renderTimeSlider = (prayerName) => {
    const displayMinutes = getSliderValue(prayerName);

    return (
      <View style={styles.timeSelector}>
        <Text style={styles.timeLabel}>
          Известие {displayMinutes} {displayMinutes === 1 ? 'минута' : 'минути'} преди молитвата
        </Text>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.minusButton, displayMinutes <= 0 && styles.buttonDisabled]}
            onPress={() => {
              if (displayMinutes > 0) {
                const newValue = displayMinutes - 1;
                handleSliderValueChange(prayerName, newValue);
                handleSliderComplete(prayerName, newValue);
              }
            }}
            disabled={displayMinutes <= 0}
          >
            <MaterialIcons name="remove" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.sliderContainer}>
            <Text style={styles.sliderMin}>0</Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={60}
              step={1}
              value={displayMinutes}
              onValueChange={(value) => handleSliderValueChange(prayerName, value)}
              onSlidingComplete={(value) => handleSliderComplete(prayerName, value)}
              minimumTrackTintColor="#38b000"
              maximumTrackTintColor="rgba(255,255,255,0.3)"
              thumbTintColor="#38b000"
            />
            <Text style={styles.sliderMax}>60</Text>
          </View>

          <TouchableOpacity
            style={[styles.plusButton, displayMinutes >= 60 && styles.buttonDisabled]}
            onPress={() => {
              if (displayMinutes < 60) {
                const newValue = displayMinutes + 1;
                handleSliderValueChange(prayerName, newValue);
                handleSliderComplete(prayerName, newValue);
              }
            }}
            disabled={displayMinutes >= 60}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.sliderLabels}>

        </View>
      </View>
    );
  };

  return (
    <ImageBackground source={require('../../assets/mosque.jpg')} style={{ flex: 1 }} resizeMode="cover">
      <View style={styles.overlay} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View key={forceUpdate.current}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.navButton} onPress={() => setMenuOpen(true)}>
              <Entypo name="menu" size={scale(28)} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={[styles.title, { fontSize: scale(28) }]}>Известия</Text>
            </View>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.globalSwitchContainer}>
            <View style={styles.switchTextContainer}>
              <Text style={styles.globalSwitchText}>Активирай известия</Text>
              <Text style={styles.globalSwitchSubtext}>
                {notificationsEnabled ? '✅ Активни' : '❌ Неактивни'}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#767577', true: '#38b000' }}
              thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>

          {notificationsEnabled && (
            <>
              <TouchableOpacity
                style={styles.testButton}
                onPress={sendTestNotification}
              >
                <MaterialIcons name="notifications" size={20} color="#fff" />
                <Text style={styles.testButtonText}>Тест</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Настройки за молитви</Text>

              {order.map((prayerName, index) => (
                <View key={`${prayerName}_${forceUpdate.current}`} style={styles.prayerCard}>
                  <View style={styles.prayerHeader}>
                    <View style={styles.prayerInfo}>
                      <Text style={styles.prayerName}>{getPrayerDisplayName(prayerName)}</Text>
                      <Text style={styles.prayerStatus}>
                        {prayerSettings[prayerName]?.enabled ? '✅ Вкл' : '❌ Изкл'}
                      </Text>
                    </View>
                    <Switch
                      value={prayerSettings[prayerName]?.enabled || false}
                      onValueChange={(value) => togglePrayerNotification(prayerName, value)}
                      trackColor={{ false: '#767577', true: '#38b000' }}
                      thumbColor={prayerSettings[prayerName]?.enabled ? '#fff' : '#f4f3f4'}
                    />
                  </View>

                  {prayerSettings[prayerName]?.enabled && (
                    renderTimeSlider(prayerName)
                  )}
                </View>
              ))}

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Как работят известията:</Text>
                <Text style={styles.infoText}>
                  • Задайте минути преди молитвата (0-60){'\n'}
                  • 0 минути = известие точно в началото на молитвата{'\n'}
                  • Използвайте + и - за точно настройване{'\n'}
                  • Известията се изпращат автоматично
                </Text>
              </View>
            </>
          )}

          {!notificationsEnabled && (
            <View style={styles.disabledState}>
              <MaterialIcons name="notifications-off" size={48} color="#888" />
              <Text style={styles.disabledText}>
                Активирайте известията, за да получавате напомняния за молитвите.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* SIDE MENU */}
      {menuOpen && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuBackground} activeOpacity={1} onPress={() => setMenuOpen(false)} />
          <View style={styles.sideMenu}>
            <View style={styles.menuHeader}>
              <MaterialIcons name="mosque" size={28} color="#38b000" />
              <Text style={styles.menuTitle}>Молитвени Времена</Text>
            </View>

            <View style={styles.menuItems}>
              <TouchableOpacity style={styles.menuBtn} onPress={() => { setMenuOpen(false); router.push('/'); }}>
                <MaterialIcons name="schedule" size={20} color="#fff" />
                <Text style={styles.menuText}>Времена за намаз</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuBtn} onPress={() => { setMenuOpen(false); router.push('/Notifications'); }}>
                <MaterialIcons name="notifications" size={20} color="#fff" />
                <Text style={styles.menuText}>Известия</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuBtn} onPress={() => { setMenuOpen(false); router.push('/Info'); }}>
                <MaterialIcons name="info" size={20} color="#fff" />
                <Text style={styles.menuText}>Информация</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuBtn} onPress={() => { setMenuOpen(false); router.push('/About'); }}>
                <MaterialIcons name="people" size={20} color="#fff" />
                <Text style={styles.menuText}>За нас</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.menuFooter}>
              <TouchableOpacity style={styles.menuCloseBtn} onPress={() => setMenuOpen(false)}>
                <Text style={styles.menuCloseText}>Затвори</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  container: { flex: 1, backgroundColor: 'transparent' },
  contentContainer: { paddingBottom: 70 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 18,
    marginTop: 20
  },
  navButton: { padding: 6 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: {
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center'
  },
  placeholder: { width: scale(28) },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 176, 0, 0.3)',
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#38b000',
    gap: 8
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  globalSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    marginHorizontal: 16
  },
  switchTextContainer: {
    flex: 1,
  },
  globalSwitchText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4
  },
  globalSwitchSubtext: {
    fontSize: 14,
    color: '#38b000',
    fontWeight: '600'
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#38b000',
    marginBottom: 20,
    textAlign: 'center'
  },
  prayerCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 16
  },
  prayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  prayerInfo: {
    flex: 1
  },
  prayerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4
  },
  prayerStatus: {
    fontSize: 14,
    color: '#888'
  },
  timeSelector: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)'
  },
  timeLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600'
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  minusButton: {
    backgroundColor: '#ff6b6b',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  plusButton: {
    backgroundColor: '#38b000',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 10
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderMin: {
    color: '#fff',
    fontSize: 12,
    width: 20
  },
  sliderMax: {
    color: '#fff',
    fontSize: 12,
    width: 20
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5
  },
  sliderLabel: {
    color: '#888',
    fontSize: 10
  },
  infoBox: {
    backgroundColor: 'rgba(56, 176, 0, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    marginHorizontal: 16
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#38b000',
    marginBottom: 8
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20
  },
  disabledState: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 30,
    borderRadius: 12,
    marginHorizontal: 16,
    alignItems: 'center',
    marginTop: 20
  },
  disabledText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10
  },
  // SIDE MENU STYLES
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    zIndex: 1000
  },
  menuBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)'
  },
  sideMenu: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    width: "75%",
    backgroundColor: "rgba(0,0,0,0.95)",
    paddingTop: 50,
    paddingHorizontal: 0,
    zIndex: 999
  },
  menuHeader: {
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    flexDirection: 'row'
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#38b000',
    marginLeft: 10
  },
  menuItems: {
    padding: 16,
    paddingTop: 8
  },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6
  },
  menuText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 12
  },
  menuFooter: {
    padding: 16,
    marginTop: 'auto'
  },
  menuCloseBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  menuCloseText: {
    fontWeight: '700',
    color: '#ff6b6b',
    fontSize: 14
  }
});