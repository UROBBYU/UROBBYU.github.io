function move() {
document.getElementsByClassName("icon goal")[0].classList = "icon goal" + ((document.getElementsByClassName("icon goal")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon links")[0].classList = "icon links" + ((document.getElementsByClassName("icon links")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon download")[0].classList = "icon download" + ((document.getElementsByClassName("icon download")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon wip")[0].classList = "icon wip" + ((document.getElementsByClassName("icon wip")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon idea")[0].classList = "icon idea" + ((document.getElementsByClassName("icon idea")[0].classList.length == 3) ? "" : " move");
document.getElementsByClassName("icon profile")[0].classList = "icon profile" + ((document.getElementsByClassName("icon profile")[0].classList.length == 3) ? "" : " move");
}
