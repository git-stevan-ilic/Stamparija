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
    client.on("download-final-image", (image)=>{
        const downloadLink = document.createElement("a");
        downloadLink.download = "Logo Studio Image.png";
        downloadLink.href = image;
        downloadLink.click();
        downloadLink.remove();
    });
    client.on("email-error", ()=>{
        sendButton.disabled = false;
        alert("Greška u slanju emaila");
    });
    client.on("email-success", ()=>{
        sendButton.disabled = false;
        alert("Email sa slikama vašeg logoa je poslat");
    });
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

    document.addEventListener("update-image-data", (e)=>{
        imageData = e.detail.imageData.concat(loadedImages);
        images = e.detail.images;
        generateCustomImages(imageData, zoom, false);
        resizeCanvases(imageData, zoom);
        window.onresize = ()=>{
            resizeCanvases(imageData, zoom);
            zoomFunc(0);
        }
        zoomFunc(0);
    });
    document.addEventListener("update-custom-images", (e)=>{
        imageData = e.detail.imageData;
        generateCustomImages(e.detail.imageData, zoom, true);
    });
    document.addEventListener("update-curr-version", (e)=>{
        currVersion = e.detail.currVersion;
        generateColors(currVersion.ID, data.versions);
        generateImages(currVersion.Images, imgIndex);
    });
    document.addEventListener("update-base-image", (e)=>{
        imageData[0].image = images[e.detail.baseImgIndex];
        imgIndex = e.detail.baseImgIndex;
        generateImages(currVersion.Images, imgIndex);
        drawCanvases(imageData);
    });
    document.addEventListener("redraw-canvases", (e)=>{
        imageData = e.detail.imageData;
        drawCanvases(imageData);
    });
    document.addEventListener("open-side-buttons", (e)=>{
        displaySideButtons(imageData, e.detail.index);
    });
    document.addEventListener("update-delete-backup", (e)=>{
        let index = e.detail.index;
        document.getElementById("outline-"+imageData[index].id).remove();
        document.getElementById(imageData[index].id).remove();
        loadedImages.splice((index - 1), 1);
        imageData.splice(index, 1);
        generateCustomImages(imageData, zoom, false);
        resizeCanvases(imageData, zoom);
        window.onresize = ()=>{
            resizeCanvases(imageData, zoom);
            zoomFunc(0);
        }
        zoomFunc(0);
    });
    document.addEventListener("remove-drag-move", ()=>{
        back.removeEventListener("mousedown", mouseDown);
    });
    document.addEventListener("add-drag-move", ()=>{
        back.addEventListener("mousedown", mouseDown);
    });
    document.addEventListener("clone-image", (e)=>{
        loadedImages.push(e.detail.clone);
        imageData.push(e.detail.clone);
        generateCustomImages(imageData, zoom, true);
    });
    document.addEventListener("switch-order", (e)=>{
        imageData = e.detail.imageData;
        let index = e.detail.index;

        let currData = imageData.splice(index, 1);
        imageData = imageData.concat(currData);

        let currLoaded = loadedImages.splice((index-1), 1);
        loadedImages = loadedImages.concat(currLoaded);

        generateCustomImages(imageData, zoom, false);
    });

    const studioOutlineHolder = document.querySelector(".studio-outline-holder");
    const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
    const zoomValue = document.querySelector("#zoom-value");
    document.querySelector(".minus").onclick = ()=>{zoomFunc(-1)}
    document.querySelector(".plus").onclick = ()=>{zoomFunc(1)}
    window.addEventListener("wheel", (event)=>{
        const delta = -Math.sign(event.deltaY);
        zoomFunc(delta);
    });
    function zoomFunc(inc){
        zoom += inc;
        if(zoom < 1) zoom = 1;
        if(zoom > 30) zoom = 30;
        zoomValue.innerText = zoom*10+"%";
        resizeCanvases(imageData, zoom);
        let newSize = canvasSize * zoom / 10;
        studioCanvasHolder.style.height = newSize+"vh";
        studioOutlineHolder.style.height = newSize+"vh";

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

        studioOutlineHolder.style.top = top;
        studioOutlineHolder.style.left = left;
        studioOutlineHolder.style.transform = "translate("+translateX+","+translateY+")";
    }

    let pos = {top:0, left:0, x:0, y:0};
    const back = document.querySelector("#back");
    back.addEventListener("mousedown", mouseDown);
    function mouseDown(e){
        deselectAllOutlines();

        const sideButtonHolder = document.querySelector(".side-button-holder");
        sideButtonHolder.style.animation = "fade-out ease-in-out 0.1s";
        sideButtonHolder.onanimationend = ()=>{
            sideButtonHolder.style.animation = "none";
            sideButtonHolder.style.display = "none";
            sideButtonHolder.onanimationend = null;
        }

        pos = {
            left:back.scrollLeft,
            top: back.scrollTop,
            x:e.clientX,
            y:e.clientY,
        };

        back.style.cursor = "grabbing";
        document.addEventListener("mousemove", mouseMove);
        document.addEventListener("mouseup", mouseUp);
    }
    function mouseMove(e){
        const dx = e.clientX - pos.x;
        const dy = e.clientY - pos.y;
        back.scrollTop  = pos.top - dy;
        back.scrollLeft = pos.left - dx;
    }
    function mouseUp(){
        back.style.cursor = "default";
        document.removeEventListener("mousemove", mouseMove);
        document.removeEventListener("mouseup", mouseUp);
    }

    const fileInput = document.querySelector(".file-input");
    document.querySelector("#input-image").onclick = ()=>{fileInput.click()}
    fileInput.onchange = ()=>{
        if(fileInput.files.length === 0) alert("Slika nije validna");
        else{
            let inputImg = new Image();
            let file = fileInput.files[0];
            let reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = ()=>{
                inputImg.src = reader.result;
                inputImg.onload = (e)=>{
                    const rect = studioCanvasHolder.getBoundingClientRect();
                    let inputImgData = resizeImgToFit(inputImg, rect, zoom);
                    let newImageData = {
                        src:reader.result,
                        id:"canvas-"+crypto.randomUUID(),
                        scaleX:1, scaleY:1, angle:0,
                        x:0.5 - inputImgData.w / 2,
                        y:0.5 - inputImgData.h / 2,
                        h:inputImgData.h,
                        w:inputImgData.w,
                        image:inputImg,
                    }
                    loadedImages.push(newImageData);
                    imageData.push(newImageData);
    
                    let eventData =  {detail:{imageData:imageData}}
                    let event = new CustomEvent("update-custom-images", eventData);
                    document.dispatchEvent(event);
                }
            }
        }
    }

    document.querySelector("#download").onclick = ()=>{
        client.emit("request-final-images", imageData, false, null);
    }
    const sendButton = document.querySelector("#send");
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

        document.querySelector("#captcha-cancel").onclick = hideCaptchaWindow;
        document.querySelector("#captcha-confirm").onclick = ()=>{
            if(captchaInput.value !== captchaData.text) alert("Pogresan kod");
            else{
                sendButton.disabled = true;
                hideCaptchaWindow();
                client.emit("request-final-images", imageData, true, currVersion.ID);
                alert("Vaša slika se šalje");
            }
        }
    });


    window.oncontextmenu = (e)=>{
        e.preventDefault();
        console.log(imageData)
    }
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
            let event = new CustomEvent("update-base-image", eventData);
            document.dispatchEvent(event);
        }
        if(i === imgIndex) studioImage.classList.add("studio-image-selected");
    }

    let images = [], imageData = [], loaded = 0;
    for(let i = 0; i < imageLinks.length; i++){
        const image = new Image();
        image.src = imageLinks[i].Image;
        images.push(image);
        if(i === imgIndex){
            imageData.push({
                src:imageLinks[i].Image,
                w:1, h:1, x:0, y:0, angle:0,
                scaleX:1, scaleY:1,
                id:"canvas-main",
                image:image
            });
        }
        image.onload = ()=>{
            image.onload = null;
            loaded++;
            if(loaded >= imageLinks.length){
                let eventData =  {detail:{images:images, imageData:imageData}}
                let event = new CustomEvent("update-image-data", eventData);
                document.dispatchEvent(event);
            }
        }
    }
}
function generateCustomImages(imageData, zoom, selectLast){
    const studioOutlineHolder = document.querySelector(".studio-outline-holder");
    const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
    while(studioOutlineHolder.children.length > 0) studioOutlineHolder.removeChild(studioOutlineHolder.lastChild);
    while(studioCanvasHolder.children.length > 1) studioCanvasHolder.removeChild(studioCanvasHolder.lastChild);
    for(let i = 1; i < imageData.length; i++){
        const canvas = document.createElement("canvas");
        canvas.id = imageData[i].id;
        studioCanvasHolder.appendChild(canvas);

        const outline = document.createElement("div");
        outline.id = "outline-"+imageData[i].id;
        outline.className = "canvas-outline";

        outline.style.height = "calc(" + imageData[i].h * 100 + "% - 2px)";
        outline.style.width = "calc(" + imageData[i].w * 100 + "% - 2px)";
        outline.style.left = imageData[i].x * 100 + "%";
        outline.style.top = imageData[i].y * 100 + "%";
        studioOutlineHolder.appendChild(outline);

        let orbs = [
            {x:0, y:0, type:0, c:"nw-resize"}, {x:1, y:0, type:0, c:"ne-resize"},
            {x:1, y:1, type:0, c:"se-resize"}, {x:0, y:1, type:0, c:"sw-resize"},
            {x:0.5, y:0, type:1, c:"n-resize"}, {x:0.5, y:1, type:1, c:"s-resize"},
            {x:0, y:0.5, type:1, c:"w-resize"}, {x:1, y:0.5, type:1, c:"e-resize"},
            {x:0.5, y:-0.25, type:2, c:"url('../assets/rotate.cur'), auto"}
        ];
        for(let j = 0; j < orbs.length; j++){
            const orb = document.createElement("div");
            orb.className = "canvas-outline-orb";

            orb.style.cursor = orbs[j].c;
            orb.style.left = orbs[j].x * 100 + "%";
            orb.style.top = orbs[j].y * 100 + "%";
            outline.appendChild(orb);
            outlineOrbLogic(orb, orbs[j], imageData, i);
        }
        const line = document.createElement("div");
        line.className = "canvas-outline-connect";
        outline.appendChild(line);
        outlineLogic(outline, imageData, i);
        if(selectLast && i === imageData.length-1){
            displaySideButtons(imageData, i);
            selectOutline(outline);
        }
    }
    resizeCanvases(imageData, zoom);
}

/*--Canvas Logic-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function resizeCanvases(imageData, zoom){
    const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
    const style = getComputedStyle(document.body);
    const canvasSizeCSS = style.getPropertyValue("--default-canvas-size");
    const canvasSize = parseInt(canvasSizeCSS.slice(0, -2));

    for(let i = 0; i < imageData.length; i++){
        const canvas = studioCanvasHolder.children[i];
        canvas.height = window.innerHeight * canvasSize /100 * zoom / 10;
        canvas.width = window.innerHeight * canvasSize / 100 * zoom / 10;
        canvas.id = imageData[i].id
    }
    drawCanvases(imageData);
}
function drawCanvases(imageData){
    const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
    for(let i = 0; i < imageData.length; i++){
        const canvas = studioCanvasHolder.children[i];
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let imgH = imageData[i].h * canvas.height;
        let imgW = imageData[i].w * canvas.width;
        let imgT = imageData[i].y * canvas.height;
        let imgL = imageData[i].x * canvas.width;

        ctx.beginPath();
        ctx.save();
        ctx.translate(imgL + imgW / 2, imgT + imgH / 2);
        ctx.scale(imageData[i].scaleX, imageData[i].scaleY);
        ctx.rotate(imageData[i].angle * Math.PI / 180);
        ctx.drawImage(imageData[i].image, -imgW / 2, -imgH / 2, imgW, imgH);
        ctx.restore();
        ctx.closePath();
    }
}
function resizeImgToFit(image, rect, zoom){
    let inputImgData = {w:1, h:1}
    let imageH = image.height * zoom / 10;
    let imageW = image.width * zoom / 10;

    let aspectRatio = imageW / imageH;
    if(imageW > rect.width && imageH > rect.height){
        if(imageW >= imageH){
            inputImgData.w = 1;
            inputImgData.h = 1 / aspectRatio;
        }
        else{
            inputImgData.h = 1;
            inputImgData.w = 1 * aspectRatio;
        }
        return inputImgData;
    }
    if(imageW > rect.width){
        inputImgData.w = 1;
        inputImgData.h = 1 / aspectRatio;
        return inputImgData;
    }
    if(imageH > rect.height){
        inputImgData.h = 1;
        inputImgData.w = 1 * aspectRatio;
        return inputImgData;
    }
    inputImgData.h = imageH / rect.height;
    inputImgData.w = imageW / rect.width;
    return inputImgData;
}

/*--Element Outline Logic----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function outlineLogic(outline, imageData, index){
    const studioOutlineHolder = document.querySelector(".studio-outline-holder");
    let outlineHolderRect, offsetX, offsetY;
    outline.addEventListener("mousedown", elemMoveMouseDown);

    function elemMoveMouseDown(e){
        outlineHolderRect = studioOutlineHolder.getBoundingClientRect();
        let outlineRect = outline.getBoundingClientRect();

        let ratioW = outlineRect.width / outlineHolderRect.width;
        let ratioH = outlineRect.height / outlineHolderRect.height;

        offsetX = (e.offsetX /  outlineRect.width) * ratioW;
        offsetY = (e.offsetY / outlineRect.height) * ratioH;

        studioOutlineHolder.addEventListener("mousemove", elemMoveMouseMove);
        studioOutlineHolder.addEventListener("mouseup", elemMoveMouseUp);

        deselectAllOutlines();
        selectOutline(outline);

        const event = new Event("remove-drag-move");
        document.dispatchEvent(event);

        setTimeout(()=>{
            let eventData =  {detail:{index:index}}
            let event = new CustomEvent("open-side-buttons", eventData);
            document.dispatchEvent(event);
        }, 100);
    }
    function elemMoveMouseMove(e){
        let newX = (e.clientX - outlineHolderRect.x) / outlineHolderRect.width - offsetX;
        let newY = (e.clientY - outlineHolderRect.y) / outlineHolderRect.height - offsetY;

        imageData[index].x = newX;
        imageData[index].y = newY;

        outline.style.left = newX * 100 + "%";
        outline.style.top = newY * 100 + "%";
        selectOutline(outline);
        emitRedrawCanvas(imageData);
    }
    function elemMoveMouseUp(e){
        elemMoveMouseMove(e);

        deselectAllOutlines();
        selectOutline(outline);

        studioOutlineHolder.removeEventListener("mousemove", elemMoveMouseMove);
        studioOutlineHolder.removeEventListener("mouseup", elemMoveMouseUp);

        const event = new Event("add-drag-move");
        document.dispatchEvent(event);
    }
}
function outlineOrbLogic(orb, orbData, imageData, index){
    const studioOutlineHolder = document.querySelector(".studio-outline-holder");
    const outline = orb.parentElement;

    let currX, currY, initX, initY, initScaleX, initScaleY;
    function resizeX(e, dir){
        const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
        const rect = studioCanvasHolder.getBoundingClientRect();;

        currX = (e.clientX - rect.x) / rect.width;
        let diffX = currX - initX;
        imageData[index].scaleX = initScaleX;

        if(Math.sign(diffX) !== Math.sign(dir)) imageData[index].scaleX = -initScaleX;
        imageData[index].w = Math.abs(diffX);
        
        if(diffX >= 0) imageData[index].x = initX;
        else imageData[index].x = initX - imageData[index].w;

        outline.style.width = Math.abs(imageData[index].w) * 100 + "%";
        outline.style.left = imageData[index].x * 100 + "%";
    }
    function resizeY(e, dir){
        const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
        const rect = studioCanvasHolder.getBoundingClientRect();

        currY = (e.clientY - rect.y) / rect.height;
        let diffY = currY - initY;
        imageData[index].scaleY = initScaleY;

        if(Math.sign(diffY) !== Math.sign(dir)) imageData[index].scaleY = -initScaleY;
        imageData[index].h = Math.abs(diffY);

        if(diffY >= 0) imageData[index].y = initY;
        else imageData[index].y = initY - imageData[index].h;

        outline.style.height = Math.abs(imageData[index].h) * 100 + "%";
        outline.style.top = imageData[index].y * 100 + "%";
    }

    if(orbData.type === 0){
        orb.addEventListener("mousedown", orbResizeMouseDown);
        let dir = {h:0, v:0} //horizontal vertical
        switch(orbData.c){
            default:break;
            case "nw-resize": dir = {h:-1, v:-1}; break;
            case "ne-resize": dir = {h:1,  v:-1}; break;
            case "sw-resize": dir = {h:-1, v:1 }; break;
            case "se-resize": dir = {h:1,  v:1 }; break;
        }
        function orbResizeMouseDown(e){
            e.stopPropagation();

            let dirX = 0;
            let dirY = 0;
            if(dir.h < 0) dirX = 1;
            if(dir.v < 0) dirY = 1;

            initScaleX = imageData[index].scaleX;
            initScaleY = imageData[index].scaleY;
            initX = imageData[index].x + dirX * imageData[index].w;
            initY = imageData[index].y + dirY * imageData[index].h;

            studioOutlineHolder.addEventListener("mousemove", orbResizeMouseMove);
            studioOutlineHolder.addEventListener("mouseup", orbResizeMouseUp);
        }
        function orbResizeMouseMove(e){
            e.stopPropagation();
            resizeX(e, dir.h);
            resizeY(e, dir.v);
            emitRedrawCanvas(imageData);
        }
        function orbResizeMouseUp(e){
            orbResizeMouseMove(e);
            studioOutlineHolder.removeEventListener("mousemove", orbResizeMouseMove);
            studioOutlineHolder.removeEventListener("mouseup", orbResizeMouseUp);
        }
        return;
    }
    if(orbData.type === 1){
        orb.addEventListener("mousedown", orbResizeMouseDown);
        let dir = {h:0, v:0} //horizontal vertical
        switch(orbData.c){
            default:break;
            case "n-resize": dir = {h:0, v:-1}; break;
            case "s-resize": dir = {h:0,  v:1}; break;
            case "w-resize": dir = {h:-1, v:0}; break;
            case "e-resize": dir = {h:1,  v:0}; break;
        }
        function orbResizeMouseDown(e){
            e.stopPropagation();

            let dirX, dirY;
            if(dir.h === 0){
                dirY = 0;
                if(dir.v < 0) dirY = 1;
                initScaleY = imageData[index].scaleY;
                initY = imageData[index].y + dirY * imageData[index].h;
            }
            else{
                dirX = 0;
                if(dir.h < 0) dirX = 1;
                initScaleX = imageData[index].scaleX;
                initX = imageData[index].x + dirX * imageData[index].w;
            }
            
            studioOutlineHolder.addEventListener("mousemove", orbResizeMouseMove);
            studioOutlineHolder.addEventListener("mouseup", orbResizeMouseUp);
        }
        function orbResizeMouseMove(e){
            e.stopPropagation();
            switch(orbData.c){
                default:break;
                case "n-resize": resizeY(e, dir.v); break;
                case "s-resize": resizeY(e, dir.v); break;
                case "w-resize": resizeX(e, dir.h); break;
                case "e-resize": resizeX(e, dir.h); break;
            }
            emitRedrawCanvas(imageData);
        }
        function orbResizeMouseUp(e){
            orbResizeMouseMove(e);
            studioOutlineHolder.removeEventListener("mousemove", orbResizeMouseMove);
            studioOutlineHolder.removeEventListener("mouseup", orbResizeMouseUp);
        }
        return;
    }

    orb.addEventListener("mousedown", orbRotateMouseDown);
    function orbRotateMouseDown(e){
        e.stopPropagation();

        const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
        const rect = studioCanvasHolder.getBoundingClientRect();

        currX = (e.clientX - rect.x) / rect.width;
        currY = (e.clientY - rect.y) / rect.height;

        studioOutlineHolder.addEventListener("mousemove", orbRotateMouseMove);
        studioOutlineHolder.addEventListener("mouseup", orbRotateMouseUp);
    }
    function orbRotateMouseMove(e){
        e.stopPropagation();

        const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
        const rect = studioCanvasHolder.getBoundingClientRect();

        currX = (e.clientX - rect.x) / rect.width;
        currY = (e.clientY - rect.y) / rect.height;

        let centerX = imageData[index].x + imageData[index].w / 2;
        let centerY = imageData[index].y + imageData[index].h / 2;
        let angle = getLineAngle(currX, currY, centerX, centerY) - 90;
        imageData[index].angle = angle;

        outline.style.transform = "rotate("+imageData[index].angle+"deg)";
        emitRedrawCanvas(imageData);
    }
    function orbRotateMouseUp(e){
        orbRotateMouseMove(e)
        studioOutlineHolder.removeEventListener("mousemove", orbRotateMouseMove);
        studioOutlineHolder.removeEventListener("mouseup", orbRotateMouseUp);
    }
}
function displaySideButtons(imageData, index){
    const sideButtonHolder = document.querySelector(".side-button-holder");
    if(sideButtonHolder.style.display !== "flex"){
        sideButtonHolder.style.animation = "fade-in ease-in-out 0.1s";
        sideButtonHolder.style.display = "flex";
        sideButtonHolder.onanimationend = ()=>{
            sideButtonHolder.style.animation = "none";
            sideButtonHolder.onanimationend = null;
        }
    }

    document.querySelector("#duplicate").onclick = ()=>{
        let clone = {
            id:     "canvas-"+crypto.randomUUID(),
            image:  imageData[index].image.cloneNode(),
            scaleX: imageData[index].scaleX,
            scaleY: imageData[index].scaleY,
            angle:  imageData[index].angle,
            src:    imageData[index].src,
            x:      imageData[index].x + 0.05,
            y:      imageData[index].y + 0.05,
            w:      imageData[index].w,
            h:      imageData[index].h,
        };
        let eventData =  {detail:{clone:clone}}
        let event = new CustomEvent("clone-image", eventData);
        document.dispatchEvent(event);
    }
    document.querySelector("#bringFront").onclick = ()=>{
        let eventData =  {detail:{imageData:imageData, index:index}}
        let event = new CustomEvent("switch-order", eventData);
        document.dispatchEvent(event);
    }
    document.querySelector("#flipH").onclick = ()=>{
        imageData[index].scaleX *= -1;
        emitRedrawCanvas(imageData);
    }
    document.querySelector("#flipV").onclick = ()=>{
        imageData[index].scaleY *= -1;
        emitRedrawCanvas(imageData);
    }
    document.querySelector("#delete").onclick = ()=>{
        let eventData =  {detail:{index:index}}
        let event = new CustomEvent("update-delete-backup", eventData);
        document.dispatchEvent(event);
    }
}
function emitRedrawCanvas(imageData){
    let eventData =  {detail:{imageData:imageData}}
    let event = new CustomEvent("redraw-canvases", eventData);
    document.dispatchEvent(event);
}
function getLineAngle(cx, cy, ex, ey){
    let dy = ey - cy;
    let dx = ex - cx;
    let theta = Math.atan2(dy, dx);
    theta *= 180 / Math.PI;
    if (theta < 0) theta = 360 + theta;
    return theta;
}
function deselectAllOutlines(){
    const allOutlines = document.querySelectorAll(".canvas-outline");
    for(let i = 0; i < allOutlines.length; i++){
        allOutlines[i].classList.remove("selected-outline");
        for(let j = 0; j < allOutlines[i].children.length; j++){
            allOutlines[i].children[j].style.display = "none";
        }
    }
}
function selectOutline(outline){
    outline.classList.add("selected-outline");
    for(let i = 0; i < outline.children.length; i++){
        outline.children[i].style.display = "block";
    }
}





let allFonts = [
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