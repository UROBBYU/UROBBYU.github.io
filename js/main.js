function move() {
document.getElementsByClassName("icon goal")[0].classList = "icon goal" + ((document.getElementsByClassName("icon goal")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon links")[0].classList = "icon links" + ((document.getElementsByClassName("icon links")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon download")[0].classList = "icon download" + ((document.getElementsByClassName("icon download")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon wip")[0].classList = "icon wip" + ((document.getElementsByClassName("icon wip")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon idea")[0].classList = "icon idea" + ((document.getElementsByClassName("icon idea")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon profile")[0].classList = "icon profile" + ((document.getElementsByClassName("icon profile")[0].classList.length == 3) ? "" : " move");
}

function move2(cls) {
var mv = (document.getElementsByClassName("center-button profile")[0].style.transform != "rotate(300deg)" || document.getElementsByClassName("center-button goal")[0].style.transform != "rotate(0deg)");
for (var i = 0; i < 6; i++) {
  document.getElementsByClassName("center-button")[i].style["z-index"] = ((cls / 60 - 6 + i) < 0) ? (cls / 60 + i) : (cls / 60 - 6 + i);
  document.getElementsByClassName("center-button")[5 - i].style.transform = "rotate(" + ((mv) ? (60*i) : ((cls > (60*i)) ? cls - 360 : cls)) + "deg)";
  document.getElementsByClassName("icon")[5 - i].style.transform = "rotate(" + ((mv) ? (60*i) : ((cls > (60*i)) ? cls - 360 : cls))*(-1) + "deg)";
}
}
