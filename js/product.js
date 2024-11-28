window.addEventListener("load", loadProductLogic);
function loadProductLogic(){
    const client = io();

    const params = new URLSearchParams(location.search);
    let productID = params.getAll("id")[0];
    if(productID) client.emit("product-id", productID);

    client.on("product-received", (data)=>{
        let productData = data.productData;
        let SubCategoryName = data.SubCategoryName;
        let CategoryName = data.CategoryName;
        let SubCategory = data.SubCategory;
        let Category = data.Category;
        console.log("product:", data);

        if(productData){
            document.querySelector(".product-display-name").innerHTML  = productData.Name;
            document.querySelector(".product-display-code").innerHTML  = "Širfa: "+productData.Id;
            document.querySelector(".product-display-price").innerHTML = productData.Price+"€";
            
            let dimesion = productData.WMSWidth+productData.WMSDimUM+" x "+productData.WMSHeight+productData.WMSDimUM+" x "+productData.WMSDepth+productData.WMSDimUM;
            document.getElementById("desc").innerHTML = productData.Model.Description;
            document.getElementById("dimensions").innerHTML = "Dimenzija: "+dimesion;
            document.getElementById("weight").innerHTML = "Težina: "+productData.Weight+"kg";
            document.getElementById("package").innerHTML = "Pakovanje: "+productData.Package;


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

            const pathHolder = document.querySelector(".path-holder");
            pathHolder.innerHTML = "<a class='path-link' target='_self' href='../'>Početna ></a> ";
            pathHolder.innerHTML += "<a class='path-link' target='_self' href='../pages/product-list.html?cat="+Category+"'>"+CategoryName+" ></a> ";
            pathHolder.innerHTML += "<a class='path-link' target='_self' href='../pages/product-list.html?subcat="+SubCategory+"'>"+SubCategoryName+" ></a> ";
            pathHolder.innerHTML += productData.Id;
            pathHolder.style.display = "none";
        }
        else{
            const productDisplayHolder = document.querySelector(".product-display-holder");
            while(productDisplayHolder.children.length > 0) productDisplayHolder.removeChild(productDisplayHolder.lastChild);
            productDisplayHolder.innerText = "Proizvod nije pronađen";
        }        
    });
    client.on("color-received", (productData, versionsData)=>{
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
    })
}