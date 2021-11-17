(function () {

  const textProperties = {
    "en": {
      "nameSize": 30,
      "dialogueSize": 32,
      "speakerXPos": 45,
      "speakerYPos": 820,
      "dialogueXPos": 75,
      "dialogueYPos": 930,
      "lineHeight": 52,
      "loc": {
        "defaultPortraitSrc": "images/adPortrait.png",
        "layer": "Layer",
        "layerImage": "Layer Image",
        "reccomendedSize": "(Reccommended Size: 750x1334)",
        "layerName": "Layer Name",
        "layerOffsetX": "Offset X",
        "layerOffsetY": "Offset Y",
        "layerRotation": "Rotation",
        "layerScale": "Scale",
        "auto": "Auto",
        "noDeleteBaseLayer": "Base layer cannot be removed!",
        "deleteLayerConfirm": "Are you sure you want to delete this layer?",
        "deleteLayer": "Delete Layer",
        "background": "Background",
        "portrait": "Portrait",
        "download": "Download",
        "generating": "Generating Image...",
      }
    },
    "zh_tw": {
      "nameSize": 32,
      "dialogueSize": "900 32",
      "speakerXPos": 45,
      "speakerYPos": 820,
      "dialogueXPos": 75,
      "dialogueYPos": 930,
      "lineHeight": 70,
      "loc": {
        "defaultPortraitSrc": "images/examplePortrait.png",
        "layer": "圖層",
        "layerImage": "圖片",
        "reccomendedSize": "(建議大小: 750x1334)",
        "layerName": "圖層名稱",
        "layerOffsetX": "左右調整",
        "layerOffsetY": "上下調整",
        "layerRotation": "旋轉",
        "layerScale": "放大/縮小",
        "auto": "自動",
        "noDeleteBaseLayer": "無法刪除基底圖層!",
        "deleteLayerConfirm": "確定刪除此圖層?",
        "deleteLayer": "刪除圖層",
        "background": "背景",
        "portrait": "美術圖",
        "download": "下載",
        "generating": "圖片生成中...",
      }
    },
    "zh_cn": {
      "nameSize": "900 32",
      "dialogueSize": "900 32",
      "speakerXPos": 45,
      "speakerYPos": 820,
      "dialogueXPos": 75,
      "dialogueYPos": 930,
      "lineHeight": 70,
      "loc": {
        "defaultPortraitSrc": "images/examplePortrait.png",
        "layer": "图层",
        "layerImage": "图片",
        "reccomendedSize": "(建议大小: 750x1334)",
        "layerName": "图层名称",
        "layerOffsetX": "左右调整",
        "layerOffsetY": "上下调整",
        "layerRotation": "旋转",
        "layerScale": "放大/缩小",
        "auto": "自动",
        "noDeleteBaseLayer": "无法删除基底图层!",
        "deleteLayerConfirm": "确定删除此图层?",
        "deleteLayer": "删除图层",
        "background": "背景",
        "portrait": "美术图",
        "download": "下载",
        "generating": "图片生成中...",
      }
    },
    "jp": {
      "nameSize": 32,
      "dialogueSize": 32,
      "speakerXPos": 45,
      "speakerYPos": 825,
      "dialogueXPos": 75,
      "dialogueYPos": 945,
      "lineHeight": 52,
      "loc": {
        "defaultPortraitSrc": "images/examplePortrait.png",
        "layer": "レイヤー",
        "layerImage": "画像",
        "reccomendedSize": "(おすすめのサイズ: 750x1334)",
        "layerName": "レイヤー名",
        "layerOffsetX": "左右位置調整",
        "layerOffsetY": "上下位置調整",
        "layerRotation": "回転",
        "layerScale": "拡大・縮小",
        "auto": "おまかせ",
        "noDeleteBaseLayer": "ベースレイヤーは削除できません!",
        "deleteLayer": "レイヤーを削除",
        "background": "背景",
        "portrait": "イラスト",
        "download": "ダウンロード",
        "generating": "Loading...",
      }
    }
  }

  const furiganaSize = 15;
  const textures = {};
  const emotionFromSide = 180;
  const emotionYPos = 250;

  const layers = [];

  let drawing = false;
  let pageLanguage = "en";
  let layerId = 0;

  window.addEventListener("load", init);

  async function init() {
    // Wait for font load before drawing
    pageLanguage = document.documentElement.lang;
    addLayer(textProperties[pageLanguage].loc.background, "images/exampleBackground.png");
    addLayer(textProperties[pageLanguage].loc.portrait, textProperties[pageLanguage].loc.defaultPortraitSrc);

    try {
      await document.fonts.load("30px dragalialosten");
      await document.fonts.load("30px dragalialostjp");
      await document.fonts.load("30px dragalialostzh_tw");
      await document.fonts.load("30px dragalialostzh_cn");
      await drawDialogueScreen();
    } catch(e) {
      console.error(e);
    }

    setupListener();
  }

  /**
   * Set up event listeners
   */
  function setupListener() {
    id("addLayer").addEventListener("click", () => { addLayer(`${textProperties[pageLanguage].loc.layer} ${layers.length}`, "images/adPortrait.png") });

    // Draw image after parameter change
    id("name").addEventListener("change", drawDialogueScreen);
    id("dialogue").addEventListener("change", drawDialogueScreen);
    id("jp").addEventListener("change", drawDialogueScreen);
    id("en").addEventListener("change", drawDialogueScreen);
    id("zh_tw").addEventListener("change", drawDialogueScreen);
    id("zh_cn").addEventListener("change", drawDialogueScreen);

    id("emotion").addEventListener("change", drawDialogueScreen);
    id("left").addEventListener("change", drawDialogueScreen);
    id("right").addEventListener("change", drawDialogueScreen);

    id("download").addEventListener("click", downloadImage);

    id("deleteCancelBtn").addEventListener("click", closeLayerDeletePrompt);
    document.addEventListener('keydown', function(e){
      if(e.key === "Escape"){
        closeLayerDeletePrompt();
      }
    });

    document.querySelectorAll("#dialogueArea input[type=number]").forEach(e => {
      // Sync number input with slider
      qs(`[data-slider="${e.id}"]`).addEventListener("input", sliderUpdateNumInput);
      qs(`[data-slider="${e.id}"]`).addEventListener("change", sliderChangeNumInput);
      e.addEventListener("input", numInputUpdateSlider);
      e.addEventListener("change", drawDialogueScreen);
    });
  }

  function sliderUpdateNumInput() {
    let input = id(this.dataset.slider);
    input.value = this.value;
  }

  function sliderChangeNumInput() {
    let input = id(this.dataset.slider);
    input.dispatchEvent(new Event('change'));
  }

  function numInputUpdateSlider() {
    let slider = qs(`[data-slider="${this.id}"]`);
    slider.value = this.value;
  }

  function changeImage() {
    id(this.dataset.image).src = window.URL.createObjectURL(this.files[0]);
  }

  function autoScale(e) {
    e.preventDefault();
    let newScale = id("editor").width / id(this.dataset.autoscale).naturalWidth;
    id(this.dataset.autoscale + "Scale").value = newScale;
    qs(`[data-slider="${this.dataset.autoscale}Scale"]`).value = newScale;
    drawDialogueScreen();
  }

  async function loadTextures() {
    if(!textures.background) {
      textures.bar = await loadImage("images/bar.png");
      textures.skipjp = await loadImage("images/skipjp.png");
      textures.skipzh_tw = await loadImage("images/skipcn.png");
      textures.skipzh_cn = await loadImage("images/skipcn.png");
    }
  }

  /**
   * Draws the summon screen based on inputs
   */
  async function drawDialogueScreen() {
    if(drawing) return;

    drawing = true;

    // Get canvas context
    const canvas = id("editor");
    const ctx = canvas.getContext("2d");
    const previewCanvas = id("preview");
    const previewCtx = previewCanvas.getContext("2d");

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Load images for use
    await loadTextures();
    const bar = textures.bar;
    const font =  qs("input[name=font]:checked").value;

    // Get parameters
    const speakerName = id("name").value;
    const dialogue = id("dialogue").value;

    // Draw Layers
    for(let i = 0; i < layers.length; i++) {
      let layer = layers[i];
      drawImageFromContext(ctx, canvas.width / 2, canvas.height / 2, layer)
    }

    // Draw Emotion
    let emotionName = id("emotion").value;
    if(emotionName !== "none") {
      let emotionSide = qs("input[name=emotionside]:checked").value;
      emotionName += "_" + emotionSide;

      if(!textures[emotionName]) {
        textures[emotionName] = await loadImage("images/" + emotionName + ".png");
      }

      const emotion = textures[emotionName];
      drawImageFromContext(ctx, emotionSide === "l" ? emotionFromSide : canvas.width - emotionFromSide, emotionYPos,
        {
          "image": emotion,
          "offsetX": id("emotionOffsetX").value,
          "offsetY":id("emotionOffsetY").value,
          "scale": 1
        });
    }

    ctx.drawImage(bar, 0, 0);

    if(font !== "en") {
      ctx.drawImage(textures["skip" + font], 0, 0);
    }

    // Calculate text position based on text width
    let prop = textProperties[font];
    drawDialogueText(ctx, prop, font, speakerName, dialogue);

    // Draw the editor canvas on the smaller preview canvas
    previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);

    drawing = false;
  }

  function downloadImage() {
    // Generate download url
    this.innerText = textProperties[pageLanguage].loc.generating;
    id("editor").toBlob(blob => {
      this.innerText = textProperties[pageLanguage].loc.download;
      id("downloadLink").href = URL.createObjectURL(blob);
      id("downloadLink").click();
    }, "image/png")


    //id("downloadLink").href = id("editor").toDataURL("image/png").replace("image/png", "image/octet-stream");
    //id("downloadLink").click();
  }

  function printDialogue(text, font, fontSize, startXPos, startYPos, ctx) {
    let tmp = "";
    let last = 0;
    text = text.replace(/\(([^\)]+)\)\{([^\}]+)\}/g, (match, p1, p2, offset, string) => {
      tmp += text.substring(last, offset);

      // Use normal font size first
      ctx.font = fontSize + "px dragalialost" + font;
      // Measure the length so far, add the half of the text below the furigana for the center
      let center = startXPos + ctx.measureText(tmp).width + ctx.measureText(p1).width / 2;

      // Change to smaller font, measure where to start the furigana
      ctx.font = furiganaSize + "px dragalialost" + font;
      let furiXPos = center - ctx.measureText(p2).width / 2;

      console.log(furiXPos);

      ctx.fillText(p2, furiXPos, startYPos - fontSize + 2);

      tmp += p1;
      last = offset + p1.length + p2.length + 4;
      return p1;
    });
    ctx.font = fontSize + "px dragalialost" + font;
    ctx.fillText(text, startXPos, startYPos);
  }

  function drawImageFromContext(ctx, centerX, centerY, layer) {
    scale = parseFloat(layer.scale);
    centerX = parseFloat(centerX);
    centerY = parseFloat(centerY);
    offsetX = parseFloat(layer.offsetX);
    offsetY = -parseFloat(layer.offsetY);
    rotation = parseFloat(layer.rotation ? layer.rotation : 0);

    let width = layer.image.naturalWidth * scale;
    let height = layer.image.naturalHeight * scale;
    let x = centerX - width / 2 + offsetX;
    let y = centerY - height / 2 + offsetY;

    ctx.translate(centerX+ offsetX, centerY+ offsetY);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.translate(-centerX- offsetX, -centerY- offsetY);

    ctx.drawImage(layer.image, x, y, width, height);

    ctx.translate(centerX+ offsetX, centerY+ offsetY);
    ctx.rotate(-rotation * Math.PI / 180);
    ctx.translate(-centerX- offsetX, -centerY- offsetY);
  }

  function drawDialogueText(ctx, prop, font, speakerName, dialogue) {
    ctx.font = prop.nameSize + "px dragalialost" + font;
    ctx.fillStyle = "white";
    ctx.fillText(speakerName, prop.speakerXPos, prop.speakerYPos);
    ctx.font = prop.dialogueSize + "px dragalialost" + font;
    ctx.fillStyle = "#071726";
    let lines = dialogue.split("\n");
    for (let i = 0; i < lines.length; i++) {
      printDialogue(lines[i], font, prop.dialogueSize, prop.dialogueXPos, prop.dialogueYPos + i * prop.lineHeight, ctx);
    }
  }

  function addLayer(layerName, imageSource) {
    let tabButton = document.createElement("button");
    tabButton.innerText = layerName;

    let newLayer = {
      "id": getNewId(),
      "image": null,
      "offsetX": 0,
      "offsetY": 0,
      "rotation": 0,
      "scale": 1,
    }

    let tab = createLayerTab(newLayer, tabButton, imageSource, textProperties[pageLanguage].loc);
    tabButton.addEventListener("click", function() {
      qsa("#tabBar button").forEach(e => e.classList.remove("active"));
      qsa(".tab").forEach(e => e.classList.remove("active"));
      this.classList.add("active");
      tab.classList.add("active");
    });

    qsa("#tabBar button").forEach(e => e.classList.remove("active"));
    qsa(".tab").forEach(e => e.classList.remove("active"));
    tabButton.classList.add("active");
    tab.classList.add("active");

    id("tabBar").insertBefore(tabButton, id("addLayer"));
    id("uploadArea").appendChild(tab);

    layers.push(newLayer);
  }

  function removeLayer() {
    const index = array.indexOf(5);
    if (index > -1) {
      array.splice(index, 1);
    }
  }

  // Should I be sensible and use frameworks like react/vue? yeah probably
  function createLayerTab(layer, tabButton, imageSource, loc) {
    let tab = document.createElement("div");
    tab.classList.add("tab");

    // Create the left part of the tab
    let imageContainer = document.createElement("div");

    imageContainer.innerHTML =
      `<h2>${loc.layerImage}</h2>
      <label>${loc.reccomendedSize}</label>`

    let image = document.createElement("img");
    image.src = imageSource;
    image.alt = `Image for ${tabButton.innerText}`;
    image.addEventListener("load", drawDialogueScreen);

    // Set the image of the layer
    layer.image = image;

    let uploadButton = document.createElement("input");
    uploadButton.type = "file";
    uploadButton.accept = "image/*";
    uploadButton.addEventListener("change", () => { image.src = window.URL.createObjectURL(uploadButton.files[0]); })

    let deleteButton = document.createElement("button");
    deleteButton.classList.add("button", "delete");

    deleteButton.addEventListener("click", function() {
      if(layers.length <= 1) {
        this.innerText = loc.noDeleteBaseLayer;
        setTimeout(() => {
          this.innerText = loc.deleteLayer;
        }, 1000);
        return;
      }

      deleteConfirmBtn.addEventListener("click", () => {
        const index = layers.findIndex(e => e.id === layer.id);
        if (index > -1) {
          layers.splice(index, 1);
        }
        tabButton.remove();
        tab.remove();
        qs("#tabBar button").click();
        drawDialogueScreen();
        closeLayerDeletePrompt();
      });

      openLayerDeleteModal();
    })

    deleteButton.innerText = loc.deleteLayer;

    imageContainer.appendChild(image);
    imageContainer.appendChild(uploadButton);
    imageContainer.appendChild(deleteButton);

    // Create the right part of the tab
    let settingContainer = document.createElement("div");

    let layerNameContainer = document.createElement("div");
    let layerLabel = document.createElement("label");
    let layerNameInput = document.createElement("input");

    layerNameInput.addEventListener("input", function() {
      tabButton.innerText = this.value;
    });

    layerNameInput.type = "text";
    layerNameInput.placeholder = loc.layerName;
    layerNameInput.value = tabButton.innerText;

    layerNameContainer.appendChild(layerLabel);
    layerNameContainer.appendChild(layerNameInput);

    settingContainer.appendChild(layerNameContainer);
    settingContainer.appendChild(createSliderGroup(loc.layerOffsetX, -200, 200, 1, 0, (value) => { layer.offsetX = value; drawDialogueScreen(); }));
    settingContainer.appendChild(createSliderGroup(loc.layerOffsetY, -200, 200, 1, 0, (value) => { layer.offsetY = value; drawDialogueScreen(); }));
    settingContainer.appendChild(createSliderGroup(loc.layerRotation, -360, 360, 0.1, 0, (value) => { layer.rotation = value; drawDialogueScreen(); }));
    let scaleSliderGroup = createSliderGroup(loc.layerScale, 0, 3, 0.1, 1, (value) => { layer.scale = value; drawDialogueScreen(); });

    let autoButton = document.createElement("button");
    autoButton.classList.add("button");
    autoButton.innerText = loc.auto;
    autoButton.addEventListener("click", () => {
      let newScale = id("editor").width / image.naturalWidth;
      scaleSliderGroup.querySelector("input[type=num]").value = newScale;
      scaleSliderGroup.querySelector("input[type=range]").value = newScale;
      drawDialogueScreen();
    });

    scaleSliderGroup.appendChild(autoButton);

    settingContainer.appendChild(scaleSliderGroup);

    //Append to tab
    tab.appendChild(imageContainer);
    tab.appendChild(settingContainer);

    return tab;
  }

  function createSliderGroup(labelText, min, max, step, startValue, callback) {
    let container = document.createElement("div");
    let label = document.createElement("label");
    label.innerText = labelText;

    let group = document.createElement("div");
    group.classList.add("input-group");

    let numInput = document.createElement("input");
    numInput.type = "number";
    numInput.min = min;
    numInput.max = max;
    numInput.step = step;
    numInput.value = startValue;

    let slider = document.createElement("input");
    slider.type = "range";
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = startValue;

    group.appendChild(numInput);
    group.appendChild(slider);
    container.appendChild(label);
    container.appendChild(group);

    slider.addEventListener("input", () => { numInput.value = slider.value; });
    slider.addEventListener("change", () => { numInput.dispatchEvent(new Event('change')); });
    numInput.addEventListener("input", () => { slider.value = numInput.value });
    numInput.addEventListener("change", function() { callback(parseFloat(this.value)) });

    return container;
  }

  function getNewId() {
    layerId++;
    return layerId;
  }

  function openLayerDeleteModal() {
    id("deletePrompt").classList.remove("hidden");
  }

  function closeLayerDeletePrompt() {
    id("deletePrompt").classList.add("hidden");
  }

  function id(elementId) {
    return document.getElementById(elementId);
  }

  function qs(selector) {
    return document.querySelector(selector);
  }

  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  function loadImage(src){
    let img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    return new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  }

})();

function test(textXPos, textYPos) {
  const canvas = document.getElementById("editor");
  const ctx = canvas.getContext("2d");
  const previewCanvas = document.getElementById("preview");
  const previewCtx = previewCanvas.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillText("test", textXPos, textYPos);
  previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
}