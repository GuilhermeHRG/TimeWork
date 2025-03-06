import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAWvHQuHxroAGd3z620v5I1l7_LWNeI2bI",
  authDomain: "tcc-timetocode.firebaseapp.com",
  projectId: "tcc-timetocode",
  storageBucket: "tcc-timetocode.appspot.com", // Corrigido
  messagingSenderId: "803148399009",
  appId: "1:803148399009:web:29a78f54a3a686f2af8be0",
  measurementId: "G-PSW4MK3P0K"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ✅ Exporta collection para evitar erro
export { collection, addDoc };
