var b;
var state = 0;
window.addEventListener('load', function() {
	b = document.getElementById("content-text");
});
var f = function() {
	if (state === 0) {
		state = 1;
		b.textContent = "Constructing...";
		b.style.color = "orange";
		var req = new XMLHttpRequest();
		req.onreadystatechange = function() {
			if (req.readyState == req.DONE) {
				if (req.response === "true") {
					b.textContent = "Success";
					b.style.color = "lime";
				} else {
					b.textContent = req.response;
					b.style.color = "red";
				}
			} else if (req.readyState == req.OPENED) {
				b.textContent = "Sending...";
				b.style.color = "yellow";
			}
		}
		req.open("POST", "https://europe-west3-uwakeonwan1.cloudfunctions.net/wakeon", true);
		req.send(JSON.stringify({
			ip: "194.29.60.68",
			port: "8030",
			mac: "9c:5c:8e:78:67:e6"
		}));
	} else {
		b.textContent = "Wake";
		b.style.color = "";
		state = 0;
	}
};