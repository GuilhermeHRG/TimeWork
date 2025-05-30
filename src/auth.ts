// src/auth.ts
import { getAuth, signInAnonymously } from 'firebase/auth';
import { app } from './firebase';

const auth = getAuth(app);

export async function authenticateUser() {
  try {
    const result = await signInAnonymously(auth);
    const user = result.user;
    console.log('Usuário anônimo autenticado:', user.uid);
    return {
      uid: user.uid
    };
  } catch (error) {
    console.error('Erro ao autenticar anonimamente:', error);
    return null;
  }
}
