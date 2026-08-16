"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import {
  onUser,
  sendSignInLink,
  signInWithGoogle,
  signInWithApple,
  signOut,
  type SignInResult,
} from "@/lib/firebase";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  sendSignInLink: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<SignInResult>;
  signInWithApple: () => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  sendSignInLink,
  signInWithGoogle,
  signInWithApple,
  signOut,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onUser((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        sendSignInLink,
        signInWithGoogle,
        signInWithApple,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  return useContext(Ctx);
}
