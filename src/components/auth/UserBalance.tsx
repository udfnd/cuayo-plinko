'use client';

import { useState } from 'react';
import styles from './UserBalance.module.css';

interface UserBalanceProps {
  balance: number;
  nickname: string;
}

export default function UserBalance({ balance, nickname }: UserBalanceProps) {
  const [showModal, setShowModal] = useState(false);

  const handleRequestBalance = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.info}>
        <span className={styles.nickname}>{nickname}</span>
        <span className={styles.balance}>
          {balance.toLocaleString('ko-KR')}원
        </span>
      </div>

      {balance <= 0 && (
        <button onClick={handleRequestBalance} className={styles.requestButton}>
          관리자에게 잔고 충전 요청
        </button>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>잠깐!</h3>
            <p className={styles.modalText}>도박 중독은 1336</p>
            <p className={styles.modalSubtext}>
              한국도박문제관리센터: 1336
              <br />
              24시간 무료 상담 가능
            </p>
            <button onClick={closeModal} className={styles.modalButton}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
