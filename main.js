(function () {

  /* Module variables */

  // Localization
  let i18n;
  let pageLang = "en_us";

  const furiganaSize = 15;
  const textures = {};
  const emotionFromSide = 180;
  const emotionYPos = 250;

  const layers = [];

  let drawing = false;
  let pageLanguage = "en_us";
  let layerId = 0;

  let portraitCanvas = document.createElement("canvas");
  portraitCanvas.width = 1024;
  portraitCanvas.height = 1024;

  let currentPortraitData =
  {
    "base": "",
    "offset": {"x": 0, "y": 0},
    "face": "",
    "mouth": "",
  }

  let backgroundData = { };

  const backgroundPaginationSize = 12;

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
      await fetchBackgroundImages();
      await populatePortraitData();
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

    if(font !== "en_us") {
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
    }, "image/png");
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

      //console.log(furiXPos);

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
      resetPanels();
    });

    qsa("#tabBar button").forEach(e => e.classList.remove("active"));
    qsa(".tab").forEach(e => e.classList.remove("active"));
    tabButton.classList.add("active");
    tab.classList.add("active");

    id("tabBar").insertBefore(tabButton, id("addLayer"));
    id("tabs").appendChild(tab);

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
    });

    deleteButton.innerText = loc.deleteLayer;

    imageContainer.appendChild(image);
    imageContainer.appendChild(uploadButton);
    imageContainer.appendChild(deleteButton);
    imageContainer.appendChild(portraitPanelToggleButton());
    imageContainer.appendChild(bgPanelToggleButton());

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
    settingContainer.appendChild(createSliderGroup(loc.layerOffsetX, -400, 400, 1, 0, (value) => { layer.offsetX = value; drawDialogueScreen(); }));
    settingContainer.appendChild(createSliderGroup(loc.layerOffsetY, -400, 400, 1, 0, (value) => { layer.offsetY = value; drawDialogueScreen(); }));
    settingContainer.appendChild(createSliderGroup(loc.layerRotation, -180, 180, 0.1, 0, (value) => { layer.rotation = value; drawDialogueScreen(); }));
    let scaleSliderGroup = createSliderGroup(loc.layerScale, 0, 3, 0.1, 1, (value) => { layer.scale = value; drawDialogueScreen(); });

    let autoButton = document.createElement("button");
    autoButton.classList.add("button");
    autoButton.innerText = loc.auto;
    autoButton.addEventListener("click", () => {
      let newScale = id("editor").width / image.naturalWidth;
      let numInput = scaleSliderGroup.querySelector("input[type=number]");
      scaleSliderGroup.querySelector("input[type=range]").value = newScale;
      numInput.value = newScale;
      numInput.dispatchEvent(new Event('change'));
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

  /* Layer Delete Modal */

  function openLayerDeleteModal() {
    id("deletePrompt").classList.remove("hidden");
  }

  function closeLayerDeletePrompt() {
    id("deletePrompt").classList.add("hidden");
  }

  /* Background Panel */

  function resetPanels() {
    id("portraitPanel").classList.add("hidden");
    id("backgroundPanel").classList.add("hidden");
    id("portraitCharacter").value = "";
    id("facialExpression").innerHTML = "";
    id("mouthExpression").innerHTML = "";
    qsa(".tab .portrait-button").forEach(e => e.classList.remove("selected"));
    qsa(".tab .bg-button").forEach(e => e.classList.remove("selected"));
    currentPortraitData =
    {
      "base": "",
      "offset": {"x": 0, "y": 0},
      "face": "",
      "mouth": "",
    }
  }

  function bgPanelToggleButton() {
    let button = document.createElement("button");
    button.innerText = textProperties[pageLanguage].loc.fromBackground;
    button.classList.add("button");
    button.classList.add("bg-button");
    button.addEventListener("click", toggleBackgroundPanel);
    return button;
  }

  function toggleBackgroundPanel() {
    // Toggle background panel
    let backgroundHidden = id("backgroundPanel").classList.toggle("hidden");
    this.classList.toggle("selected", !backgroundHidden);

    // If panel is shown, update portrait panel
    if(!backgroundHidden) {
      id("portraitPanel").classList.add("hidden");
      qs(".tab.active .portrait-button").classList.remove("selected");
    }
  }

  async function fetchBackgroundImages() {
    let data = await fetchJson("data/background_data.json");

    for(let i = 0; i < data.length; i++) {
      if(backgroundData[data[i].type] === undefined) {
        backgroundData[data[i].type] = { "imgs": [], "index": 0 };
      }
      backgroundData[data[i].type].imgs.push(data[i]);
    }

    createPagination(id("backgroundBackgroundArt"), backgroundData.background, backgroundPaginationSize);
    createPagination(id("skyboxBackgroundArt"), backgroundData.skybox, backgroundPaginationSize);
    createPagination(id("cloudBackgroundArt"), backgroundData.cloud, backgroundPaginationSize);
    createPagination(id("overlayBackgroundArt"), backgroundData.overlay, backgroundPaginationSize);
  }

  function createPagination(container, data, size) {
    let bgs = [];

    let prev = document.createElement("button");
    let next = document.createElement("button");
    prev.innerText = "<";
    next.innerText = ">";
    prev.classList.add("button");
    next.classList.add("button");

    let imageContainer = document.createElement("div");
    imageContainer.classList.add("bg-container");

    for(let i = 0; i < size; i ++) {
      let bg = document.createElement("img");
      if(i < data.imgs.length) {
        bg.src = `https://dragalialost.wiki/thumb.php?f=${data.imgs[i].fileName}&width=75`;
        bg.dataset.fullSrc = data.imgs[i].url;
      } else {
        bg.classList.add("hidden");
      }
      bg.addEventListener("click", function() {
        let activeImage = qs(".tab.active img");
        activeImage.crossOrigin = "anonymous";
        activeImage.src = this.dataset.fullSrc;
      });
      bgs.push(bg);
      imageContainer.appendChild(bg);
    }

    prev.addEventListener("click", () => {
      data.index -= size;
      if(data.index < 0) {
        data.index = 0;
      }
      for(let i = 0; i < size; i++) {
        if(i + data.index < data.imgs.length) {
          bgs[i].src = `https://dragalialost.wiki/thumb.php?f=${data.imgs[i + data.index].fileName}&width=75`;
          bgs[i].dataset.fullSrc = data.imgs[i + data.index].url;
          bgs[i].classList.remove("hidden");
        }
        else {
          bgs[i].classList.add("hidden");
        }
      }
    });

    next.addEventListener("click", () => {
      if(data.index + size >= data.imgs.length) {
        return;
      }
      data.index += size;
      for(let i = 0; i < size; i++) {
        if(i + data.index < data.imgs.length) {
          bgs[i].src = `https://dragalialost.wiki/thumb.php?f=${data.imgs[i + data.index].fileName}&width=75`;
          bgs[i].dataset.fullSrc = data.imgs[i + data.index].url;
          bgs[i].classList.remove("hidden");
        }
        else {
          bgs[i].classList.add("hidden");
        }
      }
    });

    container.appendChild(prev);
    container.appendChild(imageContainer);
    container.appendChild(next);
  }

  /* Portrait Panel */

  function portraitPanelToggleButton() {
    let button = document.createElement("button");
    button.innerText = textProperties[pageLanguage].loc.fromPortrait;
    button.addEventListener("click", togglePortraitPanel);
    button.classList.add("button");
    button.classList.add("portrait-button");
    return button;
  }

  function togglePortraitPanel() {
    // Toggle portrait panel
    let portraitHidden = id("portraitPanel").classList.toggle("hidden");
    this.classList.toggle("selected", !portraitHidden);

    // If panel is shown, update bg panel
    if(!portraitHidden) {
      id("backgroundPanel").classList.add("hidden");
      qs(".tab.active .bg-button").classList.remove("selected");
    }
  }

  async function populatePortraitData() {
    let portraitData = await fetchJson("https://dlportraits.space/portrait_output/localizedDirData.json");
    let datalist = id("portraitList");
    for(file in portraitData.fileList) {
      let option = document.createElement("option");
      option.value = portraitData.fileList[file][pageLanguage];
      option.dataset.id = file;
      datalist.appendChild(option);
    }

    id("portraitCharacter").addEventListener("change", validateDatalistInput);
  }

  function validateDatalistInput() {
    let option = document.querySelector(`#portraitList option[value="${this.value}"]`);
    if (option === null) {
      this.value = "";
    } else {
      loadSelectedPortraitData(option.dataset.id);
    }
  }

  async function loadSelectedPortraitData(portraitId) {
    let data = await fetchJson(`https://dlportraits.space/portrait_output/${portraitId}/data.json`);

    let faceContainer = id("facialExpression");
    faceContainer.innerHTML = "";
    for(let i = 0; i < data.partsData.faceParts.length; i++) {
      let facePartUrl = `https://dlportraits.space/${data.partsData.faceParts[i].substring(2)}`;
      let facePart = document.createElement("img");
      facePart.src = facePartUrl;
      facePart.addEventListener("click", function() {
        currentPortraitData.face = this.src;
        drawPortraitAndRender();
      });
      faceContainer.appendChild(facePart);
    }

    let mouthContainer = id("mouthExpression");
    mouthContainer.innerHTML = "";
    for(let i = 0; i < data.partsData.mouthParts.length; i++) {
      let mouthPartUrl = `https://dlportraits.space/${data.partsData.mouthParts[i].substring(2)}`;
      let mouthPart = document.createElement("img");
      mouthPart.src = mouthPartUrl;
      mouthPart.addEventListener("click", function() {
        currentPortraitData.mouth = this.src;
        drawPortraitAndRender();
      });
      mouthContainer.appendChild(mouthPart);
    }

    currentPortraitData.face = "";
    currentPortraitData.mouth = "";
    currentPortraitData.base = `https://dlportraits.space/portrait_output/${portraitId}/${portraitId}_base.png`;
    currentPortraitData.offset = data.offset;

    drawPortraitAndRender();
  }

  async function drawPortraitAndRender() {
    const ctx = portraitCanvas.getContext("2d");
    ctx.clearRect(0, 0, portraitCanvas.width, portraitCanvas.height);

    const baseImage = await loadImage(currentPortraitData.base);
    ctx.drawImage(baseImage, 0, 0);

    if(currentPortraitData.face !== "") {
      const faceImage = await loadImage(currentPortraitData.face);
      ctx.drawImage(faceImage, currentPortraitData.offset.x, currentPortraitData.offset.y);
    }

    if(currentPortraitData.mouth !== "") {
      const mouthImage = await loadImage(currentPortraitData.mouth);
      ctx.drawImage(mouthImage, currentPortraitData.offset.x, currentPortraitData.offset.y);
    }

    const blob = await new Promise(resolve => portraitCanvas.toBlob(resolve));
    const url = URL.createObjectURL(blob);
    qs(".tab.active img").src = url;
  }

  /* Helper functions */

  function id(elementId) {
    return document.getElementById(elementId);
  }

  function qs(selector) {
    return document.querySelector(selector);
  }

  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  async function fetchJson(url) {
    try {
      let response = await fetch(url);
      if(response.ok) {
        let json = await response.json();
        return json;
      } else {
        throw new error(await response.text());
      }
    } catch (e) {
      console.error(e);
    }
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