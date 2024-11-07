window.onload = ()=>{
    const pageBody = document.querySelector(".page-body");
    pageBody.style.animation = "fade-in ease-in-out 0.1s";
    pageBody.style.display = "block";
    pageBody.onanimationend = ()=>{
        pageBody.style.animation = "none";
        pageBody.onanimationend = null;
    }

    let fullScreen = false;
    const fullScreenButton = document.querySelector("#full-screen");
    fullScreenButton.onclick = ()=>{
        if(!fullScreen){
            fullScreen = true;
            document.documentElement.requestFullscreen();
            fullScreenButton.children[0].classList.remove("full-screen-icon");
            fullScreenButton.children[0].classList.add("exit-full-screen-icon");
        }
        else{
            fullScreen = false;
            document.exitFullscreen();
            fullScreenButton.children[0].classList.add("full-screen-icon");
            fullScreenButton.children[0].classList.remove("exit-full-screen-icon");
        }
    }
    document.documentElement.onfullscreenchange = (e)=>{
        if(!document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement){
            fullScreenButton.children[0].classList.add("full-screen-icon");
            fullScreenButton.children[0].classList.remove("exit-full-screen-icon");
        }
    }

    $(".flipbook").turn();
    document.querySelector("#first-page").onclick = ()=>{$(".flipbook").turn("page", 1)}
    document.querySelector("#last-page").onclick = ()=>{$(".flipbook").turn("page", 14)}
    document.querySelector("#next-page").onclick = ()=>{$(".flipbook").turn("next")}
    document.querySelector("#prev-page").onclick = ()=>{$(".flipbook").turn("previous")}
    document.querySelector("#body-next-page").onclick = ()=>{$(".flipbook").turn("next")}
    document.querySelector("#body-prev-page").onclick = ()=>{$(".flipbook").turn("previous")}
   
    const goToPage = document.querySelector("#go-to-page");
    goToPage.onchange = ()=>{
        let currPage = parseInt(goToPage.value);
        if(currPage !== NaN && currPage >= 1 && currPage <= 14) $(".flipbook").turn("page", currPage);
    }

    $(".flipbook").bind("turning",
        (event, page, obj)=>{
            let displayValue = "";
            if(obj[0] === 0) displayValue = "1";
            else if(obj[1] === 15) displayValue = "14";
            else displayValue = obj[0]+"-"+obj[1]

            goToPage.value = "";
            goToPage.placeholder = displayValue;
        }
    );
}