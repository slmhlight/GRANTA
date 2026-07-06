# 글로서리 미세조직 사진 슬롯 (R227/E14/H4c)

이 폴더에 **라이선스가 확보된** 미세조직 사진(광학/SEM/TEM)을 넣으면
용어 페이지에 자동으로 렌더됩니다.

## 넣는 방법
1. 이미지 파일을 이 폴더에 저장 — 파일명이 곧 사진 `id`.
   예: `martensite-lath.jpg`, `pearlite.jpg`, `ferrite-grains.jpg`
   지원 확장자: png · jpg · jpeg · webp
2. `data/glossary-articles.json` 의 해당 섹션에 슬롯 추가:
   ```json
   { "heading": "...", "body": "...",
     "photo": { "id": "martensite-lath", "caption": "설명", "credit": "출처·저작권자" } }
   ```
   - `credit` 은 **출처/저작권자**를 반드시 표기(라이선스 준수).
3. Vite 가 번들 → `GlossaryPhoto` 가 캡션·출처와 함께 렌더.

## 주의 — 저작권
- 교과서·논문·ScienceDirect 등의 그림은 **저작권**이 있습니다. 임베드하려면
  라이선스(직접 촬영본·CC/오픈 라이선스·저작권자 허락)가 필요합니다.
- 라이선스 없는 이미지는 넣지 마세요. 대안으로 `scripts/gen-glossary-figures.py`
  의 **개략 도해(schematic)** 를 쓸 수 있습니다(저작권 안전).
