const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyATr38SZhW5pUPd8pQNJjojP6mxrq39Hos",
  authDomain: "eih-inventory.firebaseapp.com",
  databaseURL: "https://eih-inventory-default-rtdb.firebaseio.com",
  projectId: "eih-inventory",
  storageBucket: "eih-inventory.firebasestorage.app",
  messagingSenderId: "564301733461",
  appId: "1:564301733461:web:291062ce2b8419a516fedc",
  measurementId: "G-KQF9T0E8T2"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Define customized administrative user payload
const defaultAdmin = {
  id: 'admin_default',
  name: 'Yasir Khanzada',
  email: 'yasir@gmail.com',
  password: 'admin@123',
  role: 'admin',
  department: 'Administration',
  status: 'active',
  created_at: new Date().toISOString()
};

console.log('Seeding administrative profile to your Firebase database...');

const adminRef = ref(database, 'users/admin_default');
set(adminRef, defaultAdmin)
  .then(() => {
    console.log('\n=============================================');
    console.log('SUCCESS: Admin credentials seeded successfully!');
    console.log('Email: yasir@gmail.com');
    console.log('Password: admin@123');
    console.log('=============================================\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('ERROR: Failed to seed admin account:', err);
    process.exit(1);
  });
