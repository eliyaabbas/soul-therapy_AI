# SoulTherapy — جامع السعادات

> A guided AI companion for tazkiyah al-nafs (soul purification), based on *Jami' al-Sa'adat* (The Collector of Felicities) by Mulla Ahmad al-Naraqi.

---

## 📱 Features

- **6 Authentication Methods**: Google, Facebook, Apple, Instagram (via Facebook), Email/Password, Phone/SMS OTP
- **AI Soul Assessment**: Socratic dialogue to identify vices & virtues from the book's taxonomy
- **4 Purification Cycles**: Musharatah → Muraqabah → Muhasabah → Mu'atabah
- **Soul Ledger**: Persistent daily accounting saved to PostgreSQL
- **Soul Radar**: Visual balance bars for the 3 soul-powers ('Aql, Ghadab, Shahwah)
- **PWA Ready**: Installable on iOS and Android
- **Vercel Edge**: Global deployment with serverless functions

---

## 🚀 Quick Deploy to Vercel

### 1. Clone & Install

```bash
git clone <your-repo>
cd soul-therapy
npm install
cp .env.local.example .env.local
```

### 2. Set Up Database

In Vercel Dashboard → Storage → Create Postgres database. Then:

```bash
vercel env pull
psql $POSTGRES_URL < schema.sql
```

### 3. Configure Auth Providers

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`
4. Copy Client ID & Secret to `.env.local`

#### Facebook (+ Instagram)
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create app → Add Facebook Login product
3. Set valid OAuth redirect: `https://yourdomain.com/api/auth/callback/facebook`
4. Copy App ID & Secret to `.env.local`
> Instagram users: They authenticate via their Facebook-linked account

#### Apple Sign In
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Certificates → Identifiers → Register App ID → Enable Sign in with Apple
3. Create a Services ID with return URL: `https://yourdomain.com/api/auth/callback/apple`
4. Create a Key with Sign in with Apple capability
5. Download the `.p8` key file
6. Add to `.env.local`: `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (contents of .p8)

#### Twilio (Phone/SMS OTP)
1. Sign up at [twilio.com](https://console.twilio.com)
2. Get a phone number with SMS capability
3. Copy Account SID, Auth Token, Phone Number to `.env.local`
> **Dev mode**: If Twilio vars are not set, OTP codes are logged to server console

#### Anthropic API
1. Get API key at [console.anthropic.com](https://console.anthropic.com)
2. Add `ANTHROPIC_API_KEY` to `.env.local`

### 4. Generate NextAuth Secret

```bash
openssl rand -base64 32
# Paste into NEXTAUTH_SECRET in .env.local
```

### 5. Deploy

```bash
# Link to Vercel
vercel link

# Push env vars
vercel env add NEXTAUTH_SECRET
# (repeat for all env vars)

# Deploy
vercel --prod
```

---

## 🏗️ Project Structure

```
soul-therapy/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts  # NextAuth with all 6 providers
│   │   │   ├── otp/route.ts            # Phone OTP send/verify (Twilio)
│   │   │   └── register/route.ts       # Email registration
│   │   └── soul/
│   │       ├── chat/route.ts           # AI conversation engine
│   │       ├── profile/route.ts        # Soul profile CRUD
│   │       └── ledger/route.ts         # Daily cycle ledger
│   ├── auth/page.tsx                   # Auth page (server)
│   ├── cycles/page.tsx                 # Main app (protected)
│   ├── layout.tsx                      # Root layout + fonts
│   └── page.tsx                        # Landing (redirects if authed)
│
├── components/
│   ├── auth/AuthClient.tsx             # Full auth UI (all 6 methods)
│   ├── soul/CyclesClient.tsx           # Main soul app (4 cycles)
│   ├── LandingClient.tsx               # Landing page
│   └── Providers.tsx                   # SessionProvider wrapper
│
├── styles/globals.css                  # Global styles + animations
├── schema.sql                          # PostgreSQL schema
├── vercel.json                         # Vercel deployment config
└── .env.local.example                  # All required env vars
```

---

## 📚 The 4 Cycles (from Jami' al-Sa'adat)

| Cycle | Arabic | Time | Purpose |
|-------|--------|------|---------|
| **Musharatah** | المشارطة | Dawn | Set the soul's contract for the day |
| **Muraqabah** | المراقبة | Day | Watchfulness — observe your soul |
| **Muhasabah** | المحاسبة | Dusk | Evening reckoning — settle the ledger |
| **Mu'atabah** | المعاتبة | Night | Loving reproach and renewal |

---

## 🔧 Local Development

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint check
```

---

## 📱 Making it a Native App (Optional)

To wrap as a true native app using Capacitor:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init SoulTherapy com.yourname.soultherapy
npm run build && npx cap sync
npx cap open ios     # Opens in Xcode
npx cap open android # Opens in Android Studio
```

---

## 🤝 Based on

- *Jami' al-Sa'adat* (جامع السعادات) — Mulla Ahmad Naraqi
- *Ihya 'Ulum al-Din* — Abu Hamid al-Ghazali  
- *Madarij al-Salikin* — Ibn Qayyim al-Jawziyyah

---

*"The most excellent jihad is the conquest of one's own soul." — The Prophet ﷺ*
