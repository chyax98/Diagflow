---
type: timing
description: 数字时序图，展示数字信号的时序关系
use_cases:
  - 数字电路设计
  - 时序验证
  - 协议时序
  - 硬件接口文档
  - FPGA/ASIC 设计
  - 通信协议说明
---

## 核心语法
- 注释: WaveDrom 使用 JSON 格式，不支持传统注释语法（// 或 # 或 /* */）
- 根对象: { signal: [...], config: {...}, head: {...}, foot: {...} }
- signal 数组: 每个元素是一个波形通道（WaveLane）
- 通道格式: { name: "信号名", wave: "波形字符串", data: [...], node: "..." }
- 分隔线: 在 signal 数组中插入 {} 或 [] 作为分组分隔
- 说明文本: 使用 name 或 data 字段添加描述性文本

波形字符：
- p 下降沿时钟（负脉冲）: ┐┌┐┌
- P 上升沿时钟（正脉冲）: ┌┐┌┐
- n 负下降沿时钟: ┘└┘└
- N 负上升沿时钟: └┘└┘
- 0 低电平
- 1 高电平
- x 未知态（灰色）
- z 高阻态（三态，虚线）
- = 数据（需配合 data 数组）
- 2-9 数据态（0-9 对应 data 数组索引）
- u 未定义（问号）
- d 下降沿（↓）
- . 保持前一状态（延续）
- | 在波形字符串中添加，用于 gap 分隔

时钟信号：
- wave: "p....." 下降沿时钟（常用于 CLK#）
- wave: "P....." 上升沿时钟（常用于 CLK）
- wave: "n....." 负下降沿时钟
- wave: "N....." 负上升沿时钟

数据总线：
- wave: "x.==.=x", data: ["值1", "值2", "值3"]
- wave: "x.234x", data: ["A", "B", "C", "D"] （2/3/4 是索引）
- 数据长度必须匹配 = 的数量

周期倍数：
- wave: "2p3." 表示 2 个 p 周期，3 个 . 周期
- 简化长波形字符串
- 展开后所有信号长度必须一致

节点和边沿标注：
- node: "....a...b" 在波形上标记节点（a/b 是节点名称）
- edge: ["a~>b 延迟", "b-~c 建立时间"]
- 箭头类型:
  * ~ 波浪箭头（时序关系）
  * - 直线箭头（数据流）
  * ~> 波浪箭头向右
  * -> 直线箭头向右
  * <~ 波浪箭头向左
  * <- 直线箭头向左

相位偏移：
- phase: 0.5 信号相位偏移半个周期
- phase: 1.0 偏移一个完整周期
- 用于展示不同时钟域的时序关系

头部配置：
- head: { text: "标题", tick: 起始刻度, every: 刻度间隔, tock: 刻度数量 }
- text: 时序图标题
- tick: 起始刻度值（默认 0）
- every: 每隔多少周期显示一次刻度（默认 1）
- tock: 刻度显示数量

底部配置：
- foot: { text: "说明", tick: 起始刻度, every: 刻度间隔, tock: 刻度数量 }
- 语法与 head 相同，显示在波形底部

配置选项：
- config: { hscale: 水平缩放, skin: 皮肤样式 }
- hscale: 控制水平拉伸（如 2 表示 2 倍宽度）
- skin: "default" | "narrow" | "lowkey"

分组和分隔：
- signal 中插入 {} 作为分隔线
- signal 中插入 ["组名", ...] 进行分组
- 分组可嵌套

## 高级语法
- 多周期: wave: "x.==..=.x", data: ["A", "B"] 数据保持多个周期
- 组合标记: wave: "0.1..0|1.0" 使用 | 分隔不同部分
- 条件波形: 使用 . 保持状态，创建复杂时序
- 嵌套分组: signal: [["组1", {...}], ["组2", {...}]]

## Kroki 限制
- ✓ 完全支持所有波形字符
- ✓ 支持 data 数组和 edge 标注
- ✓ 支持 config 和 head/foot 配置
- ✓ 支持 phase 和 period 参数
- ⚠️ 通道数建议 ≤ 20 个
- ⚠️ 时间单位数建议 ≤ 30 个
- ⚠️ 复杂 edge 标注可能重叠

## 常见错误
- 尝试添加注释
  * ❌ { "signal": [ // 时钟信号（JSON 不支持注释）
  * ❌ { "signal": [ # 时钟信号（JSON 不支持注释）
  * ✓ 使用 name 字段添加说明：{ "name": "CLK (时钟信号)", "wave": "p..." }

- wave 字符串长度不一致
  * ❌ 不同信号的 wave 长度不同会导致对齐错误
  * ✓ 确保所有信号的 wave 字符串长度相同（包括周期倍数展开后）

- data 数组长度不匹配
  * ❌ wave: "x.==.=x", data: ["A", "B"] (data 需要 3 个元素)
  * ✓ wave: "x.==.=x", data: ["A", "B", "C"]

- edge 时间点不存在
  * ❌ edge 引用未定义的节点名称
  * ✓ 先用 node 定义节点，再在 edge 中引用

- JSON 格式错误
  * ❌ 缺少引号、逗号、括号不匹配
  * ✓ 使用标准 JSON 格式，最后一个元素后不加逗号

- 周期倍数错误
  * ❌ wave: "2p" 其他信号 wave: "..." (长度 3)
  * ✓ 所有信号展开后长度一致

- 节点名称冲突
  * ❌ 多个信号使用相同的节点名称
  * ✓ 节点名称全局唯一

最佳实践：
- 时钟信号放在第一行
- 使用 {} 分隔不同逻辑组
- data 数组使用有意义的名称
- edge 标注简短明了
- 复杂时序分组显示
- 使用 head 添加标题和刻度
- 保持 wave 字符串对齐（便于编辑）
- 相关信号放在一起


## 示例

### 示例 1

```json
{
  "signal": [
    {"name": "clk", "wave": "p.....|..."},
    {"name": "data", "wave": "x.345x|=.x", "data": ["A", "B", "C", "D"]},
    {"name": "valid", "wave": "01...0|1.0"}
  ],
  "head": {
    "text": "基础时序图",
    "tick": 0
  }
}
```

### 示例 2

```json
{
  "signal": [
    {"name": "clk", "wave": "P.......", "node": ".a..b.."},
    {},
    {"name": "write", "wave": "01.0...."},
    {"name": "addr", "wave": "x3.4x...", "data": ["A1", "A2"]},
    {"name": "wdata", "wave": "x3.4x...", "data": ["D1", "D2"]},
    {},
    {"name": "read", "wave": "0...10.."},
    {"name": "rdata", "wave": "x.....4x", "data": ["Q2"]}
  ],
  "edge": [
    "a~>b 时钟周期"
  ],
  "head": {
    "text": "读写时序",
    "tick": 0,
    "every": 2
  }
}
```

### 示例 3

```json
{
  "signal": [
    {"name": "clk", "wave": "p......."},
    {"name": "cs", "wave": "01.....0"},
    {"name": "wr", "wave": "0.1...0."},
    {"name": "addr", "wave": "x.=...x.", "data": ["0x1234"]},
    {"name": "data", "wave": "x.====x.", "data": ["D0", "D1", "D2", "D3"]}
  ],
  "head": {
    "text": "SPI 写操作",
    "tick": 0,
    "every": 1
  }
}
```

### 示例 4

```json
{
  "signal": [
    ["时钟",
      {"name": "clk", "wave": "P......."},
      {"name": "clk_en", "wave": "0101...."}
    ],
    {},
    ["控制信号",
      {"name": "reset", "wave": "10......"},
      {"name": "enable", "wave": "0.1....."}
    ],
    {},
    ["数据信号",
      {"name": "data_in", "wave": "x..=====", "data": ["A", "B", "C", "D", "E"]},
      {"name": "data_out", "wave": "x....===", "data": ["A", "B", "C"]}
    ]
  ],
  "head": {
    "text": "流水线时序（分组示例）",
    "tick": 0
  }
}
```

### 示例 5

```json
{
  "signal": [
    {"name": "clk", "wave": "P........", "node": ".a.b.c.d.e"},
    {},
    {"name": "req", "wave": "01.0.1..0"},
    {"name": "ack", "wave": "0..1.0.1."},
    {"name": "data", "wave": "x.3x.4..x", "data": ["REQ1", "REQ2"]}
  ],
  "edge": [
    "a~>b 请求延迟",
    "c->d 响应时间",
    "b-~c 建立时间"
  ],
  "head": {
    "text": "握手协议（带标注）",
    "tick": 0
  }
}
```

### 示例 6

```json
{
  "signal": [
    {"name": "pclk", "wave": "P......."},
    {"name": "psel", "wave": "01....0."},
    {"name": "penable", "wave": "0.1...0."},
    {"name": "pwrite", "wave": "01....0."},
    {"name": "paddr", "wave": "x.==..x.", "data": ["ADDR"]},
    {"name": "pwdata", "wave": "x.==..x.", "data": ["DATA"]},
    {"name": "pready", "wave": "0...10.."}
  ],
  "head": {
    "text": "APB 写时序",
    "tick": 0,
    "every": 1
  },
  "config": {
    "hscale": 2
  }
}
```
