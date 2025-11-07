# 🎤 VoiceTel Phone

A cross-platform WebRTC SIP phone built with Electron for VoiceTel communications. Make and receive calls directly from your desktop with a modern, intuitive interface.

![Version](https://img.shields.io/badge/version-3.5.6-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

## 📚 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Screenshots](#-screenshots)
- [Privacy](#-privacy)
- [Contributors](#-contributors)
- [Sponsors](#-sponsors)
- [License](#-license)

## ✨ Features

### 📞 Core Telephony
- **WebRTC/SIP Integration** - Full SIP over WebSocket support using SIP.js
- **Outgoing Calls** - Dial any number with automatic number sanitization
- **Incoming Calls** - Visual call notifications with caller ID display
- **Call Controls** - Mute, hang up, call duration timer
- **DTMF Support** - Send touch-tone digits during calls via dialpad or keyboard
- **Ringing Handling** - Local ringback on 180/183; early media muted until answer

### 🔐 Security & Privacy
- **Local Storage** - Credentials stored locally using browser storage
- **Hide Caller ID** - Optional privacy mode for outgoing calls
- **No External Dependencies** - All data processing happens locally

### 🎨 User Interface
- **Desktop-First Design**
  - 📞 Phone - Main dialing and call interface with large buttons
  - 👥 Contacts - Google Contacts integration with search and quick dial
  - 📜 Call History - View past calls with inline audio playback for recordings
  - 📋 Event Log - Real-time SIP message logging and debugging
  - ⚙️ Settings - SIP configuration, credentials, and call recording preferences
- **Visual Call Indicators** - Ringing animation, call status, duration display
- **Desktop Notifications** - System notifications for incoming calls
- **Keyboard Shortcuts**
  - `Enter` - Answer incoming call
  - `Escape` - Decline incoming call

### 🔧 Advanced Features
- **Caller ID Customization** - Set custom display name and 10-digit North American caller ID
- **Smart Number Handling** - Accepts any format, automatically cleans to digits
- **Auto-Rejection** - Busy signal for incoming calls when already on a call
- **30-Second Timeout** - Auto-decline unanswered incoming calls
- **Automatic DTMF** - RFC 2833 telephone-event with SIP INFO fallback
- **WebRTC Diagnostics** - Built-in troubleshooting tips for media negotiation issues
- **Call History** - Track incoming, outgoing, missed, and declined calls with timestamps
- **Redial Functionality** - Quick redial from call history with formatted phone numbers
- **Google Contacts Integration** - Seamless access to your Google Contacts
  - Sign in with Google to access your contacts
  - Account selection support for multiple Google accounts
  - Search contacts by name or phone number
  - Quick dial by clicking any contact's phone number
  - Displays contact name, phone number, and phone type (mobile, work, home, etc.)
  - Refresh contacts to sync latest changes
  - Clear contacts list when needed
  - Only contacts with phone numbers are displayed
- **Call Recording** - Optional automatic recording of all calls with inline playback
  - Enable/disable recording in Settings
  - Recordings stored locally in app data directory
  - Inline audio player in call history for easy playback
  - Clear all recordings with one click
  - Mixed audio tracks (local + remote) for complete call capture

## 🚀 Installation

### Download Pre-built Binaries
Download the latest release for your platform from the [Releases](https://github.com/voicetel/voicetel-phone-desktop/releases).

**Available Packages:**
- **Windows**: NSIS Installer, MSI Installer, Portable Executable
- **macOS**: DMG, ZIP
- **Linux**: AppImage, DEB, RPM

### Build from Source

#### Prerequisites
- Node.js 16+ and npm
- Git
- Docker (for cross-platform builds)

#### Quick Start
```bash
# Clone the repository
git clone https://github.com/voicetel/voicetel-phone-desktop.git
cd voicetel-phone-desktop

# Install dependencies
npm install

# Run in development mode
npm start
```

#### Build Commands

**Native Builds (Current Platform):**
```bash
npm run build              # Current platform
npm run build:mac          # macOS only
npm run build:win          # Windows only (NSIS + MSI + Portable)
npm run build:linux        # Linux only (AppImage + DEB + RPM)
npm run build:all          # All platforms
```

**Individual Windows Packages:**
```bash
npm run build:win-msi      # MSI installer only
npm run build:win-nsis     # NSIS installer only
npm run build:win-portable # Portable executable only
```

**Docker Builds (Cross-Platform):**
```bash
# Build RPM package using Docker
npm run build:rpm-docker

# Build Windows packages using Docker
npm run build:windows-docker

# Build all packages using Docker
npm run build:all-docker

# Or use the Docker script directly
./docker-build.sh rpm      # RPM only
./docker-build.sh windows  # Windows packages
./docker-build.sh all      # All packages
```

#### Docker Requirements
For cross-platform builds, ensure Docker is installed and running:
```bash
# Start Docker service
sudo systemctl start docker

# Add user to docker group (optional)
sudo usermod -aG docker $USER
```

## 🖥️ Screenshots

<p align="center">
  <img src="https://voicetel-phone.s3.us-east-1.amazonaws.com/images/linux_dialer.png" alt="Desktop — Dialer Interface" width="270" />
  <img src="https://voicetel-phone.s3.us-east-1.amazonaws.com/images/linux_event-log.png" alt="Desktop — Event Log" width="270" />
  <img src="https://voicetel-phone.s3.us-east-1.amazonaws.com/images/linux_settings.png" alt="Desktop — Settings" width="270" />
</p>

## 🔒 Privacy

All SIP signaling and media negotiation occur directly between your device and your SIP server. No analytics or third‑party tracking are embedded. Credentials are stored locally on the device.

## 🙌 Contributors

We welcome contributions! Thanks to these awesome people:

- [Michael Mavroudis](https://github.com/mavroudis) - Lead Developer & Architect

## 💖 Sponsors

Proudly supported by:

| Sponsor | Contribution |
|---------|--------------|
| [VoiceTel Communications](http://www.voicetel.com) | Primary development and testing infrastructure |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Changelog and releases are available on the [Releases](https://github.com/voicetel/voicetel-phone-desktop/releases) page.
