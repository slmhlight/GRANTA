# GitHub Pages 정적 호스팅 가이드

AM Materials Explorer는 순수 정적 SPA(빌드 결과물 = HTML/JS/CSS + `materials.json`)라서
별도 서버 없이 **GitHub Pages**로 무료 호스팅할 수 있습니다. 이 저장소는 이미 그에 맞게 설정돼 있습니다.

## 게시 URL

프로젝트 사이트이므로 저장소 이름이 경로에 들어갑니다:

```
https://slmhlight.github.io/GRANTA/
```

## 한 번만 하면 되는 설정 (GitHub 웹에서)

1. GitHub에서 저장소 → **Settings → Pages** 이동
2. **Build and deployment → Source** 를 **GitHub Actions** 로 선택 (← "Deploy from a branch" 아님)
3. 끝. 이후 `main`에 push할 때마다 자동 빌드·배포됩니다.

> 최초 1회는 `Actions` 탭에서 "Deploy to GitHub Pages" 워크플로가 성공해야 URL이 활성화됩니다.
> 수동 실행: Actions 탭 → 워크플로 선택 → **Run workflow**.

## 이 저장소에 이미 적용된 준비 사항

| 항목 | 파일 | 내용 |
|---|---|---|
| 배포 워크플로 | `.github/workflows/deploy-pages.yml` | push 시 빌드 → 아티팩트 업로드 → Pages 배포 |
| 자산 base 경로 | `vite.config.ts` | `base: process.env.VITE_BASE \|\| "/"` (CI에서 `/GRANTA/`) |
| 라우터 base | `client/src/main.tsx` | `VITE_ROUTER_BASE`(`/GRANTA`)로 wouter `<Router base>` 설정 |
| 데이터 로드 | `client/src/pages/Home.tsx` | `fetch(\`${import.meta.env.BASE_URL}materials.json\`)` — base 인식 |
| Jekyll 비활성화 | `client/public/.nojekyll` | `_`로 시작하는 자산 파일 차단 방지 |
| SPA 새로고침 대응 | 워크플로 | `index.html` → `404.html` 복사 (딥링크·새로고침 404 방지) |

## 배포 흐름 (자동)

`main` push → Actions가 다음을 수행:

```
pnpm install --frozen-lockfile
pnpm build:data          # data/ 소스 → client/public/materials.json 재생성
VITE_BASE=/GRANTA/ VITE_ROUTER_BASE=/GRANTA  pnpm exec vite build   # → dist/public
cp dist/public/index.html dist/public/404.html
→ dist/public 업로드 → Pages 배포
```

## 로컬에서 프로덕션 빌드 미리보기

Windows 개발 환경 기준 (Node가 PATH에 없으므로 prepend):

```powershell
$env:Path = "C:\Program Files\nodejs;$env:APPDATA\npm;$env:Path"
$env:VITE_BASE = "/GRANTA/"
$env:VITE_ROUTER_BASE = "/GRANTA"
pnpm build:data
pnpm exec vite build
pnpm exec vite preview        # http://localhost:4173/GRANTA/ 에서 확인
```

`/GRANTA/` 하위 경로까지 포함해 실제 Pages와 동일하게 확인됩니다.

## 저장소 이름을 바꾸면

base 경로가 곧 저장소 이름이므로 **두 곳**을 함께 바꿔야 합니다
(`.github/workflows/deploy-pages.yml`의 `env`):

```yaml
VITE_BASE: /새이름/      # 앞뒤 슬래시 모두
VITE_ROUTER_BASE: /새이름 # 뒤 슬래시 없음
```

## 사용자/조직 사이트로 쓰려면 (루트 도메인)

저장소 이름을 `slmhlight.github.io`로 만들면 사이트가 루트(`https://slmhlight.github.io/`)로 게시됩니다.
이 경우 base가 `/`여야 하므로 워크플로 `env`에서 `VITE_BASE`/`VITE_ROUTER_BASE`를 비우거나 `/`로 두세요.

## 커스텀 도메인 (선택)

`Settings → Pages → Custom domain`에 도메인 입력 후, 루트 게시라면 `VITE_BASE=/`로 설정.
`client/public/CNAME`에 도메인을 넣으면 빌드마다 유지됩니다.

## 대안: 브랜치 배포 (Actions 미사용)

```powershell
pnpm build:data; $env:VITE_BASE="/GRANTA/"; $env:VITE_ROUTER_BASE="/GRANTA"; pnpm exec vite build
# dist/public 내용을 gh-pages 브랜치 루트로 푸시 후
# Settings → Pages → Source = "Deploy from a branch", 브랜치 gh-pages /(root)
```
이 방식은 `.nojekyll`이 반드시 필요합니다(이미 포함됨). 일반적으로는 위의 **GitHub Actions** 방식을 권장합니다.

## 참고 / 한계

- `materials.json`은 약 2.9 MB입니다. Pages 1 GB 용량·100 GB/월 대역폭 한도 내에서 충분합니다.
- 정적 호스팅이므로 `server/index.ts`(Express)는 Pages 배포에 사용되지 않습니다 — 그건 자체 서버/Node 호스팅용입니다.
- 비공개(private) 저장소의 Pages는 GitHub 유료 플랜이 필요할 수 있습니다. 공개 저장소는 무료입니다.
