---
type: container
description: C4模型Level 2 - 容器图，展示系统内部的技术构成和容器划分
use_cases:
  - 系统架构
  - 技术栈
  - 服务划分
  - 数据存储
  - 部署单元
---

核心语法要点：
- 强制包裹: @startuml 和 @enduml
- 强制库引用: !include <C4/C4_Container>
  * 注意: Container库继承Context，可定义Person和System
  * ❌ Kroki 不支持在线 URL include（安全限制）

容器元素定义：
- 通用容器: Container(alias, "名称", "技术栈", "描述", ?sprite, ?tags, ?link, ?baseShape)
- 数据库容器: ContainerDb(alias, "数据库名", "数据库类型", "描述", ?sprite, ?tags, ?link)
- 消息队列容器: ContainerQueue(alias, "队列名", "队列技术", "描述", ?sprite, ?tags, ?link)
- 外部容器: Container_Ext(alias, "外部服务", "技术", "描述", ?sprite, ?tags, ?link, ?baseShape)
- 外部数据库: ContainerDb_Ext(alias, "外部DB", "类型", "描述", ?sprite, ?tags, ?link)
- 外部队列: ContainerQueue_Ext(alias, "外部MQ", "技术", "描述", ?sprite, ?tags, ?link)

容器边界：
- Container_Boundary(alias, "名称") { ... }
- 可嵌套多个Container定义
- 边界用于模块划分

技术栈标注：
- 第三个参数必须包含技术栈信息
- 示例: "Spring Boot", "React 18", "PostgreSQL 14", "Redis 6.2"
- 技术栈会在容器内显示为 [技术栈] 格式

关系定义（继承Context）：
- Rel(from, to, "描述", "技术/协议")
- 常见协议: "REST/JSON", "gRPC", "GraphQL", "JDBC", "AMQP", "WebSocket"
- 异步消息: 使用Rel_Back表示回调或消息响应

布局和样式：
- LAYOUT_TOP_DOWN() - 上下布局（默认）
- LAYOUT_LEFT_RIGHT() - 左右布局
- LAYOUT_LANDSCAPE() - 横向布局（适合宽屏）
- SHOW_LEGEND() - 显示图例
- HIDE_STEREOTYPE() - 隐藏<<container>>标签
- SetDefaultLegendEntries("人员\n系统\n容器") - 自定义图例

高级特性：
- 容器组: ContainerBoundary 可嵌套多层
- 技术债标记: 使用$tags标记"legacy"或"deprecated"
- 性能关键路径: 使用AddRelTag()定义特殊关系样式
- 数据流方向: 使用Rel_U/D/L/R明确数据流向

最佳实践：
- 粒度控制: 5-15个容器，避免过度复杂
- 技术栈一致性: 统一技术栈命名格式（含版本号）
- 分层清晰: 前端/后端/数据层分离
- 职责单一: 每个容器职责明确

常见模式：
- 三层架构: Web容器 -> API容器 -> 数据库容器
- 微服务: 多个独立容器 + 消息队列 + 服务网格
- 前后端分离: SPA容器 + API Gateway容器 + 多个微服务容器


## 示例

### 示例 1

```plantuml
@startuml
!include <C4/C4_Container>

title 电商系统容器架构

Person(customer, "客户")
Person(admin, "管理员")

System_Boundary(ecommerce, "电商系统") {
  Container(webapp, "Web应用", "React 18", "用户界面")
  Container(mobile, "移动APP", "Flutter 3.0", "iOS/Android客户端")
  Container(api, "API网关", "Spring Cloud Gateway", "统一入口、路由和认证")

  Container_Boundary(services, "业务服务层") {
    Container(user_svc, "用户服务", "Spring Boot 3.0", "用户管理")
    Container(product_svc, "商品服务", "Spring Boot 3.0", "商品管理")
    Container(order_svc, "订单服务", "Spring Boot 3.0", "订单处理")
  }

  ContainerDb(user_db, "用户数据库", "PostgreSQL 14", "用户数据")
  ContainerDb(product_db, "商品数据库", "MySQL 8.0", "商品库存")
  ContainerDb(order_db, "订单数据库", "MySQL 8.0", "订单数据")
  ContainerQueue(mq, "消息队列", "RabbitMQ 3.11", "异步消息")
  Container(cache, "缓存层", "Redis 7.0", "会话和热点数据")
}

System_Ext(payment, "支付网关", "第三方支付")

Rel(customer, webapp, "访问", "HTTPS")
Rel(customer, mobile, "使用", "HTTP/2")
Rel(webapp, api, "调用API", "REST/JSON")
Rel(mobile, api, "调用API", "REST/JSON")

Rel(api, user_svc, "转发", "HTTP")
Rel(api, product_svc, "转发", "HTTP")
Rel(api, order_svc, "转发", "HTTP")

Rel(user_svc, user_db, "读写", "JDBC")
Rel(product_svc, product_db, "读写", "JDBC")
Rel(order_svc, order_db, "读写", "JDBC")

Rel(order_svc, mq, "发送订单事件", "AMQP")
Rel(user_svc, cache, "缓存用户", "Redis Protocol")
Rel(order_svc, payment, "支付请求", "REST API")

Rel(admin, webapp, "管理后台", "HTTPS")

LAYOUT_TOP_DOWN()
SHOW_LEGEND()
@enduml
```

### 示例 2

```plantuml
@startuml
!include <C4/C4_Container>

title 微服务架构容器图

Person(user, "用户")

System_Boundary(platform, "微服务平台") {
  Container(web, "Web门户", "Next.js 13", "服务端渲染")
  Container(bff, "BFF层", "Node.js 18 + Express", "前端专用API")
  Container(gateway, "API网关", "Kong 3.0", "流量入口")

  Container_Boundary(microservices, "微服务集群") {
    Container(auth, "认证服务", "Go 1.20", "JWT鉴权")
    Container(user_ms, "用户服务", "Java 17 + Spring Boot", "用户CRUD")
    Container(notify, "通知服务", "Python 3.11 + FastAPI", "邮件/短信")
  }

  ContainerDb(pg, "主数据库", "PostgreSQL 15", "业务数据")
  ContainerQueue(kafka, "事件总线", "Kafka 3.3", "领域事件")
  Container(redis, "分布式缓存", "Redis Cluster 7.0", "缓存和会话")
  Container(es, "搜索引擎", "Elasticsearch 8.0", "全文检索")
}

Rel(user, web, "访问")
Rel(web, bff, "调用", "GraphQL")
Rel(bff, gateway, "路由", "HTTP/2")
Rel(gateway, auth, "认证", "gRPC")
Rel(gateway, user_ms, "用户操作", "REST")
Rel(gateway, notify, "发送通知", "REST")

Rel(auth, redis, "存储Token", "Redis Protocol")
Rel(user_ms, pg, "读写", "JDBC")
Rel(user_ms, kafka, "发布事件", "Kafka Protocol")
Rel(notify, kafka, "订阅事件", "Kafka Protocol")
Rel(user_ms, es, "索引用户", "HTTP API")

LAYOUT_TOP_DOWN()
SHOW_LEGEND()
@enduml
```

### 示例 3

```plantuml
@startuml
!include <C4/C4_Container>

title Serverless架构容器图

AddContainerTag("lambda", $bgColor="", $fontColor="", $borderColor="", $shadowing="", $shape="", $sprite="lambda", $legendText="Lambda函数")
AddContainerTag("managed", $bgColor="#e1f5e1", $legendText="托管服务")

Person(user, "用户")

System_Boundary(serverless, "Serverless应用") {
  Container(cdn, "CDN", "CloudFront", "静态资源分发", $tags="managed")
  Container(spa, "单页应用", "Vue 3 + Vite", "静态前端")
  Container(apigw, "API网关", "AWS API Gateway", "HTTP路由", $tags="managed")

  Container(auth_fn, "认证函数", "Node.js 18 Lambda", "用户认证", $tags="lambda")
  Container(api_fn, "API函数", "Python 3.11 Lambda", "业务逻辑", $tags="lambda")
  Container(event_fn, "事件处理", "Go 1.20 Lambda", "异步任务", $tags="lambda")

  ContainerDb(dynamo, "NoSQL数据库", "DynamoDB", "用户和业务数据", $tags="managed")
  ContainerDb(s3, "对象存储", "S3", "文件存储", $tags="managed")
  ContainerQueue(sqs, "消息队列", "SQS", "异步消息", $tags="managed")
}

Rel(user, cdn, "访问")
Rel(cdn, spa, "分发")
Rel(spa, apigw, "调用", "HTTPS")
Rel(apigw, auth_fn, "鉴权", "Lambda触发")
Rel(apigw, api_fn, "业务处理", "Lambda触发")
Rel(api_fn, dynamo, "读写", "AWS SDK")
Rel(api_fn, s3, "上传文件", "AWS SDK")
Rel(api_fn, sqs, "发送消息", "AWS SDK")
Rel(sqs, event_fn, "触发", "事件驱动")
Rel(event_fn, dynamo, "更新状态", "AWS SDK")

SHOW_LEGEND()
@enduml
```
