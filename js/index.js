window.onload = initLoad;
function initLoad(){
    const params = new URLSearchParams(location.search);
    const style = getComputedStyle(document.body);
    const client = io();

    let browser, android, ios, prefix = (Array.prototype.slice
    .call(window.getComputedStyle(document.documentElement, ""))
    .join("") 
    .match(/-(moz|webkit|ms)-/))[1];
        
    let userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if(/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) ios = true;
    if(/android/i.test(userAgent)) android = true;
    if(prefix === "webkit") browser = 0;
    else browser = 1;
   
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
            if(android === true || ios === true){
                sideBarItems[i].children[0].onclick = (e)=>{
                    e.preventDefault();
                    if(showSideBar){
                        for(let j = 0; j < sideBarItems.length; j++){
                            if(sideBarItems[j].children.length > 1){
                                const currPopUp = sideBarItems[j].children[1];
                                if(currPopUp.style.display !== "none"){
                                    currPopUp.style.animation = "none";
                                    currPopUp.style.animation = "popup-out ease-in-out 0.1s";
                                    currPopUp.onanimationend = ()=>{
                                        currPopUp.style.animation = "none";
                                        currPopUp.style.display = "none";
                                        currPopUp.onanimationend = null;
                                    }
                                }
                            }
                        }

                        const popUp = sideBarItems[i].children[1];
                        currSelected = popUp;
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
            }
            else{
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
    }

    let showSide = params.getAll("side")[0];
    if(showSide) showSide = parseInt(showSide);
    let showSideBar = true;
    if(android === true || ios === true) showSide = 0;
    if(showSide !== undefined){
        if(showSide === 0){
            try{document.querySelector(".path-holder").style.display = "block"}
            catch{}
            const category = document.querySelector("#category");
            category.className = "category-white";
            sideBar.style.overflow = "hidden";
            sideBar.style.display = "none";
            showSideBar = false;
        }
    }

    category.onclick = ()=>{
        const pageNavBar = document.querySelector(".page-nav-bar");
        const categoryMask = document.createElement("div");
        categoryMask.className = "category-mask";
        pageNavBar.appendChild(categoryMask);

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
        const pathHolder = document.querySelector(".path-holder");
        const category = document.querySelector("#category");
        if(direction === "out"){
            category.classList.remove("category");
            category.classList.add("category-white");

            category.style.animation = "category-turn-white ease-in-out 0.35s";
            category.onanimationend = ()=>{
                category.style.animation = "none";
                category.onanimationend = null;
                const categoryMask = document.querySelector(".category-mask");
                if(categoryMask) categoryMask.remove();
            }
        }
        else{
            category.classList.remove("category-white");
            category.classList.add("category");

            category.style.animation = "category-turn-orange ease-in-out 0.35s";
            category.onanimationend = ()=>{
                category.style.animation = "none";
                category.onanimationend = null;
                const categoryMask = document.querySelector(".category-mask");
                if(categoryMask) categoryMask.remove();
            }
        }
        
        sideBar.style.display = "block";
        sideBar.style.animation = "none";
        sideBar.style.animation = "side-bar-slide-"+direction+" ease-in-out 0.35s forwards";
        if(pathHolder && direction === "in") pathHolder.style.display = "none";
        sideBar.onanimationend = ()=>{
            sideBar.style.animation = "none";
            sideBar.onanimationend = null;
            if(direction === "out"){
                sideBar.style.overflow = "hidden";
                sideBar.style.display = "none";
                if(pathHolder) pathHolder.style.display = "block";
            }
            else{
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
    function generateSearchResult(results, searchQuery){
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
                    resultElement.innerText = results[i].name;
                    if(results[i].cat) resultElement.href = "../pages/product-list.html?cat="+results[i].cat;
                    if(results[i].subCat) resultElement.href = "../pages/product-list.html?subcat="+results[i].subCat;
                }
                else{
                    resultElement.className = "search-item search-item-big";
                    const searchItemIcon  = document.createElement("div"); searchItemIcon.className  = "search-item-icon";
                    const searchItemBody  = document.createElement("div"); searchItemBody.className  = "search-item-body";
                    const searchItemTitle = document.createElement("div"); searchItemTitle.className = "search-item-title";
                    const searchItemCode  = document.createElement("div"); searchItemCode.className  = "search-item-code";
                    const searchItemPrice = document.createElement("div"); searchItemPrice.className = "search-item-price";

                    searchItemIcon.style.backgroundImage = "url('"+results[i].img+"')";
                    searchItemTitle.innerText = results[i].name;
                    searchItemCode.innerText  = results[i].code;
                    searchItemPrice.innerText = results[i].price+"€";
                    if(results[i].price === 0) searchItemPrice.innerText = "Cena na upit";

                    searchItemBody.appendChild(searchItemTitle);
                    searchItemBody.appendChild(searchItemCode);
                    resultElement.appendChild(searchItemIcon);
                    resultElement.appendChild(searchItemBody);
                    resultElement.appendChild(searchItemPrice);

                    resultElement.target = "_self";
                    let dot1 = results[i].code.indexOf(".");
                    let dot2 = results[i].code.lastIndexOf(".");
                    let id = results[i].code.slice(0, dot1) + results[i].code.slice(dot1+1, dot2) + results[i].code.slice(dot2+1);
                    resultElement.href = "../pages/product.html?id="+id;
                }
                searchDropDown.appendChild(resultElement);   
            }
        }
        if(results.length > 5){
            const buttonHolder = document.createElement("div");
            const moreButton   = document.createElement("a");
            buttonHolder.className = "search-item search-item-more";
            moreButton.className = "more-button";
            moreButton.innerText = "Vidi više";

            buttonHolder.appendChild(moreButton);
            searchDropDown.appendChild(buttonHolder);

            moreButton.target = "_self";
            moreButton.href = "/pages/product-list.html?search="+searchQuery;
        }
    }

    client.on("all-product-data", (data)=>{
        //console.log("all product data:", data);
        function inputSearch(){
            let searchQuery = removeDiacritics(searchBar.value.toLowerCase());
            if(searchQuery.length <= 1) searchAnimUp();
            else{
                let searchResults = [];
                for(let i = 0; i < data.length; i++){
                    if(removeDiacritics(data[i].CategoryName.toLowerCase()).indexOf(searchQuery) !== -1){
                        searchResults.push({type:0, name:data[i].CategoryName, cat:data[i].Category});
                    }
                    if(removeDiacritics(data[i].SubCategoryName.toLowerCase()).indexOf(searchQuery) !== -1){
                        searchResults.push({type:0, name:data[i].SubCategoryName, subCat:data[i].SubCategory});
                    }
                    for(let j = 0; j < data[i].Products.length; j++){
                        for(let k = 0; k < data[i].Products[j].versions.length; k++){
                            let currProduct = data[i].Products[j].versions[k];
                            let nameIndex = removeDiacritics(currProduct.Name.toLowerCase()).indexOf(searchQuery);
                            let modelIndex = removeDiacritics(currProduct.Model.toLowerCase()).indexOf(searchQuery);
                            if(
                                (nameIndex !== -1 && (nameIndex === 0 || currProduct.Name[nameIndex-1] === " ")) || 
                                (modelIndex !== -1 && (modelIndex === 0 || currProduct.Model[modelIndex-1] === " "))
                            )
                            searchResults.push({
                                code:currProduct.ProductIdView,
                                price:currProduct.Price,
                                name:currProduct.Model,
                                img:currProduct.Img,
                                type:1,
                            });
                        }
                    }
                }
                searchResults = searchResults.filter((o, index, arr) =>
                    arr.findIndex(item => JSON.stringify(item) === JSON.stringify(o)) === index
                );
                //console.log("search result head:", searchResults);
                generateSearchResult(searchResults, searchQuery);
                if(searchDropDown.style.display !== "block"){
                    if(searchResults.length > 0) searchAnimDown();
                }
                if(searchBar.value === "") searchAnimUp();
            }
        }
        
        searchBar.oninput = inputSearch;
        document.querySelector(".search-button").onclick = inputSearch;
    });

    sendUsLogic(client);
    setTimeout(()=>{
        const loadingScreen = document.querySelector(".loading-screen");
        loadingScreen.style.animation = "fade-out ease-in-out 0.2s";
        loadingScreen.onanimationend = ()=>{
            loadingScreen.style.animation = "none";
            loadingScreen.style.display = "none";
            loadingScreen.onanimationend = null;
        }
    }, 350);
}
function removeDiacritics(str){
    let defaultDiacriticsRemovalMap = [
        {'base':'c', 'letters':/[\u0107\u010D]/g},
        {'base':'s','letters':/[\u0161]/g}
    ];
    for(let i = 0; i < defaultDiacriticsRemovalMap.length; i++){
        str = str.replace(defaultDiacriticsRemovalMap[i].letters, defaultDiacriticsRemovalMap[i].base);
    }
    return str;
}
function isEmailValid(email){
    const emailRegex = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
    if(!email) return false;
    if(email.length > 254) return false;

    let valid = emailRegex.test(email);
    if(!valid) return false;

    let parts = email.split("@");
    if(parts[0].length > 64) return false;

    let domainParts = parts[1].split(".");
    if(domainParts.some((part)=>{return part.length > 63})) return false;

    return true;
}
function sendUsLogic(client){
    try{
        const sendMask = document.querySelector(".send-mask");
        const sendUsName  = document.getElementById("send-us-name");  sendUsName.value = "";
        const sendUsEmail = document.getElementById("send-us-email"); sendUsEmail.value = "";
        const sendUsTitle = document.getElementById("send-us-title"); sendUsTitle.value = "";
        const sendUsText  = document.getElementById("send-us-text");  sendUsText.value = "";
        const confirmSend  = document.getElementById("confirm-send-captcha");
        const cancelSend  = document.getElementById("cancel-send-captcha");
        const sendUsBttn  = document.getElementById("send-us-message");
    
        sendUsBttn.onclick = ()=>{
            if(sendUsName.value === "" || sendUsEmail.value === "" || sendUsTitle.value === "" || sendUsText.value === ""){
                alert("Popunite sva polja");
                return;
            }
            if(!isEmailValid(sendUsEmail.value)){
                alert("neispravan email");
                return;
            }
            client.emit("get-captcha", 0);
        }
        cancelSend.onclick = ()=>{
            sendMask.style.animation = "fade-out ease-in-out 0.2s";
            sendMask.onanimationend = ()=>{
                sendMask.style.animation = "none";
                sendMask.style.display = "none";
                sendMask.onanimationend = null;
            }
        }
        client.on("receive-captcha", (captchaData, type)=>{
            if(type === 0){
                document.querySelector("#confirm-captcha-input").value = "";
                confirmSend.disabled = false;
                sendMask.style.animation = "fade-in ease-in-out 0.2s";
                sendMask.style.display = "block";
                sendMask.onanimationend = ()=>{
                    sendMask.style.animation = "none";
                    sendMask.onanimationend = null;
                }
                document.querySelector(".send-captcha").innerHTML = captchaData.data;

                confirmSend.onclick = ()=>{
                    if(captchaData.text !== document.querySelector("#confirm-captcha-input").value){
                        alert("Unesite simbole sa slike");
                        return;
                    }
                    let sendUsData = {
                        name:sendUsName.value,
                        email:sendUsEmail.value,
                        title:sendUsTitle.value,
                        text:sendUsText.value,
                    }
                    client.emit("send-us-email", sendUsData);
                    confirmSend.disabled = true;
                }
            }
        });
        client.on("send-mail-success", ()=>{
            alert("Poruka uspešno poslata");
            sendUsName.value = "";
            sendUsEmail.value = "";
            sendUsTitle.value = "";
            sendUsText.value = "";
            cancelSend.click();
        });
    }
    catch{}
}