# PawsCura — Complete Codebase Study Guide & Technical Reference

This study guide breaks down every layer of **PawsCura**—from how the app boots up, manages real-time cloud state, and runs multimodal AI diagnostics, to how the interactive clinic map renders street-level routing. Every section links directly to the source files and line numbers so you can jump straight to the code while studying.

---

## 1. Tech Stack & High-Level Architecture

| Layer | Technology Used | Key Files | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework & Runtime** | React Native `0.88.0` + Expo SDK `58` (Hermes Engine) | `package.json`, `app.json` | Cross-platform mobile app runtime & native APIs (Camera, ImagePicker, Location, FileSystem) |
| **Navigation** | React Navigation v7 (`@react-navigation/stack` & `bottom-tabs`) | `src/navigation/AppNavigator.js`, `src/navigation/BottomTabNavigator.js` | Auth-gated stack routing and custom floating pill tab bar |
| **Authentication & Database** | Firebase v12 (`firebase/auth`, `firebase/firestore`) | `src/services/firebaseConfig.js` | Email/Password authentication and real-time NoSQL cloud sync |
| **AI & Computer Vision** | Google Gemini API (`@google/genai` SDK, `gemini-2.5-flash` + `gemini-1.5-flash` fallback) | `src/services/gemini.js` | Multimodal pet skin/symptom diagnosis, pet visual recognition, and 24/7 Vet Chatbot |
| **Maps & Geolocation** | `@expo/dom-webview` + Leaflet `1.9.4` + Google Maps Road Tiles + OSRM Routing API + `expo-location` | `src/components/InteractiveClinicMap.js`, `src/screens/ClinicScreen.js`, `src/services/googleMaps.js` | GPS coordinates, Haversine distance calculation, interactive clinic pins, and real road-path polylines |
| **Styling & Design System** | React Native `StyleSheet` + `expo-linear-gradient` + `Public Sans` typography | `src/theme/colors.js`, `src/polyfill.js` | Warm earthy color palette (`#794B35` primary brown, `#FFF8F1` cream background) & global font injection |

---

## 2. Boot Sequence & Global Runtime Pipeline

When a user taps the PawsCura icon on Android, the execution flows through three files in order:

### Step 1: Entry Point — `index.js`
1. Imports `./src/polyfill` **first** before any other library loads.
2. Imports `react-native-gesture-handler` for touch/swipe gestures.
3. Registers `App` as the root component via `registerRootComponent(App)`.

### Step 2: Runtime Polyfills & Typography Engine — `src/polyfill.js`
This file solves two critical cross-platform concerns before the UI renders:
- **`InteractionManager` Compatibility (lines 6–41)**: React Native `0.88` removed `InteractionManager` from its core exports, which `@react-navigation/stack` still calls during screen transitions. `polyfill.js` attaches a working `InteractionManager` implementation directly onto `require('react-native')` (and `scripts/patch-rn.js` patches it during `npm install`).
- **Automatic `Public Sans` Font Injection (lines 44–125)**: Instead of manually writing `fontFamily: 'PublicSans_700Bold'` on hundreds of `<Text>` tags across the app, `resolveAppFont(weight)` intercepts React's JSX runtime (`react/jsx-runtime`) and automatically maps standard `fontWeight` values (`'300'` -> `PublicSans_300Light`, `'600'` -> `PublicSans_600SemiBold`, `'700'`/`'bold'` -> `PublicSans_700Bold`, `'800'` -> `PublicSans_800ExtraBold`) while leaving icon fonts (`Ionicons`) untouched.

### Step 3: Root Application Shell — `App.js`
1. **`AppErrorBoundary` (lines 15–48)**: A React class error boundary that catches unexpected rendering errors and displays a friendly `"Something went wrong"` recovery screen with a `"Try Again"` button instead of crashing the app.
2. **Font Loading (lines 85–96)**: Loads all 6 weights of `PublicSans` from `assets/fonts/` using `useFonts()`.
3. **Provider Nesting (lines 99–113)**:
   ```text
   AppErrorBoundary
    └── AuthProvider            (tracks logged-in Firebase user)
         └── SubscriptionProvider (tracks Free vs. Premium & daily scan quota)
              └── HealthProvider  (streams user's pets & healthRecords from Firestore)
                   └── GestureHandlerRootView
                        ├── NavigationContainer -> AppNavigator
                        └── SplashScreen (smooth animated overlay that fades out after 650ms)
   ```

---

## 3. State Management & Cloud Firestore Schema

PawsCura uses **React Context API** backed by **Firebase Firestore `onSnapshot` real-time listeners**. Whenever a document changes in Firestore (e.g., adding a pet, saving a scan, or an admin suspending a user from the web dashboard), the mobile app updates instantaneously without needing a manual refresh.

### Firestore Collections
1. **`users/{uid}`**:
   - `username`, `email`, `isPremium` (boolean), `isSuspended` (boolean), `scanUsageCount` (number), `scanUsageDate` (`YYYY-MM-DD`).
2. **`pets/{petId}`**:
   - `userId`, `name`, `species` (`Dog` | `Cat`), `breed`, `gender`, `birthday`, `age`, `weight`, `color`, `referencePhotos` (array of up to 4 angle objects `{ angle, base64, mimeType }`), `createdAt`.
3. **`healthRecords/{recordId}`**:
   - `userId`, `petId`, `petName`, `petSpecies`, `condition`, `status` (`Safe` | `Mild` | `Moderate` | `Urgent`), `confidence`, `area`, `duration`, `symptoms`, `description`, `recommendedAction`, `alternatives`, `imageUri`, `date`.
4. **`vetClinics/{clinicId}`**:
   - `name`, `address`, `phone`, `rating`, `reviewCount`, `isOpen`, `hours`, `openDays`, `coordinates` (`{ latitude, longitude }`), `services`, `specialties`, `reviews`.

---

## 4. Navigation Architecture (`src/navigation/`)

### 1. Root Stack — `src/navigation/AppNavigator.js`
Uses conditional rendering based on `const { user, loading } = useAuth()`:
- **When `user === null` (Unauthenticated Stack)**: `Welcome` -> `Login` -> `Signup`.
- **When `user !== null` (Authenticated Stack)**: `MainTabs` (`BottomTabNavigator`), `Settings`, `Chatbot` (modal), and `Paywall` (fullScreenModal).

### 2. Custom Floating Pill Bottom Tab Bar — `src/navigation/BottomTabNavigator.js`
- Renders 5 tabs: **Home**, **Pets**, **Scan** (elevated orange center circle button `#D88D59`), **Clinics**, and **Records**.
- **Auto-Hiding Navbar & Floating Chatbot**: When a screen opens a full-screen workflow (such as the Add/Edit Pet modal in `PetsScreen` or the active scan wizard in `ScanScreen`), that screen sets `navigation.setOptions({ tabBarStyle: { display: 'none' } })`. `CustomPillTabBar` detects this and hides both the bottom pill bar and the floating `DraggableChatbot` head so they never block form inputs or buttons.

---

## 5. Deep Dive: Core Features & Screens

1. **Multimodal AI Pet Scanner (`src/screens/ScanScreen.js` & `src/services/gemini.js`)**:
   - Sends the captured symptom photo along with all stored `referencePhotos` of the user's registered pets to `gemini-2.5-flash` (with automatic fallback to `gemini-1.5-flash`).
   - Returns structured JSON identifying which pet is in the photo (`matchedPetId`, `matchConfidence`), the primary `suspectedCondition`, diagnostic `confidence`, `alternatives`, a 4-tier `urgencyLevel` (`Safe`, `Mild`, `Moderate`, `Urgent`), clinical `analysis`, and `recommendedAction`.
2. **Pet Profiles & Multi-Angle Reference Photos (`src/screens/PetsScreen.js` & `src/components/PetCard.js`)**:
   - Stores up to 4 compressed Base64 reference angles (`front`, `back`, `left`, `right`) per pet, calculates age from birthday, and supports full CRUD operations.
3. **Veterinary Clinic Finder & Road Routing (`src/screens/ClinicScreen.js` & `src/components/InteractiveClinicMap.js`)**:
   - Uses `@expo/dom-webview` + Leaflet 1.9.4 + Google Maps road tiles (`mt0–mt3.google.com`) + OSRM GeoJSON street routing (`router.project-osrm.org` and `routing.openstreetmap.de`).
   - Computes distances via the Haversine formula (`calculateDistance` in `src/services/googleMaps.js`).
4. **24/7 AI Vet Chatbot (`src/screens/ChatbotScreen.js` & `src/components/DraggableChatbot.js`)**:
   - Magnetized draggable floating button using `PanResponder` + `Animated.ValueXY`.
   - Multi-turn chat with pet-context injection, image attachments, and `AsyncStorage` persistence.
5. **Freemium vs. Premium Monetization (`src/context/SubscriptionContext.js` & `src/screens/PaywallScreen.js`)**:
   - Free tier allows 1 pet, 2 AI scans/day, 3 nearest clinics, and 3 chatbot messages/session with sponsored ad components (`AdBanner.js`, `AdRich.js`). Premium unlocks unlimited pets, unlimited scans, cloud health record saving, all clinics, unlimited chat, and removes all ads.

