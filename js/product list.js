window.addEventListener("load", loadProductListLogic);
function loadProductListLogic(){
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
        pathHolder.style.display = "none";
        generateSearchResultBody(productHolder, data);
        console.log("search result body:", data);
    });
    client.on("category-received", (data)=>{
        if(!data.Found) productPageTitle.innerText = "Proizvodi nisu nađeni";
        else{
            productPageTitle.innerHTML = data.CategoryName;
            let dataArray = data.SubCategories.concat(data.Products);
            generateSearchResultBody(productHolder, dataArray);
            pathHolder.innerHTML = "<a class='path-link' target='_self' href='../'>Početna ></a> ";
            pathHolder.innerHTML += data.CategoryName;
            console.log("category data:", data);
        }
    });
    client.on("sub-category-received", (data)=>{
        if(!data.Found) productPageTitle.innerText = "Proizvodi nisu nađeni";
        else{
            productPageTitle.innerHTML = data.SubCategoryName;
            generateSearchResultBody(productHolder, data.Products);
            pathHolder.innerHTML = "<a class='path-link' target='_self' href='../'>Početna ></a> ";
            pathHolder.innerHTML += "<a class='path-link' target='_self' href='../pages/product-list.html?cat="+data.Category+"'>"+data.CategoryName+" ></a> ";
            pathHolder.innerHTML += data.SubCategoryName;
            console.log("sub category data:", data);
        }
    });
}
function generateSearchResultBody(holder, list){
    let categoryList = [];
    let productList = [];
    for(let i = 0; i < list.length; i++){
        if(list[i].type === 1) productList.push(list[i]);
        else if(list[i].SubCategoryName !== "") categoryList.push(list[i]);
    }

    for(let i = 0; i < categoryList.length; i++){
        const category = document.createElement("a");
        category.innerText = categoryList[i].SubCategoryName;
        category.className = "search-category";
        holder.appendChild(category);
        category.target = "_self";
        category.href = "../pages/product-list.html?subcat="+categoryList[i].SubCategory;
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
    
            productID.innerText = productList[i].ID;
            productName.innerText = productList[i].versions[0].Model;
            productImg.style.backgroundImage = "url('"+productList[i].Img+"')";
            productPrice.innerText = productList[i].versions[0].Price+"€";
            if(productList[i].versions[0].Price === 0) productPrice.innerText = "Cena na upit";
    
            let listLoop = productList[i].versions.length;
            if(productList[i].versions.length > 5) listLoop = 4;
            for(let j = 0; j < listLoop; j++){
                const color = document.createElement("div");
                color.className = "product-color";
                productColorH.appendChild(color);

                if(productList[i].versions[j].ColorImage !== "") color.style.backgroundImage = "url('"+productList[i].versions[j].ColorImage+"')";
                else if(productList[i].versions[j].HTMLColor !== "") color.style.backgroundColor = productList[i].versions[j].HTMLColor;
                else{
                    color.style.backgroundColor = "rgb(255, 255, 255)";
                    color.innerText = "N/A";
                }

                //color.style.backgroundColor = productList[i].versions[j].HTMLColor;
                //if(productList[i].versions[j].HTMLColor === "") color.innerText = "N/A";
            }
            if(productList[i].versions.length > 5){
                const colorNum = document.createElement("div");
                colorNum.className = "product-color";
                productColorH.appendChild(colorNum);
                colorNum.innerText = "+"+(productList[i].versions.length-4);
            }
           
            product.appendChild(productImg);
            product.appendChild(productName);
            product.appendChild(productColorH);
            product.appendChild(productID);
            product.appendChild(productPrice);
            holder.appendChild(product);

            product.target = "_self";
            product.href = "../pages/product.html?id="+productList[i].versions[0].ID;
        }
    }
    if(productList.length === 0) holder.innerHTML = "<div style='margin-left:1vh'>Nema rezultata</div>";
}