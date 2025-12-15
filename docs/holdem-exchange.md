# Hold'em Exchange

Texas Hold'em 기반의 베팅 게임으로, 4개의 핸드가 동일한 보드에서 경쟁합니다.

## 게임 룰

### 개요
- 4개의 핸드 각각에 2장의 홀 카드 배분
- 5장의 커뮤니티 카드 (플랍 3장 + 턴 1장 + 리버 1장)
- 총 13장의 카드 사용 (4×2 + 5 = 13)
- 각 핸드의 최종 족보는 홀 카드 2장 + 커뮤니티 카드 5장 중 최고의 5장 조합

### 게임 진행 단계

1. **PRE_DEAL**: 초기 상태, 카드 미배분
2. **PRE_FLOP**: 4개 핸드에 홀 카드 2장씩 배분, 승률 표시
3. **FLOP**: 커뮤니티 카드 3장 공개
4. **TURN**: 커뮤니티 카드 4번째 장 공개
5. **RIVER/SETTLE**: 커뮤니티 카드 5번째 장 공개, 최종 족보 평가 및 정산

### 족보 순위 (낮은 순 → 높은 순)

1. High Card - 하이 카드
2. Pair - 원 페어
3. Two Pair - 투 페어
4. Three of a Kind - 트리플
5. Straight - 스트레이트
6. Flush - 플러시
7. Full House - 풀 하우스
8. Four of a Kind - 포카드
9. Straight Flush - 스트레이트 플러시
10. Royal Flush - 로얄 플러시

## 승률 (Equity) 계산

### Monte Carlo 시뮬레이션

각 핸드의 승률은 Monte Carlo 방식으로 계산됩니다:

```
승률 = (승리 횟수 + 무승부 횟수 / 무승부 핸드 수) / 총 시뮬레이션 횟수
```

### 계산 방식

1. 현재 공개된 카드를 제외한 나머지 카드로 덱 구성
2. 남은 커뮤니티 카드를 무작위로 배분
3. 각 핸드의 최종 족보 평가
4. 승자 결정 (동률 시 Dead Heat 처리)
5. 50,000회 반복하여 평균 승률 산출

### 설정값

| 항목 | 값 |
|------|-----|
| 기본 반복 횟수 | 50,000 |
| 최소 반복 횟수 | 1,000 |
| 최대 반복 횟수 | 100,000 |

## 베팅/정산 규칙

### Fair Odds (공정 배당률)

각 핸드의 배당률은 승률의 역수로 계산됩니다:

```
Fair Odds = 1 / Equity
```

예시:
- 승률 25% → 배당률 4.00
- 승률 50% → 배당률 2.00
- 승률 10% → 배당률 10.00

### 베팅

- PRE_FLOP, FLOP, TURN 단계에서 베팅 가능
- 핸드 선택 후 원하는 금액을 스테이크로 배팅
- 베팅 시점의 배당률이 잠금 (locked odds)
- 한 핸드에 여러 번 베팅 가능 (각 베팅의 배당률은 베팅 시점 기준)

### 정산

**승리 시:**
```
수익 = 스테이크 × (배당률 - 1)
지급액 = 스테이크 + 수익
```

**패배 시:**
```
손실 = 스테이크
지급액 = 0
```

### Dead Heat (동률) 규칙

여러 핸드가 동시에 승리할 경우:

```
Dead Heat 수익 = 수익 / 동률 핸드 수
지급액 = 스테이크 + (수익 / 동률 핸드 수)
```

예시 (4개 핸드 모두 동률):
- 스테이크: 100
- 배당률: 4.00
- 일반 수익: 100 × (4.00 - 1) = 300
- Dead Heat 수익: 300 / 4 = 75
- 최종 지급액: 100 + 75 = 175

## 데모 모드

### 시드(Seed) 기반 재현

동일한 시드를 사용하면 동일한 카드 배분을 재현할 수 있습니다:

1. "Demo Mode" 버튼 클릭
2. Custom Seed 입력 필드에 원하는 시드 문자열 입력
3. "Start" 클릭

### 시드 생성 방식

- 기본: `Date.now().toString(36)` + 랜덤 문자열
- 커스텀: 사용자 입력값

### PRNG 알고리즘

xorshift32 알고리즘 사용:
- 시드 문자열을 해시하여 32비트 정수로 변환
- 결정적(deterministic) 난수 생성

## 실행 방법

### 개발 서버

```bash
pnpm dev
```

브라우저에서 `http://localhost:3000/holdem` 접속

### 빌드

```bash
pnpm build
pnpm start
```

### 테스트

```bash
pnpm test
```

## 파일 구조

```
src/
├── app/
│   └── holdem/
│       └── page.tsx          # 메인 게임 페이지
├── components/
│   └── holdem/
│       ├── BoardDisplay.tsx   # 커뮤니티 카드 표시
│       ├── BettingPanel.tsx   # 베팅 컨트롤
│       ├── CardDisplay.tsx    # 개별 카드 렌더링
│       ├── GameControls.tsx   # 게임 진행 버튼
│       └── HandDisplay.tsx    # 핸드 표시 (승률/족보)
└── lib/
    └── holdem/
        ├── index.ts          # 모듈 exports
        ├── cards.ts          # 카드 정의
        ├── deck.ts           # 덱/셔플 로직
        ├── evaluator.ts      # 족보 평가
        ├── equity.ts         # 승률 계산
        └── gameState.ts      # 게임 상태 관리
        └── __tests__/
            └── evaluator.test.ts  # 유닛 테스트
```

## 기술 스택

- Next.js 16 (App Router)
- React 19
- TypeScript
- Vitest (테스트)
