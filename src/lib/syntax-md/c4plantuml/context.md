---
type: context
description: C4模型Level 1 - 系统上下文图，展示系统与外部实体的交互关系
use_cases:
  - 系统边界
  - 外部依赖
  - 用户角色
  - 系统全景
  - 利益相关者视图
---

核心语法要点：
- 强制包裹: @startuml 和 @enduml（缺少会渲染失败）
- 强制库引用(最致命错误): !include <C4/C4_Context>，不能为空或错误
  * ❌ Kroki 不支持在线 URL include（安全限制）

元素定义：
- 人员: Person(alias, "名称", "描述", ?sprite, ?tags, ?link)
- 外部人员: Person_Ext(alias, "外部人员", "描述", ?sprite, ?tags, ?link)
- 系统: System(alias, "名称", "描述", ?sprite, ?tags, ?link, ?type)
- 外部系统: System_Ext(alias, "外部系统", "描述", ?sprite, ?tags, ?link, ?type)
- 数据库系统: SystemDb(alias, "数据库名", "描述", ?sprite, ?tags, ?link)
- 消息队列系统: SystemQueue(alias, "队列名", "描述", ?sprite, ?tags, ?link)

关系定义：
- 基础关系: Rel(from, to, "描述", ?技术)
- 反向关系: Rel_Back(from, to, "描述", ?技术)
- 方向关系: Rel_U/Rel_Up (上), Rel_D/Rel_Down (下), Rel_L/Rel_Left (左), Rel_R/Rel_Right (右)
- 双向关系: BiRel(from, to, "描述", ?技术)
- 方向双向: BiRel_U/BiRel_D/BiRel_L/BiRel_R

边界定义：
- 系统边界: System_Boundary(alias, "名称") { ... }
- 企业边界: Enterprise_Boundary(alias, "名称") { ... }
- 通用边界: Boundary(alias, "名称", ?type) { ... }

布局选项：
- 方向布局: LAYOUT_TOP_DOWN() / LAYOUT_LEFT_RIGHT() / LAYOUT_LANDSCAPE()
- 显示图例: SHOW_LEGEND()
- 组合使用: 先设置方向布局，再调用 SHOW_LEGEND()
- 手绘风格: LAYOUT_AS_SKETCH()

高级特性：
- 标签系统: $tags="tag1+tag2" 用于元素分类
- 自定义标签: AddElementTag(tagStereo, ?bgColor, ?fontColor, ?borderColor, ?shadowing, ?shape, ?sprite, ?techn, ?legendText, ?legendSprite, ?borderStyle, ?borderThickness)
- 自定义关系标签: AddRelTag(tagStereo, ?textColor, ?lineColor, ?lineStyle, ?sprite, ?techn, ?legendText, ?legendSprite)
- 添加链接: $link="https://example.com"
- 添加图标: $sprite="{SpriteName}" 或 img:{File/Url} 或 &{OpenIconic}

最佳实践：
- 粒度控制: 3-10个系统，过多应拆分为多个图
- 特殊字符: 描述中的[]{}()必须用双引号包裹
- 命名规范: alias使用驼峰命名或下划线，避免空格
- 技术标注: 使用第四个参数明确技术栈，如"HTTPS", "REST API"

## 常见错误
- 缺少@startuml/@enduml包裹
- !include路径错误或缺失
- alias重复定义
- 关系中的from/to引用不存在的alias


## 示例

### 示例 1

```plantuml
@startuml
!include <C4/C4_Context>

title 电商系统上下文图

Person(customer, "客户", "使用系统的最终用户")
Person(admin, "管理员", "系统管理员")

System(ecommerce, "电商平台", "在线购物核心系统")
System_Ext(payment, "支付宝", "第三方支付平台")
System_Ext(logistics, "物流系统", "第三方配送服务")
SystemDb(erp, "ERP系统", "企业资源管理")

Rel(customer, ecommerce, "浏览商品、下单", "HTTPS")
Rel(admin, ecommerce, "管理商品、订单", "HTTPS")
Rel(ecommerce, payment, "处理支付", "REST API/JSON")
Rel(ecommerce, logistics, "创建配送单", "HTTPS")
Rel(ecommerce, erp, "同步库存", "SOAP/XML")

LAYOUT_TOP_DOWN()
SHOW_LEGEND()
@enduml
```

### 示例 2

```plantuml
@startuml
!include <C4/C4_Context>

title 企业信息系统全景图

Enterprise_Boundary(enterprise, "企业边界") {
  Person(employee, "员工", "公司内部员工")

  System_Boundary(internal, "内部系统") {
    System(hr, "HR系统", "人力资源管理")
    System(finance, "财务系统", "财务核算")
    System(crm, "CRM系统", "客户关系管理")
  }
}

Person_Ext(customer, "外部客户", "购买产品的客户")
System_Ext(bank, "银行系统", "在线支付")
System_Ext(email, "邮件服务", "邮件推送", $sprite="mail")

Rel(employee, hr, "查询考勤、薪资")
Rel(employee, finance, "报销审批")
Rel(employee, crm, "管理客户")
Rel(customer, crm, "提交需求", "Web Portal")
Rel(finance, bank, "付款对账", "银联接口")
Rel(crm, email, "发送通知", "SMTP")

LAYOUT_LEFT_RIGHT()
SHOW_LEGEND()
@enduml
```

### 示例 3

```plantuml
@startuml
!include <C4/C4_Context>
!include <awslib/AWSCommon>
!include <awslib/Storage/SimpleStorageServiceS3.puml>

title IoT平台系统上下文（带图标和标签）

AddElementTag("v1.0", $bgColor="#d4f1d4")
AddElementTag("legacy", $bgColor="#f1d4d4")
AddRelTag("async", $textColor="#ff6655", $lineColor="", $lineStyle="DashedLine")

Person(user, "设备用户", "操作IoT设备")
Person(ops, "运维人员", "监控系统健康")

System(iot_platform, "IoT平台", "设备管理和数据采集", $tags="v1.0")
System(device, "智能设备", "物联网终端", $sprite="robot", $tags="v1.0")
System_Ext(old_system, "遗留系统", "旧版监控平台", $tags="legacy")
SystemDb(timeseries, "时序数据库", "InfluxDB存储设备数据", $sprite="database")
SystemQueue(mq, "消息队列", "Kafka消息总线", $tags="v1.0")

Rel(user, device, "控制设备", "移动APP")
Rel(device, iot_platform, "上报数据", "MQTT", $tags="async")
Rel(iot_platform, timeseries, "存储时序数据", "HTTP API")
Rel(iot_platform, mq, "发布事件", "Kafka Protocol", $tags="async")
Rel(iot_platform, old_system, "数据同步", "REST API")
Rel(ops, iot_platform, "监控告警", "Web Console")

SHOW_LEGEND()
@enduml
```
