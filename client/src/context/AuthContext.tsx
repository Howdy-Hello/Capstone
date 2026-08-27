import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  bio: string;
  avatar_url: string | null;
  updated_at: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  profileLoading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Which user the `profile` above was actually fetched for -- null means "not
  // fetched yet". A plain profileLoading boolean was not enough: on a hard load
  // of /profile the !userId branch below sets it false while session is still
  // null, and React then commits the resolved session in the same pass. Passive
  // effects run child-before-parent, so Profile's seeding effect saw
  // profileLoading === false with profile === null, seeded every field blank,
  // and the next Save wrote those blanks over the user's real username, bio and
  // avatar. Comparing the id makes "loaded" a fact about this user, not a
  // timing-dependent flag. It is tracked separately from `profile` because a
  // brand-new account legitimately has no row and must still count as loaded.
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setProfile(null);
      setProfileUserId(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, username, bio, avatar_url, updated_at")
      .eq("id", userId)
      .maybeSingle();

    // Only mark the fetch settled when it actually succeeded. On failure the
    // consumer keeps showing its loading state rather than seeding from null
    // and offering to save the blanks.
    if (!error) {
      setProfile((data as UserProfile | null) ?? null);
      setProfileUserId(userId);
    }
  }, [session?.user.id]);

  const profileLoading = loading || profileUserId !== (session?.user.id ?? null);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch(() => {
        // Treat a session-read failure as signed-out rather than hanging on the spinner.
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  // Identity-stable across token refreshes.
  //
  // auth-js registers a visibilitychange listener and refreshes the session
  // every time the tab regains focus, which fires onAuthStateChange with a
  // brand-new session object. Handing `session.user` straight to consumers gave
  // them a new object reference each time, and 33 dependency arrays across the
  // hooks key off `user`. The worst of them is GameContext's loadOrCreateSession:
  // a new identity re-ran the load effect, which sets loading = true and refetches
  // every stock, event and price row -- so simply switching tabs and coming back
  // made the whole app flash through its loading state and "reload".
  //
  // Keyed on the id: a refreshed token keeps the same user object, while a real
  // sign-in/sign-out still produces a new one. Consumers that need the rotating
  // access token read `session` instead, which is unmemoised on purpose.
  const userId = session?.user.id ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const user = useMemo(() => session?.user ?? null, [userId]);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    profileLoading,
    refreshProfile,
    signOut,
  }), [user, session, profile, loading, profileLoading, refreshProfile, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
