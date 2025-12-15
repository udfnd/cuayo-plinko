# CLAUDE.md - Plinko Demo Project

## 프로젝트 개요
교육/데모 목적의 Plinko 게임 웹앱. **실제 도박 서비스가 아님**.
Stake Plinko에서 영감만 받았으며, 브랜딩/에셋/정확한 배수표는 복제하지 않음.

## 기술 스택
- Next.js 16 + React 19 + TypeScript
- Canvas API (애니메이션)
- 패키지 매니저: pnpm

## 실행 커맨드
```bash
pnpm install
pnpm dev     # 개발 서버 (localhost:3000)
pnpm build   # 프로덕션 빌드
```

## 디렉토리 구조
```
src/
├── app/              # Next.js App Router
│   ├── page.tsx      # 메인 페이지
│   └── layout.tsx    # 레이아웃
├── components/       # React 컴포넌트
│   ├── PlinkoBoard.tsx
│   ├── SettingsPanel.tsx
│   └── ResultsPanel.tsx
├── lib/              # 유틸리티/로직
│   ├── prng.ts       # 시드 기반 PRNG
│   ├── multipliers.ts # 배수표
│   └── probability.ts # 확률/EV 계산
└── types/            # TypeScript 타입
```

## 코딩 규칙
- 함수형 컴포넌트 + hooks 사용
- 명시적 타입 선언 (any 금지)
- 상수는 UPPER_SNAKE_CASE
- 컴포넌트 파일명은 PascalCase

## 중요 규칙
**배수표(multipliers)는 Stake와 동일하게 복제 금지.**
이 프로젝트의 배수표는 독자적으로 설계된 값임.
