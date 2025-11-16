document.addEventListener("DOMContentLoaded", () => {
  // --- 1. 모든 HTML 요소 가져오기 ---

  // 단계(Step) 컨테이너
  const step1Upload = document.getElementById("step-1-upload");
  const step2Options = document.getElementById("step-2-options");
  const step3Result = document.getElementById("step-3-result");

  // 단계 1 요소
  const uploadButton = document.getElementById("uploadButton");
  const imageLoader = document.getElementById("imageLoader");

  // 단계 2 요소
  const sourcePreview = document.getElementById("sourcePreview");
  const optionGroup = document.querySelector(".option-group");
  const optionCards = document.querySelectorAll(".option-card");
  const splitButton = document.getElementById("splitButton");
  let selectedGrid = "3x3"; // 기본값

  // 단계 3 요소
  const gridResultContainer = document.getElementById("gridResultContainer");
  const zipDownloadButton = document.getElementById("zipDownloadButton");
  const restartButton = document.getElementById("restartButton");

  // 전역 변수
  let originalImage = null;
  let generatedPieces = [];

  // --- 2. 함수 정의 ---

  // 현재 단계를 숨기고 다음 단계를 표시하는 함수
  function goToStep(stepToShow) {
    step1Upload.classList.remove("active");
    step2Options.classList.remove("active");
    step3Result.classList.remove("active");
    stepToShow.classList.add("active");
  }

  // v2.0의 "자르기 및 렌더링" 로직 (거의 동일)
  function splitAndRenderGrid() {
    if (!originalImage) return;

    gridResultContainer.innerHTML = "";
    generatedPieces = [];

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
        generatedPieces.push({ name, data: dataUrl });

        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = name;
        link.title = `클릭해서 ${name} 저장`;
        const img = document.createElement("img");
        img.src = dataUrl;
        link.appendChild(img);
        gridResultContainer.appendChild(link);
      }
    }
    // 결과 단계로 이동
    goToStep(step3Result);
  }

  // v2.0의 "ZIP 다운로드" 로직 (동일)
  async function downloadAllAsZip() {
    if (generatedPieces.length === 0) return;

    zipDownloadButton.disabled = true;
    zipDownloadButton.textContent = "압축 중...";

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

    zipDownloadButton.disabled = false;
    zipDownloadButton.textContent = ".zip으로 모두 받기";
  }

  // --- 3. 이벤트 리스너 연결 ---

  // 단계 1: 사진 선택하기 버튼
  uploadButton.addEventListener("click", () => {
    imageLoader.click(); // 숨겨진 input[type=file] 실행
  });

  // 파일이 실제로 선택되었을 때
  imageLoader.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      originalImage = new Image();
      originalImage.src = event.target.result;
      originalImage.onload = () => {
        sourcePreview.src = event.target.result; // 단계 2의 미리보기 이미지 설정
        goToStep(step2Options); // 옵션 단계로 이동
      };
    };
    reader.readAsDataURL(file);
  });

  // 단계 2: 옵션 카드 선택
  optionGroup.addEventListener("click", (e) => {
    const selectedCard = e.target.closest(".option-card");
    if (!selectedCard) return;

    // 모든 카드에서 'active' 제거
    optionCards.forEach((card) => card.classList.remove("active"));
    // 선택한 카드에 'active' 추가
    selectedCard.classList.add("active");
    // 선택한 값 저장
    selectedGrid = selectedCard.dataset.grid;
  });

  // 단계 2: "나누기" 버튼
  splitButton.addEventListener("click", splitAndRenderGrid);

  // 단계 3: "ZIP 다운로드" 버튼
  zipDownloadButton.addEventListener("click", downloadAllAsZip);

  // 단계 3: "새로 하기" 버튼
  restartButton.addEventListener("click", () => {
    // 모든 값 초기화
    originalImage = null;
    generatedPieces = [];
    imageLoader.value = null; // 파일 선택 초기화
    goToStep(step1Upload); // 1단계로 이동
  });
});
