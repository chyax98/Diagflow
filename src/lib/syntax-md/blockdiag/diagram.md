---
type: diagram
description: 块状图,使用矩形块和箭头展示系统结构或流程
use_cases:
  - 系统架构图
  - 模块关系图
  - 简单流程图
  - 网络拓扑图
  - 组织结构图
  - 数据流图
---

基础语法:
- 声明: blockdiag { ... } 或 blockdiag 图名 { ... }
- 注释: // 单行注释 (C 风格)
- 节点定义: 节点ID [属性列表]; 如 A [label="开始"];
- 边定义: 节点A -> 节点B; (有向箭头)
- 边语法变体: A -> B -> C; (链式), A -> B, C; (分支)
- 边方向: -> 向前, <- 向后, <-> 双向, -- 无箭头连接
- 节点 label: 节点ID [label="显示文本"]; (不指定则显示节点ID)

节点形状 (shape):
- 基础形状:
  * box: 矩形 (默认)
  * circle: 圆形
  * ellipse: 椭圆
  * diamond: 菱形
  * roundedbox: 圆角矩形
  * square: 正方形
  * dots: 点点
  * note: 便签
  * mail: 信封
  * cloud: 云
  * actor: 人形

- 流程图形状:
  * flowchart.condition: 菱形判断
  * flowchart.database: 数据库
  * flowchart.terminator: 终止符 (圆角矩形)
  * flowchart.input: 输入框 (平行四边形)

节点样式:
- style: dotted (点线), dashed (虚线), solid (实线,默认), "3,3,3,3,15,3" (自定义虚线模式)
- color: "#RRGGBB" 或颜色名 (背景色)
- textcolor: 文本颜色
- width: 节点宽度 (默认 128)
- height: 节点高度 (默认 40)
- fontsize: 字体大小 (默认 11)
- numbered: 数字 (添加编号徽章)
- stacked: 堆叠效果 (3D 效果)
- icon: "图片路径" (添加图标,需要可访问的 URL)

分组语法 (group):
- 基础分组: group { 节点列表 }
- 命名分组: group 组名 { label="组标签"; 节点列表 }
- 分组属性:
  * color: 背景色
  * label: 标签文本
  * textcolor: 文本颜色
  * shape: line (线框) / box (边框,默认)
  * style: dotted / dashed / solid
- 嵌套分组: group { group { ... } } (支持多层嵌套,建议 ≤ 3 层)

边属性:
- label: "说明文本"
- style: dashed / dotted / solid
- color: 边的颜色
- thick: 粗线
- folded: 折叠边 (改变布局层级)
- dir: forward / back / both / none (箭头方向)

图全局属性:
- orientation: portrait (竖向) / landscape (横向,默认)
- node_width: 全局节点宽度
- node_height: 全局节点高度
- span_width: 水平间距
- span_height: 垂直间距
- default_shape: 默认形状
- default_fontsize: 默认字体大小

样式类定义:
- 定义类: class 类名 [属性列表];
- 使用类: 节点ID [class="类名"];
- 可重用样式,减少重复代码

## Kroki 限制
- ✓ 完全支持所有标准形状和样式
- ✓ 支持分组和嵌套
- ✓ 支持多语言文本 (UTF-8)
- ⚠️ 节点数建议 ≤ 50 个
- ⚠️ 嵌套层级建议 ≤ 3 层
- ❌ icon 和 background 图片需要可访问的 URL

## 常见错误
- 注释语法错误
  * ❌ # 这是注释 或 %% 这是注释
  * ✓ // 这是注释

- 节点ID包含特殊字符未加引号
  * ❌ my-node -> other-node;
  * ✓ "my-node" -> "other-node";

- 属性列表缺少分号
  * ❌ A [label="测试"]
  * ✓ A [label="测试"];

- 边定义缺少分号
  * ❌ A -> B
  * ✓ A -> B;

- group 未闭合
  * ❌ group { A; B;
  * ✓ group { A; B; }

- 多语言文本未加引号
  * ❌ 开始 -> 结束;
  * ✓ "开始" -> "结束";

- 属性名拼写错误
  * ❌ A [colour="red"];
  * ✓ A [color="red"];

实用技巧:
- 使用 class 定义重用样式
- 使用 group 组织相关节点
- 使用 numbered 添加序号
- 使用 orientation=portrait 适配竖向布局
- 使用 span_width/span_height 调整间距


## 示例

### 示例 1

```blockdiag
blockdiag {
  A [label="用户"];
  B [label="Web服务器"];
  C [label="应用服务器"];
  D [label="数据库", shape=flowchart.database];

  A -> B -> C -> D;
}
```

### 示例 2

```blockdiag
blockdiag {
  orientation = portrait;
  default_fontsize = 14;

  // 前端层
  group frontend {
    label = "前端层";
    color = "#e3f2fd";

    Web [label="Web应用", shape=roundedbox];
    Mobile [label="移动应用", shape=roundedbox];
  }

  // 后端层
  group backend {
    label = "后端层";
    color = "#c8e6c9";
    shape = line;
    style = dashed;

    API [label="API网关", shape=cloud];
    Service [label="业务服务", numbered=1];
    Cache [label="缓存", shape=ellipse, stacked];
  }

  // 数据层
  DB [label="数据库", shape=flowchart.database, color="#ffccbc"];

  // 连接关系
  Web -> API;
  Mobile -> API;
  API -> Service [label="REST", style=dashed];
  Service -> Cache [thick];
  Service -> DB [label="SQL", color="red"];
}
```

### 示例 3

```blockdiag
blockdiag {
  // 定义样式类
  class important [color=pink, style=dashed];
  class system [color=lightblue, shape=roundedbox];

  A [label="开始", shape=flowchart.terminator];
  B [label="输入数据", shape=flowchart.input];
  C [label="验证", shape=diamond, class="important"];
  D [label="处理", class="system"];
  E [label="保存", shape=flowchart.database];
  F [label="结束", shape=flowchart.terminator];

  A -> B -> C;
  C -> D [label="通过"];
  C -> B [label="失败", dir=back, style=dotted];
  D -> E -> F;

  group {
    label = "核心流程";
    color = "#f0f0f0";
    C; D; E;
  }
}
```

### 示例 4

```blockdiag
blockdiag {
  // 组织架构图示例
  default_fontsize = 12;

  CEO [label="CEO", shape=actor];
  CTO [label="CTO", shape=actor];
  CFO [label="CFO", shape=actor];

  group tech {
    label = "技术团队";
    color = "#e8f5e9";
    Dev1 [label="开发组"];
    QA1 [label="测试组"];
    Ops1 [label="运维组"];
  }

  group finance {
    label = "财务团队";
    color = "#fff3e0";
    Account [label="会计"];
    Audit [label="审计"];
  }

  CEO -> CTO;
  CEO -> CFO;
  CTO -> Dev1;
  CTO -> QA1;
  CTO -> Ops1;
  CFO -> Account;
  CFO -> Audit;
}
```
