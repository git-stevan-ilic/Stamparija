window.addEventListener("load", loadProductLogic);
function loadProductLogic(){
    const client = io();

    const params = new URLSearchParams(location.search);
    let productID = params.getAll("id")[0];
    if(productID) client.emit("product-id", productID);

    client.on("product-received", (productData, versionsData)=>{
        console.log("product:", productData, versionsData)

        const colorHolder = document.querySelector(".product-display-color-holder");
        document.querySelector(".product-display-name").innerHTML  = productData.Name;
        document.querySelector(".product-display-code").innerHTML  = "Širfa: "+productData.Id;
        document.querySelector(".product-display-price").innerHTML = productData.Price+"€";
        document.querySelector(".product-display-image").src = productData.Images[0].Image;
        
        let dimesion = productData.WMSWidth+productData.WMSDimUM+" x "+productData.WMSHeight+productData.WMSDimUM+" x "+productData.WMSDepth+productData.WMSDimUM;
        document.getElementById("desc").innerHTML = productData.Model.Description;
        document.getElementById("dimensions").innerHTML = "Dimenzija: "+dimesion;
        document.getElementById("weight").innerHTML = "Težina: "+productData.Weight+"kg";
        document.getElementById("package").innerHTML = "Pakovanje: "+productData.Package;


        /*for(let i = 0; i < versionsData.length; i++){
            if(versionsData[i].Shade.HtmlColor !== productData.Shade.HtmlColor){
                const color = document.createElement("a");
                color.className = "product-display-color";
                color.style.backgroundColor = versionsData[i].Shade.HtmlColor;
                color.target = "_self";
                color.href = "../pages/product.html?id="+versionsData[i].Id;
                colorHolder.appendChild(color);
            }
        }*/

        /*let subCategoryName;
        let categoryName = "Šolje / Flašice";
        let categoryCode = productData.Category.Id;
        let subCategoryCode = productData.SubCategory.Id;*/


        /*for(let i = 0; i < allProducts.length; i++){
            if(allProducts[i].SubCategory === productData.SubCategory.Id){
                subCategoryName = allProducts[i].name
            }
        }*/

        /*const pathHolder = document.querySelector(".path-holder");
        pathHolder.innerHTML = "<a class='path-link' target='_self' href='../'>Početna ></a> ";
        pathHolder.innerHTML += "<a class='path-link' target='_self' href='../pages/product-list.html?cat="+categoryCode+"'>"+categoryName+" ></a> ";
        pathHolder.innerHTML += "<a class='path-link' target='_self' href='../pages/product-list.html?subcat="+subCategoryCode+"'>"+subCategoryName+" ></a> ";
        pathHolder.innerHTML += productData.Id;
        pathHolder.style.display = "none";*/
    })
}