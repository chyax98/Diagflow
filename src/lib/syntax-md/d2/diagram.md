---
type: diagram
description: D2通用图表，支持流程图、架构图、时序图等多种场景
use_cases:
  - 流程图
  - 架构图
  - 时序图
  - 类图
  - ER图
  - 网络图
  - 网格图
---

## 核心语法
- 样式前缀强制规则(最常见致命错误): 所有样式必须使用style.前缀，如style.fill: "#bbdefb"，否则编译失败
- 颜色值格式(常见错误): hex 颜色需要引号，颜色名不需要
  * ✓ style.fill: "#e3f2fd"（hex 需要引号）
  * ✓ style.fill: red（颜色名不需要引号）
  * ❌ style.fill: #e3f2fd（无引号的 hex 会编译失败）
- 节点ID命名: 中文/英文/数字/下划线/短横线，带空格需引号，避免特殊符号[]{}():.
- 路径引用: 访问嵌套节点必须用.连接，如系统.前端层.Web界面 -> 系统.应用层.API网关
- 注释: 只支持 # 单行注释，不支持 // 和 /* */
- 容器嵌套: 使用{}定义容器，可嵌套节点/容器，如父容器:{子节点1:标签1; 子节点2}
- 连接符: A->B单向, A<->B双向, A<-B反向，标签: A->B:"HTTP请求"
- 布局方向: direction:right/down/left/up

节点形状（完整列表）：
- 基础形状: rectangle, square, page, parallelogram, document
- 数据相关: cylinder, queue, package, stored_data
- 流程控制: diamond, oval, circle, hexagon
- 特殊形状: step, callout, person, cloud, text, code
- 高级形状: sql_table, class, image（需要icon URL）, c4-person（C4模型专用）
- 形状语法: 节点名.shape: circle
- 1:1比例形状: circle, square（宽高始终相等）

完整样式系统：
- 填充: style.fill: 颜色/渐变
  * hex 颜色需引号: style.fill: "#f9f"
  * 颜色名无需引号: style.fill: red
  * 渐变: style.fill: "linear-gradient(#f69d3c, #3f87a6)"（渐变需要引号）
  * 透明: style.fill: transparent
  * 填充图案: style.fill-pattern: dots/lines/grain/none
- 边框: style.stroke: 颜色
  * 边框宽度: style.stroke-width: 1-15
  * 边框样式: style.stroke-dash: 0-10（虚线间距）
  * 圆角: style.border-radius: 0-20（999为药丸效果）
- 特效: style.shadow: true/false
  * 3D效果: style.3d: true（仅rectangle/square）
  * 多层效果: style.multiple: true
  * 双边框: style.double-border: true（仅rectangle和oval）
- 文字: style.font: mono
  * 字号: style.font-size: 8-100
  * 颜色: style.font-color: 颜色
  * 修饰: style.bold/italic/underline: true/false
  * 大小写: style.text-transform: uppercase/lowercase/title/none
- 透明度: style.opacity: 0-1
- 动画: style.animated: true（连接线动画）

### 连接样式
- 线条: style.stroke: 颜色
- 宽度: style.stroke-width: 1-15
- 虚线: style.stroke-dash: 0-10
- 圆角拐点: style.border-radius: 0-20（仅ELK布局引擎有效）
- 动画: style.animated: true

### 箭头样式
自定义连接的箭头形状和标签：
- 源箭头: source-arrowhead: 标签 {shape: 形状}
- 目标箭头: target-arrowhead: 标签 {shape: 形状}
- 箭头形状: triangle（默认）, arrow, diamond, circle, box, cf-one, cf-one-required, cf-many, cf-many-required, cross
- 填充控制: style.filled: true/false（适用于 triangle, diamond, circle, box）
- 注意: 箭头标签应简短，不经过自动布局，长标签可能碰撞其他对象

根级样式（整体图表）：
- 背景: style.fill: 颜色
- 背景图案: style.fill-pattern: dots/lines/grain/none
- 边框: style.stroke: 颜色
- 边框宽度: style.stroke-width: 数字
- 边框样式: style.stroke-dash: 数字
- 双边框: style.double-border: true

## 高级语法
- 尺寸控制: width: 数字, height: 数字
- 标签独立: label: "显示文本"（不同于ID）
- 工具提示: tooltip: "提示信息"
- 链接: link: "https://url"
- 图标: icon: "图标URL"
- 网格布局: grid-rows: 数字, grid-columns: 数字（用于网格图）
- 间距控制: grid-gap: 数字（网格单元格间距）

导入系统：
- 常规导入: x: @文件名（导入整个文件作为值）
- 展开导入: ...@文件名（在当前作用域展开文件内容）
- 部分导入: ...@文件名.路径（仅导入特定对象）
- 相对路径: @../文件名（相对于当前文件）
- 绝对路径: @/绝对/路径/文件名

## Kroki限制
- 节点 ≤ 100个，嵌套 ≤ 3层，连接 ≤ 200条（超出504超时）
- ❌ 不支持变量系统、导入系统、泛型语法<T>
- ⚠️ sql_table 和 class 支持基础语法，但无法验证具体数据库供应商的语法
- ⚠️ 渐变色在某些浏览器可能显示异常
- ⚠️ 某些高级布局引擎（如 TALA）功能可能受限，建议用 direction 控制布局

## 常见错误
- 样式前缀缺失:
  * ❌ 节点.fill: "#f9f"
  * ✓ 节点.style.fill: "#f9f"
- hex 颜色值缺少引号（最常见错误）:
  * ❌ style.fill: #e3f2fd
  * ✓ style.fill: "#e3f2fd"
- 路径引用错误:
  * ❌ 容器-子节点 -> 其他节点
  * ✓ 容器.子节点 -> 其他节点
- 形状拼写错误:
  * ❌ rec, cir, hex
  * ✓ rectangle, circle, hexagon
- 注释格式错误:
  * ❌ // 注释, /* 注释 */, %% 注释
  * ✓ # 注释


## 示例

### 基础架构图：不同形状

```d2
# 基础架构图：不同形状
direction: right

用户: {shape: person}
Web界面: {
  shape: rectangle
  style.fill: "#e3f2fd"
}
API网关: {
  shape: hexagon
  style.fill: "#c8e6c9"
}
数据库: {
  shape: cylinder
  style.fill: "#ffccbc"
}

用户 -> Web界面: HTTPS
Web界面 -> API网关: REST API
API网关 -> 数据库: SQL查询
```

### 高级样式：边框、阴影、渐变

```d2
# 高级样式：边框、阴影、渐变
direction: down

重要节点: {
  shape: rectangle
  style.fill: "linear-gradient(#ff6b6b, #feca57)"
  style.stroke: "#c0392b"
  style.stroke-width: 3
  style.shadow: true
  style.3d: true
  style.font-size: 18
  style.bold: true
}

数据存储: {
  shape: stored_data
  style.fill: "#74b9ff"
  style.stroke-dash: 5
  style.border-radius: 8
}

云服务: {
  shape: oval
  style.fill: "#dfe6e9"
  style.opacity: 0.8
  style.double-border: true
}

重要节点 -> 数据存储: "写入" {
  style.stroke: "#e74c3c"
  style.stroke-width: 4
  style.animated: true
}

重要节点 -> 云服务: "同步" {
  style.stroke-dash: 3
}
```

### 完整形状展示

```d2
# 完整形状展示（基础形状）
direction: right

基础形状: {
  r: rectangle {shape: rectangle; style.fill: "#e3f2fd"}
  s: 正方形 {shape: square; style.fill: "#f3e5f5"}
  p: 页面 {shape: page; style.fill: "#e8f5e9"}
  pa: 平行四边形 {shape: parallelogram; style.fill: "#fff3e0"}
  d: 文档 {shape: document; style.fill: "#fce4ec"}

  r -> s -> p -> pa -> d
}

数据形状: {
  c: 圆柱 {shape: cylinder; style.fill: "#e0f7fa"}
  q: 队列 {shape: queue; style.fill: "#f1f8e9"}
  pk: 包 {shape: package; style.fill: "#fff9c4"}
  sd: 存储 {shape: stored_data; style.fill: "#ffe0b2"}

  c -> q -> pk -> sd
}

流程形状: {
  dm: 菱形 {shape: diamond; style.fill: "#e1f5fe"}
  o: 椭圆 {shape: oval; style.fill: "#f9fbe7"}
  ci: 圆形 {shape: circle; style.fill: "#fce4ec"}
  h: 六边形 {shape: hexagon; style.fill: "#e8eaf6"}
  cl: 云 {shape: cloud; style.fill: "#e0f2f1"}

  dm -> o -> ci -> h -> cl
}

特殊形状: {
  st: 步骤 {shape: step; style.fill: "#fff9c4"}
  ca: 标注 {shape: callout; style.fill: "#ffe0b2"}
  pe: 人物 {shape: person; style.fill: "#f8bbd0"}

  st -> ca -> pe
}

基础形状 -> 数据形状
数据形状 -> 流程形状
流程形状 -> 特殊形状
```

### 容器嵌套与路径引用

```d2
# 容器嵌套与路径引用（重要！）
direction: down

# 定义容器和内部节点
前端层: {
  style.fill: "#e3f2fd"
  浏览器: {shape: cloud}
  Web界面: {shape: rectangle}
}

应用层: {
  style.fill: "#e8f5e9"
  API网关: {shape: hexagon}
  业务服务: {shape: rectangle}
}

数据层: {
  style.fill: "#fff3e0"
  数据库: {shape: cylinder}
}

# 跨容器连接必须使用完整路径
# ❌ 错误: 浏览器 -> Web界面（会创建新的顶层节点）
# ✓ 正确: 前端层.浏览器 -> 前端层.Web界面

前端层.浏览器 -> 前端层.Web界面: "HTTPS"
前端层.Web界面 -> 应用层.API网关: "HTTP请求"
应用层.API网关 -> 应用层.业务服务: "业务调用"
应用层.业务服务 -> 数据层.数据库: "SQL查询"

# 容器间连接可以直接用容器名
前端层 -> 应用层: "API调用"
应用层 -> 数据层: "数据访问"
```

### 网格布局示例

```d2
# 网格布局示例
grid-rows: 3
grid-columns: 3

A: 节点A {style.fill: "#e3f2fd"}
B: 节点B {style.fill: "#c8e6c9"}
C: 节点C {style.fill: "#fff9c4"}
D: 节点D {style.fill: "#ffccbc"}
E: 节点E {style.fill: "#d1c4e9"}
F: 节点F {style.fill: "#b2dfdb"}
G: 节点G {style.fill: "#f8bbd0"}
H: 节点H {style.fill: "#c5e1a5"}
I: 节点I {style.fill: "#ffecb3"}
```

### 箭头自定义示例

```d2
# 箭头自定义示例
direction: right

数据库 -> API: "查询" {
  source-arrowhead: 1 {
    shape: diamond
    style.filled: true
  }
  target-arrowhead: N {
    shape: cf-many
  }
}

用户 <-> 服务器: "HTTPS" {
  source-arrowhead: 客户端 {
    shape: circle
    style.filled: true
  }
  target-arrowhead: 服务端 {
    shape: arrow
  }
}

A -> B: "流程" {
  target-arrowhead: {
    shape: triangle
    style.filled: false
  }
}
```
