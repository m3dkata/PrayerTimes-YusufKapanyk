import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import prayerData from '../assets/all_prayer_times_2025.json';

const order = ["Зора", "Изгрев", "Обяд", "Следобяд", "Залез", "Нощ"];

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

export const scheduleNotifications = async () => {
    try {
        const enabled = await AsyncStorage.getItem('notificationsEnabled');
        if (enabled !== 'true') {
            await Notifications.cancelAllScheduledNotificationsAsync();
            return;
        }

        const settingsStr = await AsyncStorage.getItem('prayerSettings');
        const prayerSettings = settingsStr ? JSON.parse(settingsStr) : {};

        await Notifications.cancelAllScheduledNotificationsAsync();

        const now = new Date();
        let scheduledCount = 0;

        // Schedule for the next 4 days to stay within iOS 64 notification limit
        for (let i = 0; i < 4; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            const city = await AsyncStorage.getItem("selectedCity") || "София";
            const cityTimes = prayerData[city]?.[dateStr];

            if (!cityTimes) continue;

            for (const prayerName of order) {
                const settings = prayerSettings[prayerName];
                if (!settings?.enabled) continue;

                const prayerTimeStr = cityTimes[prayerName];
                if (!prayerTimeStr) continue;

                const [hours, minutes] = prayerTimeStr.split(':').map(Number);
                const prayerTime = new Date(date);
                prayerTime.setHours(hours, minutes, 0, 0);

                // 1. Schedule Reminder Notification
                if (settings.minutesBefore > 0) {
                    const reminderTime = new Date(prayerTime.getTime() - (settings.minutesBefore * 60 * 1000));
                    const diffSeconds = Math.floor((reminderTime.getTime() - now.getTime()) / 1000);

                    if (diffSeconds > 0) {
                        console.log(`Scheduling REMINDER for ${prayerName} at ${reminderTime.toLocaleString()} (in ${diffSeconds}s)`);
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: `🕌 ${getPrayerDisplayName(prayerName, date)}`,
                                body: `Молитвата ${getPrayerDisplayName(prayerName, date)} започва след ${settings.minutesBefore} минути.`,
                                sound: true,
                                vibrate: [0, 250, 250, 250],
                                data: { prayerName, type: 'prayer-reminder' },
                            },
                            trigger: reminderTime,
                        });
                        scheduledCount++;
                    }
                }

                // 2. Schedule Exact Time Notification
                const diffSecondsExact = Math.floor((prayerTime.getTime() - now.getTime()) / 1000);
                if (diffSecondsExact > 0) {
                    console.log(`Scheduling EXACT for ${prayerName} at ${prayerTime.toLocaleString()} (in ${diffSecondsExact}s)`);
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: `🕌 ${getPrayerDisplayName(prayerName, date)}`,
                            body: `Молитвата ${getPrayerDisplayName(prayerName, date)} започва сега.`,
                            sound: true,
                            vibrate: [0, 250, 250, 250],
                            data: { prayerName, type: 'prayer-start' },
                        },
                        trigger: prayerTime,
                    });
                    scheduledCount++;
                }
            }
        }
        console.log(`Успешно създаване на ${scheduledCount} известия за следващите 4 дни.`);
    } catch (error) {
        console.log('Грешка при създаване на известия:', error);
    }
};
