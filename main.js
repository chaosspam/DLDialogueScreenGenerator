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
    },
    "cn": {
      "nameSize": 32,
      "dialogueSize": 32,
      "speakerXPos": 45,
      "speakerYPos": 820,
      "dialogueXPos": 75,
      "dialogueYPos": 930,
      "lineHeight": 70,
    },
    "jp": {
      "nameSize": 32,
      "dialogueSize": 32,
      "speakerXPos": 45,
      "speakerYPos": 825,
      "dialogueXPos": 75,
      "dialogueYPos": 945,
      "lineHeight": 52,
    }
  }
  const furiganaSize = 15;
  const textures = {};

  let drawing = false;

  window.addEventListener("load", init);

  async function init() {
    // Wait for font load before drawing
    await document.fonts.load("30px dragalialosten");
    await document.fonts.load("30px dragalialostjp");
    await document.fonts.load("30px dragalialostcn");
    await drawImage();
    setupListener();
  }

  /**
   * Set up event listeners
   */
  function setupListener() {
    // Update image after upload
    id("portraitUpload").addEventListener("change", changeImage);
    id("backgroundUpload").addEventListener("change", changeImage);

    // Draw image after parameter change
    id("name").addEventListener("change", drawImage);
    id("dialogue").addEventListener("change", drawImage);
    id("jp").addEventListener("change", drawImage);
    id("en").addEventListener("change", drawImage);
    id("cn").addEventListener("change", drawImage);

    id("portrait").addEventListener("load", drawImage);
    id("background").addEventListener("load", drawImage);

    document.querySelectorAll("input[type=number]").forEach(e => {
      // Sync number input with slider
      qs(`[data-slider="${e.id}"]`).addEventListener("input", sliderUpdateNumInput);
      qs(`[data-slider="${e.id}"]`).addEventListener("change", sliderChangeNumInput);
      e.addEventListener("input", numInputUpdateSlider);
      e.addEventListener("change", drawImage);
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
      textures.skipcn = await loadImage("images/skipcn.png");
    }
  }

  /**
   * Draws the summon screen based on inputs
   */
  async function drawImage() {
    console.log("draw");
    if(drawing) return;
    drawing = true;

    // Get canvas context
    const canvas = id("editor");
    const ctx = canvas.getContext("2d");
    const previewCanvas = id("preview");
    const previewCtx = previewCanvas.getContext("2d");

    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Load images for use
    await loadTextures();
    const bar = textures.bar;
    const font =  qs("input[name=font]:checked").value;

    // Get parameters
    const speakerName = id("name").value;
    const dialogue = id("dialogue").value;
    const portrait = id("portrait");
    const background = id("background");

    // Draw background elements


    drawImageOffsetScale(ctx, background, id("backgroundScale").value,
      canvas.width / 2, canvas.height / 2,
      id("backgroundOffsetX").value, id("backgroundOffsetY").value);

    drawImageOffsetScale(ctx, portrait, id("portraitScale").value,
      canvas.width / 2, canvas.height / 2,
      id("portraitOffsetX").value, id("portraitOffsetY").value);

    ctx.drawImage(bar, 0, 0);

    if(font !== "en") {
      ctx.drawImage(textures["skip" + font], 0, 0);
    }


    // Calculate text position based on text width
    let prop = textProperties[font];

    // Draw the text
    ctx.font = prop.nameSize + "px dragalialost" + font;
    ctx.fillStyle = "white";
    ctx.fillText(speakerName, prop.speakerXPos, prop.speakerYPos);
    ctx.font = prop.dialogueSize + "px dragalialost" + font;
    ctx.fillStyle = "#071726";
    let lines = dialogue.split("\n");
    for(let i = 0; i < lines.length; i++) {
      printDialogue(lines[i], font, prop.dialogueSize, prop.dialogueXPos, prop.dialogueYPos + i * prop.lineHeight, ctx);
    }

    // Generate download url
    id("download").href = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");

    // Draw the editor canvas on the smaller preview canvas
    previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);

    drawing = false;
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

  function drawImageOffsetScale(ctx, image, scale, centerX, centerY, offsetX, offsetY) {
    scale = parseFloat(scale);
    centerX = parseFloat(centerX);
    centerY = parseFloat(centerY);
    offsetX = parseFloat(offsetX);
    offsetY = -parseFloat(offsetY);
    let width = image.naturalWidth * scale;
    let height = image.naturalHeight * scale;
    let x = centerX - width / 2 + offsetX;
    let y = centerY - height / 2 + offsetY;
    ctx.drawImage(image, x, y, width, height);
  }

  function id(elementId) {
    return document.getElementById(elementId);
  }

  function qs(selector) {
    return document.querySelector(selector);
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