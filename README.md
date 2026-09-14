# SpeakForward

무료 브라우저 API만 사용하는 OPIc IH 및 비즈니스 영어 훈련용 정적 웹앱입니다.

## GitHub Pages 배포

1. GitHub에서 Public 저장소를 새로 만듭니다.
2. 이 폴더의 `index.html`과 `README.md`를 저장소 최상단에 올려 `main` 브랜치에 푸시합니다.
3. 저장소 **Settings → Pages**에서 **Deploy from a branch**를 선택합니다.
4. 브랜치를 `main`, 폴더를 `/(root)`로 선택하고 저장합니다.
5. 잠시 후 표시되는 `https://사용자명.github.io/저장소명/` 주소로 접속합니다.

## 유의 사항

- 음성 인식은 브라우저 구현에 따라 네트워크 연결을 사용할 수 있으며, 앱이 별도의 서버나 API 키를 사용하지는 않습니다.
- TTS 음성과 음성 인식 지원은 Chrome/Edge에서 가장 안정적입니다.
- 학습 기록과 자기소개 스크립트는 해당 브라우저의 LocalStorage에만 저장됩니다.
