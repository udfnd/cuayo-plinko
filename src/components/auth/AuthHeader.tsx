'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UserBalance from './UserBalance';
import { useAuth } from './AuthProvider';
import styles from './AuthHeader.module.css';

export default function AuthHeader() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    // Context의 signOut 사용 - 즉시 profile을 null로 설정 후 Supabase 로그아웃
    await signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        Cuayo
      </Link>

      <nav className={styles.nav}>
        {profile ? (
          <>
            <UserBalance balance={profile.balance} nickname={profile.nickname} />
            <button onClick={handleSignOut} className={styles.logoutButton}>
              로그아웃
            </button>
          </>
        ) : (
          <div className={styles.authLinks}>
            <Link href="/auth/login" className={styles.loginLink}>
              로그인
            </Link>
            <Link href="/auth/signup" className={styles.signupLink}>
              회원가입
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
