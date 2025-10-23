# 🎤 VoiceTel Phone

A cross-platform WebRTC SIP phone built with Electron for VoiceTel communications. Make and receive calls directly from your desktop with a modern, intuitive interface.

![Version](https://img.shields.io/badge/version-3.4.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

## ✨ Features

### 📞 Core Telephony
- **WebRTC/SIP Integration** - Full SIP over WebSocket support using SIP.js
- **Outgoing Calls** - Dial any number with automatic number sanitization
- **Incoming Calls** - Visual call notifications with caller ID display
- **Call Controls** - Mute, hang up, call duration timer
- **DTMF Support** - Send touch-tone digits during calls via dialpad or keyboard

### 🔐 Security & Privacy
- **Local Storage** - Credentials stored locally using browser storage
- **Hide Caller ID** - Optional privacy mode for outgoing calls
- **No External Dependencies** - All data processing happens locally

### 🎨 User Interface
- **Three-Panel Design**
  - 📞 Phone - Main dialing and call interface
  - 📋 Event Log - Real-time SIP message logging
  - ⚙️ Settings - SIP configuration and credentials
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

## 🚀 Installation

### Download Pre-built Binaries
Download the latest release for your platform from the [Releases](https://github.com/voicetel/voicetel-phone/releases).

### Build from Source

#### Prerequisites
- Node.js 16+ and npm
- Git

#### Steps
```bash
# Clone the repository
git clone https://github.com/voicetel/voicetel-phone.git
cd voicetel-phone

# Install dependencies
npm install

# Run in development mode
npm start

# Build for your platform
npm run build              # Current platform
npm run build:mac          # macOS only
npm run build:win          # Windows only
npm run build:linux        # Linux only
npm run build:all          # All platforms

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
