(function () {

  /* Module variables */

  // Localization
  let i18n;
  let pageLang = "en";

  // Screen drawing data
  const furiganaSize = 15;
  const textures = {};
  const emotionFromSide = 180;
  const emotionYPos = 250;
  const layers = [];
  const layerToRemove = {};
  let drawing = false;
  let layerId = 0;

  // Portrait drawing data
  const PORTRAIT_URL = "https://dlportraits.space/";
  let portraitCanvas;
  const currentPortraitData = {};

  // Background drawing data
  const THUMB_URL = "https://dragalialost.wiki/thumb.php?width=75&f="
  const backgroundData = {};
  const bgCarouselSize = 12;

  /* Setup */

  window.addEventListener("load", init);

  /**
   * Initialize canvas and localization data
   */
  async function init() {
    try {
      // Load localization data
      i18n = await fetchJson("data/i18n.json");
      pageLang = document.documentElement.lang;
      // Add default layers
      addLayer(i18n[pageLang].loc.background, "images/exampleBackground.png");
      addLayer(i18n[pageLang].loc.portrait, i18n[pageLang].loc.defaultPortraitSrc);
      // Wait for fonts to load before drawing
      await document.fonts.load("30px dragalialosten");
      await document.fonts.load("30px dragalialostja");
      await document.fonts.load("30px dragalialostzh-Hans");
      await document.fonts.load("30px dragalialostzh-Hant");
      // Draw dialogue screen
      await drawDialogueScreen();
      // Fetch background and portrait data
      setupPortrait();
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
    id("addLayer").addEventListener("click", () => {
      addLayer(`${i18n[pageLang].loc.layer} ${layers.length}`, "images/adPortrait.png")
    });

    // Draw image after parameter change
    id("name").addEventListener("change", drawDialogueScreen);
    id("dialogue").addEventListener("change", drawDialogueScreen);
    id("emotion").addEventListener("change", drawDialogueScreen);
    qsa("#dialogueArea input[type=radio]").forEach(e => e.addEventListener("change", drawDialogueScreen));
    qsa("#dialogueArea input[type=number]").forEach(e => {
      syncSliderWithInput(qs(`[data-slider="${e.id}"]`), e);
      e.addEventListener("change", drawDialogueScreen);
    });

    id("deleteConfirmBtn").addEventListener("click", removeLayer);
    id("deleteCancelBtn").addEventListener("click", closeLayerDeletePrompt);
    window.addEventListener("dragover", tabDragOver);

    document.addEventListener('keydown', function(e){
      if(e.key === "Escape"){
        closeLayerDeletePrompt();
      }
    });

    id("download").addEventListener("click", downloadImage);
  }

  /**
   * Setup portrait canvas and data
   */
  function setupPortrait() {
    portraitCanvas = document.createElement("canvas");
    portraitCanvas.width = 1024;
    portraitCanvas.height = 1024;
    resetPortraitData();
  }

  /**
   * Clears portrait data
   */
  function resetPortraitData() {
    currentPortraitData.base = "";
    currentPortraitData.offset = {"x": 0, "y": 0};
    currentPortraitData.face = "";
    currentPortraitData.mouth = "";
  }

  async function loadTextures() {
    if(!textures.loaded) {
      textures.bar = await loadImage("images/bar.png");
      textures.caption = await loadImage("images/caption.png");
      textures.book = await loadImage("images/book.png");
      textures.fullscreen = await loadImage("images/fullscreen.png");
      textures.introBack = await loadImage("images/introBack.png");
      textures.introBar = await loadImage("images/introBar.png");
      textures.skipja = await loadImage("images/skipjp.png");
      textures['skipzh-Hant'] = await loadImage("images/skipcn.png");
      textures['skipzh-Hans'] = await loadImage("images/skipcn.png");
      textures.skipen= await loadImage("images/skipen_us.png");
      textures.loaded = true;
    }
  }

  /**
   * Draws the dialogue screen based on inputs
   */
  async function drawDialogueScreen() {

    if(drawing) return;
    drawing = true;

    // Get canvas context
    const canvas = id("editor");
    const preview = id("preview");
    const ctx = canvas.getContext("2d");
    const ctxPreview = preview.getContext("2d");

    // Get draw type
    const dialogueType = qs("input[name=stdialogue]:checked").value;
    const lang =  qs("input[name=font]:checked").value;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctxPreview.clearRect(0, 0, preview.width, preview.height);

    // Load images for use
    await loadTextures();

    let bar = textures.bar;

    if(dialogueType === "intro") {
      bar = textures.introBar;
      ctx.drawImage(textures.introBack, 0, 0);
    }
    if(dialogueType === "caption" || dialogueType === "narration") {
      bar = textures.caption;
    }
    if(dialogueType === "full") {
      bar = textures.fullscreen;
    }
    if(dialogueType === "book") {
      ctx.drawImage(textures.book, 0, 0);
      bar = textures["skip" + lang];
    }

    // Draw Layers
    for(let i = 0; i < layers.length; i++) {
      let layer = layers[i];
      drawImageWithData(ctx, canvas.width / 2, canvas.height / 2, layer, dialogueType === "intro")
    }

    await drawEmotion(ctx);

    ctx.drawImage(bar, 0, 0);
    // If language is not English, we draw the skip button in other language
    if(lang !== "en") {
      ctx.drawImage(textures["skip" + lang], 0, 0);
    }

    drawDialogueText(dialogueType, ctx, lang);

    // Draw the editor canvas on the smaller preview canvas
    ctxPreview.drawImage(canvas, 0, 0, preview.width, preview.height);

    drawing = false;
  }

  /**
   * Draws the image with given data
   * @param {CanvasRenderingContext2D} ctx - Context of the canvas to draw on
   * @param {number} centerX - Where to center the image's x position at
   * @param {number} centerY - Where to center the image y position at
   * @param {Object} layer - Data of the image
   */
  function drawImageWithData(ctx, centerX, centerY, layer, dropShadow = false) {
    // Sanitize the data passed in
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

    // Save current context state
    ctx.save();

    // Move the context to the pivot before rotating
    ctx.translate(centerX + offsetX, centerY + offsetY);

    if(layer.flipX) {
      ctx.scale(-1, 1);
    }

    if(rotation !== 0) {
      ctx.rotate(rotation * Math.PI / 180);
    }

    if(dropShadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, .25)';
      ctx.shadowOffsetX = 20;
      ctx.shadowOffsetY = 20;
    }

    ctx.globalAlpha = layer.opacity;

    ctx.translate(-centerX - offsetX, -centerY - offsetY);

    ctx.drawImage(layer.image, x, y, width, height);

    // Restore original state
    ctx.restore();
  }

  /**
   * Draws the emotion balloon using context from canvas to draw on
   * @param {CanvasRenderingContext2D} ctx - Context of the canvas to draw on
   */
  async function drawEmotion(ctx) {
    let emotionName = id("emotion").value;
    if (emotionName !== "none") {
      let emotionSide = qs("input[name=emotionside]:checked").value;
      emotionName += "_" + emotionSide;

      if (!textures[emotionName]) {
        textures[emotionName] = await loadImage("images/" + emotionName + ".png");
      }

      const emotion = textures[emotionName];
      drawImageWithData(ctx,
        emotionSide === "l" ? emotionFromSide : ctx.canvas.width - emotionFromSide,
        emotionYPos,
        {
          "image": emotion,
          "offsetX": id("emotionOffsetX").value,
          "offsetY": id("emotionOffsetY").value,
          "scale": 1
        });
    }
  }

  /**
   * Draws the dialogue text using context from canvas to draw on
   * @param {CanvasRenderingContext2D} ctx - Context of the canvas to draw on
   * @param {string} lang - language of the font to draw with
   */
  function drawDialogueText(dialogueType, ctx, lang) {
    // Get text property and text to draw
    const prop = i18n[lang];
    const speakerName = id("name").value;
    const dialogue = id("dialogue").value;

    // Draw speaker name
    ctx.textAlign = "left";

    ctx.font = `${prop.nameSize}px dragalialost${lang}`;
    ctx.fillStyle = "white";

    if(dialogueType === "caption") {
      ctx.font = `${prop.titleSize}px dragalialost${lang}`;
      ctx.fillText(speakerName, (ctx.canvas.width - ctx.measureText(speakerName).width) / 2, prop.titleYPos);
      ctx.fillRect(0, 430, ctx.canvas.width, 1);
    } else if (dialogueType === "intro") {
      drawSpeakerNameIntro(ctx, prop, lang, speakerName);
    } else if(dialogueType !== "narration" && dialogueType !== "full" && dialogueType !== "book") {
      ctx.fillText(speakerName, prop.speakerXPos, prop.speakerYPos);
    }

    // Draw dialogue
    let lines = dialogue.split("\n");

    let fontSize = prop.dialogueSize;
    let lineHeight = prop.lineHeight;

    let startX = prop.dialogueXPos;
    let startY = prop.dialogueYPos;

    ctx.fillStyle = "#071726";

    if(dialogueType === "intro") {
      drawTitleIntro(ctx, prop, lang, dialogue);
      return;
    }

    let center = false;

    if(dialogueType === "caption") {
      startY = prop.captionYPos;
      ctx.fillStyle = "white";
      fontSize = prop.captionSize;
      center = true;
    } else if(dialogueType === "narration" || dialogueType === "full") {
      fontSize = prop.dialogueSize;
      lineHeight = prop.narrationLineHeight;
      startY = prop.narrationYPos - (fontSize + (lines.length - 1) * lineHeight) / 2;
      ctx.fillStyle = "white";
      center = true;
    } else if(dialogueType === "book") {
      fontSize = prop.dialogueSize;
      lineHeight = prop.narrationLineHeight;
      startY = ctx.canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
      ctx.fillStyle = "#412c29";
      center = true;
    }

    ctx.font = `${fontSize}px dragalialost${lang}`;

    // Draw line by line
    for (let i = 0; i < lines.length; i++) {
      let x = startX;
      if(center) {
        let base = lines[i].replace(/\(([^\)]+)\)\{([^\}]+)\}/g, (match, base, furigana, offset, string) => base);
        x = (ctx.canvas.width - ctx.measureText(base).width) / 2;
      }
      let y = startY + i * lineHeight;
      drawDialogueLine(ctx, lang, lines[i], fontSize, x, y);
    }
  }

  /**
   * Draws a line of text starting at the provided position
   * @param {CanvasRenderingContext2D} ctx - Context of the canvas to draw on
   * @param {string} lang - Language of the font to draw with
   * @param {string} text - Text to draw
   * @param {number} fontSize - Default size of the dialogue text in provided language
   * @param {number} startX - Starting x position to draw text from
   * @param {number} startY - Starting y position to draw text from
   */
  function drawDialogueLine(ctx, lang, text, fontSize, startX, startY) {
    let tmp = "";
    let last = 0;
    const normalFont = `${fontSize}px dragalialost${lang}`;
    const furiganaFont = `${furiganaSize}px dragalialost${lang}`;

    // Draw the furigana first by removing them from the line
    text = text.replace(/\(([^\)]+)\)\{([^\}]+)\}/g, (match, base, furigana, offset, string) => {
      tmp += text.substring(last, offset);

      // Use normal font size first
      ctx.font = normalFont;
      // Measure the length so far, add the half of the text below the furigana for the center
      let center = startX + ctx.measureText(tmp).width + ctx.measureText(base).width / 2;

      // Change to smaller font, measure where to start the furigana
      ctx.font = furiganaFont;
      let furiganaX = center - ctx.measureText(furigana).width / 2;
      let furiganaY = startY - fontSize + 2;
      ctx.fillText(furigana, furiganaX, furiganaY);

      tmp += base;
      last = offset + base.length + furigana.length + 4;

      return base;
    });

    // Draw text without furigana
    ctx.font = normalFont;
    ctx.fillText(text, startX, startY);
  }

  /**
   * Draws the speaker's name slanted for intro
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} prop - property of the text
   * @param {string} lang - Language of the font to draw with
   * @param {string} speakerName - Text to draw
   */
  function drawSpeakerNameIntro(ctx, prop, lang, speakerName) {
    ctx.save();

    ctx.font = `${prop.introNameSize}px dragalialost${lang}`;
    let textWidth = ctx.measureText(speakerName).width;

    let x = ctx.canvas.width;
    ctx.translate(x, prop.introNameYPos);
    ctx.rotate(-6.25 * Math.PI / 180);
    ctx.translate(-x, -prop.introNameYPos);

    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 8;
    ctx.miterLimit = 2;
    ctx.strokeText(speakerName, ctx.canvas.width - textWidth - prop.introXPos, prop.introNameYPos);
    ctx.fillText(speakerName, ctx.canvas.width - textWidth - prop.introXPos, prop.introNameYPos);

    ctx.restore();
  }

  /**
   * Draws the speaker's name slanted for intro
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} prop - property of the text
   * @param {string} lang - Language of the font to draw with
   * @param {string} speakerName - Text to draw
   */
  function drawTitleIntro(ctx, prop, lang, text) {
    ctx.save();

    ctx.font = `${prop.introTitleSize}px dragalialost${lang}`;
    let textWidth = ctx.measureText(text).width;

    let x = ctx.canvas.width;
    ctx.translate(x, prop.introTitleYPos);
    ctx.rotate(-6.25 * Math.PI / 180);
    ctx.translate(-x, -prop.introTitleYPos);

    ctx.fillStyle = "#333333";
    ctx.fillText(text, ctx.canvas.width - textWidth - prop.introXPos, prop.introTitleYPos);

    ctx.restore();
  }

  /**
   * Generate a download link and click it
   */
  async function downloadImage() {
    this.innerText = i18n[pageLang].loc.generating;
    const blob = await new Promise(resolve => id("editor").toBlob(resolve, "image/png"));
    this.innerText = i18n[pageLang].loc.download;

    id("downloadLink").href = URL.createObjectURL(blob);
    id("downloadLink").download = `${id("name").value.toLowerCase()}_dialogue_screen.png`;
    id("downloadLink").click();
  }

  /**
   * Add a new layer
   * @param {string} layerName - Name of the new layer to add
   * @param {string} imgSrc - Image source for the new layer
   */
  function addLayer(layerName, imgSrc) {
    // Get a new id
    const layerId = getNewId();
    // Create tab button
    let tabButton = document.createElement("li");
    tabButton.innerText = layerName;
    tabButton.dataset.layerId = layerId;
    tabButton.draggable = true;
    tabButton.addEventListener("dragstart", () => { tabButton.classList.add("dragging") });
    tabButton.addEventListener("dragend", () => { tabButton.classList.remove("dragging"); reorderLayer(tabButton) });
    // Prevent long tap context menu
    tabButton.addEventListener("touchstart", (e) => { tabButton.classList.add("dragging");});
    tabButton.addEventListener("touchend", () => { tabButton.classList.remove("dragging"); reorderLayer(tabButton) });
    tabButton.addEventListener("touchmove", tabTouchOver);
    // Create data for new layer
    let newLayer = {
      "id": layerId,
      "image": null,
      "offsetX": 0,
      "offsetY": 0,
      "rotation": 0,
      "scale": 1,
      "opacity": 1,
      "flipX": false
    }

    // Get a new tab
    let tab = createLayerTab(newLayer, tabButton, imgSrc);

    tabButton.addEventListener("click", function() {
      qsa("#tabBar li").forEach(e => e.classList.remove("active"));
      qsa(".tab").forEach(e => e.classList.remove("active"));
      this.classList.add("active");
      tab.classList.add("active");
      resetPanels();
    });

    // Set new tab to active
    qsa("#tabBar li").forEach(e => e.classList.remove("active"));
    qsa(".tab").forEach(e => e.classList.remove("active"));
    tabButton.classList.add("active");
    tab.classList.add("active");

    // Add tab to DOM
    id("tabBar").insertBefore(tabButton, id("addLayer"));
    id("tabs").appendChild(tab);

    layers.push(newLayer);
  }

  /**
   * Remove the layer that is set to be removed
   */
  function removeLayer() {

    const index = layers.findIndex(e => e.id === layerToRemove.id);

    if (index > -1) {
      layers.splice(index, 1);
    }

    if(layerToRemove.tabButton) {
      layerToRemove.tabButton.remove();
    }

    if(layerToRemove.tab) {
      layerToRemove.tab.remove();
    }

    qs("#tabBar li").click();
    drawDialogueScreen();
    closeLayerDeletePrompt();
  }

  /**
   * Generate a new id to associate with a new layer
   * @returns {number} A new number id
   */
  function getNewId() {
    layerId++;
    return layerId;
  }

  /**
   * Handles
   * @param {Event} e - mouse event
   */
  function tabDragOver(e) {
    e.preventDefault();
    const after = getDragAfterElement(e.clientX, e.clientY);
    const tab = qs(".dragging");
    if(after == null) {
      id("tabBar").insertBefore(tab, id("addLayer"));
    } else {
      id("tabBar").insertBefore(tab, after);
    }
  }

  /**
   *
   * @param {Event} e - touch event
   */
  function tabTouchOver(e) {
    e.preventDefault();
    let target = e.targetTouches[0];
    const after = getDragAfterElement(target.clientX, target.clientY);
    const tab = qs(".dragging");
    if(after == null) {
      id("tabBar").insertBefore(tab, id("addLayer"));
    } else {
      id("tabBar").insertBefore(tab, after);
    }
  }

  /**
   * Returns the tab to append before based on the position
   * @param {number} x - x position of the event
   * @param {number} y - y position of the event
   * @returns {HTMLLIElement} - tab that comes after the position
   */
  function getDragAfterElement(x, y) {
    const tabs = [...qsa("#tabBar li:not(#addLayer, .dragging)")];

    let after = null;
    let afterRightMost = -1;
    let minXOffset = Number.POSITIVE_INFINITY;
    let minYOffset = Number.POSITIVE_INFINITY;
    let maxBoxY = 0;
    let maxBoxX = 0;

    for(let i = 0; i < tabs.length; i++) {
      const box = tabs[i].getBoundingClientRect();
      const boxY = box.top + box.height / 2;
      if(boxY > maxBoxY) {
        maxBoxY = boxY;
      }
    }

    for(let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const box = tab.getBoundingClientRect();
      const offsetX = x - (box.right - box.width / 2);
      const offsetY = y - box.bottom;

      // The tab is on the row if the mouse is above the row
      const activeRow = offsetY < 0 && -offsetY <= minYOffset
      if(activeRow) {
        minYOffset = Math.abs(offsetY);

        if(offsetX < 0) {
          if(-offsetX < minXOffset) {
            after = tab;
            minXOffset = -offsetX;
          }
        }
        else if(box.right > maxBoxX) {
          maxBoxX = box.right;
          afterRightMost = i + 1;
        }
      }
    }

    if(after === null && afterRightMost >= 0 && afterRightMost < tabs.length - 1) {
      after = tabs[afterRightMost];
    }

    return after;
  }

  /**
   * Reorder the layers based on the document order
   * @param {HTMLLIElement} tab - tab that is getting repositioned
   */
  function reorderLayer(tab) {
    // Get the tabs
    const tabs = [...qsa("#tabBar li:not(#addLayer)")];
    if(tabs.length !== layers.length) { return; }

    let oldIndex = indexOfLayer(tab.dataset.layerId);
    let newIndex = tabs.indexOf(tab);
    if(oldIndex === -1 || newIndex === -1) {
      console.error(`Cannot move tab from index ${oldIndex} to ${newIndex}`);
      return;
    }
    layers.splice(newIndex, 0, layers.splice(oldIndex, 1)[0]);
    drawDialogueScreen();
  }

  /**
   * Returns the index of the layer with the given layer id
   * @param {number} layerId - id of the layer
   * @returns {number} index of the layer, -1 if not found
   */
  function indexOfLayer(layerId) {
    let match = parseInt(layerId);
    return layers.findIndex(x => x.id === match);
  }

  /**
   * Creates and returns a new layer tab
   * @param {Object} layer - layer the tab represents
   * @param {HTMLLIElement} tabButton - button that opens that tab
   * @param {string} imgSrc - src of the image to be used on the new tab
   * @returns {HTMLDivElement} - new layer tab
   */
  function createLayerTab(layer, tabButton, imgSrc) {

    // Get localization data
    let loc = i18n[pageLang].loc;

    // Create main container
    let tab = document.createElement("div");
    tab.classList.add("tab");

    // Create the left part of the tab
    let imageContainer = document.createElement("div");
    imageContainer.innerHTML = `<h2>${loc.layerImage}</h2><label>${loc.reccomendedSize}</label>`

    let image = document.createElement("img");
    image.src = imgSrc;
    image.alt = "Layer Image";
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
      layerToRemove.id = layer.id;
      layerToRemove.tabButton = tabButton;
      layerToRemove.tab = tab;

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
    settingContainer.appendChild(createSliderGroup(loc.layerOpacity, 0, 1, 0.01, 1, (value) => { layer.opacity = value; drawDialogueScreen(); }));
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

    let flipXLabel = document.createElement("label");
    flipXLabel.innerText = loc.flipX;
    let flipX = document.createElement("input");
    flipX.type = "checkbox";
    flipX.addEventListener("change", function(){ layer.flipX = this.checked; drawDialogueScreen(); });
    scaleSliderGroup.appendChild(flipX);
    scaleSliderGroup.appendChild(flipXLabel);

    scaleSliderGroup.appendChild(autoButton);

    settingContainer.appendChild(scaleSliderGroup);

    //Append to tab
    tab.appendChild(imageContainer);
    tab.appendChild(settingContainer);

    return tab;
  }

  /**
   * Creates and returns a slider input group that is labeled and calls the given function when
   * their value is updated
   * @param {string} labelText - text of the label
   * @param {number} min - minimum of the slider/input
   * @param {number} max - maximum of the slider/input
   * @param {number} step - step of the slider/input
   * @param {number} startValue - initial value of the slider/input
   * @param {function} callback - function that will be called when value of slider/input is changed
   * @returns
   */
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

    syncSliderWithInput(slider, numInput);
    numInput.addEventListener("change", function() { callback(parseFloat(this.value)) });

    return container;
  }

  /* Layer Delete Modal */

  /**
   * Opens the layer delete modal
   */
  function openLayerDeleteModal() {
    id("deletePrompt").classList.remove("hidden");
  }

  /**
   * Closes the layer delete modal
   */
  function closeLayerDeletePrompt() {
    id("deletePrompt").classList.add("hidden");
  }

  /* Panels General */

  /**
   * Resets the portrait and background panel
   */
  function resetPanels() {
    id("portraitPanel").classList.add("hidden");
    id("backgroundPanel").classList.add("hidden");
    id("portraitCharacter").value = "";
    id("facialExpression").innerHTML = "";
    id("mouthExpression").innerHTML = "";
    qsa(".tab .portrait-button").forEach(e => e.classList.remove("selected"));
    qsa(".tab .bg-button").forEach(e => e.classList.remove("selected"));
    resetPortraitData();
  }

  /* Background Panel */

  /**
   * Generate a button that toggles the background panel
   * @returns {HTMLButtonElement} button that toggles the background panel
   */
  function bgPanelToggleButton() {
    let button = document.createElement("button");
    button.innerText = i18n[pageLang].loc.fromBackground;
    button.classList.add("button");
    button.classList.add("bg-button");
    button.addEventListener("click", toggleBackgroundPanel);
    return button;
  }

  /**
   * Toggles the background panel
   */
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

  /**
   * Fetches data for the background
   */
  async function fetchBackgroundImages() {
    let data = await fetchJson("data/background_data.json");

    for(let i = 0; i < data.length; i++) {
      if(backgroundData[data[i].type] === undefined) {
        backgroundData[data[i].type] = { "imgs": [], "index": 0 };
      }
      backgroundData[data[i].type].imgs.push(data[i]);
    }

    createCarousel(id("backgroundBackgroundArt"), backgroundData.background, bgCarouselSize);
    createCarousel(id("skyboxBackgroundArt"), backgroundData.skybox, bgCarouselSize);
    createCarousel(id("cloudBackgroundArt"), backgroundData.cloud, bgCarouselSize);
    createCarousel(id("overlayBackgroundArt"), backgroundData.overlay, bgCarouselSize);
  }

  /**
   * Creates a carousel that displays background images
   * @param {HTMLDivElement} container - container for the images
   * @param {Object} data - data of the background
   * @param {number} size - size of each background page
   */
  function createCarousel(container, data, size) {
    let images = [];

    let prev = document.createElement("button");
    let next = document.createElement("button");
    prev.innerText = "<";
    next.innerText = ">";
    prev.classList.add("button");
    next.classList.add("button");

    let imageContainer = document.createElement("div");
    imageContainer.classList.add("bg-container");

    for(let i = 0; i < size; i ++) {
      let image = document.createElement("img");
      if(i < data.imgs.length) {
        image.src = `https://dragalialost.wiki/thumb.php?f=${data.imgs[i].fileName}&width=75`;
        image.dataset.fullSrc = data.imgs[i].url;
      } else {
        image.classList.add("hidden");
      }
      image.addEventListener("click", function() {
        let activeImage = qs(".tab.active img");
        activeImage.crossOrigin = "anonymous";
        activeImage.src = this.dataset.fullSrc;
      });
      images.push(image);
      imageContainer.appendChild(image);
    }

    prev.addEventListener("click", () => {
      data.index -= size;
      if(data.index < 0) {
        data.index = 0;
      }
      updateBackgroundImages(images, data);
    });

    next.addEventListener("click", () => {
      if(data.index + size >= data.imgs.length) {
        return;
      }
      data.index += size;
      updateBackgroundImages(images, data);
    });

    container.appendChild(prev);
    container.appendChild(imageContainer);
    container.appendChild(next);
  }

  /**
   * Update the background images to display images from the current index of the data
   * @param {HTMLImageElement[]} images - images for displaying the data
   * @param {Object} data - data to display
   */
  function updateBackgroundImages(images, data) {
    for(let i = 0; i < images.length; i++) {
      let imgIndex = i + data.index;
      if(imgIndex < data.imgs.length) {
        images[i].src = THUMB_URL + data.imgs[imgIndex].fileName;
        images[i].dataset.fullSrc = data.imgs[imgIndex].url;
        images[i].classList.remove("hidden");
      }
      else {
        images[i].classList.add("hidden");
      }
    }
  }

  /* Portrait Panel */

  /**
   * Generate a button that toggles the portrait panel
   * @returns {HTMLButtonElement} button that toggles the portrait panel
   */
  function portraitPanelToggleButton() {
    let button = document.createElement("button");
    button.innerText = i18n[pageLang].loc.fromPortrait;
    button.addEventListener("click", togglePortraitPanel);
    button.classList.add("button");
    button.classList.add("portrait-button");
    return button;
  }

  /**
   * Toggles the portrait panel
   */
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

  /**
   * Fetches data for the available portraits
   */
  async function populatePortraitData() {
    let portraitData = await fetchJson(PORTRAIT_URL + "portrait_output/localizedDirData.json");
    let datalist = id("portraitList");
    for(file in portraitData.fileList) {
      let option = document.createElement("option");
      option.value = portraitData.fileList[file][pageLang];
      option.dataset.id = file;
      datalist.appendChild(option);
    }

    id("portraitCharacter").addEventListener("change", validateDatalistInput);
  }

  /**
   * Validates the portrait input to match options in datalist
   */
  function validateDatalistInput() {
    let option = document.querySelector(`#portraitList option[value="${this.value}"]`);
    if (option === null) {
      this.value = "";
    } else {
      loadSelectedPortraitData(option.dataset.id);
    }
  }

  /**
   * Gets data about the portrait of the character with the given id
   * @param {string} charId - id of the character
   */
  async function loadSelectedPortraitData(charId) {
    let data = await fetchJson(PORTRAIT_URL + `portrait_output/${charId}/data.json`);

    let faceContainer = id("facialExpression");
    faceContainer.innerHTML = "";
    for(let i = 0; i < data.partsData.faceParts.length; i++) {
      let facePartUrl = PORTRAIT_URL + data.partsData.faceParts[i].substring(2);
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
      let mouthPartUrl = PORTRAIT_URL + data.partsData.mouthParts[i].substring(2);
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
    currentPortraitData.base = PORTRAIT_URL + `portrait_output/${charId}/${charId}_base.png`;
    currentPortraitData.offset = data.offset;

    drawPortraitAndRender();
  }

  /**
   * Draws the portrait on the portrait canvas and sets the image source of the
   * current tab to the portrait canvas
   */
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

  /**
   * Shorthand for document.getElementById
   * @param {string} elementId - id of the element to get
   * @returns {Element} - element with the id
   */
  function id(elementId) {
    return document.getElementById(elementId);
  }

  /**
   * Shorthand for document.querySelector
   * @param {string} selector - selector of the element to get
   * @returns {Element} - first element matching the selector
   */
  function qs(selector) {
    return document.querySelector(selector);
  }

  /**
   * Shorthand for document.querySelectorAll
   * @param {string} selector - selector of the elements to get
   * @returns {NodeList} - element that matches at least one of the specified selectors
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * Returns the JSON object from the response of a request to the URL
   * @param {string} url - url to fetch from
   * @returns {Object} JSON object fron response
   */
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

  /**
   * Creates and returns the image element with given souce
   * @param {string} src - source of the image
   * @returns {Promise} - resolves to the image element if the image loads successfully
   */
  function loadImage(src){
    let img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    return new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  }

  /**
   * Sync the value of a slider to an input that will trigger an event
   * @param {HTMLInputElement} slider - slider to sync with the input
   * @param {HTMLInputElement} input - input to sync with the slider
   */
  function syncSliderWithInput(slider, input) {
    slider.addEventListener("input",  function() { input.value = this.value; });
    // Dispatch a change event to the input, triggering event listener listening for the 'change' event
    slider.addEventListener("change", function() { input.dispatchEvent(new Event('change')); });
    input.addEventListener("input",   function() { slider.value = this.value });
  }

})();
