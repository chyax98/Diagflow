---
type: component
description: C4模型Level 3 - 组件图，展示容器内部的组件划分和职责分配
use_cases:
  - 模块划分
  - 职责分离
  - 组件依赖
  - 接口设计
  - 代码组织
---

核心语法要点：
- 强制包裹: @startuml 和 @enduml
- 强制库引用: !include <C4/C4_Component>
  * 注意: Component库继承Container和Context
  * ❌ Kroki 不支持在线 URL include（安全限制）

组件元素定义：
- 通用组件: Component(alias, "名称", "技术栈", "描述", ?sprite, ?tags, ?link, ?baseShape)
- 数据库组件: ComponentDb(alias, "数据库", "类型", "描述", ?sprite, ?tags, ?link)
- 队列组件: ComponentQueue(alias, "队列", "技术", "描述", ?sprite, ?tags, ?link)
- 外部组件: Component_Ext(alias, "外部组件", "技术", "描述", ?sprite, ?tags, ?link, ?baseShape)
- 外部数据库: ComponentDb_Ext(alias, "外部数据库", "类型", "描述", ?sprite, ?tags, ?link)
- 外部队列: ComponentQueue_Ext(alias, "外部队列", "技术", "描述", ?sprite, ?tags, ?link)

组件边界：
- Component_Boundary(alias, "组件组名") { ... }
- 用于逻辑分组（如Controller层、Service层、Repository层）
- 可嵌套多层边界

组件粒度：
- 粒度: 5-20个组件，保持可读性
- 层次: 通常3-4层（Controller/Service/Repository/Infrastructure）
- 职责: 每个组件单一职责原则（SRP）

典型分层模式：
1. 表示层: Controller组件（处理HTTP请求）
2. 业务层: Service组件（业务逻辑）
3. 数据层: Repository组件（数据访问）
4. 基础设施: Utility组件（工具类）

关系定义：
- 组件间依赖: Rel(from, to, "调用", "方法调用/接口")
- 常见模式: "方法调用", "依赖注入", "事件发布", "接口实现"
- 数据流: 使用Rel_U/D/L/R明确调用方向

技术栈标注：
- 第三个参数指定技术或框架
- 示例: "Spring MVC", "Spring Data JPA", "MyBatis", "Hibernate"
- 模式: "Repository Pattern", "Factory Pattern", "Singleton"

布局建议：
- LAYOUT_TOP_DOWN() - 适合分层架构（默认）
- LAYOUT_LEFT_RIGHT() - 适合管道/过滤器模式
- LAYOUT_LANDSCAPE() - 横向布局
- SHOW_LEGEND() - 显示图例
- 使用Lay_Distance()调整间距

最佳实践：
- 层次一致: 不混用Context/Container元素
- 依赖方向: 自上而下，避免循环依赖
- 接口隔离: 组件间通过接口交互
- 命名规范: 组件名反映职责（如UserController, UserService）

常见架构模式：
- 三层架构: Controller -> Service -> Repository
- 六边形架构: Application -> Domain <- Infrastructure
- CQRS: Command Handler <-> Query Handler
- 事件驱动: Event Publisher -> Event Bus -> Event Handler

## Kroki 限制
- ❌ 不支持 Component_Boundary：Kroki 无法渲染边界语法，会报 "Syntax Error"
- ❌ 不支持 Container_Boundary：同样的边界限制
- ✅ 支持基础元素：Component, ComponentDb, ComponentQueue, Rel 等
- 替代方案：使用 PlantUML 原生 package/rectangle 语法实现分组

## 常见错误
- 组件粒度过细（类级别）或过粗（模块级别）
- 循环依赖（A->B->A）
- 跨层调用（Controller直接调Repository）
- 职责不清（一个组件做多件事）


## 示例

### 示例 1

```plantuml
@startuml
!include <C4/C4_Component>

title 订单服务组件架构

Container_Boundary(order_service, "订单服务") {
  Component_Boundary(api_layer, "API层") {
    Component(order_ctrl, "订单控制器", "Spring MVC", "REST API端点")
    Component(payment_ctrl, "支付控制器", "Spring MVC", "支付接口")
  }

  Component_Boundary(business_layer, "业务层") {
    Component(order_svc, "订单业务", "Spring Service", "订单处理逻辑")
    Component(payment_svc, "支付业务", "Spring Service", "支付流程")
    Component(inventory_svc, "库存业务", "Spring Service", "库存扣减")
  }

  Component_Boundary(data_layer, "数据层") {
    Component(order_repo, "订单仓储", "Spring Data JPA", "订单CRUD")
    Component(payment_repo, "支付仓储", "Spring Data JPA", "支付记录")
    ComponentDb(order_db, "订单数据库", "MySQL 8.0", "持久化存储")
  }

  Component_Boundary(infra_layer, "基础设施") {
    Component(event_pub, "事件发布器", "Spring Event", "领域事件")
    Component(cache_mgr, "缓存管理", "Spring Cache", "缓存抽象")
  }
}

Component_Ext(mq, "消息队列", "RabbitMQ", "异步消息")

Rel(order_ctrl, order_svc, "调用", "方法调用")
Rel(payment_ctrl, payment_svc, "调用", "方法调用")

Rel(order_svc, order_repo, "使用", "JPA接口")
Rel(payment_svc, payment_repo, "使用", "JPA接口")
Rel(order_svc, inventory_svc, "扣减库存", "方法调用")
Rel(order_svc, event_pub, "发布事件", "Spring Event")

Rel(order_repo, order_db, "读写", "JDBC")
Rel(payment_repo, order_db, "读写", "JDBC")

Rel(order_svc, cache_mgr, "缓存", "@Cacheable")
Rel(event_pub, mq, "发送消息", "AMQP")

LAYOUT_TOP_DOWN()
SHOW_LEGEND()
@enduml
```

### 示例 2

```plantuml
@startuml
!include <C4/C4_Component>

title 六边形架构（端口适配器）组件图

Container_Boundary(hexagonal, "用户服务（六边形架构）") {
  Component_Boundary(application, "应用层") {
    Component(create_user_cmd, "创建用户命令", "Use Case", "用户注册")
    Component(get_user_qry, "查询用户", "Use Case", "用户查询")
  }

  Component_Boundary(domain, "领域层") {
    Component(user_entity, "用户实体", "Domain Model", "用户聚合根")
    Component(user_repo_port, "用户仓储端口", "Interface", "仓储抽象")
    Component(email_port, "邮件端口", "Interface", "邮件抽象")
  }

  Component_Boundary(adapters_in, "入站适配器") {
    Component(rest_adapter, "REST适配器", "Spring MVC", "HTTP入口")
    Component(grpc_adapter, "gRPC适配器", "gRPC", "RPC入口")
  }

  Component_Boundary(adapters_out, "出站适配器") {
    Component(jpa_adapter, "JPA适配器", "Spring Data JPA", "数据库实现")
    Component(smtp_adapter, "SMTP适配器", "JavaMail", "邮件实现")
  }
}

ComponentDb(pg, "PostgreSQL", "关系数据库")
Component_Ext(smtp_server, "SMTP服务器", "邮件服务")

Rel(rest_adapter, create_user_cmd, "调用")
Rel(grpc_adapter, get_user_qry, "调用")

Rel(create_user_cmd, user_entity, "操作")
Rel(get_user_qry, user_entity, "查询")

Rel(create_user_cmd, user_repo_port, "使用端口")
Rel(create_user_cmd, email_port, "使用端口")
Rel(get_user_qry, user_repo_port, "使用端口")

Rel(jpa_adapter, user_repo_port, "实现", "Adapter")
Rel(smtp_adapter, email_port, "实现", "Adapter")

Rel(jpa_adapter, pg, "持久化", "JDBC")
Rel(smtp_adapter, smtp_server, "发送", "SMTP")

LAYOUT_LEFT_RIGHT()
SHOW_LEGEND()
@enduml
```

### 示例 3

```plantuml
@startuml
!include <C4/C4_Component>

title CQRS模式组件架构

Container_Boundary(cqrs_service, "CQRS服务") {
  Component_Boundary(command_side, "命令端（写）") {
    Component(cmd_handler, "命令处理器", "Handler", "处理写操作")
    Component(aggregate, "聚合根", "Domain Model", "业务逻辑")
    Component(event_store, "事件存储", "Event Sourcing", "事件持久化")
    ComponentDb(write_db, "写库", "PostgreSQL", "事件日志")
  }

  Component_Boundary(query_side, "查询端（读）") {
    Component(qry_handler, "查询处理器", "Handler", "处理读操作")
    Component(read_model, "读模型", "Projection", "查询优化模型")
    ComponentDb(read_db, "读库", "MongoDB", "非规范化数据")
  }

  Component_Boundary(sync, "同步机制") {
    Component(event_bus, "事件总线", "In-Memory Bus", "事件分发")
    Component(projector, "投影器", "Event Handler", "更新读模型")
  }
}

Rel(cmd_handler, aggregate, "执行命令", "方法调用")
Rel(aggregate, event_store, "保存事件", "Append")
Rel(event_store, write_db, "持久化", "JDBC")

Rel(event_store, event_bus, "发布事件", "事件驱动")
Rel(event_bus, projector, "分发事件", "订阅")
Rel(projector, read_model, "更新投影", "更新")
Rel(read_model, read_db, "保存", "MongoDB Driver")

Rel(qry_handler, read_model, "查询", "方法调用")

LAYOUT_TOP_DOWN()
SHOW_LEGEND()
@enduml
```
