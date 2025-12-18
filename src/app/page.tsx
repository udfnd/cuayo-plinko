'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <header style={{
        textAlign: 'center',
        marginBottom: '40px',
      }}>
        <h1 style={{
          fontSize: '42px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea 0%, #f5576c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '12px',
        }}>
          Cuayo
        </h1>
      </header>

      <div style={{
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {/* Plinko Card */}
        <Link href="/plinko" style={{ textDecoration: 'none' }}>
          <div style={{
            width: '280px',
            padding: '32px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}>
              🎯
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#667eea',
              marginBottom: '8px',
            }}>
              플링코
            </h2>
            <p style={{
              color: '#888',
              fontSize: '14px',
              lineHeight: '1.5',
            }}>
              공을 떨어뜨려 배수 슬롯에 넣으세요
            </p>
          </div>
        </Link>

        {/* Crash Card */}
        <Link href="/crash" style={{ textDecoration: 'none' }}>
          <div style={{
            width: '280px',
            padding: '32px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.15) 0%, rgba(245, 87, 108, 0.15) 100%)',
            border: '1px solid rgba(245, 87, 108, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}>
              📈
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#f5576c',
              marginBottom: '8px',
            }}>
              크래시
            </h2>
            <p style={{
              color: '#888',
              fontSize: '14px',
              lineHeight: '1.5',
            }}>
              배수가 터지기 전에 캐시아웃하세요
            </p>
          </div>
        </Link>

        {/* Hold'em Exchange Card */}
        <Link href="/holdem" style={{ textDecoration: 'none' }}>
          <div style={{
            width: '280px',
            padding: '32px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}>
              🃏
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#10b981',
              marginBottom: '8px',
            }}>
              홀덤 익스체인지
            </h2>
            <p style={{
              color: '#888',
              fontSize: '14px',
              lineHeight: '1.5',
            }}>
              4개의 핸드 중 승리할 핸드에 베팅하세요
            </p>
          </div>
        </Link>
      </div>
    </main>
  );
}
