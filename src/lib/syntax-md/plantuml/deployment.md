---
type: deployment
description: 部署图，展示系统物理部署和网络拓扑
use_cases:
  - 系统部署架构
  - 物理拓扑
  - 云架构设计
  - 混合云部署
  - 容器编排
---

## 核心语法
- 声明包裹:
  * @startuml 和 @enduml 包裹所有内容

- 节点类型:
  * actor - 参与者
  * agent - 代理
  * artifact - 软件工件/应用
  * boundary - 边界
  * card - 卡片
  * circle - 圆形
  * cloud - 云服务
  * collections - 集合
  * component - 组件
  * control - 控制器
  * database - 数据库
  * entity - 实体
  * file - 文件
  * folder - 文件夹
  * frame - 框架容器
  * hexagon - 六边形
  * interface - 接口
  * label - 标签
  * node - 通用节点/服务器
  * package - 软件包
  * person - 人物
  * process - 进程
  * queue - 队列
  * rectangle - 矩形
  * stack - 堆栈
  * storage - 存储设备
  * usecase - 用例

- 部署关系:
  * 嵌套方式（推荐）:
    node "服务器" {
        artifact "应用"
    }
  * 连接方式:
    node "服务器"
    artifact "应用"
    "服务器" -> "应用"

- 通信协议:
  * --> 有向通信
  * -- 双向通信
  * 标签标注协议
  * 示例: [前端] --> [后端] : HTTP
  * 示例: [应用] --> [数据库] : JDBC

- 嵌套层次:
  * 层次结构: package/cloud → node → artifact
  * 最大层级 ≤3 层
  * 示例:
    cloud "阿里云" {
        node "Web服务器" {
            artifact "Nginx"
        }
    }

- 短形式语法:
  * actor: :actor_name:
  * component: [component_name]
  * interface: () "interface_name"
  * usecase: (usecase_name)

- 连接样式:
  * 基础线型:
    - -- 实线
    - == 粗线
    - .. 虚线
    - ~~ 波浪线
  * 箭头头部类型:
    - --> 标准箭头
    - --* 星号
    - --o 空心圆
    - --+ 加号
    - --# 方块
    - -->> 双箭头
    - --0 数字0
    - --^ 插入符
    - --(0 带括号的0
  * 圆形连接:
    - 0--0, )--(, 0)--(0, 0)--, -0)-, -(0)-, -(0-, --(0, --(

- 网络标记:
  * 语法: [节点1] --> [节点2] : 协议
  * 示例: [客户端] --> [服务器] : HTTPS

## 高级语法
- 构造型:
  * node "名称" <<stereotype>>
  * 示例: node "Web服务器" <<Apache>>
  * 示例: database "MySQL" <<5.7>>

- 链接颜色:
  * [节点1] -[#red]-> [节点2]
  * [节点1] -[#0000FF]-> [节点2]

- 链接样式（括号内联）:
  * [节点1] -[bold]-> [节点2]
  * [节点1] -[dashed]-> [节点2]
  * [节点1] -[#red,dashed,thickness=2]-> [节点2]

- 方向控制:
  * 全局: top to bottom direction（默认）
  * 全局: left to right direction
  * 箭头方向: left/right/up/down
  * 示例: [A] -left-> [B]

- 注释语法:
  * 单行注释: ' 注释内容
  * 多行注释: /' 注释内容 '/
  * ❌ 不支持 // 或 #（这是其他引擎的语法）

- 图表注释:
  * note left of 节点: 注释
  * note right of 节点: 注释
  * note "注释" as N1
  * 节点 .. N1

- 混合图元:
  * allowmixing - 允许混合类图、部署图元素
  * json JSON { "key": "value" } - 嵌入JSON数据显示

- 内联样式:
  * node n #颜色;line:蓝色;line.dotted;text:红色
  * 示例: node n #aliceblue;line:blue;line.dotted;text:red

- 全局样式:
  * <style> ... </style> 块
  * 示例:
    <style>
    componentDiagram {
      BackGroundColor palegreen
      LineThickness 2
    }
    node {
      BackGroundColor #ff6644
    }
    </style>

## 设计建议
- 节点数量: 5-20 个
- 工件数量: 10-40 个
- 嵌套层级: ≤3 层
- 连接数量: 10-30 条
- 清晰标注协议和端口

### 典型部署场景
- 单机部署: 所有组件在一个节点
- 三层部署: Web层、应用层、数据层
- 云原生: 容器、微服务、负载均衡
- 混合云: 本地+云服务
- 高可用: 主从、集群、负载均衡

性能约束（Kroki）:
- 节点 ≤40 个
- 工件 ≤60 个
- 嵌套 ≤3 层
- 连接 ≤80 条
- 复杂系统应按地域/层级/功能拆分

## Kroki 限制
- ✓ 支持所有节点类型
- ✓ 支持嵌套结构
- ✓ 支持通信协议标注
- ⚠️ 节点建议 ≤30 个
- ⚠️ 工件建议 ≤50 个
- ⚠️ 避免过度嵌套

常见错误排查：
1. 注释语法错误
   ❌ // 这是注释（错误，PlantUML 不支持 //）
   ❌ # 这是注释（错误，PlantUML 不支持 #）
   ✓ ' 这是单行注释
   ✓ /' 这是多行注释 '/

2. 嵌套未闭合
   ❌ node "服务器" {
          artifact "应用"
      （缺少闭合括号）
   ✓ node "服务器" {
          artifact "应用"
      }

3. 节点名称未引号
   ❌ node Web服务器
   ✓ node "Web服务器"

4. 工件和节点混淆
   ❌ node "Nginx"（Nginx 是软件，应该是 artifact）
   ✓ artifact "Nginx"

5. 协议标注位置错误
   ❌ HTTP : [A] --> [B]
   ✓ [A] --> [B] : HTTP

6. 过度嵌套
   ❌ 5-6 层嵌套
   ✓ ≤3 层嵌套


## 示例

### 示例 1

```plantuml
@startuml
cloud "阿里云" {
    node "Web服务器" {
        artifact "Nginx"
        artifact "前端应用"
    }

    node "应用服务器" {
        artifact "Spring Boot应用"
    }

    database "MySQL数据库" {
        artifact "用户数据"
    }
}

actor 用户
用户 --> [Nginx] : HTTPS
[Nginx] --> [前端应用]
[前端应用] --> [Spring Boot应用] : REST API
[Spring Boot应用] --> [MySQL数据库] : JDBC
@enduml
```

### 示例 2

```plantuml
@startuml
cloud "云服务" {
    node "负载均衡器" <<AWS ELB>> {
        artifact "ELB"
    }

    package "Web层" {
        node "Web服务器1" {
            artifact "Nginx"
            artifact "静态资源"
        }
        node "Web服务器2" {
            artifact "Nginx"
            artifact "静态资源"
        }
    }

    package "应用层" {
        node "应用服务器1" {
            artifact "Spring Boot"
        }
        node "应用服务器2" {
            artifact "Spring Boot"
        }
    }

    package "数据层" {
        database "MySQL主库" <<Master>> {
            artifact "用户数据"
        }
        database "MySQL从库" <<Slave>> {
            artifact "用户数据副本"
        }
        database "Redis集群" {
            artifact "缓存数据"
        }
    }
}

actor 用户

用户 --> [ELB] : HTTPS
[ELB] --> [Web服务器1]
[ELB] --> [Web服务器2]

[Web服务器1] --> [应用服务器1] : HTTP
[Web服务器2] --> [应用服务器2] : HTTP

[应用服务器1] --> [MySQL主库] : JDBC
[应用服务器2] --> [MySQL主库] : JDBC

[应用服务器1] --> [Redis集群] : 读写
[应用服务器2] --> [Redis集群] : 读写

[MySQL主库] --> [MySQL从库] : 主从复制

note right of [ELB]: 负载均衡
note right of [Redis集群]: 缓存层
note bottom of [MySQL从库]: 只读副本
@enduml
```

### 示例 3

```plantuml
@startuml
node "本地机房" {
    node "边缘节点" {
        artifact "IoT网关"
    }
}

cloud "混合云架构" {
    package "公有云（AWS）" {
        node "API网关" {
            artifact "Kong"
        }

        node "容器集群" {
            artifact "K8s Master"
            artifact "Worker节点1"
            artifact "Worker节点2"
        }

        database "RDS" {
            artifact "PostgreSQL"
        }
    }

    package "私有云" {
        node "内部服务器" {
            artifact "遗留系统"
        }

        storage "NAS存储" {
            artifact "文件数据"
        }
    }
}

[IoT网关] --> [API网关] : MQTT over TLS
[API网关] --> [K8s Master] : gRPC
[K8s Master] --> [Worker节点1]
[K8s Master] --> [Worker节点2]
[Worker节点1] --> [RDS] : SQL
[Worker节点2] --> [RDS] : SQL

[API网关] ..> [遗留系统] : VPN
[Worker节点1] --> [NAS存储] : NFS

note right of [IoT网关]: 边缘计算节点
note top of [K8s Master]: 容器编排
note right of [遗留系统]: 通过VPN访问
@enduml
```
