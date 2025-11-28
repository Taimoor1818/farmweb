<<<<<<< HEAD
# Firebase Firestore Setup Guide - Production Mode

## Finding the Rules Tab

If you don't see a "Rules" tab, try these steps:

### Option 1: Look for Rules in the Top Menu
1. Go to Firebase Console: https://console.firebase.google.com
2. Select project "farmweb-2c6ae"
3. Click **"Firestore Database"** in left sidebar
4. Look at the **top tabs**: Overview | Data | Rules | Indexes | Usage
5. Click the **"Rules"** tab

### Option 2: If Still Not Visible
The database might not be fully initialized. Try:
1. Click **"Firestore Database"** in the left menu
2. If you see "Create database" button, click it
3. Choose **"Start in test mode"** (easier for development)
4. Select a location (e.g., us-central)
5. Click "Enable"

## Test Mode vs Production Mode

### Test Mode (Recommended for Development)
- Allows all reads/writes for 30 days
- Good for getting started quickly
- You'll see this rule:
```
allow read, write: if request.time < timestamp.date(2025, 12, 26);
```

### Production Mode (What You Have)
- Blocks all access by default
- More secure but needs rules configured
- Default rule:
```
allow read, write: if false;
```

## Quick Fix: Switch to Test Mode

If you can't find the Rules tab:
1. **Delete the current Firestore database**:
   - Go to Firestore Database
   - Click the 3 dots menu (⋮)
   - Select "Delete database"
   
2. **Recreate in Test Mode**:
   - Click "Create database"
   - Select **"Start in test mode"**
   - Click "Enable"

This will give you 30 days to develop, then you can add proper rules later.

## Proper Production Rules (For Later)

Once you can access the Rules tab, use these:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Verify It's Working

After updating rules, test by:
1. Go to your app: http://localhost:3000
2. Try adding a customer in Users section
3. Check if it saves (you should see a success toast)
4. Refresh the page - data should persist

Need help? Let me know what you see in your Firebase console!
=======
# Firebase Firestore Setup Guide - Production Mode

## Finding the Rules Tab

If you don't see a "Rules" tab, try these steps:

### Option 1: Look for Rules in the Top Menu
1. Go to Firebase Console: https://console.firebase.google.com
2. Select project "farmweb-2c6ae"
3. Click **"Firestore Database"** in left sidebar
4. Look at the **top tabs**: Overview | Data | Rules | Indexes | Usage
5. Click the **"Rules"** tab

### Option 2: If Still Not Visible
The database might not be fully initialized. Try:
1. Click **"Firestore Database"** in the left menu
2. If you see "Create database" button, click it
3. Choose **"Start in test mode"** (easier for development)
4. Select a location (e.g., us-central)
5. Click "Enable"

## Test Mode vs Production Mode

### Test Mode (Recommended for Development)
- Allows all reads/writes for 30 days
- Good for getting started quickly
- You'll see this rule:
```
allow read, write: if request.time < timestamp.date(2025, 12, 26);
```

### Production Mode (What You Have)
- Blocks all access by default
- More secure but needs rules configured
- Default rule:
```
allow read, write: if false;
```

## Quick Fix: Switch to Test Mode

If you can't find the Rules tab:
1. **Delete the current Firestore database**:
   - Go to Firestore Database
   - Click the 3 dots menu (⋮)
   - Select "Delete database"
   
2. **Recreate in Test Mode**:
   - Click "Create database"
   - Select **"Start in test mode"**
   - Click "Enable"

This will give you 30 days to develop, then you can add proper rules later.

## Proper Production Rules (For Later)

Once you can access the Rules tab, use these:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Verify It's Working

After updating rules, test by:
1. Go to your app: http://localhost:3000
2. Try adding a customer in Users section
3. Check if it saves (you should see a success toast)
4. Refresh the page - data should persist

Need help? Let me know what you see in your Firebase console!
>>>>>>> 57e33c11d4d972c13cf59442880c8debd5b7f7ef
