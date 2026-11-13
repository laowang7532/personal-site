# 照片放这里

把照片（建议 jpg / webp，单张控制在 300KB 以内，宽度 1600px 左右）复制到本目录，然后改 `index.html` 里对应格子的背景图：

```html
<!-- 原来是 -->
<figure class="tile t1 reveal"><div class="ph"></div><figcaption>起飞前的十分钟</figcaption></figure>

<!-- 改成 -->
<figure class="tile t1 reveal"><div class="ph" style="background-image:url(assets/photos/01.jpg)"></div><figcaption>起飞前的十分钟</figcaption></figure>
```

八个格子对应 `t1` ~ `t8`。想换顺序或数量，直接调 `style.css` 里 `.wall` 的 grid 定义。

> 建议先压缩，照片墙一次加载八张大图很容易拖慢首屏。
