# 📸 IG 9-Cut (Insta Grid Splitter) <!-- Trigger Auto Update -->

> **인스타그램 피드를 예쁜 바둑판 모양으로 꾸며주는 웹 도구입니다.**  
> 사진 한 장을 3분할, 6분할, 9분할로 깔끔하게 쪼개드립니다.

🔗 **Live Demo:** [tools.seungyongcho.com/ig-9cut](https://tools.seungyongcho.com/ig-9cut/)

---

## ✨ Features

- **다양한 분할 옵션**: 3x1, 3x2(정석), 3x3(프로필 꽉 채우기), 3x4 지원.
- **스마트 여백 채우기**: 사진이 너무 많이 잘릴 경우, 여백을 채워 원본 비율을 유지하는 기능 제공.
- **Toss UI Design**: 깔끔하고 직관적인 토스 스타일 인터페이스.
- **Privacy First**: 서버로 이미지를 전송하지 않고, 브라우저에서 즉시 처리합니다.

---

## 🛠️ Development

이 프로젝트는 **[web-tools-common-assets](https://github.com/spencer0124/web-tools-common-assets)** 를 서브모듈로 사용하여 디자인을 공유합니다.

### 1. Clone & Setup
```bash
# 레포지토리 복제 (서브모듈 포함)
git clone --recursive https://github.com/spencer0124/insta-grid-splitter.git

# 만약 이미 clone 했다면 서브모듈 업데이트
git submodule update --init --recursive
```

### 2. Run Locally
```bash
# Python 내장 서버 실행
python3 -m http.server 8080

# 접속
http://localhost:8080
```

---

## 🔗 Related Projects

다른 인스타그램 도구도 확인해보세요:

- **[인스타 사진 이어붙이기](https://github.com/spencer0124/insta-carousel)**: 여러 사진을 이어서 긴 게시물을 만드는 도구
- **[Web Tools Common Assets](https://github.com/spencer0124/web-tools-common-assets)**: 공통 UI 컴포넌트

---

## 🤝 Contributing
버그 제보나 기능 제안은 Issue를 통해 남겨주세요!
