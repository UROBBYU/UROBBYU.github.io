function move() {
document.getElementsByClassName("icon goal")[0].classList = "icon goal" + ((document.getElementsByClassName("icon goal")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon links")[0].classList = "icon links" + ((document.getElementsByClassName("icon links")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon download")[0].classList = "icon download" + ((document.getElementsByClassName("icon download")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon wip")[0].classList = "icon wip" + ((document.getElementsByClassName("icon wip")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon idea")[0].classList = "icon idea" + ((document.getElementsByClassName("icon idea")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon profile")[0].classList = "icon profile" + ((document.getElementsByClassName("icon profile")[0].classList.length == 3) ? "" : " move");
}

function move2() {
var mv = ((document.getElementsByClassName("center-button links")[0].style.transform == "rotate(0deg)") ? 1 : 0);
document.getElementsByClassName("center-button links")[0].style.transform = "rotate(" + 60*mv + "deg)";
document.getElementsByClassName("icon links")[0].style.transform = "rotate(-" + 60*mv + "deg)";
document.getElementsByClassName("center-button download")[0].style.transform = "rotate(" + 120*mv + "deg)";
document.getElementsByClassName("icon download")[0].style.transform = "rotate(-" + 120*mv + "deg)";
document.getElementsByClassName("center-button wip")[0].style.transform = "rotate(" + 180*mv + "deg)";
document.getElementsByClassName("icon wip")[0].style.transform = "rotate(-" + 180*mv + "deg)";
document.getElementsByClassName("center-button idea")[0].style.transform = "rotate(" + 240*mv + "deg)";
document.getElementsByClassName("icon idea")[0].style.transform = "rotate(-" + 240*mv + "deg)";
document.getElementsByClassName("center-button profile")[0].style.transform = "rotate(" + 300*mv + "deg)";
document.getElementsByClassName("icon profile")[0].style.transform = "rotate(-" + 300*mv + "deg)";
}
