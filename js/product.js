window.addEventListener("load", loadProductLogic);
function loadProductLogic(){
    const client = io();

    const params = new URLSearchParams(location.search);
    let productID = params.getAll("id")[0];
    if(productID) client.emit("product-id", productID);

    client.on("product-received", (data, versionsData, allProducts)=>{
        console.log("product:", data, versionsData, allProducts)

        const colorHolder = document.querySelector(".product-display-color-holder");
        document.querySelector(".product-display-name").innerHTML  = data.Name;
        document.querySelector(".product-display-code").innerHTML  = "Širfa: "+data.Id;
        document.querySelector(".product-display-price").innerHTML = data.Price+"€";
        document.querySelector(".product-display-image").src = data.Model.Image;
        
        document.getElementById("desc").innerHTML = data.Model.Description;
        document.getElementById("dimensions").innerHTML = "Dimenzija: "+data.WMSWidth+data.WMSDimUM+" x "+data.WMSHeight+data.WMSDimUM+" x "+data.WMSDepth+data.WMSDimUM;
        document.getElementById("weight").innerHTML = "Težina: "+data.Weight+"kg";
        document.getElementById("package").innerHTML = "Pakovanje: "+data.Package;


        for(let i = 0; i < versionsData.length; i++){
            if(versionsData[i].Shade.HtmlColor !== data.Shade.HtmlColor){
                const color = document.createElement("a");
                color.className = "product-display-color";
                color.style.backgroundColor = versionsData[i].Shade.HtmlColor;
                color.target = "_self";
                color.href = "../pages/product.html?side=0&id="+versionsData[i].Id;
                colorHolder.appendChild(color);
            }
        }

        //data.SubCategory.Id+
        let subCategoryName;
        let categoryName = "Šolje / Flašice";
        let categoryCode = data.Category.Id;
        let subCategoryCode = data.SubCategory.Id;


        for(let i = 0; i < allProducts.length; i++){
            if(allProducts[i].SubCategory === data.SubCategory.Id){
                subCategoryName = allProducts[i].name
            }
        }

        

        const pathHolder = document.querySelector(".path-holder");
        pathHolder.innerHTML = "<a class='path-link' target='_self' href='../'>Početna ></a> ";
        pathHolder.innerHTML += "<a class='path-link' target='_self' href='../pages/product-list.html?side=0&cat="+categoryCode+"'>"+categoryName+" ></a> ";
        pathHolder.innerHTML += "<a class='path-link' target='_self' href='../pages/product-list.html?side=0&subcat="+subCategoryCode+"'>"+subCategoryName+" ></a> ";
        pathHolder.innerHTML += data.Id;
    })
}