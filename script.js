/* === 리팩토링된 script.js (v3.3: 토글 오류 수정) === */

document.addEventListener("DOMContentLoaded", () => {
  // --- 모든 분할 옵션 정의 ---
  const ALL_GRID_OPTIONS = [
    { id: "3x1", text: "3x1 정방형", cols: 3, rows: 1, targetRatio: 3 / 1 },
    { id: "3x2", text: "3x2 정방형", cols: 3, rows: 2, targetRatio: 3 / 2 },
    { id: "3x3", text: "3x3 정방형", cols: 3, rows: 3, targetRatio: 3 / 3 },
    { id: "3x4", text: "3x4 정방형", cols: 3, rows: 4, targetRatio: 3 / 4 },
    {
      id: "3x2-pano",
      text: "3x2 (4:5 파노라마)",
      cols: 3,
      rows: 2,
      targetRatio: 1.2,
    },
    {
      id: "3x3-pano",
      text: "3x3 (4:5 파노라마)",
      cols: 3,
      rows: 3,
      targetRatio: 0.8,
    },
  ];

  const App = {
    // 1. 앱의 상태를 관리하는 객체
    state: {
      originalImage: null,
      generatedPieces: [],
      cropperInstance: null,
      selectedGridOption: null,
      isCropMode: true,
      padColor: "#000000",
    },

    // 2. DOM 요소를 저장하는 객체
    elements: {
      step1Upload: null,
      step2Crop: null,
      step2Options: null,
      step3Result: null,
      uploadButton: null,
      imageLoader: null,
      sourcePreview: null,
      gridResultContainer: null,
      zipDownloadButton: null,
      restartButton: null,
      cropperImage: null,
      cropHeadingText: null,
      fitFillToggleButton: null,
      colorPickerGroup: null,
      colorDots: null,
      cropperContainer: null,
      fitPreviewContainer: null,
      cropAndSplitButton: null,
      changeGridButton: null,
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
      this.elements.cropperImage = document.getElementById("cropperImage");
      this.elements.cropHeadingText =
        document.getElementById("cropHeadingText");
      this.elements.fitFillToggleButton = document.getElementById(
        "fitFillToggleButton"
      );
      this.elements.colorPickerGroup =
        document.getElementById("colorPickerGroup");
      this.elements.colorDots = document.querySelectorAll(".color-dot");
      this.elements.cropperContainer =
        document.getElementById("cropperContainer");
      this.elements.fitPreviewContainer = document.getElementById(
        "fitPreviewContainer"
      );
      this.elements.cropAndSplitButton =
        document.getElementById("cropAndSplitButton");
      this.elements.changeGridButton =
        document.getElementById("changeGridButton");
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
      this.elements.cropAndSplitButton.addEventListener(
        "click",
        this.handlers.handleCropAndSplit
      );
      this.elements.changeGridButton.addEventListener(
        "click",
        this.handlers.handleChangeGrid
      );
      this.elements.fitFillToggleButton.addEventListener(
        "click",
        this.handlers.handleFitFillToggle
      );
      this.elements.colorPickerGroup.addEventListener(
        "click",
        this.handlers.handleColorSelect
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

            App.ui.goToStep(App.elements.step2Crop);
            setTimeout(() => {
              App.logic.setupCropper(bestOption);
            }, 0);
          };
        };
        reader.readAsDataURL(file);
      },

      handleChangeGrid() {
        const imageRatio =
          App.state.originalImage.width / App.state.originalImage.height;
        const filteredOptions = App.logic.getFilteredGridOptions(imageRatio);
        App.ui.populateOptions(filteredOptions);
        App.ui.goToStep(App.elements.step2Options);
      },

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

      handleBackToCrop() {
        App.ui.goToStep(App.elements.step2Crop);
      },

      handleFitFillToggle() {
        App.state.isCropMode = !App.state.isCropMode;
        App.ui.updateFitFillToggle();
      },

      handleColorSelect(e) {
        const selectedColorDot = e.target.closest(".color-dot");
        if (!selectedColorDot) return;

        App.elements.colorDots.forEach((dot) => dot.classList.remove("active"));
        selectedColorDot.classList.add("active");

        App.state.padColor =
          selectedColorDot.dataset.color === "auto"
            ? "#000000" // TODO: 'auto' 색상 추출 로직 (일단 검정)
            : selectedColorDot.dataset.color;

        App.ui.updateFitFillToggle(); // 미리보기 색상 업데이트
      },

      async handleCropAndSplit() {
        App.ui.setLoading(App.elements.cropAndSplitButton, "나누는 중...");

        let imageToSplit = new Image();
        let canvasToSplit;

        if (App.state.isCropMode) {
          if (!App.state.cropperInstance) {
            console.error("Cropper가 초기화되지 않았습니다.");
            App.ui.setLoading(
              App.elements.cropAndSplitButton,
              "오류 발생",
              false
            );
            return;
          }
          canvasToSplit = App.state.cropperInstance.getCroppedCanvas();
        } else {
          canvasToSplit = App.logic.createPaddedCanvas();
        }

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
        App.state.isCropMode = true; // '자르기' 모드로 리셋
        App.ui.updateCropUI(); // UI 업데이트 (제목, 토글 등)

        if (App.state.cropperInstance) {
          App.state.cropperInstance.destroy();
        }

        App.state.cropperInstance = new Cropper(App.elements.cropperImage, {
          aspectRatio: gridOption.targetRatio,
          viewMode: 1,
          autoCropArea: 1.0,
          ready() {
            console.log("Cropper is ready.");
          },
        });
      },

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

      getFilteredGridOptions(imageRatio) {
        const optionsWithDiff = ALL_GRID_OPTIONS.map((option) => ({
          ...option,
          diff: Math.abs(imageRatio - option.targetRatio),
        }));
        return optionsWithDiff.sort((a, b) => a.diff - b.diff).slice(0, 4);
      },

      createPaddedCanvas() {
        const { originalImage, selectedGridOption, padColor } = App.state;
        const targetRatio = selectedGridOption.targetRatio;

        let outWidth, outHeight;
        const imgRatio = originalImage.width / originalImage.height;

        if (targetRatio > imgRatio) {
          outHeight = originalImage.height;
          outWidth = Math.round(outHeight * targetRatio);
        } else {
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

      splitImage(imageToSplit, gridOption) {
        const { gridResultContainer } = App.elements;
        const { cols, rows } = gridOption;

        gridResultContainer.innerHTML = "";
        App.state.generatedPieces = [];

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
          const gridVis = option.id.includes("pano")
            ? `${option.id.split("-")[0]}-pano`
            : option.id;

          const gridVisHtml = Array.from(
            { length: option.cols * option.rows },
            () => `<div class="grid-cell"></div>`
          ).join("");

          const html = `
            <button class="option-card" data-grid="${option.id}">
              <div class="grid-preview ${
                option.id.includes("pano") ? "pano" : ""
              }" data-grid-vis="${gridVis}">
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

      updateCropUI() {
        const { cropHeadingText } = App.elements;
        const { selectedGridOption } = App.state;
        cropHeadingText.innerHTML = `"${selectedGridOption.text}"`;
        App.ui.updateFitFillToggle();
      },

      updateFitFillToggle() {
        const {
          fitFillToggleButton,
          colorPickerGroup,
          cropperContainer,
          fitPreviewContainer,
        } = App.elements;
        const { isCropMode, padColor, selectedGridOption, originalImage } =
          App.state;

        if (isCropMode) {
          fitFillToggleButton.textContent = "✂️ 자르기";
          fitFillToggleButton.classList.add("active");
          colorPickerGroup.style.display = "none";
          cropperContainer.style.display = "block";
          fitPreviewContainer.style.display = "none";

          if (!App.state.cropperInstance && App.state.originalImage) {
            // (*** 버그 3 수정 ***)
            // '여백' 모드에서 '자르기'로 돌아올 때, cropper가 파괴된 상태일 수 있음.
            // 이때 setupCropper를 다시 호출해야 함.
            // 렌더링 타이밍을 위해 setTimeout으로 감싸기.
            setTimeout(() => {
              // 이 시점엔 cropperContainer가 display: block이 됨.
              App.logic.setupCropper(App.state.selectedGridOption);
            }, 0);
          }
        } else {
          fitFillToggleButton.textContent = "⬜️ 여백 채우기";
          fitFillToggleButton.classList.remove("active");
          colorPickerGroup.style.display = "flex";
          cropperContainer.style.display = "none";
          fitPreviewContainer.style.display = "block";

          fitPreviewContainer.style.backgroundColor = padColor;
          if (selectedGridOption)
            fitPreviewContainer.style.aspectRatio =
              selectedGridOption.targetRatio;
          if (originalImage)
            fitPreviewContainer.style.backgroundImage = `url(${originalImage.src})`;

          if (App.state.cropperInstance) {
            App.state.cropperInstance.destroy();
            App.state.cropperInstance = null;
          }
        }
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
