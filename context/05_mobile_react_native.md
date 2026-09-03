# Patient Mobile App Specifications (React Native)

## Tech Stack
- **Framework**: React Native 0.72+ (Expo or Bare Workflow)
- **Navigation**: React Navigation

## Accessibility & Inclusive Design
- **Audio-Guided Mode**: Built-in TTS reads out every intake question clearly.
- **Big-Text / High-Contrast**: Configurable UI themes for visually impaired users.
- **Touch Alternatives**: Large, intuitive tappable buttons (emojis/icons) for symptom selection when voice recognition is unavailable.

## Native Integrations
- `react-native-camera`: Document scanning with auto-cropping capabilities.
- `react-native-voice`: Speech-to-text integration with fallback to Google / Indic ASR APIs.
- `react-native-fs`: Local filesystem caching of offline conversations during network drops.

## Offline Capabilities
- Clinical intake conversations are stored locally on-device and automatically synced when network connectivity is restored.
