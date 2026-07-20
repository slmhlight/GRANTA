# 생성 이미지 원화 (H4k / H6 W3-11)

글자 없는 조직·파면·결함 일러스트 원화를 여기에 둔다. `scripts/overlay-figure-labels.py`
가 이 원화에 한글 라벨·리더선·구역 표기를 얹어 `client/src/assets/glossary/<id>.png` 로 낸다.

## 규약

- **파일명 = 도표 id** (`<id>.png`). id 는 overlay 스크립트 `SPECS` 의 키와 같아야 한다.
- **원화에는 글자가 없어야 한다.** 생성 모델은 문자를 왜곡하고 한글은 사실상 불가하다.
  라벨은 스크립트가, 서술은 `glossary-figures.tsx` 의 `CAPTIONS` 가 담당한다(설명 SSOT).
- 흰 배경 · 가로 1600px 이상 · 팔레트는 `gen-glossary-figures.py` 상수를 따른다
  (#4a5568 축 · #2f6fb0 청 · #b4322a 적 · #c2621f 주황 · #8a96a3 회).
- 바깥 여백은 스크립트가 자동 트림하므로 신경쓰지 않아도 된다.

## 산출

```
python scripts/overlay-figure-labels.py            # 전체
python scripts/overlay-figure-labels.py haz-zones  # 하나만
```

## 성격 (중요)

여기 이미지는 **모식도(illustration)** 다. 실제 현미경 사진이 아니므로 배율·스케일바를
넣지 않고, 캡션도 기존 도표와 같은 "그림 · …(개략)" 형식을 쓴다. 실사 현미경 이미지가
꼭 필요한 자리는 생성물이 아니라 퍼블릭도메인(Wikimedia Commons·DoITPoMS)에서 출처와
함께 인용한다.
