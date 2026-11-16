# 照片放这里

把照片（建议 jpg / webp，单张控制在 300KB 以内，宽度 1600px 左右）复制到本目录
`public/assets/photos/`，构建后会发布到站点的 `/assets/photos/`。

然后在 `src/components/PhotoWall.vue` 的 `tiles` 数组里给对应格子加 `image`：

```ts
const tiles: Tile[] = [
  { caption: '起飞前的十分钟', image: '/assets/photos/01.jpg' },
  { caption: '正射影像的另一种看法' },
  // ...
]
```

八个格子对应 `t1` ~ `t8`；不填 `image` 时使用内置渐变占位图。

> 建议先压缩，照片墙一次加载八张大图很容易拖慢首屏。
