# Iraq Tourism CMS

A Content Management System for the Iraq Tourism mobile application built with Next.js, TypeScript, Tailwind CSS, and Firebase.

## Features

- 🌑 Dark theme UI optimized for readability
- 🔐 Secure authentication with role-based access
- 🌐 Bilingual content management (Arabic/English)
- 📱 Fully responsive design for all devices
- 🖼️ Image management with Firebase Storage
- 📊 Dashboard with statistics and analytics

## Prerequisites

- Node.js 18+ and npm/yarn
- Firebase account with Firestore database
- Firebase project with Authentication enabled

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/iraq-tourism-cms.git
cd iraq-tourism-cms
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Firebase configuration

Create a `.env.local` file in the root directory with your Firebase configuration:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production

```bash
npm run build
```

## Firebase Setup

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication with Email/Password provider
3. Create a Firestore database
4. Set up appropriate security rules for your Firestore database
5. Create an admin user through the Firebase console

## Firestore Data Structure

The CMS expects the following collections in your Firestore database:

- `categories`: Categories for listings
- `listings`: Main listings data
- `restaurant_details`: Restaurant-specific details
- `museum_details`: Museum-specific details
- `shopping_details`: Shopping-specific details
- `religious_sites_details`: Religious site-specific details
- `historical_sites_details`: Historical site-specific details
- `parks_nature_details`: Parks and nature-specific details
- `experiences_details`: Experiences-specific details
- `opening_hours`: Opening hours for venues
- `listing_images`: Images for listings
- `users`: User accounts
- `user_preferences`: User settings
- `user_favorites`: User saved listings
- `reviews`: User reviews
- `admins`: Admin users for the CMS

## Project Structure

- `/app`: Next.js App Router pages
- `/components`: Reusable UI components
- `/hooks`: Custom React hooks
- `/lib`: Utility functions and configurations
- `/providers`: Context providers
- `/styles`: Global CSS styles

## License

This project is licensed under the MIT License - see the LICENSE file for details. 