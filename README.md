# IQMS Frontend

지능형 품질경영시스템(IQMS)의 프론트엔드입니다. 품질 이벤트부터 부적합 판정, CAPA(시정·예방조치), 조치 관리, 형상변경요청까지 품질 업무 흐름을 한 화면에서 다룹니다.

현재는 백엔드 연동 전 단계로, 목록·상세·상태 전이는 **목 데이터 + TanStack Query**로 동작합니다. `axios` 클라이언트(`src/lib/api-client.ts`)는 `VITE_API_URL`을 바라보도록 준비되어 있습니다.

## 기술 스택

| 구분 | 사용 |
| --- | --- |
| 런타임 | React 19, TypeScript, Vite 8 |
| 라우팅 | React Router 8 |
| 서버 상태 | TanStack Query |
| UI 상태 | Zustand (챗 패널 열림 등) |
| 스타일 | Tailwind CSS 4, shadcn/ui (Base UI) |
| 테이블 / 폼 | TanStack Table, React Hook Form, Zod |
| 차트 / PDF | Recharts, @react-pdf/renderer |
| AI | Google Gemini (`src/lib/gemini.ts`) |

## 주요 기능

품질 업무는 대략 아래 순서로 이어집니다.

```
품질 이벤트 등록 → 검토 → 부적합 판정 → CAPA 또는 단순조치 → 원인분석 / 시정·예방 / 효과성 검증 → 종료
```

형상변경요청은 별도 트랙입니다.

```
변경 등록 → 검토·승인 → 적용 → 검증 → 종료
```

### 모듈

- **대시보드** (`/`): 내 할 일, 이벤트 현황, 추이, NC 판정, 파이프라인, 담당자 부하, 지연·완료 조치. 패널 순서는 드래그로 바꾸고 `localStorage`에 저장합니다.
- **품질 이벤트**: 등록/목록/내 등록/내 검토. 상세에서 검토, 부적합 판정, CAPA 판정, 무효 처리를 합니다.
- **부적합 관리**: 판정 대상, 부적합 목록, 경미 부적합·단순조치 종결.
- **CAPA 관리**: 계획 등록, 진행 현황, 원인분석 / 시정·예방 / 효과성 검증 대상, 상세·PDF.
- **조치 관리**: 내 조치, 전사 현황, 지연, 완료 이력.
- **형상변경요청**: 등록(AI 검토 소견), 목록, 내 검토/승인, 적용·검증 대기, 종료 이력, PDF.
- **품질 도우미**: 레이아웃 우측 챗 패널. QMS 안내, 첨부(이미지/PDF/Word/Excel 등) 분석, 차트·이미지 생성.
- **인증 UI**: `/login`, `/auth/signup`, 마이페이지. 실제 세션은 아직 stub(`src/mock/currentUser.ts`)입니다.

사이드바 미처리 건수는 `src/config/sidebar-navigation.ts`의 `badge` 키와 각 도메인 쿼리 훅이 연결됩니다.

## 시작하기

Node.js 18 이상, **pnpm**을 사용합니다. (`pnpm-lock.yaml`)

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

개발 서버는 Vite 기본 주소(`http://localhost:5173`)에서 뜹니다.

| 스크립트 | 설명 |
| --- | --- |
| `pnpm dev` | 개발 서버 |
| `pnpm build` | 타입 체크 후 프로덕션 빌드 |
| `pnpm preview` | 빌드 결과 미리보기 |
| `pnpm lint` | ESLint |

경로 별칭 `@`는 `src/`입니다 (`vite.config.ts`).

## 환경 변수

`.env.example`을 복사해 로컬 파일을 만듭니다. `.env*`는 git에 올리지 않습니다.

| 변수 | 용도 |
| --- | --- |
| `VITE_GEMINI_API_KEY` | 로컬에서 Gemini를 브라우저가 직접 호출할 때. **배포 번들에 넣지 마세요.** |
| `VITE_GEMINI_MODEL` | (선택) 텍스트 모델. 기본 `gemini-3.6-flash` |
| `VITE_GEMINI_IMAGE_MODEL` | (선택) 이미지 모델. 기본 `gemini-2.5-flash-image` |
| `VITE_API_URL` | REST 백엔드 base URL (`apiClient`) |
| `GEMINI_API_KEY` | **Vercel 서버 환경변수**. `/api/gemini` 프록시 전용. `VITE_` 접두사 없음 |

키가 없거나 호출이 실패하면 AI 소견·초안은 규칙 기반 함수로 폴백하므로, 키 없이도 화면은 동작합니다.

## 디렉터리

```
src/
  App.tsx                 # 라우트. 사이드바 메뉴를 평탄화해 등록
  layout/app-layout.tsx   # 사이드바, 브레드크럼, 알림, 챗 패널
  config/sidebar-navigation.ts
  components/             # 공통 UI, shadcn, 챗, 사이드바
  lib/                    # gemini, api-client, utils
  mock/                   # 현재 사용자, 품질 이벤트, 검토자
  pages/                  # 도메인별 화면
    quailty-event/        # 폴더명 철자 주의 (quality가 아님)
    nonconformity-management/
    capa-management/
    action-management/
    change-request-management/
    dashboard/ mypage/ auth/
  stores/ui-store.ts
api/gemini.ts             # Vercel Function: Gemini 프록시
```

도메인 화면은 보통 `index.tsx`(목록) + `columns.tsx`(테이블) + `queries.ts`(타입·훅·목 상태) 패턴입니다. 목록 그리드는 `src/components/common/DataTable.tsx`를 공유합니다. 컬럼 너비를 픽셀로 고정하려면 `layout="fixed"`와 `meta.className`(`w-[…px]`, 남는 칸은 `w-full`)을 함께 씁니다.

라우트는 사이드바 설정에서 생성되고, 상세처럼 동적 경로는 `App.tsx`에 따로 둡니다.

- `/quality-events/detail/:id`
- `/capa/detail/:id`
- `/configuration-changes/detail/:id`
- 등록 이어쓰기: `/quality-events/register/:id`, `/configuration-changes/register/:id`

상세로 들어갈 때 `from` 쿼리로 출처 메뉴를 남겨 사이드바 활성 상태를 맞춥니다.

## AI 연동

`src/lib/gemini.ts`가 품질 이벤트 검토·CAPA 필요 여부, CAPA/단순조치/원인분석/효과성 초안, 형상변경 검토·검증 소견, 챗, 이미지 생성을 담당합니다.

- **로컬**: `VITE_GEMINI_API_KEY`가 있으면 Google API를 직접 호출합니다. 키가 브라우저에 노출됩니다.
- **배포**: `POST /api/gemini?model=…` → `api/gemini.ts`가 서버의 `GEMINI_API_KEY`로 중계합니다.

## 배포

Vercel 기준입니다 (`vercel.json`).

- 빌드: `vite build` → `dist`
- SPA 새로고침: `/api/`가 아닌 경로는 `index.html`로 rewrite
- 프로덕션 Gemini: 프로젝트 Environment Variables에 `GEMINI_API_KEY`만 등록

## 참고

- 로그인·권한·REST 연동은 아직 UI/목 수준입니다. 실제 API는 `apiClient`와 각 `queries.ts`의 `useQuery`를 교체하면 됩니다.
- 품질 이벤트 소스 폴더는 `src/pages/quailty-event`입니다. import 경로를 맞출 때 철자를 그대로 쓰세요.
