# Plinko Demo

교육 및 시연 목적의 Plinko 게임 데모 웹앱입니다.

> **중요**: 이 프로젝트는 실제 도박 서비스가 아니며, 교육/데모 목적으로만 제작되었습니다.
> 배수표(multiplier table)는 독자적으로 설계된 값이며, 어떤 상용 서비스와도 동일하지 않습니다.

## 실행 방법

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 프로덕션 빌드
pnpm build
pnpm start
```

브라우저에서 `http://localhost:3000` 접속

## 게임 규칙

### Plinko란?
- 위에서 공을 떨어뜨리면, 핀(peg)에 부딪히며 좌/우로 튕기고 아래 슬롯 중 하나에 떨어짐
- 각 슬롯마다 배수(multiplier)가 있고, `지급액 = 베팅금액 × 배수`

### 물리 모델
- 각 행마다 공이 "왼쪽(-1) 또는 오른쪽(+1)"로 한 칸 이동 (50% 확률)
- N개 행이면 N+1개의 슬롯이 존재
- 슬롯 분포는 이항분포(가운데가 잘 나오고 양끝이 드묾)

### 리스크 레벨
- **Low**: 가운데 배수 안정적, 극단 배수 작음 (낮은 변동성)
- **Medium**: 균형 잡힌 배수 분포
- **High**: 가운데 배수 낮고, 극단 배수 매우 큼 (높은 변동성)

## 기술 설계

### 시드 기반 PRNG (재현 가능한 랜덤)
```
src/lib/prng.ts
```
- **알고리즘**: xorshift32 + djb2 해시
- **특징**: 같은 seed로 항상 동일한 결과 재현 가능
- **사용법**: seed 입력란에 문자열 입력 후 Drop

### 배수표 (독자 설계)
```
src/lib/multipliers.ts
```
- **설계 원칙**:
  1. 대칭 구조 (가운데 기준 좌우 동일)
  2. 가운데 안정, 양끝 고배수
  3. 기대값(EV) ≈ 0.99 (1% 하우스 엣지)

- **EV 조정 방식**:
  원본 배수표를 `Σ(P(slot) × multiplier)` 기반으로 계산 후,
  목표 EV(0.99)에 맞게 전체 배수를 스케일링

### 확률 계산
```
src/lib/probability.ts
```
- 이항계수 기반 정확한 확률 계산
- `P(slot k) = C(n,k) × 0.5^n`

### Canvas 애니메이션
```
src/components/PlinkoBoard.tsx
```
- 프레임 단위 애니메이션 (requestAnimationFrame)
- ease-out 이징으로 자연스러운 움직임
- 다중 공 동시 드롭 지원

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx          # 메인 페이지 (게임 통합)
│   ├── layout.tsx        # 레이아웃
│   └── globals.css       # 전역 스타일
├── components/
│   ├── PlinkoBoard.tsx   # Canvas 기반 게임 보드
│   ├── SettingsPanel.tsx # 설정 UI
│   └── ResultsPanel.tsx  # 결과/히스토리/확률 표시
├── lib/
│   ├── prng.ts           # 시드 기반 난수 생성기
│   ├── multipliers.ts    # 배수표 정의
│   └── probability.ts    # 확률/EV 계산
└── types/
    └── index.ts          # TypeScript 타입 정의
```

## 주요 기능

1. **설정 패널**: 베팅금액, 행 수(8/12/16), 리스크(Low/Medium/High), 시드
2. **Drop 버튼**: 공 1개 드롭
3. **Auto 버튼**: 연속 n회 드롭 (중간에 Stop 가능)
4. **결과 표시**: 슬롯, 배수, 지급액, 총 수익
5. **히스토리**: 최근 20개 결과
6. **확률 테이블**: 각 슬롯의 확률, 배수, EV 기여분

## 라이선스

MIT License - 교육/데모 목적으로 자유롭게 사용 가능

---

**다시 한번 강조**: 이 프로젝트의 배수표는 독자적으로 설계된 값이며,
어떤 상용 도박 서비스의 값과도 동일하지 않습니다.
