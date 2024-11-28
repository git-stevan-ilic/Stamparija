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
            console.log("product:", data);
            if(!data.productData){
                while(productDisplayHolder.children.length > 0) productDisplayHolder.removeChild(productDisplayHolder.lastChild);
                productDisplayHolder.innerText = "Proizvod nije pronađen";
            }
            else{
                /*
                let dimesion = data.productData.WMSWidth +
                               data.productData.WMSDimUM +" x "+
                               data.productData.WMSHeight +
                               data.productData.WMSDimUM +" x "+
                               data.productData.WMSDepth +
                               data.productData.WMSDimUM;
                
                document.querySelector(".product-display-name").innerHTML  = data.productData.Name;
                document.querySelector(".product-display-code").innerHTML  = "Širfa: "+data.productData.Id;
                document.querySelector(".product-display-price").innerHTML = data.productData.Price+"€";
                document.getElementById("desc").innerHTML = data.productData.Model.Description;
                document.getElementById("dimensions").innerHTML = "Dimenzija: "+dimesion;
                document.getElementById("weight").innerHTML = "Težina: "+data.productData.Weight+"kg";
                document.getElementById("package").innerHTML = "Pakovanje: "+data.productData.Package;
                */

                /*
                const pathHolder = document.querySelector(".path-holder");
                pathHolder.innerHTML = "<a class='path-link' target='_self' href='../'>Početna ></a> ";
                pathHolder.innerHTML += "<a class='path-link' target='_self' href='../pages/product-list.html?cat="+Category+"'>"+CategoryName+" ></a> ";
                pathHolder.innerHTML += "<a class='path-link' target='_self' href='../pages/product-list.html?subcat="+SubCategory+"'>"+SubCategoryName+" ></a> ";
                pathHolder.innerHTML += productData.Id;
                pathHolder.style.display = "none";
                */

                /*
                const allImagesHolder = document.querySelector(".product-display-all-images");
                const imageHolder = document.querySelector(".product-display-images");
                for(let i = 0; i < productData.Images.length; i++){
                    const img = document.createElement("img");
                    img.className = "product-display-image";
                    img.src = productData.Images[i].Image;
                    imageHolder.appendChild(img);
    
                    const smallImg = document.createElement("img");
                    smallImg.className = "product-display-small-image";
                    smallImg.src = productData.Images[i].Image;
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
                */
            }
        }
    });
    /*client.on("color-received", (productData, versionsData)=>{
        if(productData && versionsData){
            console.log("color data:", versionsData);
            const colorHolder = document.querySelector(".product-display-color-holder");
            for(let i = 0; i < versionsData.length; i++){
                if(versionsData[i].Color !== productData.Shade.HtmlColor){
                    const color = document.createElement("a");
                    color.className = "product-display-color";
                    color.style.backgroundColor = versionsData[i].Color;
                    if(versionsData[i].Color === "") color.innerText = "N/A";
                    color.target = "_self";
                    color.href = "../pages/product.html?id="+versionsData[i].ID;
                    colorHolder.appendChild(color);
                }
            }
        }
    })*/
}