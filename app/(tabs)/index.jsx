import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  AppState,
  Dimensions,
  ImageBackground
} from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AntDesign, Entypo, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import prayerData from '../../assets/all_prayer_times_2025.json';
import SideMenu from '../../components/SideMenu';

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
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
const formatDate = (d) => {
  if (!(d instanceof Date)) d = new Date(d);
  return d.toISOString().split("T")[0];
};

export default function Index() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState("София");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayTimes, setDayTimes] = useState({});
  const [prevToday, setPrevToday] = useState("");
  const [nextToday, setNextToday] = useState("");
  const [nextPrayerDate, setNextPrayerDate] = useState(null);
  const [remainingSec, setRemainingSec] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [progressWidth, setProgressWidth] = useState('50%');

  const timerRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const cities = Object.keys(prayerData);
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const scale = (size) => Math.round(size * SCREEN_WIDTH / 375);

  const getMinDate = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

  const calculateNextPrayer = () => {
    const now = new Date();
    const todayStr = formatDate(now);
    const cityTimesToday = prayerData[selectedCity]?.[todayStr];
    if (!cityTimesToday) { 
      setPrevToday(""); 
      setNextToday(""); 
      setRemainingSec(null); 
      setElapsedSec(null); 
      setNextPrayerDate(null); 
      setProgressWidth('50%');
      return; 
    }

    let previous="", next="", nextTime=null, prevTime=null, nextDate=new Date();
    for (let key of order) {
      const timeStr = cityTimesToday[key];
      if (!timeStr) continue;
      const [h,m] = timeStr.split(":").map(Number);
      const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
      if (now >= t) { previous=key; prevTime=t; } 
      else if (!next) { next=key; nextTime=t; nextDate=new Date(now); }
    }

    if (!next) {
      const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1);
      const tomorrowStr = formatDate(tomorrow);
      const cityTimesTomorrow = prayerData[selectedCity]?.[tomorrowStr];
      if (cityTimesTomorrow && cityTimesTomorrow["Зора"]) {
        next="Зора"; 
        const [h,m] = cityTimesTomorrow["Зора"].split(":").map(Number);
        nextTime = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), h, m, 0);
        nextDate = tomorrow;
      }
    }

    setPrevToday(previous);  
    setNextToday(next);       
    setNextPrayerDate(nextDate);
    
    const remaining = nextTime ? Math.max(Math.floor((nextTime - now)/1000),0) : null;
    setRemainingSec(remaining);
    setElapsedSec(prevTime ? Math.max(Math.floor((now - prevTime)/1000),0) : null);

    // Изчисляване на напредъка за лентата за напредък
    if (nextTime && prevTime) {
      const totalTimeBetweenPrayers = (nextTime - prevTime) / 1000; // в секунди
      const elapsedSincePrevPrayer = (now - prevTime) / 1000; // в секунди
      const progress = Math.min(elapsedSincePrevPrayer / totalTimeBetweenPrayers, 1);
      const widthPercent = Math.max(progress * 100, 2); // Поне 2% ширина
      setProgressWidth(`${widthPercent}%`);
    } else {
      setProgressWidth('50%');
    }
  };

  useEffect(() => {
    const dateStr = formatDate(currentDate);
    const cityData = prayerData[selectedCity];
    setDayTimes(cityData && cityData[dateStr] ? cityData[dateStr] : {});
  }, [selectedCity, currentDate]);

  useEffect(() => {
    calculateNextPrayer();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(calculateNextPrayer, 1000);

    const subscription = AppState.addEventListener("change", nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") { calculateNextPrayer(); }
      appState.current = nextAppState;
    });
    return () => { if (timerRef.current) clearInterval(timerRef.current); subscription.remove(); };
  }, [selectedCity]);

  const onCitySelect = async (city) => {
    setSelectedCity(city);
    await AsyncStorage.setItem("selectedCity", city);
    setCurrentDate(new Date());
    setModalVisible(false);
  };
  
  useEffect(() => {
    const loadCity = async () => {
      try { 
        const savedCity = await AsyncStorage.getItem("selectedCity"); 
        if (savedCity) setSelectedCity(savedCity); 
      } catch (error) { 
        console.log("Error loading city", error); 
      }
    };
    loadCity();
  }, []);

  const changeDate = (days) => {
    const newDate = new Date(currentDate.getTime() + days*86400000);
    if (newDate < getMinDate()) return;
    setCurrentDate(newDate);
  };

  const formatTime = (t) => {
    if (!t) return "--:--";
    const [h,m] = t.split(":");
    return `${h.padStart(2,"0")}:${m.padStart(2,"0")}`;
  };

  const rem = remainingSec !== null ? (() => {
    const sec = remainingSec;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600)/60);
    const s = sec % 60;
    return { hhmm:`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, ss: String(s).padStart(2,'0') };
  })() : null;

  const elapsed = elapsedSec !== null ? (() => {
    const sec = elapsedSec;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600)/60);
    return { hhmm:`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` };
  })() : null;

  // Получаване на цвета на лентата за напредък въз основа на оставащото време
  const getProgressBarColor = () => {
    if (!remainingSec) return '#38b000';
    if (remainingSec <= 300) return '#ff6b6b'; // 5 минути или по-малко - червено
    if (remainingSec <= 900) return '#ffa726'; // 15 минути или по-малко - оранжево
    return '#38b000'; // Повече от 15 минути - зелено
  };

  return (
    <ImageBackground source={require('../../assets/mosque.jpg')} style={{ flex:1 }} resizeMode="cover">
      <View style={styles.overlay} />
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Заглавка - ПО-МАЛКА */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.navButton} onPress={() => setMenuOpen(true)}>
            <Entypo name="menu" size={scale(22)} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.cityTitle, { fontSize: scale(22) }]}>{selectedCity}</Text>
            <Text style={[styles.currentTime, { fontSize: scale(16) }]}>
              {new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:false})}
            </Text>
          </View>
          <TouchableOpacity onPress={()=>setModalVisible(true)} style={styles.locationButton}>
            <MaterialIcons name="location-on" size={scale(22)} color="#38b000" />
          </TouchableOpacity>
        </View>

        {/* Оставащо време - ПО-МАЛКО */}
        {rem && nextToday && (
          <View style={styles.remainingContainer}>
            <View style={styles.remainingRow}>
              <Text style={[styles.remainingBig, { fontSize: scale(50) }]}>- {rem.hhmm}</Text>
              <Text style={[styles.remainingSmall, { fontSize: scale(25), lineHeight: scale(28), transform: [{ translateY: -scale(16) }] }]}>{`:${rem.ss}`}</Text>
              <Text style={[styles.remainingBig, { fontSize: scale(25) }]}> Ч.</Text>
            </View>
            
            <Text style={[styles.untilText, { fontSize: scale(25), width:'100%', textAlign:'center', marginBottom: 8 }]}>до</Text>
            <Text style={[styles.nextPrayerText, { fontSize: scale(25) }]}>{getPrayerDisplayName(nextToday, new Date())}</Text>
          </View>
        )}

        {/* Изминала молитва - ПО-МАЛКА с ЛЕНТА ЗА НАПРЕДЪК */}
        {elapsed && prevToday && (
          <View style={styles.elapsedContainer}>
            <View style={styles.elapsedRowWrapper}>
              <View style={styles.elapsedInfo}>
                <MaterialIcons name="access-time" size={16} color="#ff6b6b" />
                <Text style={styles.elapsedName}>{getPrayerDisplayName(prevToday, new Date())}</Text>
              </View>
              <View style={styles.elapsedTimeBox}>
                <Text style={styles.elapsedTimeText}>+{elapsed.hhmm}</Text>
              </View>
            </View>
            
            {/* Лента за напредък - ДОБАВЕНА ТУК, МНОГО МАЛКА */}
            <View style={styles.elapsedProgressContainer}>
              <View style={styles.elapsedProgressBackground}>
                <View 
                  style={[
                    styles.elapsedProgressFill,
                    { 
                      width: progressWidth,
                      backgroundColor: getProgressBarColor()
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        )}

        {/* Навигация по дата - ПО-МАЛКА */}
        <View style={styles.dateNavigation}>
          <TouchableOpacity onPress={()=>changeDate(-1)} disabled={currentDate<=getMinDate()} style={styles.dateButton}>
            <AntDesign name="left" size={scale(20)} color={currentDate<=getMinDate() ? '#666' : '#fff'} />
          </TouchableOpacity>
          <View style={styles.dateContainer}>
            <MaterialIcons name="calendar-today" size={16} color="#38b000" style={styles.dateIcon} />
            <Text style={[styles.dateText, { fontSize: scale(16) }]}>{formatDate(currentDate)}</Text>
          </View>
          <TouchableOpacity onPress={()=>changeDate(1)} style={styles.dateButton}>
            <AntDesign name="right" size={scale(20)} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Таблица с часове за молитва - ПО-МАЛКА */}
        <View style={styles.timesContainer}>
          <View style={styles.tableHeader}>
            <MaterialIcons name="schedule" size={18} color="#38b000" />
            <Text style={[styles.tableDayTitle, { fontSize: scale(18) }]}>
              {capitalize(currentDate.toLocaleDateString("bg-BG",{ weekday:"long" }))}
            </Text>
          </View>
          {order.map((key, index) => {
            const time = formatTime(dayTimes[key]);
            let rowColor = '#ffffff';
            const isPrev = prevToday === key && formatDate(currentDate) === formatDate(new Date());
            const isNext = nextToday === key && nextPrayerDate && formatDate(nextPrayerDate) === formatDate(currentDate);
            if(isNext) rowColor='#38b000'; if(isPrev) rowColor='#ff6b6b';
            return (
              <View key={key} style={[styles.timeRow, index !== order.length - 1 && styles.timeRowBorder]}>
                <View style={styles.timeNameContainer}>
                  {isNext && <MaterialIcons name="notifications-active" size={14} color="#38b000" style={styles.prayerIcon} />}
                  {isPrev && <MaterialIcons name="check-circle" size={14} color="#ff6b6b" style={styles.prayerIcon} />}
                  <Text style={[styles.timeName, { color: rowColor, fontSize: scale(15) }]}>{getPrayerDisplayName(key, currentDate)}</Text>
                </View>
                <Text style={[styles.timeValue, { color: rowColor, fontSize: scale(15) }]}>{time}</Text>
              </View>
            );
          })}
        </View>

        {/* Долен разделител */}
        <View style={styles.bottomSpacer} />

        {/* Модал */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <MaterialIcons name="location-city" size={28} color="#38b000" />
                <Text style={[styles.modalTitle, { fontSize: scale(24) }]}>Избери град</Text>
                <TouchableOpacity onPress={()=>setModalVisible(false)} style={styles.modalCloseButton}>
                  <AntDesign name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
                <Text style={styles.searchPlaceholder}>Търси град...</Text>
              </View>

              <FlatList
                data={cities}
                keyExtractor={i=>i}
                showsVerticalScrollIndicator={false}
                style={styles.cityList}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={()=>onCitySelect(item)} style={[
                    styles.cityItem,
                    item===selectedCity && styles.cityItemSelected
                  ]}>
                    <View style={styles.cityItemContent}>
                      <MaterialIcons 
                        name="location-on" 
                        size={20} 
                        color={item===selectedCity ? '#fff' : '#38b000'} 
                      />
                      <View style={styles.cityTextContainer}>
                        <Text style={[
                          styles.cityText, 
                          { fontSize: scale(20) },
                          item===selectedCity && styles.cityTextSelected
                        ]}>
                          {item}
                        </Text>
                        {item===selectedCity && (
                          <Text style={styles.selectedLabel}>Избран</Text>
                        )}
                      </View>
                    </View>
                    {item===selectedCity && (
                      <MaterialIcons name="check-circle" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

      </ScrollView>

      <SideMenu
        isVisible={menuOpen}
        onClose={() => setMenuOpen(false)}
        currentScreen="/"
      />

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  overlay: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)'},
  container: { 
    flex:1, 
    backgroundColor:'transparent' 
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 10,
    minHeight: Dimensions.get('window').height - 30
  },
  
  // Заглавка - ПО-МАЛКА
  header: {
    flexDirection:'row', 
    justifyContent:'space-between', 
    alignItems:'center', 
    marginBottom:12, 
    paddingHorizontal:16, 
    marginTop:15 
  },
  navButton: { 
    padding:8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8
  },
  headerCenter: { flex:1, alignItems:'center' },
  cityTitle: { fontWeight:'800', color:'#fff', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  currentTime: { color:'#fff', fontWeight:'600', marginTop:2, opacity: 0.9 },
  locationButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8
  },

  // Оставащо време - ПО-МАЛКО
  remainingContainer: {
    alignItems:'center', 
    marginVertical:15,
    marginBottom: 20
  },
  remainingRow: { 
    flexDirection:'row', 
    alignItems:'flex-end',
    marginBottom: 8 
  },
  remainingBig: { 
    fontWeight:'800', 
    color:'#fff', 
    textShadowColor: 'rgba(0,0,0,0.75)', 
    textShadowOffset: {width: 1, height: 1}, 
    textShadowRadius: 3 
  },
  remainingSmall: { 
    fontWeight:'700', 
    color:'#fff', 
    marginLeft:4, 
    lineHeight:28, 
    textShadowColor: 'rgba(0,0,0,0.75)', 
    textShadowOffset: {width: 1, height: 1}, 
    textShadowRadius: 3 
  },
  
  untilText: { 
    color:'#fff', 
    opacity:0.9, 
    fontWeight: '600' 
  },
  nextPrayerText: { 
    fontWeight:'800', 
    color:'#38b000', 
    textShadowColor: 'rgba(0,0,0,0.5)', 
    textShadowOffset: {width: 1, height: 1}, 
    textShadowRadius: 2 
  },

  // Изминала молитва - ПО-МАЛКА с ЛЕНТА ЗА НАПРЕДЪК
  elapsedContainer: {
    marginHorizontal:16, 
    marginBottom:16, 
    borderRadius:10, 
    backgroundColor:'rgba(0,0,0,0.4)',
    borderLeftWidth: 3,
    borderLeftColor: '#ff6b6b',
    overflow: 'hidden'
  },
  elapsedRowWrapper: { 
    flexDirection:'row', 
    justifyContent:'space-between', 
    alignItems:'center', 
    paddingVertical:10, 
    paddingHorizontal:14,
  },
  elapsedInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  elapsedName: { color:'#ff6b6b', fontSize:14, fontWeight:'700', marginLeft: 6 },
  elapsedTimeBox: { 
    backgroundColor:'#ff6b6b', 
    paddingVertical:5, 
    paddingHorizontal:10, 
    borderRadius:6,
  },
  elapsedTimeText: { color:'#fff', fontWeight:'700', fontSize:14 },
  
  // Стилове за лента за напредък на изминала молитва - МНОГО МАЛКА
  elapsedProgressContainer: {
    width: '100%',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  elapsedProgressBackground: {
    height: 3, // Very thin
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  elapsedProgressFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 1s ease-in-out, background-color 1s ease-in-out',
  },

  // Навигация по дата - ПО-МАЛКА
  dateNavigation: {
    flexDirection:'row', 
    justifyContent:'space-between', 
    alignItems:'center', 
    marginBottom:20, 
    paddingHorizontal:16 
  },
  dateButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8
  },
  dateIcon: {
    marginRight: 6
  },
  dateText: { fontWeight:'700', color:'#fff' },

  // Таблица с часове за молитва - ПО-МАЛКА
  timesContainer: {
    backgroundColor:'rgba(255,255,255,0.1)', 
    paddingVertical:14, 
    paddingHorizontal:16, 
    borderRadius:14, 
    marginHorizontal:16, 
    marginBottom:16, 
    borderWidth:1, 
    borderColor:'rgba(255,255,255,0.3)',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  tableDayTitle: { 
    fontWeight:'800', 
    textAlign:'center', 
    marginLeft: 6,
    color:'#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2
  },
  timeRow: { 
    flexDirection:'row', 
    justifyContent:'space-between', 
    alignItems:'center', 
    paddingVertical:8 
  },
  timeRowBorder: { 
    borderBottomWidth: 1, 
    borderBottomColor:'rgba(255,255,255,0.3)' 
  },
  timeNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  prayerIcon: {
    marginRight: 6
  },
  timeName: { fontWeight:'700', flex: 1 },
  timeValue: { 
    width:'35%', 
    textAlign:'right', 
    fontWeight:'700',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 5
  },

  // Долен разделител за предотвратяване на отрязване
  bottomSpacer: {
    height: 10
  },

  // Модални стилове - ПО-МАЛКИ
  modalOverlay:{
    flex:1, 
    backgroundColor:'rgba(0,0,0,0.7)', 
    justifyContent:'center', 
    alignItems:'center',
    padding: 16
  },
  modalContainer:{ 
    width:'100%', 
    maxHeight:'75%', 
    backgroundColor:'#1a1a1a', 
    borderRadius:16, 
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    position: 'relative'
  },
  modalTitle:{ 
    fontWeight:'800', 
    textAlign:'center', 
    color:'#fff',
    marginLeft: 6
  },
  modalCloseButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  searchIcon: {
    marginRight: 6
  },
  searchPlaceholder: {
    color: '#888',
    fontSize: 14
  },
  cityList: {
    maxHeight: 350,
    paddingHorizontal: 16
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  cityItemSelected: {
    backgroundColor: '#38b000',
    borderColor: '#38b000'
  },
  cityItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  cityTextContainer: {
    marginLeft: 10
  },
  cityText:{ 
    fontWeight:'600', 
    color: '#fff'
  },
  cityTextSelected: {
    color: '#fff',
    fontWeight: '700'
  },
  selectedLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 2
  }
});