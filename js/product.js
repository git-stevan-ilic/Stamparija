window.addEventListener("load", loadProductLogic);
function loadProductLogic(){
    const client = io();

    const params = new URLSearchParams(location.search);
    let productID = params.getAll("id")[0];
    if(productID) client.emit("product-id", productID);

    client.on("product-received", (data)=>{
        const productDisplayHolder = document.querySelector(".product-display-holder");
        if(!data.Found) productDisplayHolder.innerText = "Proizvod nije nađen";
        else{
            console.log("product:", data);;
            let currVersion;
            for(let i = 0; i < data.productData.versions.length; i++){
                if(data.productData.versions[i].ID === data.ID){
                    currVersion = data.productData.versions[i];
                    break;
                }
            }
            console.log("current version:", currVersion);

            let dimesion = "";
            if(currVersion.WMSWidth && currVersion.WMSDimUM && currVersion.WMSHeight && currVersion.WMSDimUM && currVersion.WMSDepth && currVersion.WMSDimUM){
                dimesion = currVersion.WMSWidth + currVersion.WMSDimUM +" x "+ currVersion.WMSHeight + currVersion.WMSDimUM +" x "+ currVersion.WMSDepth + currVersion.WMSDimUM;
            }
            
            document.querySelector(".product-display-name").innerText  = currVersion.Name;
            document.querySelector(".product-display-code").innerText  = "Širfa: "+data.ID;
            document.querySelector(".product-display-price").innerText = currVersion.Price+"€";
            document.getElementById("desc").innerText = currVersion.Description;
            if(dimesion !== "") document.getElementById("dimensions").innerText = "Dimenzija: "+dimesion;
            if(currVersion.Weight && currVersion.WeightUM) document.getElementById("weight").innerText = "Težina: "+currVersion.Weight + currVersion.WeightUM;
            document.getElementById("package").innerText = "Pakovanje: "+currVersion.Package;

            if(currVersion.Sizes.length > 0){
                let sizeText = "Veličine:";
                for(let i = 0; i < currVersion.Sizes.length; i++){
                    let comma = ",";
                    if(i === currVersion.Sizes.length - 1) comma = "";
                    sizeText += " "+currVersion.Sizes[i] + comma;
                }
                document.getElementById("sizes").innerText = sizeText;
            }

            const pathHolder = document.querySelector(".path-holder");
            pathHolder.innerHTML = "<a class='path-link' target='_self' href='../'>Početna ></a> ";
            pathHolder.innerHTML += "<a class='path-link' target='_self' href='../pages/product-list.html?cat="+data.Category+"'>"+data.CategoryName+" ></a> ";
            pathHolder.innerHTML += "<a class='path-link' target='_self' href='../pages/product-list.html?subcat="+data.SubCategory+"'>"+data.SubCategoryName+" ></a> ";
            pathHolder.innerHTML += data.ID;
            pathHolder.style.display = "none";

            const colorHolder = document.querySelector(".product-display-color-holder"); 
            for(let i = 0; i < data.productData.versions.length; i++){
                if(data.productData.versions[i].HTMLColor !== currVersion.HTMLColor){
                    const color = document.createElement("a");
                    color.className = "product-display-color";
                    color.style.backgroundColor = data.productData.versions[i].HTMLColor;
                    if(data.productData.versions[i].HTMLColor === "") color.innerText = "N/A";
                    color.target = "_self";
                    color.href = "../pages/product.html?id="+data.productData.versions[i].ID;
                    colorHolder.appendChild(color);
                }
            }

            const allImagesHolder = document.querySelector(".product-display-all-images");
            const imageHolder = document.querySelector(".product-display-images");
            if(currVersion.Images.length > 5){
                let rowSize = (currVersion.Images.length % 5) + 5;
                for(let i = currVersion.Images.length-1; i > 0; i--){
                    let remainder = rowSize % i;
                    if(remainder === 0){
                        rowSize = i;
                        break;
                    }
                }
                if(rowSize === 1) rowSize = 5;
                allImagesHolder.style.width = Math.round(rowSize/5*100)+"%";
            }

            for(let i = 0; i < currVersion.Images.length; i++){
                const img = document.createElement("img");
                img.className = "product-display-image";
                img.src = currVersion.Images[i].Image;
                imageHolder.appendChild(img);

                const smallImg = document.createElement("img");
                smallImg.className = "product-display-small-image";
                smallImg.src = currVersion.Images[i].Image;
                allImagesHolder.appendChild(smallImg);

                if(i === 0){
                    img.style.display = "block";
                    smallImg.classList.add("product-display-small-image-selected");
                }

                smallImg.onclick = ()=>{
                    for(let j = 0; j < imageHolder.children.length; j++)
                        imageHolder.children[j].style.display = "none";
                    img.style.display = "block";

                    for(let j = 0; j < allImagesHolder.children.length; j++)
                        allImagesHolder.children[j].classList.remove("product-display-small-image-selected");
                    smallImg.classList.add("product-display-small-image-selected");
                }
            }
        }

        const logoButton = document.querySelector("#your-logo");
        logoButton.onclick = ()=>{window.open("../pages/studio.html?id="+data.ID)}
    });
}