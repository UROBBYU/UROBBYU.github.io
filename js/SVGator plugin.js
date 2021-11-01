/**
 * @name         SVGator_Plugin_System
 * @description  Allows user to install custom export plugins over SVGator online tool. Also includes SMIL export plugin as an example.
 * @author       UROBBYU
 * @link         https://urobbyu.github.io
 */
window.plugins = setInterval(() => {
    if (document.querySelector('#document')) {
        clearInterval(window.plugins)

        //* SVG SMIL ANIMATION EXPORT FUNCTION
        /** 
         * Runs export sequence for SMIL animation format.
         * @param {object} funcOptions - Export options.
         */
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

            const animTypeMap = {
                'shape-size': ['width', 'height'],
                'shape-radius': ['rx', 'ry'],
                'shape-path': 'd',
                'transform-origin': 'translate',
                'transform-translate': 'translate',       //TODO
                'transform-scale': 'scale',
                'transform-skew': ['skewX', 'skewY'],
                'transform-rotate': 'rotate',
                'compositing-opacity': 'opacity',
                'fill-paint': 'fill',
                'fill-opacity': 'fill-opacity',
                'stroke-paint': 'stroke',
                'stroke-opacity': 'stroke-opacity',
                'stroke-width': 'stroke-width',
                'stroke-dashArray': 'stroke-dasharray',
                'stroke-dashOffset': 'stroke-dashoffset',
                'filter-list': ''                         //TODO
            }
        
            function sleep(time) {
                return new Promise(res => setTimeout(res, time))
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
        
            // Iterating through all animation keyframes and saving its position on timeline
            for (const a of animList) {
                const id = a.dataset.for
                const type = `${a.dataset.propertygroup}-${a.dataset.propertyname}`
                const keys = a.querySelectorAll('.timeline-key.timeline-key-diamond')
                if (!animation[id]) animation[id] = {}
                let anim = animation[id][type] = { keyTimes: [], values: [], base: null , ease: []}
                document.querySelectorAll('.timeline-header .popper')[2].style.opacity = '0'
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i]
                    const time = key.dataset.keytime / 1000
                    anim.keyTimes.push(time)
                    anim.values.push(null)
                    // Saving spline functions
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
                                options[0].value*1,
                                options[1].value*1,
                                options[2].value*1,
                                options[3].value*1
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
        
            // Setting timeline zoom to maximum and time to zero
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
        
            // Opening all objects groups
            await openFolders()
        
            const elementsList = document.querySelectorAll('[data-region="editor-left-content"] .tree-item:not(.tree-root)')
        
            { // Deselecting all objects
                let elem = elementsList[0]
                elem.click()
                await sleep(100)
                if (elem.classList.contains('tree-selected')) {
                    elem.click()
                }
            }
        
            // Saving zero animation objects' svg data
            Object.assign(svgData, Array.from(objectList.querySelectorAll(':not([style*="display: none"])')).reduce((t, v) => {
                if (v.innerHTML && v.tagName != 'text' && v.tagName != 'tspan') t[v.id] = v.outerHTML.replace(v.innerHTML, '<|>')
                else if (v.tagName != 'tspan') t[v.id] = v.outerHTML.replace('><', '><|><')
                return t
            }, {}))
        
            await sleep(100)
        
            // Iterating through every object on the scene and writing down its animation data
            for (const elem of elementsList) {
                if (elem.querySelector(':scope > .tree-invisible')) continue
                elem.click()
                timelineRulerFull.dispatchEvent(new MouseEvent('click', { clientX: timelineRulerAnim.getBoundingClientRect().x }))
                await sleep(100)
                const id = document.querySelector('#tool-selection .origin-point').dataset.for
                const options = document.querySelectorAll('[data-region="editor-right-content"] .accordion-body.disable-on-play input')
                const object = objectList.querySelector('#'+id)
                const offset = [(object.tagName == 'rect' || object.tagName == 'polygon') + (options.length == 27), (object.tagName == 'text') * 6]
                const opt = n => options[n + (n > 3 ? offset[0] : 0) + (n > 13 ? offset[1] : 0)].value
                // Saving base values for reference
                objBase[id] = {
                    size:   [opt(2)*1, opt(3)*1],
                    origin: [opt(4)*1, opt(5)*1],
                    anchor: [opt(6)*1, opt(7)*1],
                    scale:  [opt(8)*1, opt(9)*1],
                    skew:   [opt(10)*1, opt(11)*1],
                    rotate: [opt(12)*1, opt(13)*1]
                }
                function getColor(n) {
                    const type = opt(n)
                    return { type, color: (type == 'Linear' || type == 'Radial' ? document.getElementById(id+(n == 16 ? '--fill' : '--stroke')).cloneNode(true) : type) }
                }
                // Iterating through every keyframe and writing down its keyvalue
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
                                case 'shape-size':          return `${object.getAttribute('width')} ${object.getAttribute('height')}`
                                case 'shape-radius':        return `${object.getAttribute('rx')} ${object.getAttribute('ry')}`
                                case 'shape-path':          return object.getAttribute('d')
                                case 'transform-origin':    return `${opt(4) - objBase[id].origin[0]} ${opt(5) - objBase[id].origin[1]}`
                                //case 'transform-translate': return `${options[6+rectOffset].value - objBase[id].anchor[0]} ${options[7+rectOffset].value - objBase[id].anchor[1]}`
                                case 'transform-scale':     return `${opt(8) / objBase[id].scale[0]} ${opt(9) / objBase[id].scale[1]}`
                                case 'transform-skew':      return `${opt(10) - objBase[id].skew[0]} ${opt(11) - objBase[id].skew[1]}`
                                case 'transform-rotate':    return opt(13)*1 + 360 * opt(12) - objBase[id].rotate[1] - 360 * objBase[id].rotate[0]
                                case 'compositing-opacity': return opt(15) / 100
                                case 'fill-paint':          return getColor(16)
                                case 'fill-opacity':        return opt(17) / 100
                                case 'stroke-paint':        return getColor(18)
                                case 'stroke-opacity':      return opt(19) / 100
                                case 'stroke-width':        return opt(20)*1
                                case 'stroke-dashArray':    return opt(22).split(';').join('')
                                case 'stroke-dashOffset':   return opt(23)*1
                            }})()
                        }
                    }
                }
            }

            // Iterating through all saved animation data
            for (const id in animation) {
                for (const type in animation[id]) {
                    const anim = animation[id][type]
                    // Ensuring there are last keys
                    if (anim.keyTimes[anim.keyTimes.length - 1] != maxTime) {
                        anim.keyTimes.push(maxTime)
                        anim.values.push(anim.values[anim.values.length - 1])
                        anim.ease.push([])
                    }
                    // Dealing with splines
                    let keySplines = []
                    if (anim.ease.filter(a => a.length).length) {
                        const ease = anim.ease
                        for (let i = 0; i < ease.length; i++) {
                            if (!ease[i].length) {
                                keySplines.push('0 0 1 1')
                                continue
                            }
                            let j = 0
                            if ((min = ease[i][ease[i].length - 1].min) && !type.endsWith('-paint')) {
                                keySplines.push(Object.values(ease[i][j]).join(' '))
                                j++
                                const time = gradientPick(anim.keyTimes[i], anim.keyTimes[i+j], min.x)
                                const value = gradientPick(anim.values[i], anim.values[i+j], min.y)
                                anim.keyTimes.splice(i + j, 0, time)
                                anim.values.splice(i + j, 0, value)
                            }
                            keySplines.push(Object.values(ease[i][j]).join(' '))
                            j++
                            if ((max = ease[i][ease[i].length - 1].max) && !type.endsWith('-paint')) {
                                keySplines.push(Object.values(ease[i][j]).join(' '))
                                const time = gradientPick(anim.keyTimes[i], anim.keyTimes[i+j], max.x)
                                const value = gradientPick(anim.values[i], anim.values[i+j], max.y)
                                anim.keyTimes.splice(i + j, 0, time)
                                anim.values.splice(i + j, 0, value)
                            }
                        }
                    }
                    // Dealing with colors
                    if (type.endsWith('-paint')) {
                        const gradID = `${id}--${animTypeMap[type]}`
                        const linearStops = anim.values.filter(c => c.type == 'Linear').reduce((t, v) => Math.max([...v.color.childNodes].filter(s => s.tagName == 'stop').length, t), 0)
                        const linearAnim = []
                        const radialStops = anim.values.filter(c => c.type == 'Radial').reduce((t, v) => Math.max([...v.color.childNodes].filter(s => s.tagName == 'stop').length, t), 0)
                        const radialAnim = []
                        const values = []
                        for (let i = 0; i < anim.values.length; i++) {
                            const value = anim.values[i]
                            const time = anim.keyTimes[i]
                            if (value.type == value.color) {
                                values.push((value.color == 'none' ? '' : '#') + value.color)
                                if (linearAnim.length) linearAnim.push({ time, value: linearAnim[linearAnim.length - 1].value })
                                if (radialAnim.length) radialAnim.push({ time, value: radialAnim[radialAnim.length - 1].value })
                            } else {
                                const isL = value.type == 'Linear'
                                values.push(`url(#${gradID}--${isL ? 'l' : 'r'})`)
                                if (i == 0) svgData[id] = svgData[id].replace(gradID, `${gradID}--${isL ? 'l' : 'r'}`)
                                const stops = []
                                for (let s = 0; s < (isL ? linearStops : radialStops); s++) {
                                    const stop = value.color.childNodes[s]
                                    stops.push(stop ?? stops[stops.length - 1])
                                }
                                if (isL) linearAnim.push({ time, value: {
                                    x1: value.color.getAttribute('x1'),
                                    y1: value.color.getAttribute('y1'),
                                    x2: value.color.getAttribute('x2'),
                                    y2: value.color.getAttribute('y2'),
                                    stops
                                }})
                                else radialAnim.push({ time, value: {
                                    cx: value.color.getAttribute('cx'),
                                    cy: value.color.getAttribute('cy'),
                                    r: value.color.getAttribute('r'),
                                    transform: value.color.getAttribute('gradientTransform'),
                                    stops
                                }})
                            }
                        }
                        anim.values = values
                        const spline = (anim.keySplines ? ` calcMode="spline" keySplines="${anim.keySplines.join(';')}"` : '')
                        let begin = ' begin = "never"'
                        if (funcOptions.beginType == 'On load') begin = ''
                        if (funcOptions.beginType == 'On click') begin = ' begin = "click"' 
                        const repeatCount = (Number.isFinite(funcOptions.iterate) ? funcOptions.iterate : 'indefinite')
                        const fill = (funcOptions.fillMode == 'Forwards' ? ' fill="freeze"' : '')
                        if (linearAnim.length) {
                            const base = linearAnim[0].value
                            const time = []
                            const x1 = []
                            const y1 = []
                            const x2 = []
                            const y2 = []
                            const stops = base.stops.map(() => [])
                            for (const val of linearAnim) {
                                time.push(val.time)
                                x1.push(val.value.x1)
                                y1.push(val.value.y1)
                                x2.push(val.value.x2)
                                y2.push(val.value.y2)
                                for (let s = 0; s < stops.length; s++) {
                                    let color = val.value.stops[s].getAttribute('stop-color')
                                    if (color.startsWith('rgb(')) color = color.replace(/rgb\(|\)/g, '').split(',').reduce((t,v)=>t+(v>15?'':0)+(v*1).toString(16).toUpperCase(),'#')
                                    stops[s].push({offset: val.value.stops[s].getAttribute('offset'), color})
                                }
                            }
                            let str = `<linearGradient id="${gradID}--l" x1="${base.x1}" y1="${base.y1}" x2="${base.x2}" y2="${base.y2}">`
                            for (const stop of stops) {
                                str += `<stop offset="${stop[0].offset}" stop-color="${stop[0].color}">`
                                if (stop.length > 1) {
                                    if ((val = stop.map(v => v.offset)).reduce((t, v) => (t.includes(v) ? t : [...t, v]), []).length > 1) str += `<animate${begin} attributeName="offset" values="${val.join(';')}" keyTimes="${time.map(v => Math.round(v / maxTime * 100) / 100).join(';')}"${spline} dur="${maxTime}" repeatCount="${repeatCount}"${fill}/>`
                                    if ((val = stop.map(v => v.color)).reduce((t, v) => (t.includes(v) ? t : [...t, v]), []).length > 1) str += `<animate${begin} attributeName="stop-color" values="${val.join(';')}" keyTimes="${time.map(v => Math.round(v / maxTime * 100) / 100).join(';')}"${spline} dur="${maxTime}" repeatCount="${repeatCount}"${fill}/>`
                                }
                                str += '</stop>'
                            }
                            if (x1.length > 1) {
                                str += [
                                    'x1" values="' + x1.join(';'),
                                    'y1" values="' + y1.join(';'),
                                    'x2" values="' + x2.join(';'),
                                    'y2" values="' + y2.join(';')
                                ].map(v => (v.replace(/.*"/, '').split(';').reduce((t, v) => (t.includes(v) ? t : [...t, v]), []).length > 1 ? `<animate${begin} attributeName="${v}" keyTimes="${time.map(v => Math.round(v / maxTime * 100) / 100).join(';')}"${spline} dur="${maxTime}" repeatCount="${repeatCount}"${fill}/>` : '')).join('')
                            }
                            objBase[id][animTypeMap[type]+'LinearGrad'] = str + '</linearGradient>'
                        }
                        if (radialAnim.length) {
                            const base = radialAnim[0].value
                            const time = []
                            const cx = []
                            const cy = []
                            const r = []
                            const transform = []
                            const stops = base.stops.map(() => [])
                            for (const val of radialAnim) {
                                time.push(val.time)
                                cx.push(val.value.cx)
                                cy.push(val.value.cy)
                                r.push(val.value.r)
                                transform.push(val.value.transform)
                                for (let s = 0; s < stops.length; s++) {
                                    let color = val.value.stops[s].getAttribute('stop-color')
                                    if (color.startsWith('rgb(')) color = color.replace(/rgb\(|\)/g, '').split(',').reduce((t,v)=>t+(v>15?'':0)+(v*1).toString(16).toUpperCase(),'#')
                                    stops[s].push({offset: val.value.stops[s].getAttribute('offset'), color})
                                }
                            }
                            let str = `<radialGradient id="${gradID}--r" cx="${base.cx}" cy="${base.cy}" r="${base.r}" gradientTransform="${base.transform}">`
                            for (const stop of stops) {
                                str += `<stop offset="${stop[0].offset}" stop-color="${stop[0].color}">`
                                if (stop.length > 1) {
                                    if ((val = stop.map(v => v.offset)).reduce((t, v) => (t.includes(v) ? t : [...t, v]), []).length > 1) str += `<animate${begin} attributeName="offset" values="${val.join(';')}" keyTimes="${time.map(v => Math.round(v / maxTime * 100) / 100).join(';')}"${spline} dur="${maxTime}" repeatCount="${repeatCount}"${fill}/>`
                                    if ((val = stop.map(v => v.color)).reduce((t, v) => (t.includes(v) ? t : [...t, v]), []).length > 1) str += `<animate${begin} attributeName="stop-color" values="${val.join(';')}" keyTimes="${time.map(v => Math.round(v / maxTime * 100) / 100).join(';')}"${spline} dur="${maxTime}" repeatCount="${repeatCount}"${fill}/>`
                                }
                                str += '</stop>'
                            }
                            if (cx.length > 1) {
                                str += [
                                    'cx" values="' + cx.join(';'),
                                    'cy" values="' + cy.join(';'),
                                    'r" values="' + r.join(';'),
                                    'gradientTransform" values="' + transform.join(';')
                                ].map(v => (v.replace(/.*"/, '').split(';').reduce((t, v) => (t.includes(v) ? t : [...t, v]), []).length > 1 ? `<animate${begin} attributeName="${v}" keyTimes="${time.map(v => Math.round(v / maxTime * 100) / 100).join(';')}"${spline} dur="${maxTime}" repeatCount="${repeatCount}"${fill}/>` : '')).join('')
                            }
                            objBase[id][animTypeMap[type]+'RadialGrad'] = str + '</radialGradient>'
                        }
                    }
                    // Assembling final values
                    anim.keyTimes = anim.keyTimes.map(v => Math.round(v / maxTime * 100) / 100).join(';')
                    anim.values = anim.values.join(';')
                    anim.keySplines = keySplines.join(';')
                    delete anim.ease
                }
            }
            
            // Iterating through initial svg data
            for (const id in svgData) {
                let str = svgData[id]
                let begin = ' begin = "never"'
                if (funcOptions.beginType == 'On load') begin = ''
                if (funcOptions.beginType == 'On click') begin = ' begin = "click"'
                const repeatCount = (Number.isFinite(funcOptions.iterate) ? funcOptions.iterate : 'indefinite')
                const fill = (funcOptions.fillMode == 'Forwards' ? ' fill="freeze"' : '')
                // Assembling final object tags
                str = str.replaceAll(/ (style=".*?"|opacity="1"|fill-opacity="1"|fill-rule="nonzero"|stroke-opacity="1"|stroke-linecap="butt"|stroke-linejoin="miter"|stroke-miterlimit="4"|stroke-dashoffset="0"|stroke-dasharray="")/g, '')
                str = str.replace('" ', `" transform-origin="${-objBase[id].anchor[0]} ${-objBase[id].anchor[1]}" `)
                // Adding animation tags in it
                let animStr = ''
                if (animation.hasOwnProperty(id)) {
                    for (let type in animation[id]) {
                        const anim = animation[id][type]
                        const spline = (anim.keySplines ? ` calcMode="spline" keySplines="${anim.keySplines}"` : '')
                        const [propGroup, propName] = type.split('-')
                        const propAttr = animTypeMap[type]
                        const splitter = n => anim.values.split(';').map(v => v.split(' ')[n]).join(';')
                        if (propGroup == 'transform') {
                            if (propName == 'skew') {
                                animStr += `<animateTransform${begin} attributeName="transform" type="skewX" values="${splitter(0)}" keyTimes="${anim.keyTimes}"${spline} dur="${maxTime}" additive="sum" repeatCount="${repeatCount}"${fill}/>`
                                animStr += `<animateTransform${begin} attributeName="transform" type="skewY" values="${splitter(1)}" keyTimes="${anim.keyTimes}"${spline} dur="${maxTime}" additive="sum" repeatCount="${repeatCount}"${fill}/>`
                            } else {
                                animStr += `<animateTransform${begin} attributeName="transform" type="${propAttr}" values="${anim.values}" keyTimes="${anim.keyTimes}"${spline} dur="${maxTime}" additive="sum" repeatCount="${repeatCount}"${fill}/>`
                            }
                        } else {
                            if (type == 'shape-radius' || type == 'shape-size') {
                                animStr += `<animate${begin} attributeName="${propAttr[0]}" values="${splitter(0)}" keyTimes="${anim.keyTimes}"${spline} dur="${maxTime}" repeatCount="${repeatCount}"${fill}/>`
                                animStr += `<animate${begin} attributeName="${propAttr[1]}" values="${splitter(1)}" keyTimes="${anim.keyTimes}"${spline} dur="${maxTime}" repeatCount="${repeatCount}"${fill}/>`
                            } else {
                                animStr += `<animate${begin} attributeName="${propAttr}" values="${anim.values}" keyTimes="${anim.keyTimes}"${spline} dur="${maxTime}" repeatCount="${repeatCount}"${fill}/>`
                            }
                        }
                    }
                }
                str = str.replace('<|>', animStr)
                svgData[id] = str
            }
        
            const canvasMetric = [
                canvasElem.getAttribute('x'),
                canvasElem.getAttribute('y'),
                canvasElem.getAttribute('width'),
                canvasElem.getAttribute('height')
            ].join(' ')
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
            // Finally assembling actual svg file
            let str = `<svg id="${funcOptions.filename.replaceAll(' ', '-').replace('.svg', '').toLowerCase()}" xmlns="http://www.w3.org/2000/svg" viewBox="${canvasMetric}"${funcOptions.fillColor ? ` style="background-color:${funcOptions.fillColor}"` : ''}>`
            if ((dynDef = document.querySelector('defs#dynamic-definitions'))?.innerHTML) {
                const [start, end] = dynDef.outerHTML.split(dynDef.innerHTML)
                let inner = dynDef.innerHTML
                for (const id in animation) {
                    if (grad = objBase[id].strokeLinearGrad) {
                        if ((regex = new RegExp(`<linearGradient id="${id+'--stroke'}".*?Gradient>`)).exec(inner)) inner = inner.replace(regex, grad)
                        else inner += grad
                    }
                    if (grad = objBase[id].fillLinearGrad) {
                        if ((regex = new RegExp(`<linearGradient id="${id+'--fill'}".*?Gradient>`)).exec(inner)) inner = inner.replace(regex, grad)
                        else inner += grad
                    }
                    if (grad = objBase[id].strokeRadialGrad) {
                        if ((regex = new RegExp(`<radialGradient id="${id+'--stroke'}".*?Gradient>`)).exec(inner)) inner = inner.replace(regex, grad)
                        else inner += grad
                    }
                    if (grad = objBase[id].fillRadialGrad) {
                        if ((regex = new RegExp(`<radialGradient id="${id+'--fill'}".*?Gradient>`)).exec(inner)) inner = inner.replace(regex, grad)
                        else inner += grad
                    }
                }
                str += start + inner + end
            }
            if ((def = document.querySelector('defs#definitions'))?.innerHTML) str += def.outerHTML
            str += recSVGAssamble(objectList.querySelectorAll(':scope > :not([style*="display: none"])'))
            // Adding some custom functions for easier control over animations
            if (funcOptions.beginType == 'On function call') str += `<script>${[
                "const a=document.querySelectorAll('animate,animateTransform')",
                "let t=0",
                "document.start=document.beginAnimation=()=>{a.forEach(v=>v.beginElement());t=0}",
                "document.beginAnimationAt=o=>{a.forEach(v=>v.beginElementAt(o));t=-o}",
                "document.pause=document.endAnimation=()=>{t=document.time;a.forEach(v=>v.endElement())}",
                "document.endAnimationAt=o=>{t=document.time-o;a.forEach(v=>v.endElementAt(o))}",
                "document.resume=()=>document.beginAnimationAt(-t)",
                "document.startAt=(b=0,d=document.duration)=>{document.beginAnimationAt(-b);document.endAnimationAt(d+b)}",
                "Object.defineProperty(document,'repeatCount',{get(){return a[0].getAttribute('repeatCount')*1},set(v){a.forEach(e=>e.setAttribute('repeatCount',v))}})",
                "Object.defineProperty(document,'fillMode',{get(){return a[0].getAttribute('fill')},set(v){a.forEach(e=>e.setAttribute('fill',v))}})",
                "Object.defineProperty(document,'duration',{get(){return a[0].getAttribute('dur')},set(v){a.forEach(e=>e.setAttribute('dur',v))}})",
                "Object.defineProperty(document,'time',{get(){try{return a[0].getCurrentTime()-a[0].getStartTime()}catch(e){return t}},set(v){document.beginAnimationAt(-v);document.endAnimation()}})",
                "a[0].addEventListener('endEvent',()=>{t=document.duration})"
            ].join(';')}</script>`
            str += '</svg>'
            // Downloading assembled svg file
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
    
        //* PLUGINS CODE
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

/* Plugin creating template
{
  function install() {
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
    tmp.setExportFunction(() => console.log(`%cHere's your input data:%c\n${{
      filename: tmp.getValues()[0],
      beginType: tmp.getValues()[1],
      iterate: tmp.getValues()[2],
      fillMode: tmp.getValues()[3],
      fillColor: tmp.getValues()[4]
    }}`, 'font-weight:bold;color:orange'))
  }
}
*/