import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// คอนฟิกการเชื่อมต่อ Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDpl1bykKCFooUCogV5O4b38-X87qagXFc",
  authDomain: "techromancer-project.firebaseapp.com",
  projectId: "techromancer-project",
  storageBucket: "techromancer-project.firebasestorage.app",
  messagingSenderId: "1047885430496",
  appId: "1:1047885430496:web:98280d4c3982a762cd9a85",
  measurementId: "G-V4ZJJ0F3PG"
};

// เริ่มต้น Firebase app
const app = initializeApp(firebaseConfig);
console.log("✅ Firebase initialized:", app.name); // จะเห็นข้อความนี้ใน Console ถ้าเชื่อมสำเร็จ

// เริ่มต้น Analytics
const analytics = getAnalytics(app);

export { app, analytics }; // ส่งออก `app` และ `analytics`
