import * as d3 from 'd3'

class Olink {
  constructor () {
    const attrs = {
      id: `ID${Math.floor(Math.random() * 1000000)}`,
      svgWidth: '100%',
      svgHeight: '100%',
      marginTop: 0,
      marginBottom: 0,
      marginRight: 0,
      marginLeft: 0,
      container: '#canvas',
      defaultTextFill: '#ddd',
      nodeTextFill: 'white',
      defaultFont: 'Helvetica',
      backgroundColor: '#fafafa',
      data: null,
      depth: 180,
      duration: 250,
      strokeWidth: 3,
      dropShadowId: null,
      initialZoom: 1,
      onNodeClick: d => d,
      layout: 'h' // h, v
    }
    this.getChartState = () => attrs
    Object.keys(attrs).forEach((key) => {
      // @ts-ignore
      this[key] = function (_) {
        if (!arguments.length) {
          return attrs[key]
        } else {
          attrs[key] = _
        }
        return this
      }
    })
    this.initializeEnterExitUpdatePattern()
  }
  initializeEnterExitUpdatePattern () {
    d3.selection.prototype.patternify = function (params) {
      const container = this
      const selector = params.selector
      const elementTag = params.tag
      const data = params.data || [selector]
      let selection = container.selectAll('.' + selector).data(data, (d, i) => {
        if (typeof d === 'object') {
          if (d.id) {
            return d.id
          }
        }
        return i
      })
      selection.exit().remove()
      selection = selection.enter().append(elementTag).merge(selection)
      selection.attr('class', selector)
      return selection
    }
  }
  getNodeChildrenIds ({
    data,
    children,
    _children
  }, nodeIdsStore) {
    nodeIdsStore.push(data.nodeId)
    if (children) {
      children.forEach(d => {
        this.getNodeChildrenIds(d, nodeIdsStore)
      })
    }
    if (_children) {
      _children.forEach(d => {
        this.getNodeChildrenIds(d, nodeIdsStore)
      })
    }
    return nodeIdsStore
  }
  setZoomFactor (zoomLevel) {
    const attrs = this.getChartState()
    const calc = attrs.calc
    attrs.initialZoom = zoomLevel
    if (attrs.layout === 'h') {
      attrs.centerG.attr('transform', ` translate(${calc.nodeMaxWidth / 2}, ${calc.centerY}) scale(${attrs.initialZoom})`)
    } else {
      attrs.centerG.attr('transform', ` translate(${calc.centerX}, ${calc.nodeMaxHeight / 2}) scale(${attrs.initialZoom})`)
    }
  }
  clipSize (zoomW, zoomH) {
    zoomW = isNaN(zoomW) ? 0 : zoomW
    zoomH = isNaN(zoomH) ? 0 : zoomH
    const attrs = this.getChartState()
    const width = attrs.svgWidth - attrs.marginRight - attrs.marginLeft
    const height = attrs.svgHeight - attrs.marginBottom - attrs.marginTop
    return { x: (width - zoomW) / 2, y: (height - zoomH) / 2 }
  }
  render () {
    const attrs = this.getChartState()
    // eslint-disable-next-line no-unused-vars
    const thisObjRef = this
    const container = d3.select(attrs.container)
    const containerRect = container.node().getBoundingClientRect()
    if (containerRect.width > 0) attrs.svgWidth = containerRect.width
    if (containerRect.height > 0) attrs.svgHeight = containerRect.height
    this.setDropShadowId(attrs)
    const calc = {
      id: null,
      chartTopMargin: null,
      chartLeftMargin: null,
      chartWidth: null,
      chartHeight: null
    }
    calc.id = `ID${Math.floor(Math.random() * 1000000)}`
    calc.chartLeftMargin = attrs.marginLeft
    calc.chartTopMargin = attrs.marginTop
    calc.chartWidth = attrs.svgWidth - attrs.marginRight - calc.chartLeftMargin
    calc.chartHeight = attrs.svgHeight - attrs.marginBottom - calc.chartTopMargin
    attrs.calc = calc
    calc.nodeMaxWidth = d3.max(attrs.data, ({
      width
    }) => width)
    calc.nodeMaxHeight = d3.max(attrs.data, ({
      height
    }) => height)
    attrs.depth = calc.nodeMaxHeight + 100
    calc.centerX = calc.chartWidth / 2
    calc.centerY = calc.chartHeight / 2
    if (attrs.layout === 'h') {
      attrs.depth = calc.nodeMaxWidth + 100
    }
    const layouts = {
      treemap: null
    }
    attrs.layouts = layouts
    layouts.treemap = d3.tree().size([calc.chartWidth, calc.chartHeight])
    if (attrs.layout === 'h') {
      layouts.treemap.nodeSize([calc.nodeMaxHeight + 30, calc.nodeMaxWidth + attrs.depth])
    } else {
      layouts.treemap.nodeSize([calc.nodeMaxWidth + 100, calc.nodeMaxHeight + attrs.depth])
    }
    const behaviors = {
      zoom: null
    }
    behaviors.zoom = d3.zoom().on('zoom', (event, d) => this.zoomed(event, d))
    attrs.root = d3.stratify()
      .id(({ nodeId }) => nodeId)
      .parentId(({ parentNodeId }) => parentNodeId)(attrs.data)
    attrs.root.x0 = 0
    attrs.root.y0 = 0
    attrs.allNodes = attrs.layouts.treemap(attrs.root).descendants()
    attrs.allNodes.forEach(d => {
      Object.assign(d.data, {
        directSubordinates: d.children ? d.children.length : 0,
        totalSubordinates: d.descendants().length - 1
      })
    })
    const children = attrs.root.children
    if (children) {
      children.forEach(d => this.collapse(d))
      children.forEach(d => this.expandSomeNodes(d))
    }
    const svg = container
      .patternify({
        tag: 'svg',
        selector: 'svg-chart-container'
      })
      .attr('width', attrs.svgWidth)
      .attr('height', attrs.svgHeight)
      .attr('font-family', attrs.defaultFont)
      .call(behaviors.zoom)
      .on('dblclick.zoom', null)
      .attr('cursor', 'move')
      .style('background-image', 'linear-gradient(to right , #fcfaf8, #E3E7EC);padding-top:10px')
    attrs.svg = svg
    const chart = svg
      .patternify({
        tag: 'g',
        selector: 'chart'
      })
      .attr('transform', `translate(${calc.chartLeftMargin},${calc.chartTopMargin})`)
    attrs.centerG = chart.patternify({
      tag: 'g',
      selector: 'center-group'
    })
    .attr('transform', () => {
      if (attrs.layout === 'h') return `translate(${calc.nodeMaxWidth * 0.5},${calc.centerY}) scale(${attrs.initialZoom})`
      return `translate(${calc.centerX},${calc.nodeMaxHeight / 2}) scale(${attrs.initialZoom})`
    })
    attrs.chart = chart
    attrs.defs = svg.patternify({
      tag: 'defs',
      selector: 'image-defs'
    })
    const filterDefs = svg.patternify({
      tag: 'defs',
      selector: 'filter-defs'
    })
    const filter = filterDefs.patternify({
      tag: 'filter',
      selector: 'shadow-filter-element'
    })
      .attr('id', attrs.dropShadowId)
      .attr('y', `${-200}%`)
      .attr('x', `${-200}%`)
      .attr('height', `${400}%`)
      .attr('width', `${400}%`)
    filter.patternify({
      tag: 'feGaussianBlur',
      selector: 'feGaussianBlur-element'
    })
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', 5.1)
      .attr('result', 'blur')
    filter.patternify({
      tag: 'feOffset',
      selector: 'feOffset-element'
    })
      .attr('in', 'blur')
      .attr('result', 'offsetBlur')
      .attr('dx', 15.28)
      .attr('dy', 10.48)
      .attr('x', -350)
      .attr('y', -140)
    filter.patternify({
      tag: 'feFlood',
      selector: 'feFlood-element'
    })
      .attr('in', 'offsetBlur')
      .attr('flood-color', 'black')
      .attr('flood-opacity', 0.2)
      .attr('result', 'offsetColor')
    filter.patternify({
      tag: 'feComposite',
      selector: 'feComposite-element'
    })
      .attr('in', 'offsetColor')
      .attr('in2', 'offsetBlur')
      .attr('operator', 'in')
      .attr('result', 'offsetBlur')
    const feMerge = filter.patternify({
      tag: 'feMerge',
      selector: 'feMerge-element'
    })
    feMerge.patternify({
      tag: 'feMergeNode',
      selector: 'feMergeNode-blur'
    })
      .attr('in', 'offsetBlur')
    feMerge.patternify({
      tag: 'feMergeNode',
      selector: 'feMergeNode-graphic'
    })
      .attr('in', 'SourceGraphic')
    this.update(attrs.root)
    d3.select(window).on(`resize.${attrs.id}`, () => {
    // eslint-disable-next-line no-unused-vars
      const containerRect = container.node().getBoundingClientRect()
    })
    return this
  }
  setDropShadowId (d) {
    if (d.dropShadowId) return
    let id = `${d.id}-drop-shadow`
    // // eslint-disable-next-line no-undef @ts-ignore
    if (typeof DOM !== 'undefined') {
      // eslint-disable-next-line no-undef
      id = DOM.uid(d.id).id
    }
    Object.assign(d, {
      dropShadowId: id
    })
  }
  addNode (obj) {
    const attrs = this.getChartState()
    attrs.data.push(obj)
    this.updateNodesState()
    return this
  }
  removeNode (nodeId) {
    const attrs = this.getChartState()
    const node = attrs.allNodes.filter(({
      data
    }) => data.nodeId === nodeId)[0]
    if (node) {
      const nodeChildrenIds = this.getNodeChildrenIds(node, [])
      attrs.data = attrs.data.filter(d => !nodeChildrenIds.includes(d.nodeId))
      const updateNodesState = this.updateNodesState.bind(this)
      updateNodesState()
    }
  }
  update ({
    x0,
    y0,
    x,
    y
  }) {
    const attrs = this.getChartState()
    // eslint-disable-next-line no-unused-vars
    const calc = attrs.calc
    const treeData = attrs.layouts.treemap(attrs.root)
    const nodes = treeData.descendants()
      .map(d => {
        if (d.width) return d
        let imageWidth = 100
        let imageHeight = 100
        let imageBorderColor = 'steelblue'
        let imageBorderWidth = 0
        let imageRx = 0
        let imageCenterTopDistance = 0
        let imageCenterLeftDistance = 0
        let borderColor = 'steelblue'
        let backgroundColor = 'steelblue'
        const width = d.data.width
        const height = d.data.height
        let dropShadowId = 'none'
        if (d.data.nodeImage && d.data.nodeImage.shadow) {
          dropShadowId = `url(#${attrs.dropShadowId})`
        }
        if (d.data.nodeImage && d.data.nodeImage.width) {
          imageWidth = d.data.nodeImage.width
        }
        if (d.data.nodeImage && d.data.nodeImage.height) {
          imageHeight = d.data.nodeImage.height
        }
        if (d.data.nodeImage && d.data.nodeImage.borderColor) {
          imageBorderColor = this.rgbaObjToColor(d.data.nodeImage.borderColor)
        }
        if (d.data.nodeImage && d.data.nodeImage.borderWidth) {
          imageBorderWidth = d.data.nodeImage.borderWidth
        }
        if (d.data.nodeImage && d.data.nodeImage.centerTopDistance) {
          imageCenterTopDistance = d.data.nodeImage.centerTopDistance
        }
        if (d.data.nodeImage && d.data.nodeImage.centerLeftDistance) {
          imageCenterLeftDistance = d.data.nodeImage.centerLeftDistance
        }
        if (d.data.borderColor) {
          borderColor = this.rgbaObjToColor(d.data.borderColor)
        }
        if (d.data.backgroundColor) {
          backgroundColor = this.rgbaObjToColor(d.data.backgroundColor)
        }
        if (d.data.nodeImage &&
                    d.data.nodeImage.cornerShape.toLowerCase() === 'circle') {
          imageRx = Math.max(imageWidth, imageHeight)
        }
        if (d.data.nodeImage &&
                    d.data.nodeImage.cornerShape.toLowerCase() === 'rounded') {
          imageRx = Math.min(imageWidth, imageHeight) / 6
        }
        return Object.assign(d, {
          imageWidth,
          imageHeight,
          imageBorderColor,
          imageBorderWidth,
          borderColor,
          backgroundColor,
          imageRx,
          width,
          height,
          imageCenterTopDistance,
          imageCenterLeftDistance,
          dropShadowId
        })
      })
    const links = treeData.descendants().slice(1)
    nodes.forEach(d => (d.y = d.depth * attrs.depth))
    if (attrs.layout === 'h') {
      nodes.forEach(d => {
        const x = d.x
        d.x = d.y
        d.y = x
      })
    }
    const patternsSelection = attrs.defs.selectAll('.pattern')
      .data(nodes, ({
        id
      }) => id)
    const patternEnterSelection = patternsSelection.enter().append('pattern')
    const patterns = patternEnterSelection
      .merge(patternsSelection)
      .attr('class', 'pattern')
      .attr('height', 1)
      .attr('width', 1)
      .attr('id', ({
        id
      }) => id)
    // eslint-disable-next-line no-unused-vars
    const patternImages = patterns.patternify({
      tag: 'image',
      selector: 'pattern-image',
      data: d => [d]
    })
      .attr('x', 0)
      .attr('y', 0)
      .attr('height', ({
        imageWidth
      }) => imageWidth)
      .attr('width', ({
        imageHeight
      }) => imageHeight)
      .attr('xlink:href', ({
        data
      }) => data.nodeImage && data.nodeImage.url)
      .attr('viewbox', ({
        imageWidth,
        imageHeight
      }) => `0 0 ${imageWidth * 2} ${imageHeight}`)
      .attr('preserveAspectRatio', 'xMidYMin slice')
    patternsSelection.exit().transition().duration(attrs.duration).remove()
    const linkSelection = attrs.centerG.selectAll('path.link')
      .data(links, ({
        id
      }) => id)
    const linkEnter = linkSelection.enter()
      .insert('path', 'g')
      .attr('class', 'link')
      .attr('d', d => {
        const o = {
          x: x0,
          y: y0
        }
        if (attrs.layout === 'h') {
          return this.hdiagonal(o, o)
        } else {
          return this.diagonal(o, o)
        }
      })
    const linkUpdate = linkEnter.merge(linkSelection)
    linkUpdate
      .attr('fill', 'none')
      .attr('stroke-width', ({
        data
      }) => data.connectorLineWidth || 2)
      .attr('stroke', ({
        data
      }) => {
        if (data.connectorLineColor) {
          return this.rgbaObjToColor(data.connectorLineColor)
        }
        return 'green'
      })
      .attr('stroke-dasharray', ({
        data
      }) => {
        if (data.dashArray) {
          return data.dashArray
        }
        return ''
      })
    linkUpdate.transition()
      .duration(attrs.duration)
      .attr('d', d => {
        if (attrs.layout === 'h') {
          return this.hdiagonal(d, d.parent)
        } else {
          return this.diagonal(d, d.parent)
        }
      })
    // eslint-disable-next-line no-unused-vars
    const linkExit = linkSelection.exit().transition()
      .duration(attrs.duration)
      .attr('d', d => {
        const o = {
          x: x,
          y: y
        }
        if (attrs.layout === 'h') {
          return this.hdiagonal(o, o)
        } else {
          return this.diagonal(o, o)
        }
      })
      .remove()
    const nodesSelection = attrs.centerG.selectAll('g.node')
      .data(nodes, ({
        id
      }) => id)
    const nodeEnter = nodesSelection.enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${x0},${y0})`)
      .attr('cursor', 'pointer')
      .on('click', (event, {
        data
      }) => {
        if ([...event.srcElement.classList].includes('node-button-circle')) {
          return
        }
        attrs.onNodeClick(data)
      })
    nodeEnter
      .patternify({
        tag: 'rect',
        selector: 'node-rect',
        data: d => [d]
      })
      .style('fill', ({
        _children
      }) => _children ? 'lightsteelblue' : '#fff')
    const nodeUpdate = nodeEnter.merge(nodesSelection)
      .style('font', '12px sans-serif')
    const fo = nodeUpdate
      .patternify({
        tag: 'foreignObject',
        selector: 'node-foreign-object',
        data: d => [d]
      })

    const hasNodeImage = !!(attrs.data && attrs.data.length && attrs.data.length > 0 && attrs.data[0].nodeImage)
    if (hasNodeImage) {
      const nodeImageGroups = nodeEnter.patternify({
        tag: 'g',
        selector: 'node-image-group',
        data: d => [d]
      })
      nodeImageGroups
        .patternify({
          tag: 'rect',
          selector: 'node-image-rect',
          data: d => [d]
        })
    }
    fo.patternify({
      tag: 'xhtml:div',
      selector: 'node-foreign-object-div',
      data: d => [d]
    })

    this.restyleForeignObjectElements()
    const nodeButtonGroups = nodeEnter
      .patternify({
        tag: 'g',
        selector: 'node-button-g',
        data: d => [d]
      })
      .on('click', (event, d) => this.onButtonClick(event, d))
    nodeButtonGroups
      .patternify({
        tag: 'circle',
        selector: 'node-button-circle',
        data: d => [d]
      })
    nodeButtonGroups
      .patternify({
        tag: 'text',
        selector: 'node-button-text',
        data: d => [d]
      })
      .attr('pointer-events', 'none')
    nodeUpdate.transition()
      .attr('opacity', 0)
      .duration(attrs.duration)
      .attr('transform', ({
        x,
        y
      }) => `translate(${x},${y})`)
      .attr('opacity', 1)
    nodeUpdate.selectAll('.node-image-group')
      .attr('transform', ({
        imageWidth,
        width,
        imageHeight,
        height
      }) => {
        const x = -imageWidth / 2 - width / 2
        const y = -imageHeight / 2 - height / 2
        return `translate(${x},${y})`
      })
    nodeUpdate.select('.node-image-rect')
      .attr('fill', ({
        id
      }) => `url(#${id})`)
      .attr('width', ({
        imageWidth
      }) => imageWidth)
      .attr('height', ({
        imageHeight
      }) => imageHeight)
      .attr('stroke', ({
        imageBorderColor
      }) => imageBorderColor)
      .attr('stroke-width', ({
        imageBorderWidth
      }) => imageBorderWidth)
      .attr('rx', ({
        imageRx
      }) => imageRx)
      .attr('y', ({
        imageCenterTopDistance
      }) => imageCenterTopDistance)
      .attr('x', ({
        imageCenterLeftDistance
      }) => imageCenterLeftDistance)
      .attr('filter', ({
        dropShadowId
      }) => dropShadowId)
    nodeUpdate.select('.node-rect')
      .attr('width', ({
        data
      }) => data.width)
      .attr('height', ({
        data
      }) => data.height)
      .attr('x', ({
        data
      }) => -data.width / 2)
      .attr('y', ({
        data
      }) => -data.height / 2)
      .attr('rx', ({
        data
      }) => data.borderRadius || 0)
      .attr('stroke-width', ({
        data
      }) => data.borderWidth != null ? data.borderWidth : attrs.strokeWidth)
      .attr('cursor', 'pointer')
      .attr('stroke', ({
        borderColor
      }) => borderColor)
      .style('fill', ({
        backgroundColor
      }) => backgroundColor)
      .attr('filter', ({
        dropShadowId
      }) => dropShadowId)
    nodeUpdate.select('.node-button-g')
      .attr('transform', ({
        data
      }) => {
        if (attrs.layout === 'h') return `translate(${data.width / 2},0)`
        return `translate(0,${data.height / 2})`
      })
      .attr('opacity', ({
        children,
        _children
      }) => {
        if (children || _children) {
          return 1
        }
        return 0
      })
    nodeUpdate.select('.node-button-circle')
      .attr('r', ({ data }) => {
        return data.height ? data.height * 0.2 : 16
      })
      .attr('stroke-width', ({
        data
      }) => data.borderWidth || attrs.strokeWidth)
      .attr('fill', attrs.backgroundColor)
      .attr('stroke', ({
        borderColor
      }) => borderColor)
    nodeUpdate.select('.node-button-text')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr('fill', attrs.defaultTextFill)
      .attr('font-size', ({
        children
      }) => {
        if (children) return 20
        return 20
      })
      .text(({
        children
      }) => {
        if (children) return '-'
        return '+'
      })
      .attr('y', this.isEdge() ? 10 : 0)
    const nodeExitTransition = nodesSelection.exit()
      .attr('opacity', 1)
      .transition()
      .duration(attrs.duration)
      .attr('transform', d => `translate(${x},${y})`)
      .on('end', function () {
        d3.select(this).remove()
      })
      .attr('opacity', 0)
    nodeExitTransition.selectAll('.node-rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('x', 0)
      .attr('y', 0)
    nodeExitTransition.selectAll('.node-image-rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('x', ({
        width
      }) => width / 2)
      .attr('y', ({
        height
      }) => height / 2)
    nodes.forEach(d => {
      d.x0 = d.x
      d.y0 = d.y
    })
  }
  isEdge () {
    return window.navigator.userAgent.includes('Edge')
  }
  rgbaObjToColor ({
    red,
    green,
    blue,
    alpha
  }) {
    return `rgba(${red},${green},${blue},${alpha})`
  }
  hdiagonal (s, t) {
    const x = s.x
    const y = s.y
    const ex = t.x
    const ey = t.y
    const xrvs = ex - x < 0 ? -1 : 1
    const yrvs = ey - y < 0 ? -1 : 1
    const rdef = 35
    let r = Math.abs(ex - x) / 2 < rdef ? Math.abs(ex - x) / 2 : rdef
    r = Math.abs(ey - y) / 2 < r ? Math.abs(ey - y) / 2 : r
    // eslint-disable-next-line no-unused-vars
    const h = Math.abs(ey - y) / 2 - r
    const w = Math.abs(ex - x) / 2 - r
    return `
            M ${x} ${y}
            L ${x + w * xrvs} ${y}
            C ${x + w * xrvs + r * xrvs} ${y} 
              ${x + w * xrvs + r * xrvs} ${y} 
              ${x + w * xrvs + r * xrvs} ${y + r * yrvs}
            L ${x + w * xrvs + r * xrvs} ${ey - r * yrvs} 
            C ${x + w * xrvs + r * xrvs}  ${ey} 
              ${x + w * xrvs + r * xrvs}  ${ey} 
              ${ex - w * xrvs}  ${ey}
            L ${ex} ${ey}
          `
  }
  diagonal (s, t) {
    const x = s.x
    const y = s.y
    const ex = t.x
    const ey = t.y
    const xrvs = ex - x < 0 ? -1 : 1
    const yrvs = ey - y < 0 ? -1 : 1
    const rdef = 35
    const rInitial = Math.abs(ex - x) / 2 < rdef ? Math.abs(ex - x) / 2 : rdef
    const r = Math.abs(ey - y) / 2 < rInitial ? Math.abs(ey - y) / 2 : rInitial
    const h = Math.abs(ey - y) / 2 - r
    const w = Math.abs(ex - x) - r * 2
    const path = `
      M ${x} ${y}
      L ${x} ${y + h * yrvs}
      C  ${x} ${y + h * yrvs + r * yrvs} ${x} ${y + h * yrvs + r * yrvs} ${x + r * xrvs} ${y + h * yrvs + r * yrvs}
      L ${x + w * xrvs + r * xrvs} ${y + h * yrvs + r * yrvs}
      C ${ex}  ${y + h * yrvs + r * yrvs} ${ex}  ${y + h * yrvs + r * yrvs} ${ex} ${ey - h * yrvs}
      L ${ex} ${ey}
    `
    return path
  }
  restyleForeignObjectElements () {
    const attrs = this.getChartState()
    attrs.svg.selectAll('.node-foreign-object')
      .attr('width', ({
        width
      }) => width)
      .attr('height', ({
        height
      }) => height)
      .attr('x', ({
        width
      }) => -width / 2)
      .attr('y', ({
        height
      }) => -height / 2)
    attrs.svg.selectAll('.node-foreign-object-div')
      .style('width', ({
        width
      }) => `${width}px`)
      .style('height', ({
        height
      }) => `${height}px`)
      .style('color', 'white')
      .html(({
        data
      }) => data.template)
  }
  onButtonClick (event, d) {
    if (d.children) {
      d._children = d.children
      d.children = null
      this.setExpansionFlagToChildren(d, false)
    } else {
      d.children = d._children
      d._children = null
      d.children.forEach(({ data }) => (data.expanded = true))
    }
    this.update(d)
  }
  setExpansionFlagToChildren ({
    data,
    children,
    _children
  }, flag) {
    data.expanded = flag
    if (children) {
      children.forEach(d => {
        this.setExpansionFlagToChildren(d, flag)
      })
    }
    if (_children) {
      _children.forEach(d => {
        this.setExpansionFlagToChildren(d, flag)
      })
    }
  }
  setExpanded (id, expandedFlag) {
    const attrs = this.getChartState()
    const node = attrs.allNodes.filter(({
      data
    }) => data.nodeId === id)[0]
    if (node) node.data.expanded = expandedFlag
    attrs.root.children.forEach(d => this.expand(d))
    if (attrs.root._children) {
      attrs.root._children.forEach(d => this.expand(d))
    }
    attrs.root.children.forEach(d => this.collapse(d))
    attrs.root.children.forEach(d => this.expandSomeNodes(d))
    this.update(attrs.root)
  }
  expandSomeNodes (d) {
    if (d.data.expanded) {
      let parent = d.parent
      while (parent) {
        if (parent._children) {
          parent.children = parent._children
        }
        parent = parent.parent
      }
    }
    if (d._children) {
      d._children.forEach(ch => this.expandSomeNodes(ch))
    }
    if (d.children) {
      d.children.forEach(ch => this.expandSomeNodes(ch))
    }
  }
  updateNodesState () {
    const attrs = this.getChartState()
    attrs.root = d3.stratify()
      .id(({
        nodeId
      }) => nodeId)
      .parentId(({
        parentNodeId
      }) => parentNodeId)(attrs.data)
    attrs.root.x0 = 0
    attrs.root.y0 = 0
    attrs.allNodes = attrs.layouts.treemap(attrs.root).descendants()
    attrs.allNodes.forEach(d => {
      Object.assign(d.data, {
        directSubordinates: d.children ? d.children.length : 0,
        totalSubordinates: d.descendants().length - 1
      })
    })
    attrs.root.children && attrs.root.children.forEach(this.expand)
    attrs.root.children && attrs.root.children.forEach(d => this.collapse(d))
    attrs.root.children && attrs.root.children.forEach(ch => this.expandSomeNodes(ch))
    this.update(attrs.root)
  }
  collapse (d) {
    if (d.children) {
      d._children = d.children
      d._children.forEach(ch => this.collapse(ch))
      d.children = null
    }
  }
  expand (d) {
    if (d._children) {
      d.children = d._children
      d.children.forEach(ch => this.expand(ch))
      d._children = null
    }
  }
  zoomed (event, d) {
    const attrs = this.getChartState()
    const chart = attrs.chart
    const transform = event.transform
    attrs.lastTransform = transform
    chart.attr('transform', transform)
    if (this.isEdge()) {
      this.restyleForeignObjectElements()
    }
  }
}
export default Olink
