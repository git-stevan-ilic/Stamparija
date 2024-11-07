window.onload = initLoad;

function initLoad(){
    const style = getComputedStyle(document.body);
    const client = io();

    /*--Side Bar Logic-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    const sideBarItemHolder = document.querySelector(".side-bar-item-holder");
    const contractSideBar = document.getElementById("contract-side-bar");
    const expandSideBar = document.getElementById("expand-side-bar");
    const sideBarItems = document.querySelectorAll(".side-bar-item");
    const sideBar  = document.querySelector(".side-bar");
    const category = document.querySelector(".category");
    sideBar.style.display = "block";

    for(let i = 0; i < sideBarItems.length; i++){
        if(sideBarItems[i].children.length > 1){
            sideBarItems[i].onmousemove = ()=>{
                if(showSideBar){
                    const popUp = sideBarItems[i].children[1];
                    if(popUp.style.display !== "block"){
                        popUp.style.display = "block";
                        popUp.style.animation = "none";
                        popUp.style.animation = "popup-in ease-in-out 0.1s";
                        popUp.onanimationend = ()=>{
                            popUp.style.animation = "none";
                            popUp.onanimationend = null;
                        }
                    }
                }
            }
            sideBarItems[i].onmouseleave = ()=>{
                if(showSideBar){
                    const popUp = sideBarItems[i].children[1];
                    if(popUp.style.display !== "none"){
                        popUp.style.animation = "none";
                        popUp.style.animation = "popup-out ease-in-out 0.1s";
                        popUp.onanimationend = ()=>{
                            popUp.style.animation = "none";
                            popUp.style.display = "none";
                            popUp.onanimationend = null;
                        }
                    }
                }
            }
        }
    }

    let showSideBar = true;
    category.onclick = ()=>{
        if(showSideBar){
            showSideBar = false;
            sideBarAnim("out");
        }
        else{
            showSideBar = true;
            sideBarAnim("in")
        }
    }
    expandSideBar.onclick = ()=>{
        expandSideBar.style.display = "none";
        sideBarItemHolder.style.animation = "extension-down ease-in-out 0.25s";
        sideBarItemHolder.onanimationend = ()=>{
            sideBarItemHolder.style.height = style.getPropertyValue("--side-bar-extension-height");
            sideBarItemHolder.style.animation = "none";
            sideBarItemHolder.onanimationend = null;
        }
    }
    contractSideBar.onclick = ()=>{
        sideBarItemHolder.style.animation = "extension-up ease-in-out 0.25s";
        sideBarItemHolder.onanimationend = ()=>{
            sideBarItemHolder.style.height = style.getPropertyValue("--side-bar-compression-height");
            sideBarItemHolder.style.animation = "none";
            sideBarItemHolder.onanimationend = null;
            expandSideBar.style.display = "flex";
        }
    }
    function sideBarAnim(direction){
        for(let i = 0; i < sideBarItems.length; i++){
            sideBarItems[i].style.animation = "none";
            sideBarItems[i].style.animation = "side-bar-content-"+direction+" ease-in-out 0.35s";
            sideBarItems[i].onanimationend = ()=>{
                sideBarItems[i].style.animation = "none";
                sideBarItems[i].onanimationend = null;
            }
        }
        sideBar.style.animation = "none";
        sideBar.style.animation = "side-bar-slide-"+direction+" ease-in-out 0.35s";
        sideBar.onanimationend = ()=>{
            sideBar.style.animation = "none";
            sideBar.onanimationend = null;
            if(direction === "out"){
                sideBar.style.overflow = "hidden";
                sideBar.style.width = "0px";
            }
            else{
                sideBar.style.width = style.getPropertyValue("--side-bar-width");
                sideBar.style.overflow = "visible";
            }
        }
    }
    
    /*--Search Bar Logic-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    const searchDropDown = document.querySelector(".search-drop-down");
    const searchButton = document.querySelector(".search-button");
    const searchBar = document.getElementById("search-bar");
    searchBar.value = "";

    searchButton.onclick = ()=>{
        if(searchBar.value !== "") searchAnimDown();
    }
    function searchAnimDown(){
        searchDropDown.style.animation = "search-pop-down ease-in-out 0.25s";
        searchDropDown.style.display = "block";
        searchDropDown.onanimationend = ()=>{
            window.addEventListener("click", removeSearchOnClick);
            searchDropDown.style.animation = "none";
            searchDropDown.onanimationend = null;
        }
    }
    function searchAnimUp(){
        window.removeEventListener("click", removeSearchOnClick);
        searchDropDown.style.animation = "search-pop-up ease-in-out 0.25s";
        searchDropDown.onanimationend = ()=>{
            searchDropDown.style.animation = "none";
            searchDropDown.style.display = "none";
            searchDropDown.onanimationend = null;
        }
    }
    function removeSearchOnClick(e){
        if(searchDropDown.style.display === "block"){
            let dropDownCoords = searchDropDown.getBoundingClientRect();
            let x = e.clientX;
            let y = e.clientY;

            if(
                y > dropDownCoords.y + dropDownCoords.height    ||
                x > dropDownCoords.x + dropDownCoords.width     ||
                y < dropDownCoords.y - window.innerHeight*0.03  ||
                x < dropDownCoords.x
            ) searchAnimUp();
        }
    }
    function generateSearchResult(results){
        const searchDropDown = document.querySelector(".search-drop-down");
        while(searchDropDown.children.length > 0) searchDropDown.removeChild(searchDropDown.lastChild);
        if(results.length === 0) searchAnimUp();
        else{
            let listLength = results.length;
            if(results.length > 5) listLength = 5;
            for(let i = 0; i < listLength; i++){
                const resultElement = document.createElement("a");
                if(results[i].type === 0){
                    resultElement.className = "search-item search-item-small";
                    resultElement.innerHTML = results[i].name;
                    resultElement.href = "";
                }
                else{
                    resultElement.className = "search-item search-item-big";
                    const searchItemIcon  = document.createElement("div"); searchItemIcon.className  = "search-item-icon";
                    const searchItemBody  = document.createElement("div"); searchItemBody.className  = "search-item-body";
                    const searchItemTitle = document.createElement("div"); searchItemTitle.className = "search-item-title";
                    const searchItemCode  = document.createElement("div"); searchItemCode.className  = "search-item-code";
                    const searchItemPrice = document.createElement("div"); searchItemPrice.className = "search-item-price";

                    searchItemTitle.innerHTML = results[i].name;
                    searchItemCode.innerHTML  = results[i].code;
                    searchItemPrice.innerHTML = results[i].price;

                    searchItemBody.appendChild(searchItemTitle);
                    searchItemBody.appendChild(searchItemCode);
                    resultElement.appendChild(searchItemIcon);
                    resultElement.appendChild(searchItemBody);
                    resultElement.appendChild(searchItemPrice);
                }
                searchDropDown.appendChild(resultElement);
            }
        }
        if(results.length > 5){
            const buttonHolder = document.createElement("a");
            const moreButton   = document.createElement("button");
            buttonHolder.className = "search-item search-item-more";
            moreButton.className = "more-button";
            moreButton.innerHTML = "Vidi više";

            buttonHolder.appendChild(moreButton);
            searchDropDown.appendChild(buttonHolder);

            moreButton.onclick = ()=>{

            }
        }
    }

    client.on("all-product-data", (data)=>{
        console.log(data)
        function inputSearch(){
            let searchQuery = searchBar.value.toLowerCase();
            let searchResults = [];
            for(let i = 0; i < data.length; i++){
                if(data[i].name.toLowerCase().indexOf(searchQuery) !== -1){
                    searchResults.push({type:0, name:data[i].name});
                }
                for(let j = 0; j < data[i].products.length; j++){
                    let currProduct = data[i].products[j];
                    if(currProduct.Name.toLowerCase().indexOf(searchQuery) !== -1 || currProduct.Model.toLowerCase().indexOf(searchQuery) !== -1){
                        searchResults.push({type:1, name:currProduct.Model, code:currProduct.ProductIdView, price:currProduct.Price});
                    }
                }
            }
            generateSearchResult(searchResults);
            if(searchDropDown.style.display !== "block"){
                if(searchResults.length > 0) searchAnimDown();
            }
            else if(searchBar.value === "") searchAnimUp();
        }
        
        searchBar.oninput = inputSearch;
        document.querySelector(".search-button").onclick = inputSearch;
    });
}