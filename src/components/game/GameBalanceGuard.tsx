'use client';

import { useAuth } from '@/components/auth';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './GameBalanceGuard.module.css';

interface GameBalanceGuardProps {
  children: React.ReactNode;
  requiredBalance?: number;
}

export default function GameBalanceGuard({
  children,
  requiredBalance = 1,
}: GameBalanceGuardProps) {
  const { profile, isLoading, isInitialized } = useAuth();
  const pathname = usePathname();

  // 초기화 전 또는 로딩 중
  if (!isInitialized || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  // 로그인하지 않은 경우
  if (!profile) {
    const loginUrl = `/auth/login?from=${encodeURIComponent(pathname)}`;
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          <h2>로그인이 필요합니다</h2>
          <p>게임을 플레이하려면 먼저 로그인해주세요.</p>
          <div className={styles.actions}>
            <Link href={loginUrl} className={styles.primaryButton}>
              로그인
            </Link>
            <Link href="/auth/signup" className={styles.secondaryButton}>
              회원가입
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 잔고 부족
  if (profile.balance < requiredBalance) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          <h2>잔고가 부족합니다</h2>
          <p>현재 잔고: {profile.balance.toLocaleString('ko-KR')}원</p>
          <p>필요 잔고: {requiredBalance.toLocaleString('ko-KR')}원</p>
          <InsufficientBalanceButton />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function InsufficientBalanceButton() {
  const handleClick = () => {
    alert('도박 중독은 1336\n\n한국도박문제관리센터: 1336\n24시간 무료 상담 가능');
  };

  return (
    <button onClick={handleClick} className={styles.requestButton}>
      관리자에게 잔고 충전 요청
    </button>
  );
}
