import type {CapacitorConfig} from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.backonfit.app',
    appName: 'BackOnFit',
    webDir: 'www',
    plugins: {
        LocalNotifications: {
            iconColor: "#0d9388",
        },
        CapacitorSQLite: {
            iosDatabaseLocation: 'Library/CapacitorDatabase',
            iosIsEncryption: true,
            iosKeychainPrefix: 'angular-sqlite-app-starter',
            iosBiometric: {
                biometricAuth: false,
                biometricTitle: "Biometric login for capacitor sqlite"
            },
            androidIsEncryption: true,
            androidBiometric: {
                biometricAuth: false,
                biometricTitle: "Biometric login for capacitor sqlite",
                biometricSubTitle: "Log in using your biometric"
            },
            electronIsEncryption: true,
            electronWindowsLocation: "C:\\ProgramData\\CapacitorDatabases",
            electronMacLocation: "/Volumes/Development_Lacie/Development/Databases",
            electronLinuxLocation: "Databases"
        },
    },
};

export default config;
