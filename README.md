# UROBBYU.github.io
## SVGator plugins system (+SMIL export plugin)
_Well, i like SVG images. They are future. And also i like animation. It helps to visualise things. So why not to combine them? What? They already did it with JS libraries? Pfft! It's too easy. I'll take my own way..._ 🥷

**Ok. Here's the plan:**
1. Check available solutions in the web.
2. Find out that there is some almost deprecated thing as **SMIL SVG Animation**.
3. Read a bunch(about 20) kilometer size documentations about why i shoud not use it.
4. Use it.

Now seriously.
I found out that there is no one really working SMIL Animation editor. Like literally. Some entusiastic people made a couple of plugins for Adobe Animate, but as i checked, they all weren't updated for like 3 years. And that's sad. SMIL technology is very promising. It's way better than all that js libraries. So i decided to try to make my own editor. But if i was making it from zero, i'd spend at least a year, so i cheated. There is one site, called [SVGator](https://app.svgator.com). It's an online svg animating tool. But obviously it does not export animations in SMIL format. And this is where i come to the stage.

Meet my new creation: **SVGator plugins system**

As you can say from it's fantastically uncommon name, it's a block of js code which allows users as you to install plugins over basic editor. In pair with it comes my own plugin for SMIL SVG Animation export. It's not perfect and may bug from time to time, but it works. And if you will be careful, maybe it will not explode you pc. Maybe...

**Instruction to install:**

Just copy code down below to your browser console and be happy.
``` js
{
  const tmp = document.createElement('script')
  tmp.src = 'https://urobbyu.github.io/js/SVGator%20plugin.js'
  document.head.appendChild(tmp)
}
```
To not to do this every time you refresh the page, you can use free browser extensions like **Tempermonkey** or **Greasemonkey**. They will do it automatically for you.

To make it work just create new script.

Set page filter to:
```
https://app.svgator.com/editor#/*
```
Insert code from above into it.

Profit!

**About SMIL Plugin:**

First of all, as I have already stated in the header, plugin is already included in plugin system. If you installed it correctly, a new tab in "export" window must be added (if they didn't update it again😑). If tab is present, there will be a plugin selector with at list one default item - "SMIL". That's it.

Now you can adjust some options. They are mostly intuitive except "Animation start". It has 3 options:

1. "On click".

2. "On load".

3. "On function call".

If first two are not too hard to understand, third is rather complicated. Visually it does nothing, but any programmer can tell that magic isn't always visual. In my case, it adds some background behavior to exported SVG.

**Deobfuscated content of script that it adds:**

``` js
const animations = document.querySelectorAll('animate,animateTransform')
let time = 0
document.start = document.beginAnimation = () => {
  animations.forEach((anim) => anim.beginElement())
  time = 0
}
document.beginAnimationAt = (start) => {
  animations.forEach((v) => v.beginElementAt(start))
  time = -start
}
document.pause = document.endAnimation = () => {
  time = document.time
  animations.forEach((anim) => anim.endElement())
}
document.endAnimationAt = (end) => {
  time = document.time - end
  animations.forEach((anim) => anim.endElementAt(end))
}
document.resume = () => document.beginAnimationAt(-time)
document.startAt = (start = 0, duration = document.duration) => {
  document.beginAnimationAt(-start)
  document.endAnimationAt(duration + start)
}
Object.defineProperty(document, 'repeatCount', {
  get() {
    return animations[0].getAttribute('repeatCount') * 1
  },
  set(count) {
    animations.forEach((anim) => anim.setAttribute('repeatCount', count))
  }
})
Object.defineProperty(document, 'fillMode', {
  get() {
    return animations[0].getAttribute('fill')
  }, set(mode) {
    animations.forEach((anim) => anim.setAttribute('fill', mode))
  }
})
Object.defineProperty(document, 'duration', {
  get() {
    return animations[0].getAttribute('dur')
  },
  set(duration) {
    animations.forEach((anim) => anim.setAttribute('dur', duration))
  }
})
Object.defineProperty(document, 'time', {
  get() {
    try {
      return animations[0].getCurrentTime() - animations[0].getStartTime()
    }
    catch (err) {
      return time
    }
  },
  set(newTime) {
    document.beginAnimationAt(-newTime)
    document.endAnimation()
  }
})
animations[0].addEventListener('endEvent', () => {
  time = document.duration
})
```

As you can see, it adds a couple of functions that I think must be present in any animated SVG. You can call them like:
``` js
XMLDocument.start()

someButton.addEventListener('click', XMLDocument.pause)
```

In this example I referenced to some XMLDocument. So what is it? Well, it's a DOM document element but for XML, which if you didn't know is the real type of SVG files. So how can you access it? It depends on your method of placing SVG in DOM. I prefer &lt;embed> tag, and for me it's:

``` js
embedElement.getSVGDocument()
```

**Little comparison of methods of starting animation:**
``` js
// Pure JS + SVG
XMLDocument.querySelector('animate,animateTransform').forEach((elem) => elem.beginElement())

// With my script tag
XMLDocument.start()
```

As you can see, my job is to make your life easier😁

Hope somebody will find it somewhat usefull. I spent about month to make it after all)
