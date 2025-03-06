import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { app } from "./firebase";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    return {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photo: user.photoURL,
    };
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return null;
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erro ao deslogar:", error);
  }
}

// Adiciona a função authenticateUser para evitar erro
export async function authenticateUser() {
  return await signInWithGoogle();
}
