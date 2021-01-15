# olink
d3 organization tree chart

## usage

1. node data structure

```ts
{
  nodeId: string | number,
  nodeName: string,
  parentNodeId: string | number,
  width: number,
  height: number,
  borderWidth: number,
  borderRadius: number,
  borderColor: {
    red: number,
    green: number,
    blue: number,
    alpha: number
  },
  backgroundColor: {
    red: number,
    green: number,
    blue: number,
    alpha: number
  },
  connectorLineColor: {
    red: number,
    green: number,
    blue: number,
    alpha: number
  },
  connectorLineWidth: number,
  expanded: boolean,
  template: string
}
```

2. render example: 
```ts
new Olink()
  .container('#container')
  .data(data)
  .svgWidth(375)
  .initialZoom(0.55)
  .onNodeClick(node => console.info('sel', node))
  .render()
```
