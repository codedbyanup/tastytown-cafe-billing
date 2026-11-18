# Tasty Town Cafe Billing (Android, Expo + SQLite)

1. `npx create-expo-app@latest tastytown --template blank` then `cd tastytown`
2. Copy `App.js db.js store.js billing.js schema.js menu.js` from this folder over the new project, and the `test/` folder
3. `npx expo install expo-sqlite`
4. `npx expo start`, scan the QR with Expo Go on the phone (or `eas build -p android --profile preview` for an APK)

Tests (Node 22+): `node test/run.js`
Edit table count and menu prices in `menu.js` (menu is seeded into SQLite on first launch; to re-seed, clear app data).
