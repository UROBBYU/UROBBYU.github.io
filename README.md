# UROBBYU.github.io
## SVGator plugins system (+SMIL export plugin)
_Well, i like SVG images. They are future. And also i like animation. It helps to visualise things. So why not to combine them? What? They already did it with JS libraries? Pfft! It's too easy. I'll take my own way..._ 🐱‍👤

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

Hope somebody will find it somewhat usefull. I spent about month to make it after all)
