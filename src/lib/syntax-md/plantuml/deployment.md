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
  * node "节点名称" - 通用节点/服务器
  * artifact "工件名称" - 软件工件/应用
  * database "数据库名称" - 数据库
  * cloud "云服务名称" - 云服务
  * folder "文件夹名称" - 文件夹
  * package "软件包名称" - 软件包
  * frame "框架名称" - 框架容器
  * storage "存储名称" - 存储设备

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

- 连接样式:
  * 实线: -- 或 -->
  * 虚线: .. 或 ..>
  * 粗线: == 或 ==>

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

- 链接样式:
  * [节点1] -[bold]-> [节点2]
  * [节点1] -[dashed]-> [节点2]

- 标签位置:
  * left/right/up/down
  * 示例: [A] -left-> [B]

- 注释:
  * note left of 节点: 注释
  * note right of 节点: 注释
  * note "注释" as N1
  * 节点 .. N1

- 参与者:
  * actor 用户
  * 用于表示系统外部用户

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
1. 嵌套未闭合
   ❌ node "服务器" {
          artifact "应用"
      （缺少闭合括号）
   ✓ node "服务器" {
          artifact "应用"
      }

2. 节点名称未引号
   ❌ node Web服务器
   ✓ node "Web服务器"

3. 工件和节点混淆
   ❌ node "Nginx"（Nginx 是软件，应该是 artifact）
   ✓ artifact "Nginx"

4. 协议标注位置错误
   ❌ HTTP : [A] --> [B]
   ✓ [A] --> [B] : HTTP

5. 过度嵌套
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
