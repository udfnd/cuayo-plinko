# Plinko Demo 구현 계획

## Phase 1: 프로젝트 설정
- [x] Next.js + React + TypeScript 프로젝트 초기화
- [x] CLAUDE.md 작성

## Phase 2: 핵심 로직
- [x] Seed 기반 PRNG 구현 (xorshift32 + seed hashing)
- [x] 독자 배수표(multiplier table) 설계 (low/medium/high × 8/12/16)
- [x] 확률 분포 계산 로직 (이항계수 기반)
- [x] 기대값(EV) 계산 로직

## Phase 3: 렌더링
- [x] Canvas 기반 Plinko 보드 렌더링
- [x] 핀(peg) 배치 로직
- [x] 슬롯 및 배수 표시

## Phase 4: 애니메이션
- [x] 공 드롭 경로 생성
- [x] 프레임 단위 애니메이션 (easing 적용)
- [x] 다중 공 동시 드롭 지원

## Phase 5: UI 구현
- [x] 설정 패널 (bet, rows, risk, seed)
- [x] Drop / Auto 버튼
- [x] 결과 표시 (슬롯, 배수, 지급액)
- [x] 최근 20개 히스토리
- [x] 확률 분포 / 기대값 테이블

## Phase 6: 문서화 및 테스트
- [x] README.md 작성
- [x] demo.md 작성
- [x] pnpm install / dev / build 테스트

---

## 완료! (All tasks completed)
