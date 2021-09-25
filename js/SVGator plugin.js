window.plugins = setInterval(() => {
    if (document.querySelector('#document')) {
        clearInterval(window.plugins)

        async function exportSMIL(funcOptions) {
            const objectList = document.getElementById('elements-wrapper')
            const animList = document.getElementsByClassName('timeline-scrollbar')[0].getElementsByClassName('timeline-line keys')
            const maxTime = document.querySelector('.timeline-header .left .popper input').value * 1
            const canvasElem = document.getElementById('overlay-carving')
            const timelineZoom = document.querySelector('.timeline-zoom-control .slider-track')
            const timelineRulerFull = document.querySelector('.timeline-header .right [pointer-events="all"]')
            const timelineRulerAnim = document.querySelector('.timeline-header .right [pointer-events="none"]')
            const easingButton = document.querySelector('.timeline-header button[title="Easing"]')
        
            const animation = {}
            const svgData = {}
            const objBase = {}
        
            function sleep(time) {
                return new Promise(res => setTimeout(res, time))
            }
        
            const rotateVector = (vector, angle) => [
                vector[0]*Math.cos(angle) - vector[1]*Math.sin(angle),
                vector[0]*Math.sin(angle) + vector[1]*Math.cos(angle)
            ]
        
            function multiplyMatrices(...m) {
                let result = m.shift()
                for (const m2 of m) {
                    let m1 = JSON.parse(JSON.stringify(result))
                    for (let i = 0; i < m1.length; i++) {
                        result[i] = []
                        for (let j = 0; j < m2[0].length; j++) {
                            let sum = 0
                            for (let k = 0; k < m1[0].length; k++) {
                                sum += m1[i][k] * m2[k][j]
                            }
                            result[i][j] = sum
                        }
                    }
                }
                return result
            }
        
            function createMatrix(rot, skewX, skewY, scaleX, scaleY, anchorX, anchorY, posX, posY) {
                const m = multiplyMatrices([
                    [Math.cos(rot / 180 * Math.PI), -Math.sin(rot / 180 * Math.PI), posX],
                    [Math.sin(rot / 180 * Math.PI),  Math.cos(rot / 180 * Math.PI), posY],
                    [0, 0, 1]
                ],[//  position & rotate
                    [1, Math.tan(skewX / 180 * Math.PI), 0],
                    [Math.tan(skewY / 180 * Math.PI), 1, 0],
                    [0, 0, 1]
                ],[//  skew
                    [scaleX, 0, 0],
                    [0, scaleY, 0],
                    [0, 0, 1]
                ],[//  scale
                    [1, 0, anchorX],
                    [0, 1, anchorY],
                    [0, 0, 1]
                ])//   anchor
                return `${m[0][0]} ${m[1][0]} ${m[0][1]} ${m[1][1]} ${m[0][2]} ${m[1][2]}`
            }
        
            function bezierCheckSplit(x1, y1, x2, y2) {
                function minMaxBez(x1, y1, x2, y2) {
                    let pts = [{x: 0, y: 0}]
                    for (let i = 1; i < 9999; i++) {
                        const t = i / 9999
                        let ax = x1 * t
                        let bx = x1 + (x2 - x1) * t
                        ax += (bx - ax) * t
                        bx += (x2 + (1 - x2) * t - bx) * t
                        let ay = y1 * t
                        let by = y1 + (y2 - y1) * t
                        ay += (by - ay) * t
                        by += (y2 + (1 - y2) * t - by) * t
                        pts.push({
                            x: ax + (bx - ax) * t,
                            y: ay + (by - ay) * t
                        })
                    }
                    const arr = pts.concat({x: 1, y: 1})
                    const min = arr.reduce((tot, val, t) => (val.y < tot.y ? {...val, t} : tot), {x: 0, y: 0, t: 0})
                    const max = arr.reduce((tot, val, t) => (val.y > tot.y ? {...val, t} : tot), {x: 0, y: 0, t: 0})
                    return {
                        min: (min.t == 0 ? null : min),
                        max: (max.t == 9999 ? null : max)
                    }
                }
                function splitCurveAt(t, x1, y1, x2, y2) {
                    const cX = x2 - x2 * t + t
                    const cY = y2 - y2 * t + t
                    let aX = x1 * t
                    let aY = y1 * t
                    let bX = x1 + (x2 - x1) * t
                    let bY = y1 + (y2 - y1) * t
                    aX += (bX - aX) * t
                    aY += (bY - aY) * t
                    bX += (cX - bX) * t
                    bY += (cY - bY) * t
                    const dX = aX + (bX - aX) * t
                    const dY = aY + (bY - aY) * t
                    return [{
                        x1: x1 * t / dX,
                        y1: y1 * t / dY,
                        x2: Math.min(aX / dX, 1),
                        y2: Math.min(aY / dY, 1)
                    },{
                        x1: Math.max((bX - dX) / (1 - dX), 0),
                        y1: Math.max((bY - dY) / (1 - dY), 0),
                        x2: (cX - dX) / (1 - dX),
                        y2: (cY - dY) / (1 - dY)
                    }]
                }
                const peaks = minMaxBez(x1, y1, x2, y2)
                let curves = [{x1, y1, x2, y2}]
                const options = {}
                if (peaks.min) {
                    options.min = peaks.min
                    const newCurves = splitCurveAt(peaks.min.t / 9999, x1, y1, x2, y2)
                    curves[0] = newCurves[0]
                    curves.push(newCurves[1])
                }
                if (peaks.max) {
                    options.max = peaks.max
                    const lC = curves[curves.length - 1]
                    const {max: {t}}  = minMaxBez(x1, y1, x2, y2)
                    const newCurves = splitCurveAt(t / 9999, lC.x1, lC.y1, lC.x2, lC.y2)
                    curves[curves.length - 1] = newCurves[0]
                    curves.push(newCurves[1])
                }
                return curves.concat(options)
            }
        
            function gradientPick(v1, v2, t) {
                const values1 = `${v1}`.match(/-?\d+\.\d+|-?\d+/g)
                const separs1 = `${v1}`.split(/-?\d+\.\d+|-?\d+/g)
                const values2 = `${v2}`.match(/-?\d+\.\d+|-?\d+/g)
                const separs2 = `${v2}`.split(/-?\d+\.\d+|-?\d+/g)
                if (separs1.join() != separs2.join() || values1.length != values2.length) throw new Error('Strings do not match')
                let ret = separs1.shift()
                for (let i = 0; i < values1.length; i++) {
                    ret += Math.round((values1[i]*1 + (values2[i] - values1[i]) * t) * 1000000) / 1000000
                    ret += separs1[i]
                }
                return ret
            }
        
            for (const a of animList) {
                const id = a.dataset.for
                const type = a.dataset.propertyname
                const keys = a.querySelectorAll('.timeline-key.timeline-key-diamond')
                if (!animation[id]) animation[id] = {}
                let anim = animation[id][type] = { keyTimes: [], values: [], base: null , ease: []}
                document.querySelectorAll('.timeline-header .popper')[2].style.opacity = '0'
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i]
                    const time = key.dataset.keytime / 1000
                    anim.keyTimes.push(time)
                    anim.values.push(null)
                    if (i < keys.length - 1) {
                        key.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}))
                        key.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}))
                        await sleep(50)
                        easingButton.click()
                        await sleep(100)
                        const easeSettings = document.querySelector('.popper .easing-settings')
                        if (controls = easeSettings.querySelector('.easing-bezier-controls')) {
                            const options = controls.getElementsByTagName('input')
                            anim.ease.push(bezierCheckSplit(
                                options[0].valueAsNumber,
                                options[1].valueAsNumber,
                                options[2].valueAsNumber,
                                options[3].valueAsNumber
                            ))
                        } else anim.ease.push([])
                        easingButton.click()
                    }
                }
                document.querySelectorAll('.timeline-header .popper')[2].style.opacity = '1'
                if (anim.keyTimes[0] != 0) {
                    anim.keyTimes.unshift(0)
                    anim.values.unshift(null)
                    anim.ease.unshift([])
                }
            }
        
            timelineZoom.dispatchEvent(new MouseEvent('click', { clientX: timelineZoom.getBoundingClientRect().width + timelineZoom.getBoundingClientRect().x }))
            timelineRulerFull.dispatchEvent(new MouseEvent('click', { clientX: timelineRulerAnim.getBoundingClientRect().x }))
        
            async function openFolders() {
                let f = false
                for (const elem of document.querySelectorAll('[data-region="editor-left-content"] .tree-item:not(.tree-root)')) {
                    if (!elem.querySelector('.tree-item-icon use').href.baseVal.endsWith('folder-closed')) continue
                    elem.querySelector('.tree-item-icon').click()
                    f = true
                }
                await sleep(100)
                if (f) openFolders()
            }
        
            await openFolders()
        
            const elementsList = document.querySelectorAll('[data-region="editor-left-content"] .tree-item:not(.tree-root)')
        
            {
                let elem = elementsList[0]
                elem.click()
                await sleep(100)
                if (elem.classList.contains('tree-selected')) {
                    elem.click()
                }
            }
        
            Object.assign(svgData, Array.from(objectList.querySelectorAll(':not([style*="display: none"])')).reduce((t, v) => {
                if (v.innerHTML) t[v.id] = v.outerHTML.replace(v.innerHTML, '<|>')
                else t[v.id] = v.outerHTML.replace('><', '><|><')
                return t
            }, {}))
        
            await sleep(100)
        
            for (const elem of elementsList) {
                if (elem.querySelector(':scope > .tree-invisible')) continue
                elem.click()
                timelineRulerFull.dispatchEvent(new MouseEvent('click', { clientX: timelineRulerAnim.getBoundingClientRect().x }))
                await sleep(100)
                const id = document.querySelector('#tool-selection .bounding-box-rect').dataset.for
                const options = document.querySelectorAll('[data-region="editor-right-content"] .accordion-body.disable-on-play .accordion-entry input')
                //const boundary = document.querySelector('.selection-bounding-box').getBBox()
                const object = objectList.querySelector('#'+id)
                const rectOffset = object.tagName == 'rect'
                /*const [dotNX, dotNY] = rotateVector([
                    options[4+rectOffset].value - (boundary.x + boundary.width / 2),
                    options[5+rectOffset].value - (boundary.y + boundary.height / 2)
                ], -options[13+rectOffset].value / 180 * Math.PI)
                const anchorX = dotNX + options[2].value / 2
                const anchorY = dotNY + options[3].value / 2*/
                objBase[id] = {
                    size:   [options[2].value*1, options[3].value*1],
                    origin: [options[4+rectOffset] .value*1, options[5+rectOffset] .value*1],
                    anchor: [options[6+rectOffset] .value*1, options[7+rectOffset] .value*1],
                    scale:  [options[8+rectOffset] .value*1, options[9+rectOffset] .value*1],
                    skew:   [options[10+rectOffset].value*1, options[11+rectOffset].value*1],
                    rotate: [options[12+rectOffset].value*1, options[13+rectOffset].value*1]/*,
                    dot:    [
                        Math.round(anchorX / options[8].value * 100) / 100,
                        Math.round(anchorY / options[9].value * 100) / 100
                    ]*/
                }
                if (animation.hasOwnProperty(id)) {
                    const timestamps = Object.keys(animation[id])
                    .reduce((t, type) => t.concat(animation[id][type].keyTimes.map((time, i) => ({time, type, value: i}))), [])
                    .reduce((t, v) => {
                        if ((i = t.findIndex(e => e.time == v.time)) != -1) t[i].data[v.type] = v.value
                        else t.push({ time: v.time, data: { [v.type]: v.value } })
                        return t
                    }, [])
                    .sort((a, b) => a.time > b.time)
                    for (const v of timestamps) {
                        timelineRulerFull.dispatchEvent(new MouseEvent('click', { clientX: timelineRulerAnim.getBoundingClientRect().width * (v.time + 0.01) / maxTime + timelineRulerAnim.getBoundingClientRect().x }))
                        await sleep(50)
                        for (const type in v.data) {
                            animation[id][type].values[v.data[type]] = (() => {switch (type) {
                                case 'scale': return `${options[8+rectOffset].value / objBase[id].scale[0]} ${options[9+rectOffset].value / objBase[id].scale[1]}`
                                case 'rotate': return options[13+rectOffset].value*1 + 360 * options[12+rectOffset].value - objBase[id].rotate[1] - 360 * objBase[id].rotate[0]
                                case 'origin': return `${options[4+rectOffset].value - objBase[id].origin[0]} ${options[5+rectOffset].value - objBase[id].origin[1]}`
                                case 'skew': return `${options[10+rectOffset].value - objBase[id].skew[0]} ${options[11+rectOffset].value - objBase[id].skew[1]}`
                                case 'opacity': return options[15+rectOffset].value / 100
                                case 'path': return object.getAttribute('d')
                            }})()
                        }
                    }
                }
            }
        
            for (const id in animation) {
                for (const type in animation[id]) {
                    if (animation[id][type].keyTimes[animation[id][type].keyTimes.length - 1] != maxTime) {
                        animation[id][type].keyTimes.push(maxTime)
                        animation[id][type].values.push(animation[id][type].values[animation[id][type].values.length - 1])
                        animation[id][type].ease.push([])
                    }
                    let keySplines = []
                    if (animation[id][type].ease.filter(a => a.length).length) {
                        const ease = animation[id][type].ease
                        for (let i = 0; i < ease.length; i++) {
                            if (!ease[i].length) {
                                keySplines.push('0 0 1 1')
                                continue
                            }
                            let j = 0
                            if (min = ease[i][ease[i].length - 1].min) {
                                keySplines.push(Object.values(ease[i][j]).join(' '))
                                j++
                                const time = gradientPick(animation[id][type].keyTimes[i], animation[id][type].keyTimes[i+j], min.x)
                                const value = gradientPick(animation[id][type].values[i], animation[id][type].values[i+j], min.y)
                                animation[id][type].keyTimes.splice(i + j, 0, time)
                                animation[id][type].values.splice(i + j, 0, value)
                            }
                            keySplines.push(Object.values(ease[i][j]).join(' '))
                            j++
                            if (max = ease[i][ease[i].length - 1].max) {
                                keySplines.push(Object.values(ease[i][j]).join(' '))
                                const time = gradientPick(animation[id][type].keyTimes[i], animation[id][type].keyTimes[i+j], max.x)
                                const value = gradientPick(animation[id][type].values[i], animation[id][type].values[i+j], max.y)
                                animation[id][type].keyTimes.splice(i + j, 0, time)
                                animation[id][type].values.splice(i + j, 0, value)
                            }
                        }
                    }
                    animation[id][type].keyTimes = animation[id][type].keyTimes.map(v => Math.round(v / maxTime * 100) / 100).join(';')
                    animation[id][type].values = animation[id][type].values.join(';')
                    animation[id][type].keySplines = keySplines.join(';')
                    delete animation[id][type].ease
                }
            }
            
            for (const id in svgData) {
                let str = svgData[id]
                const dot = rotateVector([objBase[id].anchor[0], objBase[id].anchor[1]], -objBase[id].rotate[1] / 180 * Math.PI)
                const matrix = createMatrix(objBase[id].rotate[1], objBase[id].skew[0], objBase[id].skew[1], objBase[id].scale[0], objBase[id].scale[1], dot[0] / objBase[id].scale[0], dot[1] / objBase[id].scale[1], objBase[id].origin[0], objBase[id].origin[1])
                let begin = ' begin = "never"'
                if (funcOptions.beginType == 'On load') begin = ''
                if (funcOptions.beginType == 'On click') begin = ' begin = "click"'
                const repeatCount = (Number.isFinite(funcOptions.iterate) ? funcOptions.iterate : 'indefinite')
                const fill = (funcOptions.fillMode == 'Forwards' ? ' fill="freeze"' : '')
                str = str.replace(/ transform=".*?"/g, ` transform="matrix(${matrix})"`)
                str = str.replaceAll(/ (style=".*?"|opacity="1"|fill-opacity="1"|fill-rule="nonzero"|stroke-opacity="1"|stroke-linecap="butt"|stroke-linejoin="miter"|stroke-miterlimit="4"|stroke-dashoffset="0"|stroke-dasharray="")/g, '')
                str = str.replace('" ', `" style="transform-origin:${-objBase[id].anchor[0]}px ${-objBase[id].anchor[1]}px" `)
                str = str.substr(0, str.indexOf('<|'))
                if (animation.hasOwnProperty(id)) {
                    for (let type in animation[id]) {
                        const anim = animation[id][type]
                        const spline = (anim.keySplines ? ` calcMode="spline" keySplines="${anim.keySplines}"` : '')
                        if (type == 'origin') type = 'translate'
                        if (type == 'path') type = 'd'
                        switch (type) {
                            case 'd':
                            case 'opacity':
                                str += `<animate${begin} attributeName="${type}" values="${anim.values}" keyTimes="${anim.keyTimes}"${spline} dur="${maxTime}" repeatCount="${repeatCount}"${fill}/>`
                                break
                            case 'skew':
                                str += `<animateTransform${begin} attributeName="transform" type="skewX" values="${anim.values.split(';').map(v => v.split(' ')[0]).join(';')}" keyTimes="${anim.keyTimes}"${spline} dur="${maxTime}" additive="sum" repeatCount="${repeatCount}"${fill}/>`
                                str += `<animateTransform${begin} attributeName="transform" type="skewY" values="${anim.values.split(';').map(v => v.split(' ')[1]).join(';')}" keyTimes="${anim.keyTimes}"${spline} dur="${maxTime}" additive="sum" repeatCount="${repeatCount}"${fill}/>`
                                break
                            case 'scale':
                            case 'rotate':
                            case 'translate':
                                str += `<animateTransform${begin} attributeName="transform" type="${type}" values="${anim.values}" keyTimes="${anim.keyTimes}"${spline} dur="${maxTime}" additive="sum" repeatCount="${repeatCount}"${fill}/>`
                        }
                    }
                }
                str += svgData[id].substr(svgData[id].indexOf('</'))
                svgData[id] = str
            }
        
            const canvasMetric = [
                canvasElem.getAttribute('x'),
                canvasElem.getAttribute('y'),
                canvasElem.getAttribute('width'),
                canvasElem.getAttribute('height')
            ].join(' ')
            const canvasWidth = canvasElem.getAttribute('width') - canvasElem.getAttribute('x')
            const canvasHeight = canvasElem.getAttribute('height') - canvasElem.getAttribute('y')
            function recSVGAssamble(objList) {
                let str = ''
                for (const obj of objList) {
                    if (obj.tagName == 'g') {
                        const data = svgData[obj.id]
                        str += data.substr(0, data.indexOf('<', 1))
                        str += recSVGAssamble(obj.querySelectorAll(':scope > :not([style*="display: none"])'))
                        str += data.substr(data.indexOf('<', 1))
                    }
                    else str += svgData[obj.id]
                }
                return str
            }
            let str = `<svg id="${funcOptions.filename.replaceAll(' ', '-').replace('.svg', '').toLowerCase()}" xmlns="http://www.w3.org/2000/svg" viewBox="${canvasMetric}" width="${canvasWidth}" height="${canvasHeight}"${funcOptions.fillColor ? ` style="background-color:${funcOptions.fillColor}"` : ''}>`
            str += recSVGAssamble(objectList.querySelectorAll(':scope > :not([style*="display: none"])'))
            if (funcOptions.beginType == 'On function call') str += `<script>${[
                "const a=document.querySelectorAll('animate,animateTransform')",
                "document.beginAnimation=()=>a.forEach(v=>v.beginElement())",
                "document.beginAnimationAt=o=>a.forEach(v=>v.beginElementAt(o))",
                "document.endAnimation=()=>a.forEach(v=>v.endElement())",
                "document.endAnimationAt=o=>a.forEach(v=>v.endElement(o))",
                "Object.defineProperty(document,'repeatCount',{get(){return a[0].getAttribute('repeatCount')*1},set(v){a.forEach(e=>e.setAttribute('repeatCount',v))}})",
                "Object.defineProperty(document,'fillMode',{get(){return a[0].getAttribute('fill')},set(v){a.forEach(e=>e.setAttribute('fill',v))}})"
            ].join(';')}</script>`
            str += '</svg>'
            const downloader = document.createElement('a')
            downloader.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str)
            downloader.download = funcOptions.filename
            downloader.style.display = 'none'
            document.body.appendChild(downloader)
            downloader.click()
            document.body.removeChild(downloader)
        }
        function createElement(html) {
            const tmp = document.createElement('template')
            tmp.innerHTML = html.trim()
            return tmp.content.firstChild
        }
        const createOuterDiv = (id, title) => createElement(`<div data-v-b4abfc0a="" class="label-container ${id}-container"><div data-v-b4abfc0a="" class="label">${title}:</div></div>`)
        function createTextbox({id, title, value}) {
            const outerDiv = createOuterDiv(id, title)
            const inputOuterDiv = createElement('<div data-v-95d5614c="" data-v-bbaba23c="" class="input-width input custom-input" style="height: 26px;" data-v-b4abfc0a=""></div>')
            const inputDiv = createElement('<div class="input-box"></div>')
            const input = createElement('<input type="text">')
            outerDiv.dataset.vBbaba23c = ''
            input.value = value
            input.addEventListener('focusin', () => {
                input.value = input.value.substr(0, input.value.length - 4)
            })
            input.addEventListener('focusout', () => {
                if (!input.value.endsWith('.svg')) input.value += '.svg'
            })
            inputDiv.appendChild(input)
            inputOuterDiv.appendChild(inputDiv)
            outerDiv.appendChild(inputOuterDiv)
            outerDiv.getValue = () => input.value
            return outerDiv
        }
        function createSelect({id, title, values}) {
            const outerDiv = createOuterDiv(id, title)
            const blockDiv = createElement('<div class="custom-select input-width" data-v-b4abfc0a=""></div>')
            const popperDiv = createElement('<div class="popper auto-y-scroll custom-scrollbar" style="max-height:40vh;display:none"></div>')
            const selectDiv = createElement('<div class="custom-select-title"></div>')
            const titleSpan = createElement(`<span class="custom-select-title-value">${values[0].text}</span>`)
            const iconSpan = createElement('<span class="custom-select-icon"><svg width="7" height="10"><use xlink:href="/assets/svgator.webapp/editor/assets/svg-tools.svg?v=2#opposite-arrows"></use></svg></span>')
            const checkmark = createElement('<svg width="16" height="16"><use xlink:href="/assets/svgator.webapp/editor/assets/svg-tools.svg?v=2#checkmark"></use></svg>')
            for (const value of values) {
                const tipDiv = createElement(`<div ${value.tip ? `title="${value.tip}"` : ''}></div>`)
                const itemDiv = createElement(`<div class="custom-list-item">${value.text}</div>`)
                itemDiv.addEventListener('click', () => {
                    if ((selected = popperDiv.querySelector('.custom-list-item-selected')) != itemDiv) {
                        selected.classList.remove('custom-list-item-selected')
                        itemDiv.classList.add('custom-list-item-selected')
                        titleSpan.innerText = value.text
                        outerDiv.dispatchEvent(new CustomEvent('valuechanged', { detail: value.text}))
                        itemDiv.insertBefore(checkmark, itemDiv.childNodes[0])
                        popperDiv.style = 'max-height:40vh;display:none'
                    }
                })
                tipDiv.appendChild(itemDiv)
                popperDiv.appendChild(tipDiv)
            }
            popperDiv.firstChild.firstChild.classList.add('custom-list-item-selected')
            popperDiv.firstChild.firstChild.insertBefore(checkmark, popperDiv.firstChild.firstChild.lastChild)
            selectDiv.addEventListener('click', () => {
                const {x, y, width, height} = selectDiv.getBoundingClientRect()
                if (popperDiv.style.display == 'none') popperDiv.style = `max-height:40vh;margin:0px;width:${width}px;position:absolute;inset:${y + height + 5}px auto auto ${x}px`
                else popperDiv.style = 'max-height:40vh;display:none'
            })
            selectDiv.appendChild(titleSpan)
            selectDiv.appendChild(iconSpan)
            blockDiv.appendChild(popperDiv)
            blockDiv.appendChild(selectDiv)
            outerDiv.appendChild(blockDiv)
            outerDiv.getValue = () => titleSpan.innerText
            return outerDiv
        }
        function createIterations({title, counterText, radioText}) {
            const outerDiv = createOuterDiv('iterations', title)
            const iterationsDiv = createElement('<div data-v-7b8f1bd4="" data-v-bbaba23c="" class="iterations" data-v-b4abfc0a=""></div>')
            const counterOuterDiv = createElement('<div data-v-7b8f1bd4=""></div>')
            const counterLabel = createElement('<label data-v-7b8f1bd4="" class="input-label"></label>')
            const counterRadio = createElement('<input type="radio">')
            const inputDiv = createElement('<div data-v-7b8f1bd4="" class="input custom-input input-disabled" style="width: 35px; margin-left: 8px;"></div>')
            const inputBox = createElement('<div class="input-box"></div>')
            const counterInput = createElement('<input disabled="disabled" type="number" min="1" step="1" max="999">')
            const infiniteLabel = counterLabel.cloneNode()
            const infiniteRadio = counterRadio.cloneNode()
            infiniteRadio.checked = true
            counterInput.value = 1
            counterRadio.addEventListener('input', () => {
                infiniteRadio.checked = false
                inputDiv.classList.remove('input-disabled')
                counterInput.disabled = false
            })
            infiniteRadio.addEventListener('input', () => {
                counterRadio.checked = false
                inputDiv.classList.add('input-disabled')
                counterInput.disabled = true
            })
            counterLabel.appendChild(counterRadio)
            counterLabel.append(counterText)
            inputBox.appendChild(counterInput)
            inputDiv.appendChild(inputBox)
            counterOuterDiv.appendChild(counterLabel)
            counterOuterDiv.appendChild(inputDiv)
            infiniteLabel.appendChild(infiniteRadio)
            infiniteLabel.append(radioText)
            iterationsDiv.appendChild(counterOuterDiv)
            iterationsDiv.appendChild(infiniteLabel)
            outerDiv.appendChild(iterationsDiv)
            outerDiv.getValue = () => (infiniteRadio.checked ? Infinity : counterInput.valueAsNumber)
            return outerDiv
        }
        const createSubtitle = ({ title }) => createElement(`<div data-v-6944a8be="" data-v-bbaba23c="" class="subtitle${!title ? ' empty' : ''}"><div data-v-6944a8be="" class="line-cont"><div data-v-6944a8be="" class="line"></div></div>${title ? `<p data-v-6944a8be="">${title}</p>` : ''}<div data-v-6944a8be="" class="line-cont"><div data-v-6944a8be="" class="line"></div></div></div>`)
        function createColorPicker() {
            const outerDiv = createElement('<div class="color-picker"></div>')
            outerDiv.getValue = () => (outerDiv.querySelector('.checkbox').classList.contains('is-checked') ? outerDiv.querySelector('path').getAttribute('fill') : null)
            return outerDiv
        }
    
        window.plugins = {
            list: {},
            addPlugin({ head, body }) {
                const page = createElement('<div class="export-settings scroll"></div>')
                let section = []
                const options = []
                for (const elem of body) {
                    switch (elem.type) {
                        case 'textbox':
                            options.push(section[section.push(createTextbox(elem)) - 1])
                            break
                        case 'selection':
                            options.push(section[section.push(createSelect(elem)) - 1])
                            break
                        case 'counter':
                            options.push(section[section.push(createIterations(elem)) - 1])
                            break
                        case 'subtitle':
                            if (elem.title && section.length) {
                                page.appendChild(section.reduce((t, v) => { t.appendChild(v); return t }, createElement('<div data-v-bbaba23c="" class="section"></div>')))
                                section = []
                            } section.push(createSubtitle(elem))
                            break
                        case 'colorPicker':
                            options.push(section[section.push(createColorPicker()) - 1])
                    }
                }
                page.appendChild(section.reduce((t, v) => { t.appendChild(v); return t }, createElement('<div data-v-bbaba23c="" class="section"></div>')))
                page.getOptions = () => options
                const header = createElement(`<div class="export-limitations plugin"><div class="heading-section"><span style="font-size:20px">${head.title}</span><span id="plan-title" style="color:lime">PLUGIN</span></div><div data-v-6944a8be="" class="line"></div><div class="upgrade-section">${head.text}<div class="premium-upgrade"><a style="color:lime" href="${head.link}">Author's site</a></div></div></div>`)
                this.list[head.title] = {
                    header,
                    page,
                    exportFunction: () => console.warn('Export function was not set')
                }
                const controller = {
                    setExportFunction: func => { this.list[head.title].exportFunction = func },
                    getElements: page.getOptions,
                    getContainer: () => page,
                    getValues: () => page.getOptions().map(v => v.getValue())
                }
                return controller
            }
        }
    
        const modal = document.querySelector('[data-region="layout"] > .modal')
        let canvasColorPicker
        const pluginSector = createElement('<div data-v-bbaba23c="" class="section"></div>')
        const modalObserver = new MutationObserver(e => {
            if (!e[0].oldValue.includes('show') && modal.classList.contains('show')) {
                const loadedPlugins = {}
                Object.assign(loadedPlugins, window.plugins.list)
                const tabContent = modal.querySelector('.tab-content')
                const tabs = tabContent.querySelector('.tabs')
                const pluginsTab = createElement('<div data-v-5b3fc24a="" class="tab" style="--accordion-title-clr:lime;filter:grayscale(1)"><span style="margin-right:6px;margin-top:-2px;font-size:16px">🧩</span><span data-v-5b3fc24a="">Plugins</span></div>')
                const unpreview = createElement('<div style="color:black;font-size:60px;font-weight:bold;text-align:center;width:100%;margin-top:35%">Preview is not available</div>')
                const exportButton = createElement('<button class="custom-button">Export</button>')
                const tabArray = tabs.children
                let lastPage = tabs.querySelector('.active')
                let exportStaticFlag
                let currentFunction
                const pluginSelect = createSelect({
                    id: 'plugin',
                    title: 'Plugin',
                    values: Object.keys(loadedPlugins).map(v => ({text: v}))
                })
                let page
                let header
                function changePage(name) {
                    const plugin = loadedPlugins[name]
                    if (tabContent.contains(page)) {
                        page.remove()
                        header.remove()
                        tabContent.appendChild(plugin.page)
                        const settings = modal.querySelector('.settings')
                        settings.insertBefore(plugin.header, settings.firstChild)
                    }
                    page = plugin.page
                    header = plugin.header
                    page.insertBefore(pluginSector, page.firstChild)
                    exportButton.removeEventListener('click', currentFunction)
                    currentFunction = plugin.exportFunction
                    exportButton.addEventListener('click', currentFunction)
                    if (canvasColorPicker) page.querySelector('.color-picker')?.appendChild(canvasColorPicker)
                }
                changePage('SMIL')
                pluginSelect.addEventListener('valuechanged', ({detail: value}) => changePage(value))
                pluginSector.appendChild(createSubtitle({title: 'Plugin'}))
                pluginSector.appendChild(pluginSelect)
                for (const tab of tabArray) tab.addEventListener('click', () => {
                    if (tabContent.contains(page)) {
                        pluginsTab.style.filter = 'grayscale(1)'
                        canvasColorPicker.remove()
                        page.remove()
                        tabContent.querySelector('.export-settings').style = ''
                        pluginsTab.classList.remove('active')
                        const lastSector = tabContent.querySelector('.export-settings').lastChild
                        if (!lastSector.querySelector('.canvas-color-container')) lastSector.appendChild(canvasColorPicker)
                        if (lastPage == tab) lastPage.classList.add('active')
                        unpreview.remove()
                        const settings = modal.querySelector('.settings')
                        header.remove()
                        settings.firstChild.style = ''
                        modal.querySelector('.preview-iframe svg').style = ''
                        modal.querySelector('.preview-footer-left').style = ''
                        modal.querySelector('.exports-left')?.setAttribute('style', '')
                        exportButton.remove()
                        modal.querySelector('.export-btn-container .custom-button').style = ''
                        if (!exportStaticFlag) modal.querySelector('.export-btn-container').classList.remove('static-export')
                        modal.querySelector('.export-btn-container .segmented-button').style.removeProperty('--button-color')
                        modal.querySelector('.export-btn-container .segmented-button').style.removeProperty('--button-color-hover')
                    }
                    lastPage = tab
                })
                pluginsTab.addEventListener('click', () => {
                    if (!tabContent.contains(page)) {
                        pluginsTab.style.filter = ''
                        exportStaticFlag = modal.querySelector('.export-btn-container').classList.contains('static-export')
                        canvasColorPicker = tabContent.querySelector('.export-settings .canvas-color-container')
                        tabContent.querySelector('.export-settings').style.display = 'none'
                        tabContent.appendChild(page)
                        lastPage.classList.remove('active')
                        pluginsTab.classList.add('active')
                        const settings = modal.querySelector('.settings')
                        settings.firstChild.style.display = 'none'
                        settings.insertBefore(header, settings.firstChild)
                        page.querySelector('.color-picker')?.appendChild(canvasColorPicker)
                        modal.querySelector('.preview-iframe svg').style.display = 'none'
                        modal.querySelector('.preview-iframe').appendChild(unpreview)
                        modal.querySelector('.preview-footer-left').style = 'opacity:0;pointer-events:none'
                        const expLeft = modal.querySelector('.exports-left')
                        if (expLeft) expLeft.style.display = 'none'
                        modal.querySelector('.export-btn-container .custom-button').style.display = 'none'
                        modal.querySelector('.export-btn-container').classList.add('static-export')
                        modal.querySelector('.export-btn-container .segmented-button').appendChild(exportButton)
                        modal.querySelector('.export-btn-container .segmented-button').style.setProperty('--button-color', '#00ab00')
                        modal.querySelector('.export-btn-container .segmented-button').style.setProperty('--button-color-hover', 'green')
                    }
                })
                tabs.appendChild(pluginsTab)
            } else if (e[0].oldValue.includes('show') && !modal.classList.contains('show')) {
                canvasColorPicker?.remove()
                canvasColorPicker = undefined
                pluginSector.innerHTML = ''
            }
        })
        modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'], attributeOldValue: true })
    
        const smilPlugin = window.plugins.addPlugin({
            head: {
                title: 'SMIL',
                text: 'This plug-in allows you to export your animations to SMIL animated SVG files',
                link: 'https://urobbyu.github.io'
            },
            body: [
                {
                    type: 'subtitle',
                    title: 'File'
                },{
                    type: 'textbox',
                    id: 'export-name',
                    title: 'Export as',
                    value: document.querySelector('.menubar-left input').value + '.svg'
                },{
                    type: 'subtitle',
                    title: 'Animation'
                },{
                    type: 'selection',
                    id: 'start',
                    title: 'Animation start',
                    values: [
                        { text: 'On function call' },
                        { text: 'On click' },
                        { text: 'On load' }
                    ]
                },{ type: 'subtitle' },{
                    type: 'counter',
                    title: 'Iterations',
                    counterText: 'Count',
                    radioText: 'Infinite'
                },{
                    type: 'selection',
                    id: 'fill-mode',
                    title: 'Fill mode',
                    values: [
                        { text: 'Forwards' },
                        { text: 'Backwards' }
                    ]
                },{
                    type: 'subtitle',
                    title: 'Document'
                },{
                    type: 'colorPicker'
                }
            ]
        })
        smilPlugin.setExportFunction(() => exportSMIL({
            filename: smilPlugin.getValues()[0],
            beginType: smilPlugin.getValues()[1],
            iterate: smilPlugin.getValues()[2],
            fillMode: smilPlugin.getValues()[3],
            fillColor: smilPlugin.getValues()[4]
        }))
        document.dispatchEvent(new Event('pluginsload'))
    }
}, 100)

/*
const tmp = window.plugins.addPlugin({
  head: {
    title: 'Testing Unit',
    text: 'This plug-in was designed for testing purposes only',
    link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  },
  body: [
    {
      type: 'subtitle',
      title: 'File'
    },{
      type: 'textbox',
      id: 'export-name',
      title: 'Export as',
      value: document.querySelector('.menubar-left input').value + '.svg'
    },{
      type: 'subtitle',
      title: 'Animation'
    },{
      type: 'selection',
      id: 'start',
      title: 'Animation start',
      values: [
        { text: 'On function call' },
        { text: 'On click' },
        { text: 'On load' }
      ]
    },{ type: 'subtitle' },{
      type: 'counter',
      title: 'Iterations',
      counterText: 'Count',
      radioText: 'Infinite'
    },{
      type: 'selection',
      id: 'fill-mode',
      title: 'Fill mode',
      values: [
        { text: 'Forwards' },
        { text: 'Backwards' }
      ]
    },{
      type: 'subtitle',
      title: 'Document'
    },{
      type: 'colorPicker'
    }
  ]
})
tmp.setExportFunction(() => console.log({
  filename: tmp.getValues()[0],
  beginType: tmp.getValues()[1],
  iterate: tmp.getValues()[2],
  fillMode: tmp.getValues()[3],
  fillColor: tmp.getValues()[4]
}))
*/