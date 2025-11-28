---
type: diagram
description: D2 通用图表，支持架构图、流程图、ER图等多种场景
use_cases:
  - 软件架构图
  - 系统设计图
  - 网络拓扑图
  - ER 图
  - 序列图
  - 类图
  - 流程图
---

## 核心语法

### 节点声明
- 基本语法: `节点ID` 或 `节点ID: 标签文本`
- ID 规则: 支持中文/英文/数字/下划线/短横线，带空格需引号
- 标签独立: `x.label: "显示文本"` (不同于 ID)
- 多节点一行: `x; y; z` (用分号分隔)

### 连接语法
- 单向: `A -> B`
- 双向: `A <-> B`
- 反向: `A <- B`
- 无箭头: `A -- B`
- 连接标签: `A -> B: "标签文本"`
- 连接链式: `A -> B -> C -> D`
- 引用连接: `(A -> B)[0]` (引用第一个 A->B 连接)

### 容器与嵌套
- 内联语法: `容器: {子节点1; 子节点2}`
- 块语法:
  ```
  容器: {
    子节点1
    子节点2
  }
  ```
- 路径引用: `容器.子节点` (访问嵌套节点)
- 父级引用: `_` (在容器内引用父级)

### 注释语法
- 单行注释: `# 这是注释`
- 块注释: `""" 多行注释 """`
- 注意: ❌ 不支持 `//` 或 `/* */` 或 `%%`

### 形状类型

基础形状:
- rectangle (默认), square, page, parallelogram, document
- cylinder, queue, package, stored_data
- diamond, oval, circle, hexagon, cloud
- step, callout, person

特殊形状:
- sql_table: ER 图表格
- class: UML 类图
- sequence_diagram: 序列图
- text, code: 纯文本/代码块
- image: 图片 (需配合 icon URL)

### 样式系统 (关键规则)

**样式前缀强制规则** (最常见致命错误):
- 所有样式必须使用 `style.` 前缀
- ❌ `节点.fill: "#f9f"`
- ✓ `节点.style.fill: "#f9f"`

**颜色值格式规则**:
- hex 颜色需引号: `style.fill: "#e3f2fd"`
- 颜色名不需要: `style.fill: red`
- 渐变需引号: `style.fill: "linear-gradient(#f69d3c, #3f87a6)"`
- 透明: `style.fill: transparent`

样式属性:
- 填充: `style.fill` (颜色/渐变)
- 边框: `style.stroke` (颜色)
- 边框宽度: `style.stroke-width: 1-15`
- 虚线: `style.stroke-dash: 0-10`
- 圆角: `style.border-radius: 0-20` (999 为药丸效果)
- 阴影: `style.shadow: true/false`
- 3D: `style.3d: true` (仅 rectangle/square/hexagon)
- 透明度: `style.opacity: 0-1`
- 填充图案: `style.fill-pattern: dots/lines/grain`
- 多层: `style.multiple: true`
- 双边框: `style.double-border: true` (仅 rectangle/oval)

文字样式:
- 字体: `style.font: mono`
- 字号: `style.font-size: 8-100`
- 颜色: `style.font-color: 颜色`
- 修饰: `style.bold/italic/underline: true`
- 大小写: `style.text-transform: uppercase/lowercase/title`

动画:
- `style.animated: true` (连接线动画)

## 高级语法

### 箭头自定义
- 源箭头: `source-arrowhead: 标签 {shape: 形状}`
- 目标箭头: `target-arrowhead: 标签 {shape: 形状}`
- 箭头形状:
  * triangle (默认), arrow, diamond, circle, box, cross
  * cf-one, cf-one-required (乌鸦脚单个)
  * cf-many, cf-many-required (乌鸦脚多个)
- 填充控制: `style.filled: true/false`

### Globs (通配符)
- 单层通配: `*.style.fill: red` (匹配当前层所有节点)
- 递归通配: `**.style.fill: red` (匹配所有层级)
- 全局通配: `***.style.fill: red` (跨 layers 和 imports)
- 连接通配: `* -> *` (所有连接，自动排除自连接)
- 过滤器: `*[shape=circle].style.fill: blue`

### 变量系统
- 定义变量:
  ```
  vars: {
    primary-color: "#1976d2"
    api-url: "https://api.example.com"
  }
  ```
- 使用变量: `style.fill: ${primary-color}`
- 嵌套变量: `vars.theme.bg: white` → `${theme.bg}`
- 展开变量: `...${vars-map}` (展开映射)

### Classes (样式类)
- 定义类:
  ```
  classes: {
    important: {
      style.fill: red
      style.bold: true
    }
  }
  ```
- 应用类: `节点.class: important`
- 多个类: `节点.class: [important, large]`
- 覆盖类: 节点自身样式优先于类样式

### SQL Tables
```
表名: {
  shape: sql_table
  id: int {constraint: PK}
  name: string {constraint: UNQ}
  user_id: int {constraint: FK}
}
```
- 约束: PK (主键), FK (外键), UNQ (唯一), 或自定义文本
- 多约束: `{constraint: [PK, UNQ]}`
- 外键连接: `表1.字段 -> 表2.字段`

### UML Classes
```
类名: {
  shape: class
  +publicField: string
  -privateField: int
  #protectedMethod(x int): bool
}
```
- 可见性: `+` 公开, `-` 私有, `#` 保护, 无前缀为公开
- 方法: 包含 `(` 的为方法
- 返回类型: 方法值为返回类型，无值为 void

### Sequence Diagrams
```
时序图: {
  shape: sequence_diagram
  alice -> bob: 消息内容
  bob -> alice: 响应内容
}
```
- 作用域规则: 序列图内所有 actor 共享同一作用域
- 顺序重要: 定义顺序即显示顺序
- 分组: 容器作为 group (fragment)
- 注释: actor 的子节点 (无连接) 为 note
- 自消息: `alice -> alice: 内部思考`
- 生命周期: `alice.span -> bob` (span 为激活框)

### Grid Diagrams
```
grid-rows: 3
grid-columns: 3
grid-gap: 20

A: 节点A
B: 节点B
```

### 布局引擎
- Dagre (默认): 分层/层次化布局，快速
- ELK: 更少边交叉，正交路由
- TALA: 专为软件架构设计 (Kroki 可能不支持)

### 方向控制
- 全局: `direction: up/down/left/right`
- 容器级 (仅 TALA): `容器.direction: right`

### 其他高级功能
- 尺寸: `width: 数字`, `height: 数字`
- 工具提示: `tooltip: "提示信息"`
- 链接: `link: "https://url"`
- 图标: `icon: "图标URL"`
- 位置: `top: 数字`, `left: 数字` (仅 TALA)
- 就近: `near: 节点ID` 或 `near: top-left/top-center/...`

## Kroki 限制

### 不支持的功能
- ❌ Imports (导入系统)
- ❌ Animations (交互动画，非 style.animated)
- ❌ Interactive (交互式工具提示/链接)
- ❌ TALA 布局引擎 (仅支持 dagre 和 elk)
- ❌ 变量展开语法 `...${x}` (可能不支持)
- ❌ 配置变量 `vars.d2-config`

### 支持的选项
通过 Kroki API 参数配置:
- `theme`: 0-301 主题 ID (如 0=default, 300=terminal)
- `layout`: dagre (默认) 或 elk
- `sketch`: true/false (手绘风格)

### 渲染限制
- 节点 ≤ 100 个，嵌套 ≤ 3 层，连接 ≤ 200 条 (超出会 504 超时)
- sql_table 和 class 支持基础语法，无法验证特定数据库语法
- 渐变色在某些浏览器可能显示异常
- 仅输出 PNG 格式 (Kroki D2 不支持 SVG)

### 已知问题
- ⚠️ ELK 布局对复杂图表渲染时间较长
- ⚠️ 连接的 `border-radius` 仅 ELK 有效
- ⚠️ 容器的 `width/height` 仅 ELK 支持

## 常见错误

### 样式前缀缺失 (最常见致命错误)
- ❌ `节点.fill: "#f9f"`
- ✓ `节点.style.fill: "#f9f"`

### hex 颜色值缺少引号
- ❌ `style.fill: #e3f2fd`
- ✓ `style.fill: "#e3f2fd"`

### 路径引用错误
- ❌ `容器-子节点 -> 其他节点` (会创建新的顶层节点)
- ✓ `容器.子节点 -> 其他节点`

### 注释语法错误
- ❌ `// 注释`, `/* 注释 */`, `%% 注释`
- ✓ `# 注释`

### 形状名称拼写错误
- ❌ `rec`, `cir`, `hex`
- ✓ `rectangle`, `circle`, `hexagon`

### 容器内引用错误
在序列图中:
- ❌ 直接用 actor 名 (会在当前 group 创建新 actor)
- ✓ 先在顶层声明 actor，group 内引用

### 变量语法错误
- ❌ `$variable` 或 `{{variable}}`
- ✓ `${variable}`

### 连接箭头配置无效
- ❌ 连接无端点时配置箭头 (如 `A -- B` 配置 arrowhead)
- ✓ 确保连接有方向 (`A -> B`)

## 示例

### 示例 1: 基础架构图

```d2
# 基础架构图：不同形状和样式
direction: right

用户: {
  shape: person
  style.fill: "#e3f2fd"
}

Web界面: {
  shape: rectangle
  style.fill: "#c8e6c9"
  style.stroke: "#2e7d32"
  style.stroke-width: 2
}

API网关: {
  shape: hexagon
  style.fill: "#fff9c4"
  style.shadow: true
}

数据库: {
  shape: cylinder
  style.fill: "#ffccbc"
}

用户 -> Web界面: "HTTPS"
Web界面 -> API网关: "REST API"
API网关 -> 数据库: "SQL查询"
```

### 示例 2: 容器嵌套与跨容器连接

```d2
# 容器嵌套：重要！必须使用完整路径
direction: down

# 定义三层架构
前端层: {
  style.fill: "#e3f2fd"

  浏览器: {shape: cloud}
  Web界面: {shape: rectangle}

  # 容器内连接
  浏览器 -> Web界面: "加载页面"
}

应用层: {
  style.fill: "#e8f5e9"

  API网关: {shape: hexagon}
  业务服务: {
    shape: rectangle
    style.multiple: true
  }

  API网关 -> 业务服务: "路由请求"
}

数据层: {
  style.fill: "#fff3e0"

  数据库: {
    shape: cylinder
  }
}

# 跨容器连接必须使用完整路径
前端层.Web界面 -> 应用层.API网关: "HTTP 请求"
应用层.业务服务 -> 数据层.数据库: "SQL 查询"

# 容器间连接
前端层 -> 应用层: "API 调用"
应用层 -> 数据层: "数据访问"
```

### 示例 3: SQL Tables (ER 图)

```d2
# ER 图：SQL Tables
direction: right

users: {
  shape: sql_table
  id: int {constraint: PK}
  username: string {constraint: UNQ}
  email: string
  created_at: timestamp
}

orders: {
  shape: sql_table
  id: int {constraint: PK}
  user_id: int {constraint: FK}
  total: decimal
  status: string
}

order_items: {
  shape: sql_table
  id: int {constraint: PK}
  order_id: int {constraint: FK}
  product_id: int {constraint: FK}
  quantity: int
}

products: {
  shape: sql_table
  id: int {constraint: PK}
  name: string
  price: decimal
}

# 外键关系
orders.user_id -> users.id
order_items.order_id -> orders.id
order_items.product_id -> products.id
```

### 示例 4: Sequence Diagram

```d2
# 序列图：用户登录流程
登录流程: {
  shape: sequence_diagram

  # 先声明所有 actor
  用户
  前端
  后端
  数据库

  # 交互流程
  用户 -> 前端: "输入账号密码"
  前端 -> 后端: "POST /login"

  验证阶段: {
    后端 -> 数据库: "查询用户"
    数据库 -> 后端: "返回用户数据"
    后端 -> 后端: "验证密码"
  }

  后端 -> 前端: "返回 JWT Token"
  前端 -> 用户: "跳转首页"
}
```

### 示例 5: 高级样式与 Globs

```d2
# 高级样式：渐变、动画、通配符
direction: right

# 全局样式：所有矩形节点使用蓝色
*[shape=rectangle].style.fill: "#e3f2fd"

# 变量定义
vars: {
  primary: "#1976d2"
  accent: "#ff5722"
}

# Classes 定义
classes: {
  重要: {
    style.stroke: ${accent}
    style.stroke-width: 3
    style.shadow: true
    style.bold: true
  }
}

入口: {
  shape: rectangle
  class: 重要
  style.fill: "linear-gradient(#ff6b6b, #feca57)"
}

处理器: {
  shape: hexagon
  style.fill: ${primary}
  style.opacity: 0.8
}

存储: {
  shape: cylinder
  style.fill: "#4caf50"
  style.double-border: true
}

入口 -> 处理器: "数据流" {
  style.stroke: ${accent}
  style.stroke-width: 4
  style.animated: true

  target-arrowhead: {
    shape: arrow
  }
}

处理器 -> 存储: "持久化" {
  style.stroke-dash: 5
}
```

### 示例 6: UML Class Diagram

```d2
# UML 类图
direction: down

Animal: {
  shape: class
  -name: string
  -age: int
  +getName(): string
  +setName(n string): void
  #reproduce(): void
}

Dog: {
  shape: class
  -breed: string
  +bark(): void
  +fetch(item string): bool
}

Cat: {
  shape: class
  -indoor: bool
  +meow(): void
  +scratch(): void
}

# 继承关系
Dog -> Animal: "" {
  source-arrowhead: {
    shape: triangle
    style.filled: false
  }
}

Cat -> Animal: "" {
  source-arrowhead: {
    shape: triangle
    style.filled: false
  }
}
```

### 示例 7: 自定义箭头

```d2
# 自定义箭头：ER 图关系
direction: right

学生: {
  shape: rectangle
  style.fill: "#e3f2fd"
}

课程: {
  shape: rectangle
  style.fill: "#c8e6c9"
}

# 多对多关系
学生 -> 课程: "选修" {
  source-arrowhead: N {
    shape: cf-many
  }
  target-arrowhead: M {
    shape: cf-many
  }
  style.stroke-dash: 3
}

教师: {
  shape: rectangle
  style.fill: "#fff9c4"
}

# 一对多关系
教师 -> 课程: "教授" {
  source-arrowhead: 1 {
    shape: cf-one-required
  }
  target-arrowhead: N {
    shape: cf-many-required
  }
}
```
