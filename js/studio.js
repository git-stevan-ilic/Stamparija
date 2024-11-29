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
        else generateStudio(data);
    });
}

/*--Generation---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function generateStudio(data){
    let currVersion = data.versions[0];
    console.log("current product", data);
    console.log("current version", currVersion);

    let imgIndex = 0, images = [], imageData = [], zoom = 10;
    generateColors(currVersion.ID, data.versions);
    generateImages(currVersion.Images, imgIndex);


    document.addEventListener("update-image-data", (e)=>{
        imageData = e.detail.imageData;
        images = e.detail.images;
        console.log("image data:", imageData);
        resizeCanvases(imageData, zoom);
        window.onresize = ()=>{
            resizeCanvases(imageData, zoom);
            zoomFunc(0);
        }
        zoomFunc(0);
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

    const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
    const zoomValue = document.querySelector("#zoom-value");
    document.querySelector(".minus").onclick = ()=>{zoomFunc(-1)}
    document.querySelector(".plus").onclick = ()=>{zoomFunc(1)}
    function zoomFunc(inc){
        zoom += inc;
        if(zoom < 1) zoom = 1;
        if(zoom > 30) zoom = 30;
        zoomValue.innerText = zoom*10+"%";
        resizeCanvases(imageData, zoom);
        let newSize = 82 * zoom / 10;
        studioCanvasHolder.style.height = newSize+"vh";

        let left = "50%", top = "50%", translateX = "-50%", translateY = "-50%";
        if(window.innerHeight * newSize / 100 > back.getBoundingClientRect().width){
            translateX = "0%";
            left = "0px";
        }
        if(newSize > 82){
            translateY = "0%";
            top = "0px";
        }
        studioCanvasHolder.style.top = top;
        studioCanvasHolder.style.left = left;
        studioCanvasHolder.style.transform = "translate("+translateX+","+translateY+")";
    }

    let pos = {top:0, left:0, x:0, y:0};
    const back = document.querySelector("#back");
    back.addEventListener("mousedown", mouseDown);
    function mouseDown(e){
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
}
function generateColors(id, versions){
    const studioColorHolder = document.querySelector(".studio-color-holder");
    while(studioColorHolder.children.length > 0) studioColorHolder.removeChild(studioColorHolder.lastChild);
    for(let i = 0; i < versions.length; i++){
        if(id !== versions[i].ID){
            const studioColor = document.createElement("div");
            studioColor.className = "studio-color";
            studioColor.style.backgroundColor = versions[i].HTMLColor;
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
        if(i === imgIndex) imageData.push({image:image, id:"main"});
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

/*--Canvas Logic-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function resizeCanvases(imageData, zoom){
    const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
    for(let i = 0; i < studioCanvasHolder.children.length; i++){
        const canvas = studioCanvasHolder.children[i];
        canvas.height = window.innerHeight * 0.8 * zoom / 10;
        canvas.width = window.innerHeight * 0.8 * zoom / 10;
        canvas.id = imageData[i].id
    }
    drawCanvases(imageData);
}
function drawCanvases(imageData){
    const studioCanvasHolder = document.querySelector(".studio-canvas-holder");
    for(let i = 0; i < studioCanvasHolder.children.length; i++){
        const canvas = studioCanvasHolder.children[i];
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let imgT = 0, imgL = 0, imgW = canvas.width, imgH = canvas.height;
        if(imageData[i].image.width > imageData[i].image.height){
            let aspectRatio = imageData[i].image.width / imageData[i].image.height;
            imgH = canvas.height / aspectRatio;
            imgT = (canvas.height - imgH) / 2;
        }
        ctx.drawImage(imageData[i].image, imgL, imgT, imgW, imgH);
    }
}