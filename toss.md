---
name: design-theme
description: 토스 스타일 UI 디자인 가이드. UI 스타일링, CSS, 디자인 작업 시 사용.
---

# Toss Style Design Guide

## 컬러 (라이트모드 — 기본값)

- 배경: #F4F4F4
- 카드/컨테이너 배경: #FFFFFF
- 텍스트 기본: #191F28
- 텍스트 보조: #8B95A1
- 플레이스홀더: #B0B8C1
- 보더: 사용 최소화 (그림자로 대체)
- 액센트(버튼, 링크): #3182F6
- 액센트 호버: #1B64DA
- 비활성: #DCDEE3
- 에러: #F04452
- 성공: #30B06E

## 컬러 (다크모드)

- 배경: #17171C
- 카드/컨테이너 배경: #1F1F28
- 텍스트 기본: #ECECEC
- 텍스트 보조: #6B7684
- 플레이스홀더: #4A4F59
- 보더: 사용 최소화
- 액센트(버튼, 링크): #4593FC
- 액센트 호버: #5BA3FF
- 비활성: #3A3A42
- 에러: #F04452
- 성공: #30B06E

## 타이포그래피

- 폰트: 시스템 기본 산세리프 (-apple-system, BlinkMacSystemFont, sans-serif)
- 제목(h1): 26px, bold, line-height: 1.3
- 부제목(h2): 20px, bold, line-height: 1.4
- 본문: 17px, regular, line-height: 1.6
- 보조 텍스트: 14px, regular, line-height: 1.4
- 링크: 액센트 컬러, underline 없음, 호버 시 opacity 0.8
- 전반적으로 폰트 크기가 큰 편 (가독성 중시)

## 레이아웃

- 최대 너비: 640px, 가운데 정렬
- 페이지 좌우 패딩: 20px
- 페이지 상단 패딩: 36px
- 섹션 간 간격: 24px
- 요소 간 간격: 12px

## 컴포넌트

### 카드

- 흰색 배경, 보더 없음, border-radius 16px, 패딩 20px
- box-shadow: 0 2px 8px rgba(0,0,0,0.08) (라이트), 0 2px 8px rgba(0,0,0,0.3) (다크)
- 호버 시 box-shadow: 0 4px 12px rgba(0,0,0,0.12)

### 버튼

- 기본: 액센트 컬러 배경, 흰색 텍스트, border-radius 12px, 패딩 14px 20px, font-size 17px, bold
- 호버: 액센트 호버 컬러
- 비활성: 배경 비활성 컬러, 텍스트 보조 컬러, cursor not-allowed
- 보조 버튼: 배경 #E8F3FF(라이트) / #1A2A44(다크), 텍스트 액센트 컬러, 보더 없음

### 입력 필드

- 배경 #F4F4F4(라이트) / #2A2A32(다크), 보더 없음, border-radius 12px, 패딩 14px 16px, font-size 17px
- 포커스: 배경 #FFFFFF(라이트) / #1F1F28(다크), box-shadow: 0 0 0 2px 액센트 컬러
- 플레이스홀더: 플레이스홀더 컬러
- 에러 상태: box-shadow: 0 0 0 2px 에러 컬러

### 셀렉트

- 입력 필드와 동일한 스타일
- 화살표 아이콘 우측 배치

### 뱃지/태그

- 배경 #E8F3FF(라이트) / #1A2A44(다크), 텍스트 액센트 컬러
- border-radius 8px, 패딩 4px 10px, font-size 14px

### 리스트 아이템

- 카드와 동일한 스타일 (각 아이템이 개별 카드)
- 또는 카드 내부에서 구분선 없이 간격으로 구분
- 호버 시 그림자 강화

### 네비게이션

- 페이지 상단 고정, 흰색 배경
- 높이 56px, 좌우 패딩 20px
- box-shadow: 0 1px 0 rgba(0,0,0,0.06)
- 로고/제목: 20px, bold

## 트랜지션

- 모든 색상/그림자 변경: transition 0.2s ease
- 버튼 클릭: transform scale(0.98)로 눌리는 느낌

## 스타일 원칙

- 보더 대신 부드러운 그림자 사용
- 큰 border-radius (12~16px)로 둥글둥글하게
- 폰트 크기 크게, 여백 넉넉하게
- 전체적으로 부드럽고 친근한 느낌
- 파란색 액센트로 신뢰감
- 인터랙션에 미세한 모션 추가

## 구현 규칙 (MUST FOLLOW)

- **배경과 텍스트 명암비는 최소 3:1을 유지한다** — 보조 텍스트(text-sub)도 포함. 명암비가 낮으면 색을 어둡게 조정한다.
- **라이트모드만 구현한다** — 다크모드(`@media (prefers-color-scheme: dark)`, `.dark` 클래스 등) 는 추가하지 않는다.

- **CSS 변수는 `globals.css`에 정의하고, Tailwind arbitrary value로만 참조한다** — `bg-[var(--accent)]`, `text-[var(--text-sub)]` 형태로 사용. `style={{ color: "var(--text)" }}` 같은 inline style과 절대 혼용하지 않는다.
- **hover 효과는 반드시 `globals.css`에 CSS 클래스로 정의한다** — Next.js 서버 컴포넌트에서는 `onMouseEnter`/`onMouseLeave` 같은 JS 이벤트 핸들러를 사용할 수 없다. 예: `.card-hover:hover { background: var(--hover-bg); }`
- **서버 컴포넌트 props에 이벤트 핸들러(onClick 등)를 넘기지 않는다** — 인터랙션이 필요하면 `"use client"` 컴포넌트로 분리한다.
- **스타일링 방식을 한 가지로 통일한다** — Tailwind를 쓰기로 했으면 Tailwind만, inline style을 쓰기로 했으면 inline style만. 한 컴포넌트 안에서 두 방식을 섞지 않는다.
