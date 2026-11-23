# PawsCura

AI-Powered Pet Health Diagnostics, Veterinary Clinic Finder, and Pet Medical Records Mobile Application built with **React Native (Expo)**.

## Project Structure

```text
PawsCura/
├── App.js                        # Root application shell, providers, font loader & error boundary
├── index.js                      # Expo entry point
├── app.json                      # Expo & EAS build configuration
├── eas.json                      # EAS Build profiles (development, preview APK, production)
├── babel.config.js               # Babel configuration
├── package.json                  # Project dependencies and scripts
├── assets/                       # Static application assets
│   ├── fonts/                    # Public Sans font family (.ttf)
│   ├── app-logo.png              # App icon & adaptive icon foreground
│   ├── splash-logo.png           # Vertical brand logo (Splash & Welcome screens)
│   ├── logo-horizontal.png       # Horizontal brand logo (Auth headers)
│   ├── chatbot.png               # AI Assistant empty state illustration
│   ├── chatbot-head.png          # AI Assistant chat avatar
│   ├── chatbot-head-q.png        # Floating draggable chatbot button icon
│   ├── Login.png                 # Login screen puppy mascot
│   ├── Create.png                # Sign-up screen kitten mascot
│   ├── NoPetsYet.png             # Empty state illustration for pets
│   └── NoHealthRecords.png       # Empty state illustration for health records
├── docs/                         # Project documentation & UI previews
│   ├── PawsCura UI.docx          # UI/UX design documentation
│   └── preview.html              # Web UI preview
├── plugins/                      # Custom Expo config plugins
│   └── withDisableMinify.js      # Prevents R8 minification crashes in release APKs
├── scripts/                      # Build & postinstall helper scripts
│   └── patch-rn.js               # React Native compatibility patch script
└── src/                          # Application source code
    ├── polyfill.js               # Runtime polyfills & global Public Sans typography hook
    ├── components/               # Reusable UI components
    │   ├── AdBanner.js           # Sponsored banner component (free tier)
    │   ├── AdRich.js             # Rich sponsored carousel component (free tier)
    │   ├── ClinicCard.js         # Veterinary clinic list item card
    │   ├── DraggableChatbot.js   # Floating draggable AI assistant button
    │   ├── HealthLogCard.js      # Pet health assessment log card
    │   ├── InteractiveClinicMap.js # Interactive Leaflet/Google Maps clinic & road-routing map
    │   ├── PetCard.js            # Pet profile summary & widget card
    │   └── StatusBadge.js        # 4-level urgency status badge (Safe, Mild, Moderate, Urgent)
    ├── context/                  # React Context state providers
    │   ├── AuthContext.js        # Firebase Authentication state & user session
    │   ├── HealthContext.js      # Real-time Firestore pets & health logs state
    │   └── SubscriptionContext.js # Free vs. Premium subscription tier state
    ├── navigation/               # React Navigation stacks & tabs
    │   ├── AppNavigator.js       # Root Auth vs. Main app stack navigator
    │   └── BottomTabNavigator.js # Custom floating pill bottom tab bar
    ├── screens/                  # Application screens
    │   ├── SplashScreen.js       # Animated launch splash overlay
    │   ├── HomeScreen.js         # Dashboard with pet overview & recent activity
    │   ├── PetsScreen.js         # Pet profiles, multi-angle AI ID photos & CRUD modals
    │   ├── ScanScreen.js         # Multi-step AI symptom & photo diagnostic scanner
    │   ├── ClinicScreen.js       # Nearby vet clinics & turn-by-turn road routing map
    │   ├── HistoryScreen.js      # Filterable & sortable pet medical records
    │   ├── ChatbotScreen.js      # 24/7 AI Veterinary Assistant chat modal
    │   ├── PaywallScreen.js      # PawsCura Premium subscription screen
    │   ├── SettingsScreen.js     # User profile & account settings screen
    │   └── auth/                 # Authentication screens
    │       ├── WelcomeScreen.js  # Onboarding welcome screen
    │       ├── LoginScreen.js    # Email/password login & password reset
    │       └── SignupScreen.js   # Account registration with password strength validation
    ├── services/                 # External API & backend service integrations
    │   ├── firebaseConfig.js     # Firebase Auth & Firestore initialization
    │   ├── firestoreClinics.js   # Veterinary clinic loader with Google Maps/OSM fallback
    │   ├── gemini.js             # Google Gemini AI diagnostic, pet ID & chat services
    │   ├── googleMaps.js         # Geolocation & nearby veterinary clinic discovery
    │   └── ads.js                # Sponsored content definitions
    └── theme/                    # Design tokens & styling constants
        └── colors.js             # Color palette, spacing, border radius & shadow tokens
```

