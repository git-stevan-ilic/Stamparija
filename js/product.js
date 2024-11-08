window.addEventListener("load", loadProductLogic);
function loadProductLogic(){
    const client = io();

    const pathHolder = document.querySelector(".path-holder");
    const productPageTitle = document.querySelector(".product-page-title");
    const productHolder = document.querySelector(".product-holder");
    while(productHolder.children.length > 0)
        productHolder.removeChild(productHolder.lastChild);

    const params = new URLSearchParams(location.search);
    let searchQuery = params.getAll("search")[0];
    if(searchQuery) client.emit("search", searchQuery);
    else{
        let catQuery = params.getAll("cat")[0];
        if(catQuery) client.emit("category", catQuery);
        else{
            let subcatQuery = params.getAll("subcat")[0];
            if(subcatQuery) client.emit("sub-category", subcatQuery);
            else{
                productPageTitle.innerHTML = 'Pretraga: ""';
                productHolder.innerHTML = "<div style='margin-left:1vh'>Nema rezultata</div>";
            }
        }
    }

    client.on("search-result-receive", (searchQuery, data)=>{
        productPageTitle.innerHTML = 'Pretraga: "'+searchQuery+'"';
        generateSearchResultBody(productHolder, data);
        console.log("search result body:", data)
    });
    client.on("category-received", (data)=>{
        productPageTitle.innerHTML = data.categoryName;
        let dataArray = data.subCategories.concat(data.products);
        generateSearchResultBody(productHolder, dataArray);
        pathHolder.innerHTML = "<a class='path-link' target='_self' href='../'>Početna ></a> ";
        pathHolder.innerHTML += data.categoryName;
        console.log("cat data:", data);
    });
    client.on("sub-category-received", (data)=>{
        productPageTitle.innerHTML = data.subCategoryName;
        generateSearchResultBody(productHolder, data.products);
        pathHolder.innerHTML = "<a class='path-link' target='_self' href='../'>Početna ></a> ";
        pathHolder.innerHTML += "<a class='path-link' target='_self' href='../pages/product-list.html?side=0&cat="+data.category+"'>"+data.categoryName+" ></a> ";
        pathHolder.innerHTML += data.subCategoryName;
        console.log("sub cat data:", data)
    });
}
function generateSearchResultBody(holder, list){
    const colorCodes = [
        {code:"B - BL",  color:"rgb(255, 255, 255)"},
        {code:"B - OR",  color:"rgb(255, 155, 0)"},
        {code:"B - ŽT",  color:"rgb(255, 255, 0)"},
        {code:"B - CV",  color:"rgb(255, 0, 0)"},
        {code:"B - PL",  color:"rgb(0, 0, 255)"},
        {code:"B - SI",  color:"rgb(80, 80, 80)"},
        {code:"B - CRN", color:"rgb(0, 0, 0)"}
    ];
    
    let categoryList = [];
    let productList = [];
    for(let i = 0; i < list.length; i++){
        if(list[i].type === 0) categoryList.push(list[i]);
        else productList.push(list[i]);
    }

    for(let i = 0; i < categoryList.length; i++){
        const category = document.createElement("a");
        category.innerHTML = categoryList[i].name;
        category.className = "search-category";
        holder.appendChild(category);
        category.target = "_self";
        category.href = "../pages/product-list.html?side=0&subcat="+categoryList[i].SubCategory;
    }

    if(categoryList.length > 0 && productList.length > 0){
        const productLine = document.createElement("div");
        productLine.className = "product-line";
        holder.appendChild(productLine);
    }

    for(let i = 0; i < productList.length; i++){
        if(productList[i].versions.length > 0){
            const product       = document.createElement("a");   product.className       = "product";
            const productImg    = document.createElement("div"); productImg.className    = "product-img";
            const productName   = document.createElement("div"); productName.className   = "product-name";
            const productColorH = document.createElement("div"); productColorH.className = "product-color-holder";
            const productID     = document.createElement("div"); productID.className     = "product-id";
            const productPrice  = document.createElement("div"); productPrice.className  = "product-price";
    
            productID.innerHTML = productList[i].id;
            productName.innerHTML = productList[i].versions[0].Model;
            productPrice.innerHTML = productList[i].versions[0].Price+"€";
    
            let listLoop = productList[i].versions.length;
            if(productList[i].versions.length > 5) listLoop = 4;
            for(let j = 0; j < listLoop; j++){
                const color = document.createElement("div");
                color.className = "product-color";
                productColorH.appendChild(color);

                let colorFound = false;
                for(let k = 0; k < colorCodes.length; k++){
                    if(colorCodes[k].code === productList[i].versions[j].Color){
                        color.style.backgroundColor = colorCodes[k].color;
                        colorFound = true;
                        break;
                    }
                }
                if(!colorFound) console.log("Missing color", productList[i].versions[j].Color, productList[i].versions[j].Name);
            }
            if(productList[i].versions.length > 5){
                const colorNum = document.createElement("div");
                colorNum.className = "product-color";
                productColorH.appendChild(colorNum);
                colorNum.innerHTML = "+"+(productList[i].versions.length-4);
            }
           
            product.appendChild(productImg);
            product.appendChild(productName);
            product.appendChild(productColorH);
            product.appendChild(productID);
            product.appendChild(productPrice);
            holder.appendChild(product);

            product.target = "_self";
            product.href = "../pages/product.html?side=0&id="+productList[i].id;
        }
    }
}