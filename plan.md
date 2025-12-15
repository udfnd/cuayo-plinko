# Cuayo Demo 구현 계획

## Phase 1: 프로젝트 설정
- [x] Next.js + React + TypeScript 프로젝트 초기화
- [x] CLAUDE.md 작성

## Phase 2: Plinko 핵심 로직
- [x] Seed 기반 PRNG 구현 (xorshift32 + seed hashing)
- [x] 독자 배수표(multiplier table) 설계 (low/medium/high × 8/12/16)
- [x] 확률 분포 계산 로직 (이항계수 기반)
- [x] 기대값(EV) 계산 로직

## Phase 3: Plinko 렌더링
- [x] Canvas 기반 Plinko 보드 렌더링
- [x] 핀(peg) 배치 로직
- [x] 슬롯 및 배수 표시
- [x] 물리 엔진 구현 (충돌, 반발, 마찰)

## Phase 4: Plinko 애니메이션
- [x] 공 드롭 경로 생성
- [x] 프레임 단위 애니메이션 (물리 기반)
- [x] 다중 공 동시 드롭 지원
- [x] 이미지 드롭 및 사운드 효과

## Phase 5: Plinko UI 구현
- [x] 설정 패널 (bet, rows, risk, seed)
- [x] Drop / Auto 버튼
- [x] 결과 표시 (슬롯, 배수, 지급액)
- [x] 최근 20개 히스토리
- [x] 확률 분포 / 기대값 테이블

## Phase 6: 라우팅 구조 변경
- [x] `/` 홈 허브 페이지 구현
- [x] `/plinko` 페이지 분리
- [x] `/crash` 페이지 생성
- [x] GameTabs 네비게이션 컴포넌트

## Phase 7: Crash 게임 핵심 로직
- [x] 해시 체인(커밋) 방식 구현
- [x] HMAC-SHA256 기반 crashPoint 계산
- [x] 게임 상태 머신 (BETTING → RUNNING → CRASHED → NEXT_ROUND)
- [x] 시드 기반 재현 가능한 결과

## Phase 8: Crash 게임 UI
- [x] 배수 표시 디스플레이
- [x] 베팅 패널 (bet, auto cashout)
- [x] Cash Out 버튼
- [x] 히스토리 표시
- [x] Verify 패널 (검증 기능)

## Phase 9: 문서화 및 테스트
- [x] README.md 작성
- [x] demo.md 작성
- [x] pnpm install / dev / build 테스트

---

## 완료! (All tasks completed)

### 구현된 기능 요약

**Plinko:**
- Canvas 기반 물리 시뮬레이션
- 시드 기반 재현 가능한 결과
- 커스텀 이미지 드롭
- 사운드 효과
- 3단계 리스크 레벨 (low/medium/high)
- 8/12/16 행 지원

**Crash:**
- 해시 체인 기반 provably fair 시스템
- 실시간 배수 상승 애니메이션
- 자동/수동 캐시아웃
- 검증 가능한 게임 해시
- 20개 히스토리 표시

**공통:**
- 게임 선택 홈 허브
- 탭 기반 네비게이션
- 반응형 UI
