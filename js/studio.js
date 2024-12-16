/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
window.addEventListener("load", loadStudioLogic);

function loadStudioLogic(){
    const client = io();

    const sendButton = document.querySelector("#send");
    const pageBodyContent = document.querySelector(".page-body-content");
    const params = new URLSearchParams(location.search);
    let productID = params.getAll("id")[0];
    if(productID) client.emit("studio-id", productID);
    else pageBodyContent.innerHTML = "<div style='margin-left:3vh;margin-top:3vh;'>Proizvod nije nađen";

    client.on("studio-received", (data)=>{
        if(!data.Found) pageBodyContent.innerHTML = "<div style='margin-left:3vh;margin-top:3vh;'>Proizvod nije nađen";
        else generateStudio(client, data);
    });
    client.on("email-error", ()=>{
        sendButton.disabled = false;
        alert("Greška u slanju emaila");
    });
    client.on("email-success", ()=>{
        sendButton.disabled = false;
        alert("Email sa slikama vašeg logoa je poslat");
    });
    client.on("download-final-image", (imageURL)=>{
        document.querySelector("#download").disabled = false;
        const downloadLink = document.createElement("a");
        downloadLink.download = "Prikaz Štampe.png";
        downloadLink.href = imageURL;
        downloadLink.click();
        downloadLink.remove();
    });
}
function isEmailValid(email){
    const emailRegex = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
    if(!email) return false;
    if(email.length > 254) return false;

    let valid = emailRegex.test(email);
    if(!valid) return false;

    let parts = email.split("@");
    if(parts[0].length > 64) return false;

    let domainParts = parts[1].split(".");
    if(domainParts.some((part)=>{return part.length > 63})) return false;

    return true;
}

/*--Generation---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function generateStudio(client, data){
    const style = getComputedStyle(document.body);
    const canvasSizeCSS = style.getPropertyValue("--default-canvas-size");
    const canvasSize = parseInt(canvasSizeCSS.slice(0, -2));

    let currVersion = data.versions[0];
    console.log("current product", data);
    console.log("current version", currVersion);

    let imgIndex = 0, images = [], imageData = [], zoom = 10, loadedImages = [];
    generateColors(currVersion.ID, data.versions);
    generateImages(currVersion.Images, imgIndex);
    generateCanvases(imageData, zoom);

    /*--Events---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    window.onresize = ()=>{
        generateCanvases(imageData, zoom);
    }
    document.addEventListener("update-base-image-list", (e)=>{
        images = e.detail.images;
        drawBaseImage(images[imgIndex]);
    });
    document.addEventListener("update-base-image-index", (e)=>{
        imgIndex = e.detail.baseImgIndex;
        generateImages(currVersion.Images, imgIndex);
        drawBaseImage(images[imgIndex]);
    });
    document.addEventListener("update-curr-version", (e)=>{
        currVersion = e.detail.currVersion;
        generateColors(currVersion.ID, data.versions);
        generateImages(currVersion.Images, imgIndex);
    });
    document.addEventListener("update-data", (e)=>{
        imageData = e.detail.imageData;
    });
    document.addEventListener("redraw-base-canvas", (e)=>{
        drawBaseImage(images[imgIndex]);
    });
    document.addEventListener("redraw-added-canvas", (e)=>{
        imageData = e.detail.imageData;
        generateCanvases(imageData, zoom);
    });
    document.addEventListener("clone-image", (e)=>{
        loadedImages.push(e.detail.clone);
        imageData.push(e.detail.clone);
        generateCanvases(imageData, zoom);
    });
    document.addEventListener("switch-order", (e)=>{
        imageData = e.detail.imageData;
        let index = e.detail.index;

        let currData = imageData.splice(index, 1);
        imageData = imageData.concat(currData);

        let currLoaded = loadedImages.splice((index-1), 1);
        loadedImages = loadedImages.concat(currLoaded);

        generateCanvases(imageData, zoom);
    });
    document.addEventListener("update-delete-backup", (e)=>{
        let index = e.detail.index;
        hideSideButtons();
        loadedImages.splice((index - 1), 1);
        imageData.splice(index, 1);
        generateCanvases(imageData, zoom);
    });

    /*--Zoom Logic-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    const pageBodyContent = document.querySelector(".page-body-content");
    const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
    const zoomValue = document.querySelector("#zoom-value");
    document.querySelector(".minus").onclick = ()=>{zoomFunc(-1)}
    document.querySelector(".plus").onclick = ()=>{zoomFunc(1)}
    pageBodyContent.addEventListener("wheel", (event)=>{
        event.preventDefault();
        const delta = -Math.sign(event.deltaY);
        zoomFunc(delta);
    });
    function zoomFunc(inc){
        zoom += inc;
        if(zoom < 1) zoom = 1;
        if(zoom > 30) zoom = 30;
        zoomValue.innerText = zoom*10+"%";
        generateCanvases(imageData, zoom);
        let newSize = canvasSize * zoom / 10;
        studioCanvasHolder.style.height = newSize+"vh";

        let left = "50%", top = "50%", translateX = "-50%", translateY = "-50%";
        if(window.innerHeight * newSize / 100 > back.getBoundingClientRect().width){
            translateX = "0%";
            left = "0px";
        }
        if(newSize > canvasSize){
            translateY = "0%";
            top = "0px";
        }
        studioCanvasHolder.style.top = top;
        studioCanvasHolder.style.left = left;
        studioCanvasHolder.style.transform = "translate("+translateX+","+translateY+")";
    }

    /*--Download and Send----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    const downloadButton = document.querySelector("#download");
    const sendButton = document.querySelector("#send");
    downloadButton.onclick = ()=>{
        downloadButton.disabled = true;
        let dataToSend = generateFinalImageData(images[imgIndex], imageData);
        client.emit("final-image", getDefaultCanvasSize(), dataToSend, false);
    }
    sendButton.onclick = ()=>{
        client.emit("get-captcha");
    }
    client.on("receive-captcha", (captchaData)=>{
        const captchaInput = document.querySelector("#captcha-input");
        const captcha = document.querySelector(".captcha");
        captcha.innerHTML = captchaData.data;
        captchaInput.value = "";

        const captchaMask = document.querySelector("#captcha-mask");
        captchaMask.style.animation = "fade-in ease-in-out 0.2s";
        captchaMask.style.display = "block";
        captchaMask.onanimationend = ()=>{
            captchaMask.style.animation = "none";
            captchaMask.onanimationend = null;
        }
        function hideCaptchaWindow(){
            captchaMask.style.animation = "fade-out ease-in-out 0.2s";
            captchaMask.onanimationend = ()=>{
                captchaMask.style.animation = "none";
                captchaMask.style.display = "none";
                captchaMask.onanimationend = null;
            }
        }

        const inputEmail = document.querySelector("#input-email");
        inputEmail.value = "";
        document.querySelector("#captcha-cancel").onclick = hideCaptchaWindow;
        document.querySelector("#captcha-confirm").onclick = ()=>{
            if(captchaInput.value !== captchaData.text) alert("Pogresan kod");
            else{
                if(!isEmailValid(inputEmail.value)) alert("Unesite ispravan email");
                else{
                    sendButton.disabled = true;
                    hideCaptchaWindow();
                    let dataToSend = generateFinalImageData(images[imgIndex], imageData);
                    client.emit("final-image", getDefaultCanvasSize(), dataToSend, true, currVersion.ID, inputEmail.value);
                    alert("Vaša slika se šalje");
                }
            }
        }
    });


    /*--Input----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    const fileInput = document.querySelector(".file-input");
    document.querySelector("#input-image").onclick = ()=>{fileInput.click()}
    document.querySelector("#input-text").onclick = ()=>{
        let newImageData = {
            id:"canvas-"+crypto.randomUUID(),
            scaleX:1, scaleY:1, angle:0,
            flipX:false, flipY:false,
            x:0.25, y:0.25, type:2,
            outlineSize:0,
            fontSize:0.05,
            colorOutline:"#000000",
            colorFill:"#000000",
            font:"Arial",
            text:"Dupli klik za modifikovanje teksta"
        }
        loadedImages.push(null);
        imageData.push(newImageData);
        let eventData =  {detail:{imageData:imageData}}
        let event = new CustomEvent("redraw-added-canvas", eventData);
        document.dispatchEvent(event);
    }
    fileInput.onchange = ()=>{
        if(fileInput.files.length === 0) alert("Slika nije validna");
        else{
            let inputImg = new Image();
            let file = fileInput.files[0];
            let reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = ()=>{
                inputImg.src = reader.result;
                inputImg.onload = ()=>{

                    let newImageData = {
                        src:reader.result,
                        id:"canvas-"+crypto.randomUUID(),
                        scaleX:1, scaleY:1, angle:0,
                        flipX:false, flipY:false,
                        x:0.25, y:0.25, type:1,

                        outlineSize:0,
                        colorOutline:"",
                        colorFill:"",
                        font:"",
                        text:""
                    }
                    loadedImages.push(newImageData);
                    imageData.push(newImageData);

                    let eventData =  {detail:{imageData:imageData}}
                    let event = new CustomEvent("redraw-added-canvas", eventData);
                    document.dispatchEvent(event);
                }
            }
        }
    }
}
function generateCanvases(imageData, zoom){
    const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
    const style = getComputedStyle(document.body);
    const canvasSizeCSS = style.getPropertyValue("--default-canvas-size");
    const canvasSize = parseInt(canvasSizeCSS.slice(0, -2));

    while(studioCanvasHolder.children.length > 1)
        studioCanvasHolder.removeChild(studioCanvasHolder.lastChild);
    let canvasIDs = ["main-canvas", "added-canvas"];
    for(let i = 0; i < canvasIDs.length; i++){
        const canvas = document.createElement("canvas");
        canvas.id = canvasIDs[i];
        canvas.height = window.innerHeight * canvasSize /100 * zoom / 10;
        canvas.width = window.innerHeight * canvasSize / 100 * zoom / 10;
        studioCanvasHolder.appendChild(canvas);
    }
   
    const event = new Event("redraw-base-canvas");
    document.dispatchEvent(event);
    drawCanvases(imageData, zoom);
}
function generateColors(id, versions){
    const studioColorHolder = document.querySelector(".studio-color-holder");
    while(studioColorHolder.children.length > 0) studioColorHolder.removeChild(studioColorHolder.lastChild);
    for(let i = 0; i < versions.length; i++){
        if(id !== versions[i].ID){
            const studioColor = document.createElement("div");
            studioColor.className = "studio-color";
            if(versions[i].ColorImage !== "") studioColor.style.backgroundImage = "url('"+versions[i].ColorImage+"')";
            else if(versions[i].HTMLColor !== "") studioColor.style.backgroundColor = versions[i].HTMLColor;
            else{
                studioColor.style.backgroundColor = "rgb(255, 255, 255)";
                studioColor.innerText = "N/A";
            }
            studioColorHolder.appendChild(studioColor);
            studioColor.onclick = ()=>{
                let currVersion = versions[i];
                let eventData =  {detail:{currVersion:currVersion}}
                let event = new CustomEvent("update-curr-version", eventData);
                document.dispatchEvent(event);
            }
        }
    }
}
function generateImages(imageLinks, imgIndex){
    const studioImageHolder = document.querySelector(".studio-image-holder");
    while(studioImageHolder.children.length > 0) studioImageHolder.removeChild(studioImageHolder.lastChild);
    for(let i = 0; i < imageLinks.length; i++){
        const studioImage = document.createElement("img");
        studioImage.className = "studio-image";
        studioImage.src = imageLinks[i].Image;
        studioImageHolder.appendChild(studioImage);
        studioImage.onclick = ()=>{
            const selected = document.querySelector(".studio-image-selected");
            selected.classList.remove("studio-image-selected");
            studioImage.classList.add("studio-image-selected");

            let eventData =  {detail:{baseImgIndex:i}}
            let event = new CustomEvent("update-base-image-index", eventData);
            document.dispatchEvent(event);
        }
        if(i === imgIndex) studioImage.classList.add("studio-image-selected");
    }

    let images = [], loaded = 0;
    for(let i = 0; i < imageLinks.length; i++){
        const image = new Image();
        image.src = imageLinks[i].Image;
        images.push(image);
        image.onload = ()=>{
            image.onload = null;
            loaded++;
            if(loaded >= imageLinks.length){
                let eventData =  {detail:{images:images}}
                let event = new CustomEvent("update-base-image-list", eventData);
                document.dispatchEvent(event);
            }
        }
    }
}
function generateFinalImageData(baseImg, imageData){
    let finalImageData = JSON.parse(JSON.stringify(imageData));
    finalImageData.unshift({x:0, y:0, angle:0, scaleX:1, scaleY:1, flipX:false, flipY:false, src:baseImg.src, type:0});
    return finalImageData;
}
function getDefaultCanvasSize(){
    const style = getComputedStyle(document.body);
    const canvasSizeCSS = style.getPropertyValue("--default-canvas-size");
    const canvasSize = parseInt(canvasSizeCSS.slice(0, -2));
    return window.innerHeight * canvasSize /100
}

/*--Image Logic--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function drawBaseImage(image){
    const canvas = document.getElementById("main-canvas");
    const ctx = canvas.getContext("2d");

    let aspectRatio = image.width / image.height;
    let height = canvas.height / aspectRatio;
    let adjustTop = (canvas.height - height) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, adjustTop, canvas.width, height);
}
function drawCanvases(imageData, zoom){
    const id = "added-canvas";
    const canvasElement = document.getElementById(id);
    const canvas = new fabric.Canvas(id, {
        height:canvasElement.height,
        width:canvasElement.width
    });
    let addedElements = [];
    for(let i = 0; i < imageData.length; i++){
        if(imageData[i].type === 1){
            fabric.Image.fromURL(imageData[i].src).then(result => {
                let y = imageData[i].y * canvasElement.height;
                let x = imageData[i].x * canvasElement.width;
    
                const img = result.set({left:x, top:y, lockScalingFlip:true, angle:imageData[i].angle});
                img.set({
                    scaleX:imageData[i].scaleX * zoom / 10,
                    scaleY:imageData[i].scaleY * zoom / 10,
                    flipX: imageData[i].flipX,
                    flipY: imageData[i].flipY
                });
                addedElements[i] = img;
                addImageObjectEvents(img, i, imageData, zoom);
            });
        }
        else{
            let y = imageData[i].y * canvasElement.height;
            let x = imageData[i].x * canvasElement.width;

            const text = new fabric.IText(imageData[i].text, {
                strokeWidth:imageData[i].outlineSize,
                stroke:imageData[i].colorOutline,
                fill:imageData[i].colorFill,
                angle:imageData[i].angle,
                lockScalingFlip:true,
                left:x, top:y,

                scaleX:imageData[i].scaleX * zoom / 10,
                scaleY:imageData[i].scaleY * zoom / 10,
                flipX: imageData[i].flipX,
                flipY: imageData[i].flipY,
                fontFamily:imageData[i].font,
                fontSize:canvasElement.height * imageData[i].fontSize / zoom * 10
            });
            addedElements[i] = text;
            addImageObjectEvents(text, i, imageData, zoom);
        }
    }
    setTimeout(()=>{
        for(let i = 0; i < addedElements.length; i++) canvas.add(addedElements[i]);
        canvas.renderAll();
    }, 50);
}
function addImageObjectEvents(img, index, imageData, zoom){
    img.on("moving", (e)=>{
        const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
        const rect = studioCanvasHolder.getBoundingClientRect();

        imageData[index].x = e.transform.target.left / rect.width;
        imageData[index].y = e.transform.target.top / rect.height;

        let eventData =  {detail:{imageData:imageData}}
        let event = new CustomEvent("update-data", eventData);
        document.dispatchEvent(event);
    });
    img.on("scaling", (e)=>{
        const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
        const rect = studioCanvasHolder.getBoundingClientRect();

        imageData[index].x = e.transform.target.left / rect.width;
        imageData[index].y = e.transform.target.top / rect.height;
        imageData[index].scaleX = e.transform.target.scaleX / zoom * 10;
        imageData[index].scaleY = e.transform.target.scaleY / zoom * 10;

        let eventData =  {detail:{imageData:imageData}}
        let event = new CustomEvent("update-data", eventData);
        document.dispatchEvent(event);
    });
    img.on("rotating", (e)=>{
        const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
        const rect = studioCanvasHolder.getBoundingClientRect();

        imageData[index].x = e.transform.target.left / rect.width;
        imageData[index].y = e.transform.target.top / rect.height;
        imageData[index].angle = e.transform.target.angle;

        let eventData =  {detail:{imageData:imageData}}
        let event = new CustomEvent("update-data", eventData);
        document.dispatchEvent(event);
    });

    img.on("deselected", ()=>{
        hideSideButtons();
        if(imageData[index].type === 2) closeTextSettings();
    });
    img.on("selected", ()=>{
        displaySideButtons(imageData, index);
        if(imageData[index].type === 2) openTextSettings(imageData, index);
    });

    if(imageData[index].type === 2){
        img.on("changed", ()=>{
            imageData[index].text = img.text;
            let eventData =  {detail:{imageData:imageData}}
            let event = new CustomEvent("update-data", eventData);
            document.dispatchEvent(event);
        });
    }
}
function displaySideButtons(imageData, index){
    const sideButtonHolder = document.querySelector(".side-button-holder");
    if(parseInt(sideButtonHolder.dataset.index) !== index){
        sideButtonHolder.dataset.index = index;
        sideButtonHolder.style.animation = "fade-in ease-in-out 0.1s";
        sideButtonHolder.style.display = "flex";
        sideButtonHolder.onanimationend = ()=>{
            sideButtonHolder.style.animation = "none";
            sideButtonHolder.onanimationend = null;
        }
    }

    document.querySelector("#duplicate").onclick = ()=>{
        let clone = {};
        let keys = Object.keys(imageData[index]);
        let values = Object.values(imageData[index]);
        for(let i = 0; i < keys.length; i++) clone[keys[i]] = values[i];
        clone["id"] = "canvas-"+crypto.randomUUID();
        clone["x"] += 0.05;
        clone["y"] += 0.05;
        
        let eventData =  {detail:{clone:clone}}
        let event = new CustomEvent("clone-image", eventData);
        document.dispatchEvent(event);
    };
    document.querySelector("#bringFront").onclick = ()=>{
        let eventData =  {detail:{imageData:imageData, index:index}}
        let event = new CustomEvent("switch-order", eventData);
        document.dispatchEvent(event);
    };
    document.querySelector("#flipH").onclick = ()=>{
        if(imageData[index].flipX) imageData[index].flipX = false;
        else imageData[index].flipX = true;

        let eventData =  {detail:{imageData:imageData}}
        let event = new CustomEvent("redraw-added-canvas", eventData);
        document.dispatchEvent(event);
    };
    document.querySelector("#flipV").onclick = ()=>{
        if(imageData[index].flipY) imageData[index].flipY = false;
        else imageData[index].flipY = true;

        let eventData =  {detail:{imageData:imageData}}
        let event = new CustomEvent("redraw-added-canvas", eventData);
        document.dispatchEvent(event);
    };
    document.querySelector("#delete").onclick = ()=>{
        let eventData =  {detail:{index:index}}
        let event = new CustomEvent("update-delete-backup", eventData);
        document.dispatchEvent(event);
    };
}
function hideSideButtons(){
    const sideButtonHolder = document.querySelector(".side-button-holder");
    if(sideButtonHolder.style.display === "flex"){
        sideButtonHolder.dataset.index = "";
        sideButtonHolder.style.animation = "fade-out ease-in-out 0.1s";
        sideButtonHolder.onanimationend = ()=>{
            sideButtonHolder.style.animation = "none";
            sideButtonHolder.style.display = "none";
            sideButtonHolder.onanimationend = null;
        }
    }

    document.querySelector("#bringFront").onclick = null;
    document.querySelector("#duplicate").onclick = null;
    document.querySelector("#delete").onclick = null;
    document.querySelector("#flipH").onclick = null;
    document.querySelector("#flipV").onclick = null;
}

/*--Text Logic---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function getAllFonts(){
    return [
        "Abadi MT Condensed Light", "Aharoni", "Aharoni Bold", "Aldhabi", "AlternateGothic2 BT", "Andale Mono", "Andalus", "Angsana New", "AngsanaUPC", "Aparajita",
        "Apple Chancery", "Arabic Typesetting", "Arial", "Arial Black", "Arial narrow", "Arial Nova", "Arial Rounded MT Bold", "Arnoldboecklin", "Avanta Garde", "Bahnschrift",
        "Bahnschrift Light", "Bahnschrift SemiBold", "Bahnschrift SemiLight", "Baskerville", "Batang", "BatangChe", "Big Caslon", "BIZ UDGothic", "BIZ UDMincho Medium", "Blippo",
        "Bodoni MT", "Book Antiqua", "Book Antiqua", "Bookman", "Bradley Hand", "Browallia New", "BrowalliaUPC", "Brush Script MT", "Brush Script Std", "Brushstroke", "Calibri",
        "Calibri Light", "Calisto MT", "Cambodian", "Cambria", "Cambria Math", "Candara", "Century Gothic", "Chalkduster", "Cherokee", "Comic Sans", "Comic Sans MS", "Consolas",
        "Constantia", "Copperplate", "Copperplate Gothic Light", "Copperplate Gothic&nbsp;Bold", "Corbel", "Cordia New", "CordiaUPC", "Coronetscript", "Courier", "Courier New",
        "DaunPenh", "David", "DengXian", "DFKai-SB", "Didot", "DilleniaUPC", "DokChampa", "Dotum", "DotumChe", "Ebrima", "Estrangelo Edessa", "EucrosiaUPC", "Euphemia", "FangSong",
        "Florence", "Franklin Gothic Medium", "FrankRuehl", "FreesiaUPC", "Futara", "Gabriola", "Gadugi", "Garamond", "Gautami", "Geneva", "Georgia", "Georgia Pro", "Gill Sans",
        "Gill Sans Nova", "Gisha", "Goudy Old Style", "Gulim", "GulimChe", "Gungsuh", "GungsuhChe", "Hebrew", "Hoefler Text", "HoloLens MDL2 Assets", "Impact", "Ink Free", "IrisUPC",
        "Iskoola Pota", "Japanese", "JasmineUPC", "Javanese Text", "Jazz LET", "KaiTi", "Kalinga", "Kartika", "Khmer UI", "KodchiangUPC", "Kokila", "Korean", "Lao", "Lao UI", "Latha",
        "Leelawadee", "Leelawadee UI", "Leelawadee UI Semilight", "Levenim MT", "LilyUPC", "Lucida Bright", "Lucida Console", "Lucida Handwriting", "Lucida Sans", "Lucida Sans Typewriter",
        "Lucida Sans Unicode", "Lucidatypewriter", "Luminari", "Malgun Gothic", "Malgun Gothic Semilight", "Mangal", "Marker Felt", "Marlett", "Meiryo", "Meiryo UI", "Microsoft Himalaya",
        "Microsoft JhengHei", "Microsoft JhengHei UI", "Microsoft New Tai Lue", "Microsoft PhagsPa", "Microsoft Sans Serif", "Microsoft Tai Le", "Microsoft Uighur", "Microsoft YaHei",
        "Microsoft YaHei UI", "Microsoft Yi Baiti", "MingLiU", "MingLiU_HKSCS", "MingLiU_HKSCS-ExtB", "MingLiU-ExtB", "Miriam", "Monaco", "Mongolian Baiti", "MoolBoran", "MS Gothic",
        "MS Mincho", "MS PGothic", "MS PMincho", "MS UI Gothic", "MV Boli", "Myanmar Text", "Narkisim", "Neue Haas Grotesk Text Pro", "New Century Schoolbook", "News Gothic MT", "Nirmala UI",
        "No automatic language associations", "Noto", "NSimSun", "Nyala", "Oldtown", "Optima", "Palatino", "Palatino Linotype", "papyrus", "Parkavenue", "Perpetua", "Plantagenet Cherokee",
        "PMingLiU", "Raavi", "Rockwell", "Rockwell Extra Bold", "Rockwell Nova", "Rockwell Nova Cond", "Rockwell Nova Extra Bold", "Rod", "Sakkal Majalla", "Sanskrit Text", "Segoe MDL2 Assets",
        "Segoe Print", "Segoe Script", "Segoe UI", "Segoe UI Emoji", "Segoe UI Historic", "Segoe UI Symbol", "Shonar Bangla", "Shruti", "SimHei", "SimKai", "Simplified Arabic", "Simplified Chinese",
        "SimSun", "SimSun-ExtB", "Sitka", "Snell Roundhan", "Stencil Std", "Sylfaen", "Symbol", "Tahoma", "Thai", "Times New Roman", "Traditional Arabic", "Traditional Chinese", "Trattatello",
        "Trebuchet MS", "Tunga", "UD Digi Kyokasho", "UD Digi KyoKasho NK-R", "UD Digi KyoKasho NP-R", "UD Digi KyoKasho N-R", "Urdu Typesetting", "URW Chancery", "Utsaah", "Vani", "Verdana",
        "Verdana Pro", "Vijaya", "Vrinda", "Webdings", "Westminster", "Wingdings", "Yu Gothic", "Yu Gothic UI", "Yu Mincho", "Zapf Chancery"
    ];
}
function openTextSettings(imageData, index){
    const textItemFont = document.querySelector(".text-item-font");
    const textSizeRange = document.querySelector("#font-size-range");
    const outlineRange = document.querySelector("#outline-range");
    const textColor = document.querySelector("#text-color");
    const backColor = document.querySelector("#back-color");
  

    textItemFont.innerText = imageData[index].font;
    textColor.value = imageData[index].colorOutline;
    backColor.value = imageData[index].colorFill;
    outlineRange.value = imageData[index].outlineSize;
    textSizeRange.value = imageData[index].fontSize * 500;

    const textHolder = document.querySelector(".text-holder");
    if(textHolder.style.display !== "flex"){
        textHolder.style.animation = "fade-in ease-in-out 0.1s";
        textHolder.style.display = "flex";
        textHolder.onanimationend = ()=>{
            textHolder.style.animation = "none";
            textHolder.onanimationend = null;
        }
    }

    const fontMask = document.querySelector("#font-mask");
    document.querySelector(".text-item-font").onclick = ()=>{
        fontMask.style.animation = "fade-in ease-in-out 0.1s";
        fontMask.style.display = "block";
        fontMask.onanimationend = ()=>{
            fontMask.style.animation = "none";
            fontMask.onanimationend = null;
        }
    }

    document.querySelector(".font-window-close").onclick = closeFontWindow;
    let allFonts = getAllFonts();
    const fontWindowBody = document.querySelector(".font-window-body");
    while(fontWindowBody.children.length > 0) fontWindowBody.removeChild(fontWindowBody.lastChild);
    for(let i = 0; i < allFonts.length; i++){
        const font = document.createElement("div");
        font.className = "font";
        font.style.fontFamily = allFonts[i];
        font.innerText = allFonts[i];

        fontWindowBody.appendChild(font);
        font.onclick = ()=>{
            closeFontWindow();
            textItemFont.innerText = allFonts[i];
            imageData[index].font = allFonts[i];
            let eventData =  {detail:{imageData:imageData}}
            let event = new CustomEvent("redraw-added-canvas", eventData);
            document.dispatchEvent(event);
        }
    }

    backColor.oninput = ()=>{
        imageData[index].colorFill = backColor.value;
        let eventData =  {detail:{imageData:imageData}}
        let event = new CustomEvent("redraw-added-canvas", eventData);
        document.dispatchEvent(event);
    }
    textColor.oninput = ()=>{
        imageData[index].colorOutline = textColor.value;
        let eventData =  {detail:{imageData:imageData}}
        let event = new CustomEvent("redraw-added-canvas", eventData);
        document.dispatchEvent(event);
    }
    outlineRange.oninput = ()=>{
        imageData[index].outlineSize = parseInt(outlineRange.value) / 20;
        let eventData =  {detail:{imageData:imageData}}
        let event = new CustomEvent("redraw-added-canvas", eventData);
        document.dispatchEvent(event);
    }
    textSizeRange.oninput = ()=>{
        imageData[index].fontSize = parseInt(textSizeRange.value) / 500;
        let eventData =  {detail:{imageData:imageData}}
        let event = new CustomEvent("redraw-added-canvas", eventData);
        document.dispatchEvent(event);
    }
}
function closeTextSettings(){
    const textHolder = document.querySelector(".text-holder");
    textHolder.style.animation = "fade-out ease-in-out 0.1s";
    textHolder.onanimationend = ()=>{
        textHolder.style.animation = "none";
        textHolder.style.display = "none";
        textHolder.onanimationend = null;
    }
}
function closeFontWindow(){
    closeTextSettings();
    hideSideButtons();
    
    const fontMask = document.querySelector("#font-mask");
    fontMask.style.animation = "fade-out ease-in-out 0.1s";
    fontMask.onanimationend = ()=>{
        fontMask.style.animation = "none";
        fontMask.style.display = "none";
        fontMask.onanimationend = null;
    }
}




/*
CategoryName: "Trakice ID Kartice / Nosač"
​​​​​​
ColorImage: ""
​​​​​​
Description: "Plastični uložak za indentifikacionu karticu sa trakicom"
​​​​​​
HTMLColor: "#ffffff"
​​​​​​
ID: "3514690"
​​​​​​
Images: Array [ {…}, {…} ]
​​​​​​
Img: "https://apiv2.promosolution.services/content/ModelItem/3514690_001.jpg?v=240917102814"
​​​​​​
Model: "SELF H"
​​​​​​
Name: "SELF H, plastični uložak za indentifikacionu karticu sa trakicom, beli"
​​​​​​
Package: "384/48/1"
​​​​​​
Price: 0.49
​​​​​​
ProductIdView: "35.146.90"
​​​​​​
Sizes: Array []
​​​​​​
SubCategoryName: "ID Trakice"
​​​​​​
WMSDepth: 9.25
​​​​​​
WMSDimUM: "cm"
​​​​​​
WMSHeight: 12.25
​​​​​​
WMSWidth: 1.04167
​​​​​​
Weight: 0.028
​​​​​​
WeightUM: "kg"

https://apiv2.promosolution.services/content/Shade/863e891f-0143-43af-bc6b-b9568e8aa703.png
*/