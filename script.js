/* === 리팩토링된 script.js (카카오 인앱 탈출 추가) === */

document.addEventListener("DOMContentLoaded", () => {
  const App = {
    // 1. 앱의 상태를 관리하는 객체
    state: {
      selectedGrid: "3x3", // 기본값
      originalImage: null,
      generatedPieces: [],
    },

    // 2. DOM 요소를 저장하는 객체
    elements: {
      step1Upload: null,
      step2Options: null,
      step3Result: null,
      uploadButton: null,
      imageLoader: null,
      sourcePreview: null,
      optionGroup: null,
      optionCards: null,
      splitButton: null,
      gridResultContainer: null,
      zipDownloadButton: null,
      restartButton: null,
    },

    // 3. 앱 초기화
    init() {
      // 3-0. (신규) 카카오 인앱 브라우저 감지 및 탈출
      if (this.helpers.checkAndEscapeKakaoInApp()) {
        return; // 탈출을 시도했으므로, 인앱 브라우저 내에서 앱 초기화를 중단
      }

      // 3-1. 모바일 실제 높이 설정
      this.ui.setAppHeight();
      window.addEventListener("resize", this.ui.setAppHeight);

      // 3-2. DOM 요소 찾기 (index.html 기반)
      this.elements.step1Upload = document.getElementById("step-1-upload");
      this.elements.step2Options = document.getElementById("step-2-options");
      this.elements.step3Result = document.getElementById("step-3-result");
      this.elements.uploadButton = document.getElementById("uploadButton");
      this.elements.imageLoader = document.getElementById("imageLoader");
      this.elements.sourcePreview = document.getElementById("sourcePreview");
      this.elements.optionGroup = document.querySelector(".option-group");
      this.elements.optionCards = document.querySelectorAll(".option-card");
      this.elements.splitButton = document.getElementById("splitButton");
      this.elements.gridResultContainer = document.getElementById(
        "gridResultContainer"
      );
      this.elements.zipDownloadButton =
        document.getElementById("zipDownloadButton");
      this.elements.restartButton = document.getElementById("restartButton");

      // 3-3. 이벤트 리스너 연결
      this.bindEvents();
    },

    // 4. 모든 이벤트 리스너를 등록하는 메소드
    bindEvents() {
      this.elements.uploadButton.addEventListener(
        "click",
        this.handlers.handleUploadClick
      );
      this.elements.imageLoader.addEventListener(
        "change",
        this.handlers.handleImageChange
      );
      this.elements.optionGroup.addEventListener(
        "click",
        this.handlers.handleOptionSelect
      );
      this.elements.splitButton.addEventListener(
        "click",
        this.logic.splitAndRenderGrid
      );
      this.elements.zipDownloadButton.addEventListener(
        "click",
        this.logic.downloadAllAsZip
      );
      this.elements.restartButton.addEventListener(
        "click",
        this.handlers.handleRestart
      );
    },

    // 5. 이벤트 핸들러 함수 모음
    handlers: {
      handleUploadClick() {
        App.elements.imageLoader.click();
      },

      handleImageChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          App.state.originalImage = new Image();
          App.state.originalImage.src = event.target.result;
          App.state.originalImage.onload = () => {
            App.elements.sourcePreview.src = event.target.result;
            App.ui.goToStep(App.elements.step2Options);
          };
        };
        reader.readAsDataURL(file);
      },

      handleOptionSelect(e) {
        const selectedCard = e.target.closest(".option-card");
        if (!selectedCard) return;

        App.elements.optionCards.forEach((card) =>
          card.classList.remove("active")
        );
        selectedCard.classList.add("active");
        App.state.selectedGrid = selectedCard.dataset.grid;
      },

      handleRestart() {
        App.state.originalImage = null;
        App.state.generatedPieces = [];
        App.elements.imageLoader.value = null; // input 값 초기화
        App.ui.goToStep(App.elements.step1Upload);
      },
    },

    // 6. 핵심 비즈니스 로직 모음
    logic: {
      splitAndRenderGrid() {
        const { originalImage, selectedGrid } = App.state;
        const { gridResultContainer } = App.elements;

        if (!originalImage) return;

        gridResultContainer.innerHTML = "";
        App.state.generatedPieces = []; // 결과물 배열 초기화

        const [cols, rows] = selectedGrid.split("x").map(Number);
        const pieceWidth = originalImage.width / cols;
        const pieceHeight = originalImage.height / rows;

        gridResultContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = Math.ceil(pieceWidth);
        canvas.height = Math.ceil(pieceHeight);

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(
              originalImage,
              c * pieceWidth,
              r * pieceHeight,
              pieceWidth,
              pieceHeight,
              0,
              0,
              canvas.width,
              canvas.height
            );

            const dataUrl = canvas.toDataURL("image/png");
            const name = `image_${r + 1}-${c + 1}.png`;
            App.state.generatedPieces.push({ name, data: dataUrl });

            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = name;
            link.title = `클릭해서 ${name} 저장`;
            link.target = "_blank";
            const img = document.createElement("img");
            img.src = dataUrl;
            link.appendChild(img);
            gridResultContainer.appendChild(link);
          }
        }
        App.ui.goToStep(App.elements.step3Result);
      },

      async downloadAllAsZip() {
        const { generatedPieces } = App.state;
        const { zipDownloadButton } = App.elements;

        if (generatedPieces.length === 0) return;

        zipDownloadButton.disabled = true;
        zipDownloadButton.textContent = "압축 중...";

        try {
          const zip = new JSZip();
          for (const piece of generatedPieces) {
            const imageData = piece.data.split(",")[1];
            zip.file(piece.name, imageData, { base64: true });
          }

          const zipContent = await zip.generateAsync({ type: "blob" });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(zipContent);
          link.download = "insta-grid-images.zip";
          link.click();
          URL.revokeObjectURL(link.href); // 메모리 해제
        } catch (error) {
          console.error("ZIP 생성 중 오류 발생:", error);
          // 사용자가 볼 수 있는 알림을 추가하는 것이 좋습니다 (alert 대신)
        } finally {
          zipDownloadButton.disabled = false;
          zipDownloadButton.textContent = ".zip으로 모두 받기";
        }
      },
    },

    // 7. UI 변경 관련 함수 모음
    ui: {
      goToStep(stepToShow) {
        App.elements.step1Upload.classList.remove("active");
        App.elements.step2Options.classList.remove("active");
        App.elements.step3Result.classList.remove("active");
        stepToShow.classList.add("active");
      },

      setAppHeight() {
        // v7.0: 모바일 실제 높이 감지
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--app-height", `${vh}px`);
      },
    },

    // 8. (신규) 헬퍼 함수 모음
    helpers: {
      checkAndEscapeKakaoInApp() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (!/kakaotalk/i.test(userAgent)) {
          return false; // 카카오톡이 아님
        }

        // 카카오톡 인앱 브라우저인 경우
        const currentUrl = window.location.href;
        const isIOS = /iphone|ipad|ipod/i.test(userAgent);

        // 1. 외부 브라우저로 열기 시도
        window.location.href =
          "kakaotalk://web/openExternal?url=" + encodeURIComponent(currentUrl);

        // 2. 잠시 후 현재 인앱 브라우저 닫기
        setTimeout(() => {
          if (isIOS) {
            window.location.href = "kakaoweb://closeBrowser";
          } else {
            // 안드로이드 및 기타
            window.location.href = "kakaotalk://inappbrowser/close";
          }
        }, 500); // 0.5초 딜레이

        return true; // 탈출 시도함
      },
    },
  };

  // --- 앱 실행 ---
  App.init();
});
