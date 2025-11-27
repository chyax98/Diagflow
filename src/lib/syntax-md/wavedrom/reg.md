---
type: reg
description: 寄存器图，展示寄存器位字段定义
use_cases:
  - 寄存器文档
  - 位字段定义
  - 配置寄存器
  - 硬件规格
  - 数据手册
  - 控制状态寄存器
---

## 核心语法
- 根对象: { reg: [...], config: {...} }
- reg 数组: 每个元素描述一个位字段
- 字段格式: { name: "字段名", bits: 位宽, attr: "属性", type: 类型 }
- bits: 位宽数值，所有字段 bits 总和通常为 8/16/32/64
- 位顺序: 从右到左（LSB 到 MSB，低位在右）

字段属性：
- attr: "RO" 只读（Read Only）
- attr: "WO" 只写（Write Only）
- attr: "RW" 读写（Read Write）
- attr: "WC" 写清除（Write to Clear）
- attr: "WS" 写置位（Write to Set）
- attr: "W1C" 写 1 清除
- attr: "W1S" 写 1 置位
- attr: "RC" 读清除（Read to Clear）
- 属性控制字段显示颜色

字段类型：
- type: 0-8 控制字段背景样式（条纹、填充等）
- type: 0 默认样式
- type: 1-8 不同的视觉样式
- 用于区分不同功能的字段

空位和保留位：
- { bits: N } 不指定 name，表示保留位
- 用于占位，确保 bits 总和正确
- 保留位通常显示为灰色

配置选项：
- config: { bits: 总位宽, lanes: 行数, vspace: 垂直间距, hspace: 水平间距 }
- bits: 显示位编号（0-31）
- lanes: 将位字段分为多行显示（如 32 位寄存器显示为 2 行 16 位）
- vspace: 字段之间的垂直间距
- hspace: 字段之间的水平间距

字段顺序：
- reg 数组顺序：从右到左（LSB 到 MSB）
- 第一个元素是最低位（bit 0）
- 最后一个元素是最高位（bit N-1）

多行显示：
- 使用 config: { lanes: N } 分行
- lanes: 2 表示分为 2 行显示
- 自动计算每行位数

位标签：
- config: { bits: 32 } 显示位编号
- 显示在寄存器上方或下方
- 便于快速定位位位置

## 高级语法
- 字段样式: attr 控制颜色，type 控制条纹
  * attr: "RO" 通常显示为灰色
  * attr: "RW" 通常显示为蓝色
  * attr: "WC" 通常显示为黄色
  * type: 0-8 控制不同的背景样式

- 字节对齐: 使用空位 { bits: N } 实现字节边界对齐
  * 例如：{ bits: 8 } 占位一个字节

- 位分组: 将相关位放在一起
  * 先定义低位字段
  * 再定义高位字段

- 命名约定: 使用清晰的字段名
  * 简短但有意义
  * 大写字母或驼峰命名
  * 避免特殊字符

## Kroki 限制
- ✓ 完全支持 reg 语法
- ✓ 支持所有 attr 属性
- ✓ 支持 type 样式
- ✓ 支持 config 配置
- ⚠️ 总位宽建议 ≤ 64 位
- ⚠️ 字段数量建议 ≤ 16 个
- ⚠️ lanes 过多可能显示不清

## 常见错误
- bits 总和不匹配
  * ❌ 32 位寄存器，字段 bits 总和不等于 32
  * ✓ 确保所有字段 bits 加起来等于目标位宽

- attr 值拼写错误
  * ❌ attr: "R/W" 或 attr: "readonly"
  * ✓ attr: "RW" 或 attr: "RO"（严格大写）

- 缺少空位占位
  * ❌ 跳过某些位没有定义
  * ✓ 使用 { bits: N } 明确标记保留位

- JSON 格式错误
  * ❌ 最后一个字段后多余逗号
  * ✓ 严格遵循 JSON 语法

- 字段顺序错误
  * ❌ 从左到右定义（MSB 到 LSB）
  * ✓ 从右到左定义（LSB 到 MSB）

- type 值超范围
  * ❌ type: 10（超出 0-8 范围）
  * ✓ type: 5（在有效范围内）

最佳实践：
- 按位顺序定义字段（LSB 到 MSB）
- 使用保留位占位
- attr 属性清晰标注
- 字段名简短有意义
- 使用 config 添加位编号
- 复杂寄存器分行显示
- 相关字段使用相同 type
- 添加注释说明字段功能


## 示例

### 示例 1

```json
{
  "reg": [
    {"name": "IPO", "bits": 8, "attr": "RO"},
    {"bits": 7},
    {"name": "BRK", "bits": 5, "attr": "RW", "type": 4},
    {"name": "CPK", "bits": 1},
    {"name": "Clear", "bits": 3},
    {"bits": 8}
  ]
}
```

### 示例 2

```json
{
  "reg": [
    {"name": "Mode", "bits": 2, "attr": "RW", "type": 2},
    {"name": "Enable", "bits": 1, "attr": "RW"},
    {"bits": 1},
    {"name": "Status", "bits": 4, "attr": "RO", "type": 5},
    {"name": "Address", "bits": 8, "attr": "RW"},
    {"name": "Data", "bits": 16, "attr": "RW", "type": 3}
  ],
  "config": {"bits": 32}
}
```

### 示例 3

```json
{
  "reg": [
    {"name": "EN", "bits": 1, "attr": "RW"},
    {"name": "RST", "bits": 1, "attr": "WO"},
    {"bits": 2},
    {"name": "MODE", "bits": 4, "attr": "RW", "type": 2},
    {"name": "IRQ", "bits": 8, "attr": "WC", "type": 4},
    {"name": "ADDR", "bits": 16, "attr": "RW", "type": 3}
  ],
  "config": {
    "bits": 32,
    "lanes": 1
  }
}
```

### 示例 4

```json
{
  "reg": [
    {"name": "D0", "bits": 1, "attr": "RW"},
    {"name": "D1", "bits": 1, "attr": "RW"},
    {"name": "D2", "bits": 1, "attr": "RW"},
    {"name": "D3", "bits": 1, "attr": "RW"},
    {"bits": 4},
    {"name": "EN0", "bits": 1, "attr": "RW"},
    {"name": "EN1", "bits": 1, "attr": "RW"},
    {"bits": 6},
    {"name": "STATUS", "bits": 8, "attr": "RO", "type": 5},
    {"name": "CTRL", "bits": 8, "attr": "RW", "type": 3}
  ],
  "config": {
    "bits": 32,
    "lanes": 2
  }
}
```

### 示例 5

```json
{
  "reg": [
    {"name": "START", "bits": 1, "attr": "WS"},
    {"name": "STOP", "bits": 1, "attr": "WS"},
    {"name": "BUSY", "bits": 1, "attr": "RO"},
    {"name": "ERROR", "bits": 1, "attr": "RC"},
    {"bits": 4},
    {"name": "COUNT", "bits": 8, "attr": "RW", "type": 2}
  ],
  "config": {
    "bits": 16
  }
}
```
