/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
window.addEventListener("load", loadStudioLogic);

function loadStudioLogic(){
    const client = io();

    const pageBodyContent = document.querySelector(".page-body-content");
    const params = new URLSearchParams(location.search);
    let productID = params.getAll("id")[0];
    if(productID) client.emit("studio-id", productID);
    else pageBodyContent.innerHTML = "<div style='margin-left:3vh;margin-top:3vh;'>Proizvod nije nađen";

    client.on("studio-received", (data)=>{
        if(!data.Found) pageBodyContent.innerHTML = "<div style='margin-left:3vh;margin-top:3vh;'>Proizvod nije nađen";
        else generateStudio(client, data);
    });
    /*client.on("receive-final-image", (images, data)=>{
        console.log(images);
        let img = new Image();
        img.src = data;
        document.body.appendChild(img);
    });*/
}

/*--Generation---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function generateStudio(client, data){
    let currVersion = data.versions[0];
    console.log("current product", data);
    console.log("current version", currVersion);

    let imgIndex = 0, images = [], imageData = [], zoom = 10, loadedImages = [];
    generateColors(currVersion.ID, data.versions);
    generateImages(currVersion.Images, imgIndex);


    document.addEventListener("update-image-data", (e)=>{
        imageData = e.detail.imageData.concat(loadedImages);
        images = e.detail.images;
        generateCustomImages(imageData, zoom);
        resizeCanvases(imageData, zoom);
        window.onresize = ()=>{
            resizeCanvases(imageData, zoom);
            zoomFunc(0);
        }
        zoomFunc(0);
    });
    document.addEventListener("update-custom-images", (e)=>{
        imageData = e.detail.imageData;
        generateCustomImages(e.detail.imageData, zoom);
    });
    document.addEventListener("update-curr-version", (e)=>{
        currVersion = e.detail.currVersion;
        generateColors(currVersion.ID, data.versions);
        generateImages(currVersion.Images, imgIndex);
    });
    document.addEventListener("update-base-image", (e)=>{
        imageData[0].image = images[e.detail.baseImgIndex];
        imgIndex = e.detail.baseImgIndex;
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
        let tempImageData = e.detail.imageData;
        tempImageData.splice(0, 1);
        loadedImages = tempImageData;
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
        let newSize = 80 * zoom / 10;
        studioCanvasHolder.style.height = newSize+"vh";
        studioOutlineHolder.style.height = newSize+"vh";

        let left = "50%", top = "50%", translateX = "-50%", translateY = "-50%";
        if(window.innerHeight * newSize / 100 > back.getBoundingClientRect().width){
            translateX = "0%";
            left = "0px";
        }
        if(newSize > 80){
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
        const allOutlines = document.querySelectorAll(".canvas-outline");
        for(let j = 0; j < allOutlines.length; j++) allOutlines[j].classList.remove("selected-outline");

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
                inputImg.onload = ()=>{
                    const rect = studioCanvasHolder.getBoundingClientRect();
                    let inputImgData = resizeImgToFit(inputImg, rect);
                    let newImageData = {
                        id:"canvas-"+crypto.randomUUID(),
                        zIndex:imageData.length,
                        x:0.5, y:0.5, angle:0,
                        scaleX:1, scaleY:1,
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

    window.oncontextmenu = (e)=>{
        e.preventDefault();
        console.log(imageData)
    }
    /*document.querySelector("#download").onclick = ()=>{
        //client.emit("request-final-images", imageData, false);
    }
    document.querySelector("#send").onclick = ()=>{
        //const stream = ss.createStream();
        //(client).emit("request-final-images", stream, {name: "test", imageData:imageData});
        //client.emit("request-final-images", imageData, true);
    }*/
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
                w:1, h:1, x:0.5, y:0.5, angle:0,
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
function generateCustomImages(imageData, zoom){
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

        outline.style.height = "calc("+imageData[i].h*100+"% - 2px)";
        outline.style.width = "calc("+imageData[i].w*100+"% - 2px)";
        outline.style.left = imageData[i].x*100+"%";
        outline.style.top = imageData[i].x*100+"%";
        studioOutlineHolder.appendChild(outline);

        let orbs = [
            {x:0, y:0, type:0, c:"nw-resize"}, {x:1, y:0, type:0, c:"ne-resize"}, {x:1, y:1, type:0, c:"se-resize"},
            {x:0, y:1, type:0, c:"sw-resize"}, {x:0.5, y:-0.25, type:1, c:"url('../assets/rotate.cur'), auto"}
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
        
    }
    resizeCanvases(imageData, zoom);
}

/*--Canvas Logic-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function resizeCanvases(imageData, zoom){
    const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
    for(let i = 0; i < imageData.length; i++){
        const canvas = studioCanvasHolder.children[i];
        canvas.height = window.innerHeight * 0.80 * zoom / 10;
        canvas.width = window.innerHeight * 0.80 * zoom / 10;
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
        ctx.translate(imgL, imgT);
        ctx.scale(imageData[i].scaleX, imageData[i].scaleY);
        ctx.rotate(imageData[i].angle * Math.PI / 180);
        ctx.drawImage(imageData[i].image, -imgW/2, -imgH/2, imgW, imgH);
        ctx.restore();
        ctx.closePath();
    }
}
function resizeImgToFit(image, rect){
    let inputImgData = {w:1, h:1}
    let aspectRatio = image.width / image.height
    if(image.width > rect.width && image.height > rect.height){
        if(image.width >= image.height){
            inputImgData.w = 1;
            inputImgData.h = 1 / aspectRatio;
        }
        else{
            inputImgData.h = 1;
            inputImgData.w = 1 * aspectRatio;
        }
        return inputImgData;
    }
    if(image.width > rect.width){
        inputImgData.w = 1;
        inputImgData.h = 1 / aspectRatio;
        return inputImgData;
    }
    if(image.height > rect.height){
        inputImgData.h = 1;
        inputImgData.w = 1 * aspectRatio;
        return inputImgData;
    }
    inputImgData.h = image.height / rect.height;
    inputImgData.w = image.width / rect.width;
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

        let offsetXoutline = 0.5 - e.offsetX / outlineRect.width;
        let offsetYoutline = 0.5 - e.offsetY / outlineRect.height;
        let ratioW = outlineRect.width / outlineHolderRect.width;
        let ratioH = outlineRect.height / outlineHolderRect.height;
        offsetX = offsetXoutline * ratioW;
        offsetY = offsetYoutline * ratioH;

        studioOutlineHolder.addEventListener("mousemove", elemMoveMouseMove);
        studioOutlineHolder.addEventListener("mouseup", elemMoveMouseUp);
        outline.classList.add("selected-outline");

        setTimeout(()=>{
            let eventData =  {detail:{index:index}}
            let event = new CustomEvent("open-side-buttons", eventData);
            document.dispatchEvent(event);
        },100);
    }
    function elemMoveMouseMove(e){
        let newX = (e.clientX - outlineHolderRect.x) / outlineHolderRect.width + offsetX;
        let newY = (e.clientY - outlineHolderRect.y) / outlineHolderRect.height + offsetY;
        imageData[index].x = newX;
        imageData[index].y = newY;

        outline.style.left = newX*100+"%";
        outline.style.top = newY*100+"%";
        outline.classList.add("selected-outline");
        emitRedrawCanvas(imageData);
    }
    function elemMoveMouseUp(e){
        let newX = (e.clientX - outlineHolderRect.x) / outlineHolderRect.width + offsetX;
        let newY = (e.clientY - outlineHolderRect.y) / outlineHolderRect.height + offsetY;
        outline.style.left = newX*100+"%";
        outline.style.top = newY*100+"%";

        const allOutlines = document.querySelectorAll(".canvas-outline");
        for(let j = 0; j < allOutlines.length; j++) allOutlines[j].classList.remove("selected-outline");
        outline.classList.add("selected-outline");

        studioOutlineHolder.removeEventListener("mousemove", elemMoveMouseMove);
        studioOutlineHolder.removeEventListener("mouseup", elemMoveMouseUp);
        emitRedrawCanvas(imageData);
    }
}
function outlineOrbLogic(orb, orbData, imageData, index){
    const studioOutlineHolder = document.querySelector(".studio-outline-holder");
    const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
    const rect = studioCanvasHolder.getBoundingClientRect();
    const outline = orb.parentElement;

    if(!orbData.type){
        orb.addEventListener("mousedown", orbResizeMouseDown);

        let dir = {h:0, v:0} //horizontal vertical
        switch(orbData.c){
            default:break;
            case "nw-resize": dir = {h:-1, v:-1}; break;
            case "ne-resize": dir = {h:1,  v:-1}; break;
            case "sw-resize": dir = {h:-1, v:1 }; break;
            case "se-resize": dir = {h:1,  v:1 }; break;
        }

        let initX, initY, currX, currY;
        function orbResizeMouseDown(e){
            e.stopPropagation();
            initX = e.clientX;
            initY = e.clientY;
            
            studioOutlineHolder.addEventListener("mousemove", orbResizeMouseMove);
            studioOutlineHolder.addEventListener("mouseup", orbResizeMouseUp);
        }
        function orbResizeMouseMove(e){
            currX = e.clientX;
            currY = e.clientY;

            let diffX = (currX - initX) /  rect.width * dir.h;
            let diffY = (currY - initY) / rect.height * dir.v;
            let diff = Math.max(diffX, diffY);

            imageData[index].w = imageData[index].w + diff;
            imageData[index].h = imageData[index].h + diff;
            imageData[index].x = imageData[index].x + diff * dir.h / 2;
            imageData[index].y = imageData[index].y + diff * dir.v / 2;

            outline.style.top = imageData[index].y*100+"%";
            outline.style.left = imageData[index].x*100+"%";
            outline.style.width = imageData[index].w*100+"%";
            outline.style.height = imageData[index].h*100+"%";
            

            initX = e.clientX;
            initY = e.clientY;
            emitRedrawCanvas(imageData);
        }
        function orbResizeMouseUp(){
            studioOutlineHolder.removeEventListener("mousemove", orbResizeMouseMove);
            studioOutlineHolder.removeEventListener("mouseup", orbResizeMouseUp);
        }
    }
    else{
        orb.addEventListener("mousedown", orbRotateMouseDown);

        let currX, currY;
        function orbRotateMouseDown(e){
            e.stopPropagation();
            currX = (e.clientX - rect.x) / rect.width;
            currY = (e.clientY - rect.y) / rect.height;

            studioOutlineHolder.addEventListener("mousemove", orbRotateMouseMove);
            studioOutlineHolder.addEventListener("mouseup", orbRotateMouseUp);
        }
        function orbRotateMouseMove(e){
            currX = (e.clientX - rect.x) / rect.width;
            currY = (e.clientY - rect.y) / rect.height;

            let angle = getLineAngle(currX, currY, imageData[index].x, imageData[index].y) - 90;
            imageData[index].angle = angle;
            outline.style.transform = "translate(-50%, -50%) rotate("+imageData[index].angle+"deg)";

            emitRedrawCanvas(imageData);
        }
        function orbRotateMouseUp(){
            studioOutlineHolder.removeEventListener("mousemove", orbRotateMouseMove);
            studioOutlineHolder.removeEventListener("mouseup", orbRotateMouseUp);
        }
    }
}
function displaySideButtons(imageData, index){
    const sideButtonHolder = document.querySelector(".side-button-holder");
    sideButtonHolder.style.animation = "fade-in ease-in-out 0.1s";
    sideButtonHolder.style.display = "flex";
    sideButtonHolder.onanimationend = ()=>{
        sideButtonHolder.style.animation = "none";
        sideButtonHolder.onanimationend = null;
    }

    /*document.querySelector("#flipH").onclick = ()=>{
        imageData[index].scaleX *= -1;
        emitRedrawCanvas(imageData);
    }
    document.querySelector("#flipV").onclick = ()=>{
        imageData[index].scaleY *= -1;
        emitRedrawCanvas(imageData);
    }
    document.querySelector("#delete").onclick = ()=>{
        document.getElementById("outline-"+imageData[index].id).remove();
        document.getElementById(imageData[index].id).remove();
        imageData.splice(index, 1);
        emitRedrawCanvas(imageData);

        let eventData =  {detail:{imageData:imageData}}
        let event = new CustomEvent("update-delete-backup", eventData);
        document.dispatchEvent(event);
    }*/
}
function emitRedrawCanvas(imageData){
    let eventData =  {detail:{imageData:imageData}}
    let event = new CustomEvent("redraw-canvases", eventData);
    document.dispatchEvent(event);
}
function getLineAngle(cx, cy, ex, ey) {
    let dy = ey - cy;
    let dx = ex - cx;
    let theta = Math.atan2(dy, dx);
    theta *= 180 / Math.PI;
    if (theta < 0) theta = 360 + theta;
    return theta;
}