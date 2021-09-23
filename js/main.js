if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js')

/*HTMLEmbedElement.prototype.play = function() {
  this.getSVGDocument?.()?.querySelectorAll('animate, animateTransform').forEach(elem => elem.beginElement())
}

let emb = document.getElementById('anim-sandglass')
emb.onload = () => emb.getSVGDocument().getElementsByTagName('animate')[0].addEventListener('endEvent', () => emb.play())

let emb2 = document.getElementById('anim-circle-to-hex')
emb2.onload = () => {
  let anim = emb2.getSVGDocument().getElementsByTagName('animate')[0]
  let rev = anim.cloneNode()
  rev.attributes.values.textContent = rev.attributes.values.textContent.split(';').reverse().join(';')
  rev.attributes.keySplines.textContent = "0.42,0,1,1"
  anim.parentNode.appendChild(rev)
  emb2.play = () => {
    try {
      let offset = rev.getSimpleDuration() - rev.getCurrentTime() + rev.getStartTime()
      anim.beginElementAt(-offset)
    } catch (err) {
      anim.beginElement()
    }
  }
  emb2.playReverse = () => {
    try {
      let offset = anim.getSimpleDuration() - anim.getCurrentTime() + anim.getStartTime()
      rev.beginElementAt(-offset)
    } catch (err) {
      rev.beginElement()
    }
  }
}*/