window.addEventListener("load", loadContentLogic);
function loadContentLogic(){
    const homePageVideo = document.getElementById("home-page-video")
    const videoFocus = document.querySelector(".video-focus");
    const videoMask = document.querySelector(".video-mask");

    const videoSettingsBlur = "&autoplay=1&mute=1&controls=0&disablekb=1&loop=1";
    const videoSettingsFocus = "&autoplay=1&loop=1";
    const videoURL = "MeFPh2oLjxs";

    let focus = false;
    videoFocus.onclick = ()=>{
        if(!focus){
            focus = true;
            homePageVideo.style.animation = "video-focus-in ease-in-out 0.2s";
            homePageVideo.onanimationend = ()=>{
                homePageVideo.classList.remove("home-page-video-blur");
                homePageVideo.style.animation = "none";
                homePageVideo.onanimationend = null;
             
                videoFocus.innerHTML = "Sakrij Video";
                videoMask.style.height = "7vh";
                videoMask.style.width = "calc(8em + 2vh)";
                homePageVideo.src = "https://www.youtube.com/embed/"+videoURL+"?playlist="+videoURL+videoSettingsFocus;
            }
        }
        else{
            focus = false;
            homePageVideo.style.animation = "video-focus-out ease-in-out 0.2s";
            homePageVideo.onanimationend = ()=>{
                homePageVideo.classList.add("home-page-video-blur");
                homePageVideo.style.animation = "none";
                homePageVideo.onanimationend = null;

                videoFocus.innerHTML = "Pusti Video";
                videoMask.style.height = "100%";
                videoMask.style.width = "100%";
                homePageVideo.src = "https://www.youtube.com/embed/"+videoURL+"?playlist="+videoURL+videoSettingsBlur;
            }
        }
    }
}