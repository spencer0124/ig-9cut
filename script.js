/* === 리팩토링된 script.js (v5.2: 점선 가이드/이름 수정) === */

document.addEventListener("DOMContentLoaded", () => {
  // --- (v5.1) "4:5 파노라마" 전용 옵션 정의 (이름 단순화) ---
  const ALL_GRID_OPTIONS = [
    { id: "3x1-pano", text: "1줄 (3장)", cols: 3, rows: 1, targetRatio: 2.4 }, // (1080*3) / 1350 = 2.4
    { id: "3x2-pano", text: "2줄 (6장)", cols: 3, rows: 2, targetRatio: 1.2 }, // (1080*3) / (1350*2) = 1.2
    { id: "3x3-pano", text: "3줄 (9장)", cols: 3, rows: 3, targetRatio: 0.8 }, // (1080*3) / (1350*3) = 0.8
    { id: "3x4-pano", text: "4줄 (12장)", cols: 3, rows: 4, targetRatio: 0.6 }, // (1080*3) / (1350*4) = 0.6
  ];

  // (v4.0) 사진 손실이 이 값(%) 이상이면 '여백 채우기'를 제안
  const CROP_LOSS_THRESHOLD_RATIO = 0.4; // 40% 이상 잘려나갈 때

  const App = {
    // 1. 앱의 상태를 관리하는 객체
    state: {
      originalImage: null,
      generatedPieces: [],
      cropperInstance: null,
      selectedGridOption: null,
      padColor: "#000000", // 여백 색상 (검은색 고정)
    },

    // 2. DOM 요소를 저장하는 객체
    elements: {
      step1Upload: null,
      step2Crop: null,
      step2Options: null,
      step3Result: null,
      step2SmartSwitch: null,
      uploadButton: null,
      imageLoader: null,
      sourcePreview: null,
      gridResultContainer: null,
      zipDownloadButton: null,
      restartButton: null,
      // 여백 제안
      padHeadingText: null,
      padOptionText: null,
      fitPreviewContainer: null,
      forceCropButton: null,
      splitWithPadButton: null,
      // 크롭 조정
      cropperImage: null,
      cropHeadingText: null,
      cropperContainer: null,
      cropAndSplitButton: null,
      changeGridButton: null,
      // (v5.1) seamGuides 요소를 삭제함 (동적 생성)
      // 옵션 변경
      optionGroup: null,
      backToCropButton: null,
    },

    // 3. 앱 초기화
    init() {
      if (this.helpers.checkAndEscapeKakaoInApp()) return;
      this.ui.setAppHeight();
      window.addEventListener("resize", this.ui.setAppHeight);
      this.findDOMElements();
      this.bindEvents();
    },

    // 3-2. DOM 요소 찾기
    findDOMElements() {
      this.elements.step1Upload = document.getElementById("step-1-upload");
      this.elements.step2SmartSwitch = document.getElementById(
        "step-2-smart-switch"
      );
      this.elements.step2Crop = document.getElementById("step-2-crop");
      this.elements.step2Options = document.getElementById("step-2-options");
      this.elements.step3Result = document.getElementById("step-3-result");

      this.elements.uploadButton = document.getElementById("uploadButton");
      this.elements.imageLoader = document.getElementById("imageLoader");
      this.elements.sourcePreview = document.getElementById("sourcePreview");
      this.elements.gridResultContainer = document.getElementById(
        "gridResultContainer"
      );
      this.elements.zipDownloadButton =
        document.getElementById("zipDownloadButton");
      this.elements.restartButton = document.getElementById("restartButton");

      // 여백 제안 (Step 2A)
      this.elements.padHeadingText = document.getElementById("padHeadingText");
      this.elements.padOptionText = document.getElementById("padOptionText");
      this.elements.fitPreviewContainer = document.getElementById(
        "fitPreviewContainer"
      );
      this.elements.forceCropButton =
        document.getElementById("forceCropButton");
      this.elements.splitWithPadButton =
        document.getElementById("splitWithPadButton");

      // 크롭 조정 (Step 2B)
      this.elements.cropperImage = document.getElementById("cropperImage");
      this.elements.cropHeadingText =
        document.getElementById("cropHeadingText");
      this.elements.cropperContainer =
        document.getElementById("cropperContainer");
      this.elements.cropAndSplitButton =
        document.getElementById("cropAndSplitButton");
      this.elements.changeGridButton =
        document.getElementById("changeGridButton");

      // 옵션 변경 (Step 3)
      this.elements.optionGroup = document.getElementById("optionGroup");
      this.elements.backToCropButton =
        document.getElementById("backToCropButton");
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

      this.elements.forceCropButton.addEventListener(
        "click",
        this.handlers.handleForceCrop
      );
      this.elements.splitWithPadButton.addEventListener(
        "click",
        this.handlers.handleSplitWithPad
      );

      this.elements.cropAndSplitButton.addEventListener(
        "click",
        this.handlers.handleCropAndSplit
      );
      this.elements.changeGridButton.addEventListener(
        "click",
        this.handlers.handleChangeGrid
      );

      this.elements.optionGroup.addEventListener(
        "click",
        this.handlers.handleOptionSelect
      );
      this.elements.backToCropButton.addEventListener(
        "click",
        this.handlers.handleBackToCrop
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
          const imageUrl = event.target.result;
          App.state.originalImage = new Image();
          App.state.originalImage.src = imageUrl;

          App.state.originalImage.onload = () => {
            App.elements.cropperImage.src = imageUrl;
            App.elements.sourcePreview.src = imageUrl;

            const imageRatio =
              App.state.originalImage.width / App.state.originalImage.height;
            const bestOption = App.logic.getBestGridOption(imageRatio);
            App.state.selectedGridOption = bestOption; // 추천 옵션을 상태에 저장

            // (v4.0) 비율 차이(손실률) 계산
            const diff = Math.abs(imageRatio - bestOption.targetRatio);
            const lossPercent =
              diff / Math.max(imageRatio, bestOption.targetRatio);

            if (lossPercent > CROP_LOSS_THRESHOLD_RATIO) {
              // A. 손실이 크다 -> "여백 채우기" 제안
              App.ui.setupSmartSwitch(bestOption);
              App.ui.goToStep(App.elements.step2SmartSwitch);
            } else {
              // B. 손실이 적다 -> "크롭 조정" (90%의 흐름)
              App.ui.goToStep(App.elements.step2Crop);
              setTimeout(() => {
                App.logic.setupCropper(bestOption);
              }, 0);
            }
          };
        };
        reader.readAsDataURL(file);
      },

      // [아니요, 직접 자를래요]
      handleForceCrop() {
        App.ui.goToStep(App.elements.step2Crop);
        setTimeout(() => {
          App.logic.setupCropper(App.state.selectedGridOption);
        }, 0);
      },

      // [네, 여백으로 나눌게요]
      async handleSplitWithPad() {
        App.ui.setLoading(App.elements.splitWithPadButton, "나누는 중...");
        const canvasToSplit = App.logic.createPaddedCanvas();

        const imageToSplit = new Image();
        imageToSplit.src = canvasToSplit.toDataURL("image/png");
        imageToSplit.onload = () => {
          App.logic.splitImage(imageToSplit, App.state.selectedGridOption);
          App.ui.setLoading(
            App.elements.splitWithPadButton,
            "💙 네, 여백으로 나눌게요",
            false
          );
        };
      },

      // [이대로 나누기] (크롭 모드)
      async handleCropAndSplit() {
        App.ui.setLoading(App.elements.cropAndSplitButton, "나누는 중...");

        if (!App.state.cropperInstance) {
          console.error("Cropper가 초기화되지 않았습니다.");
          App.ui.setLoading(
            App.elements.cropAndSplitButton,
            "오류 발생",
            false
          );
          return;
        }

        const canvasToSplit = App.state.cropperInstance.getCroppedCanvas();
        const imageToSplit = new Image();
        imageToSplit.src = canvasToSplit.toDataURL("image/png");
        imageToSplit.onload = () => {
          App.logic.splitImage(imageToSplit, App.state.selectedGridOption);
          App.ui.setLoading(
            App.elements.cropAndSplitButton,
            "💙 이대로 나누기",
            false
          );
        };
      },

      // [다른 줄로 나누기]
      handleChangeGrid() {
        const imageRatio =
          App.state.originalImage.width / App.state.originalImage.height;
        const filteredOptions = App.logic.getFilteredGridOptions(imageRatio);
        App.ui.populateOptions(filteredOptions);
        App.ui.goToStep(App.elements.step2Options);
      },

      // 옵션 선택
      handleOptionSelect(e) {
        const selectedCard = e.target.closest(".option-card");
        if (!selectedCard) return;

        const optionId = selectedCard.dataset.grid;
        const selectedOption = ALL_GRID_OPTIONS.find((o) => o.id === optionId);

        App.ui.goToStep(App.elements.step2Crop);
        setTimeout(() => {
          App.logic.setupCropper(selectedOption);
        }, 0);
      },

      // 추천으로 돌아가기
      handleBackToCrop() {
        App.ui.goToStep(App.elements.step2Crop);
      },

      // 새로 하기
      handleRestart() {
        App.state.originalImage = null;
        App.state.generatedPieces = [];
        App.elements.imageLoader.value = null;
        if (App.state.cropperInstance) {
          App.state.cropperInstance.destroy();
          App.state.cropperInstance = null;
        }
        App.elements.cropperImage.src = "";
        App.elements.sourcePreview.src = "";
        App.ui.goToStep(App.elements.step1Upload);
      },
    },

    // 6. 핵심 비즈니스 로직 모음
    logic: {
      setupCropper(gridOption) {
        App.state.selectedGridOption = gridOption;
        App.ui.updateCropUI(gridOption); // UI 업데이트 (제목)

        if (App.state.cropperInstance) {
          App.state.cropperInstance.destroy();
        }

        App.state.cropperInstance = new Cropper(App.elements.cropperImage, {
          aspectRatio: gridOption.targetRatio,
          viewMode: 1,
          autoCropArea: 1.0,
          guides: false, // (*** v5.2 수정: 이 한 줄이 핵심입니다 ***)
          ready() {
            // (v5.2 수정) 붉은 점선 가이드 + 요청한 가로줄을 크롭 박스 안에 '동적'으로 주입
            const cropBox =
              App.elements.cropperContainer.querySelector(".cropper-crop-box");
            if (cropBox) {
              // 1. 기존 가이드 삭제 (옵션 변경 시 중복 방지)
              const oldGuides = cropBox.querySelector(".seam-guides-dynamic");
              if (oldGuides) oldGuides.remove();

              // 2. 새 가이드 컨테이너 생성
              const guides = document.createElement("div");
              guides.className = "seam-guides-dynamic";

              // === ▼▼▼ [수정됨] v_blog_fix: 블로그 지식 기반 가이드라인 수정 ▼▼▼ ===
              // 3. (v_blog_fix) 블로그 지식 기반 가이드라인 수정
              guides.innerHTML = `
                <div class="seam-line-dynamic outer-safe-zone outer-left"></div>
                <div class="seam-line-dynamic outer-safe-zone outer-right"></div>

                <div class="seam-line-dynamic internal-split-line vertical-split vertical-1"></div>
                <div class="seam-line-dynamic internal-split-line vertical-split vertical-2"></div>
              `;

              // 4. (v5.2 / v_blog_fix) '줄 수'에 맞는 '가로' 분할선 추가 (흰색)
              for (let i = 1; i < gridOption.rows; i++) {
                const hLine = document.createElement("div");
                // (v_blog_fix) 'internal-split-line' 클래스 추가
                hLine.className =
                  "seam-line-dynamic internal-split-line horizontal";
                hLine.style.top = `${(i / gridOption.rows) * 100}%`;
                guides.appendChild(hLine);
              }
              // === ▲▲▲ [수정됨] v_blog_fix: 블로그 지식 기반 가이드라인 수정 ▲▲▲ ===

              cropBox.appendChild(guides);
            }
          },
        });
      },

      // (v5.0) "4:5" 옵션 중에서만 최적의 옵션 찾기
      getBestGridOption(imageRatio) {
        let bestOption = ALL_GRID_OPTIONS[0];
        let minDiff = Infinity;

        ALL_GRID_OPTIONS.forEach((option) => {
          const diff = Math.abs(imageRatio - option.targetRatio);
          if (diff < minDiff) {
            minDiff = diff;
            bestOption = option;
          }
        });
        return bestOption;
      },

      // (v5.0) "4:5" 옵션 목록을 차이순으로 정렬
      getFilteredGridOptions(imageRatio) {
        const optionsWithDiff = ALL_GRID_OPTIONS.map((option) => ({
          ...option,
          diff: Math.abs(imageRatio - option.targetRatio),
        }));
        return optionsWithDiff.sort((a, b) => a.diff - b.diff);
      },

      createPaddedCanvas() {
        const { originalImage, selectedGridOption, padColor } = App.state;
        const targetRatio = selectedGridOption.targetRatio;

        let outWidth, outHeight;
        const imgRatio = originalImage.width / originalImage.height;

        // 캔버스가 이미지보다 가로로 넓음 (세로 꽉 참)
        if (targetRatio > imgRatio) {
          outHeight = originalImage.height;
          outWidth = Math.round(outHeight * targetRatio);
        } else {
          // 캔버스가 이미지보다 세로로 넓음 (가로 꽉 참)
          outWidth = originalImage.width;
          outHeight = Math.round(outWidth / targetRatio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = outWidth;
        canvas.height = outHeight;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = padColor;
        ctx.fillRect(0, 0, outWidth, outHeight);

        const dx = (outWidth - originalImage.width) / 2;
        const dy = (outHeight - originalImage.height) / 2;

        ctx.drawImage(
          originalImage,
          dx,
          dy,
          originalImage.width,
          originalImage.height
        );
        return canvas;
      },

      // (v5.0) 분할 로직 (v3.3과 동일하나, 이제 4:5 옵션만 처리함)
      splitImage(imageToSplit, gridOption) {
        const { gridResultContainer } = App.elements;
        const { cols, rows } = gridOption;

        gridResultContainer.innerHTML = "";
        App.state.generatedPieces = [];

        // imageToSplit는 (3*4) : (N*5) 비율의 캔버스임
        // (예: 3x2 -> 12:10 = 1.2 비율)
        // 이것을 3x2로 자르면, 각 조각은 (12/3) : (10/2) = 4:5 비율이 됨.
        const pieceWidth = imageToSplit.width / cols;
        const pieceHeight = imageToSplit.height / rows;

        gridResultContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = Math.round(pieceWidth);
        canvas.height = Math.round(pieceHeight);

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(
              imageToSplit,
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
            // (v5.0) 1번부터 순서대로 저장 (1, 2, 3, ...)
            const pieceNumber = r * cols + c + 1;
            const name = `image_${pieceNumber}.png`;
            App.state.generatedPieces.push({ name, data: dataUrl });

            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = name;
            link.title = `클릭해서 ${pieceNumber}번 조각 저장`;
            link.target = "_blank";

            // (v5.1) 이미지 위에 번호 표시
            const numberLabel = document.createElement("span");
            numberLabel.className = "grid-number-label";
            numberLabel.textContent = pieceNumber;
            link.appendChild(numberLabel);

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

        App.ui.setLoading(zipDownloadButton, "압축 중...");
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
          URL.revokeObjectURL(link.href);
        } catch (error) {
          console.error("ZIP 생성 중 오류 발생:", error);
        } finally {
          App.ui.setLoading(zipDownloadButton, ".zip으로 모두 받기", false);
        }
      },
    },

    // 7. UI 변경 관련 함수 모음
    ui: {
      goToStep(stepToShow) {
        [
          App.elements.step1Upload,
          App.elements.step2SmartSwitch,
          App.elements.step2Crop,
          App.elements.step2Options,
          App.elements.step3Result,
        ].forEach((step) => step.classList.remove("active"));
        stepToShow.classList.add("active");
      },

      setAppHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--app-height", `${vh}px`);
      },

      populateOptions(options) {
        const { optionGroup } = App.elements;
        optionGroup.innerHTML = "";
        options.forEach((option) => {
          // (v5.1) 1:1 옵션이 없으므로, pano 클래스가 기본임
          const gridVis = option.id;
          const gridVisHtml = Array.from(
            { length: option.cols * option.rows },
            () => `<div class="grid-cell"></div>`
          ).join("");

          const html = `
            <button class="option-card" data-grid="${option.id}">
              <div class="grid-preview" data-grid-vis="${gridVis}">
                ${gridVisHtml}
              </div>
              <strong>${option.text}</strong>
            </button>
          `;
          optionGroup.insertAdjacentHTML("beforeend", html);
        });
        const currentActive = optionGroup.querySelector(
          `[data-grid="${App.state.selectedGridOption.id}"]`
        );
        if (currentActive) currentActive.classList.add("active");
      },

      // (v4.0) 크롭 UI 업데이트
      updateCropUI(gridOption) {
        const { cropHeadingText } = App.elements;
        cropHeadingText.innerHTML = `"${gridOption.text}"`;
      },

      // (v4.0) 여백 제안 UI 업데이트
      setupSmartSwitch(gridOption) {
        const { padHeadingText, padOptionText, fitPreviewContainer } =
          App.elements;
        const { originalImage } = App.state;

        // 멘트 업데이트 (v5.1)
        const boldText = gridOption.text.split(" ")[0]; // "1줄", "2줄"
        padHeadingText.innerHTML = `"${boldText}"로 나누면`;
        padOptionText.innerHTML = `"${gridOption.text}"`;

        // 미리보기 업데이트
        fitPreviewContainer.style.aspectRatio = gridOption.targetRatio;
        fitPreviewContainer.style.backgroundImage = `url(${originalImage.src})`;
      },

      setLoading(button, text, isLoading = true) {
        button.disabled = isLoading;
        button.textContent = text;
      },
    },

    // 8. 헬퍼 함수 모음
    helpers: {
      checkAndEscapeKakaoInApp() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (!/kakaotalk/i.test(userAgent)) return false;

        const currentUrl = window.location.href;
        const isIOS = /iphone|ipad|ipod/i.test(userAgent);
        window.location.href =
          "kakaotalk://web/openExternal?url=" + encodeURIComponent(currentUrl);
        setTimeout(() => {
          window.location.href = isIOS
            ? "kakaoweb://closeBrowser"
            : "kakaotalk://inappbrowser/close";
        }, 500);
        return true;
      },
    },
  };

  // --- 앱 실행 ---
  App.init();
});
