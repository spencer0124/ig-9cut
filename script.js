document.addEventListener("DOMContentLoaded", () => {
  // --- (v6.0) 3106px 너비 기준 4:5 파노라마 비율 정의 ---
  // W = 3106px
  // H = 1350px * Rows
  const ALL_GRID_OPTIONS = [
    {
      id: "3x1-pano",
      text: "1줄 (3장)",
      cols: 3,
      rows: 1,
      targetRatio: 3106 / 1350,
    }, // ~2.30
    {
      id: "3x2-pano",
      text: "2줄 (6장)",
      cols: 3,
      rows: 2,
      targetRatio: 3106 / 2700,
    }, // ~1.15
    {
      id: "3x3-pano",
      text: "3줄 (9장)",
      cols: 3,
      rows: 3,
      targetRatio: 3106 / 4050,
    }, // ~0.76
    {
      id: "3x4-pano",
      text: "4줄 (12장)",
      cols: 3,
      rows: 4,
      targetRatio: 3106 / 5400,
    }, // ~0.57
  ];

  const CROP_LOSS_THRESHOLD_RATIO = 0.4;

  const App = {
    state: {
      originalImage: null,
      generatedPieces: [],
      cropperInstance: null,
      selectedGridOption: null,
      padColor: "#000000",
    },

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
      padHeadingText: null,
      padOptionText: null,
      fitPreviewContainer: null,
      forceCropButton: null,
      splitWithPadButton: null,
      cropperImage: null,
      cropHeadingText: null,
      cropperContainer: null,
      cropAndSplitButton: null,
      changeGridButton: null,
      optionGroup: null,
      backToCropButton: null,
    },

    init() {
      if (this.helpers.checkAndEscapeKakaoInApp()) return;
      this.ui.setAppHeight();
      window.addEventListener("resize", this.ui.setAppHeight);
      this.findDOMElements();
      this.bindEvents();
    },

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

      this.elements.padHeadingText = document.getElementById("padHeadingText");
      this.elements.padOptionText = document.getElementById("padOptionText");
      this.elements.fitPreviewContainer = document.getElementById(
        "fitPreviewContainer"
      );
      this.elements.forceCropButton =
        document.getElementById("forceCropButton");
      this.elements.splitWithPadButton =
        document.getElementById("splitWithPadButton");

      this.elements.cropperImage = document.getElementById("cropperImage");
      this.elements.cropHeadingText =
        document.getElementById("cropHeadingText");
      this.elements.cropperContainer =
        document.getElementById("cropperContainer");
      this.elements.cropAndSplitButton =
        document.getElementById("cropAndSplitButton");
      this.elements.changeGridButton =
        document.getElementById("changeGridButton");

      this.elements.optionGroup = document.getElementById("optionGroup");
      this.elements.backToCropButton =
        document.getElementById("backToCropButton");
    },

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
            App.state.selectedGridOption = bestOption;

            const diff = Math.abs(imageRatio - bestOption.targetRatio);
            const lossPercent =
              diff / Math.max(imageRatio, bestOption.targetRatio);

            if (lossPercent > CROP_LOSS_THRESHOLD_RATIO) {
              App.ui.setupSmartSwitch(bestOption);
              App.ui.goToStep(App.elements.step2SmartSwitch);
            } else {
              App.ui.goToStep(App.elements.step2Crop);
              setTimeout(() => {
                App.logic.setupCropper(bestOption);
              }, 0);
            }
          };
        };
        reader.readAsDataURL(file);
      },

      handleForceCrop() {
        App.ui.goToStep(App.elements.step2Crop);
        setTimeout(() => {
          App.logic.setupCropper(App.state.selectedGridOption);
        }, 0);
      },

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

      async handleCropAndSplit() {
        App.ui.setLoading(App.elements.cropAndSplitButton, "나누는 중...");
        if (!App.state.cropperInstance) return;

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

    logic: {
      setupCropper(gridOption) {
        App.state.selectedGridOption = gridOption;
        App.ui.updateCropUI(gridOption);

        if (App.state.cropperInstance) {
          App.state.cropperInstance.destroy();
        }

        App.state.cropperInstance = new Cropper(App.elements.cropperImage, {
          aspectRatio: gridOption.targetRatio,
          viewMode: 1,
          autoCropArea: 1.0,
          guides: false, // 기본 격자 제거
          ready() {
            // (v6.0) 새로운 가이드 동적 생성
            const cropBox =
              App.elements.cropperContainer.querySelector(".cropper-crop-box");
            if (cropBox) {
              const oldGuides = cropBox.querySelector(".seam-guides-dynamic");
              if (oldGuides) oldGuides.remove();

              const guides = document.createElement("div");
              guides.className = "seam-guides-dynamic";

              // 1. 붉은색 Margin Zone (좌/우)
              guides.innerHTML += `
                <div class="seam-margin-zone left"></div>
                <div class="seam-margin-zone right"></div>
              `;

              // 2. 흰색 Split Line (분기점)
              guides.innerHTML += `
                <div class="seam-split-line split-1"></div>
                <div class="seam-split-line split-2"></div>
              `;

              // 3. 가로 분할선 (Rows)
              for (let i = 1; i < gridOption.rows; i++) {
                const hLine = document.createElement("div");
                hLine.className = "seam-horizontal-line";
                hLine.style.top = `${(i / gridOption.rows) * 100}%`;
                guides.appendChild(hLine);
              }

              cropBox.appendChild(guides);
            }
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
        return optionsWithDiff.sort((a, b) => a.diff - b.diff);
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

      // (v6.0) 핵심: 겹침을 고려한 분할 로직
      splitImage(imageToSplit, gridOption) {
        const { gridResultContainer } = App.elements;
        const { cols, rows } = gridOption;

        gridResultContainer.innerHTML = "";
        App.state.generatedPieces = [];

        // 1. Master Canvas 생성 (W:3106 기준)
        // imageToSplit을 3106px 폭으로 리사이징합니다.
        const masterWidth = 3106;
        const masterHeight = 1350 * rows;

        const masterCanvas = document.createElement("canvas");
        masterCanvas.width = masterWidth;
        masterCanvas.height = masterHeight;
        const mCtx = masterCanvas.getContext("2d");
        mCtx.drawImage(imageToSplit, 0, 0, masterWidth, masterHeight);

        // 2. 조각내기 (Slicing)
        // 각 조각은 1080 x 1350
        const pieceWidth = 1080;
        const pieceHeight = 1350;

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = pieceWidth;
        sliceCanvas.height = pieceHeight;
        const sCtx = sliceCanvas.getContext("2d");

        gridResultContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        // 좌표 설정 (PDF 원리 적용)
        const xCoords = [0, 1013, 2026]; // 1열, 2열, 3열의 시작 x좌표

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            sCtx.clearRect(0, 0, pieceWidth, pieceHeight);

            // Master Canvas에서 겹침을 고려하여 1080px씩 추출
            sCtx.drawImage(
              masterCanvas,
              xCoords[c],
              r * pieceHeight, // sx, sy
              pieceWidth,
              pieceHeight, // sw, sh
              0,
              0, // dx, dy
              pieceWidth,
              pieceHeight // dw, dh
            );

            const dataUrl = sliceCanvas.toDataURL("image/png");
            const pieceNumber = r * cols + c + 1;
            const name = `image_${pieceNumber}.png`;
            App.state.generatedPieces.push({ name, data: dataUrl });

            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = name;
            link.target = "_blank";

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

      updateCropUI(gridOption) {
        const { cropHeadingText } = App.elements;
        cropHeadingText.innerHTML = `"${gridOption.text}"`;
      },

      setupSmartSwitch(gridOption) {
        const { padHeadingText, padOptionText, fitPreviewContainer } =
          App.elements;
        const { originalImage } = App.state;
        const boldText = gridOption.text.split(" ")[0];
        padHeadingText.innerHTML = `"${boldText}"로 나누면`;
        padOptionText.innerHTML = `"${gridOption.text}"`;
        fitPreviewContainer.style.aspectRatio = gridOption.targetRatio;
        fitPreviewContainer.style.backgroundImage = `url(${originalImage.src})`;
      },

      setLoading(button, text, isLoading = true) {
        button.disabled = isLoading;
        button.textContent = text;
      },
    },

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

  App.init();
});
