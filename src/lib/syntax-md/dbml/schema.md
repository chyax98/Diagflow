---
type: schema
description: 数据库架构图，展示表结构和关系
use_cases:
  - 数据库设计
  - ER图
  - 模式迁移
  - 单表设计
  - 多模式设计
---

## 核心语法
- Table关键字大小写: 必须使用Table(首字母大写)，table会编译失败
- 类型长度/精度: varchar必须指定长度varchar(100)，decimal必须指定精度decimal(10,2)
- 关系箭头方向: ref:>箭头指向"一"(多对一常用), ref:<一对多(少用), ref:-一对一, ref:<>多对多
- 字段约束: [pk]主键, [pk,increment]自增主键, [not null]非空, [unique]唯一, [default:'值']默认值
- 引用完整性: 引用的表和字段必须存在，先定义被引用表
- 索引定义: Indexes { (字段1, 字段2) [type: btree, unique] }
- 枚举类型: Enum gender { male female other }
- 注释: //单行注释, /* */多行注释, Note:'说明'字段注释
- 表别名: Table users as U { ... }

表定义语法：
- 基本格式: Table 表名 { 字段定义列表 }
- 跨模式: Table schema.table_name { ... }
- 表设置: Table users [headercolor: #3498DB] { ... }（注意表名和设置之间必须有空格）
- 表注释: Note: '表描述'或Note { '多行描述' }

字段定义语法：
- 基本格式: 字段名 类型 [约束列表]
- 主键: id integer [pk]或id integer [primary key]
- 外键: user_id integer [ref: > users.id]
- 默认值: created_at timestamp [default: `now()`]（函数用反引号）
- 多个约束: username varchar(50) [not null, unique]

关系定义语法：
- 内联形式: user_id integer [ref: > users.id]
- 短格式: Ref: posts.user_id > users.id
- 长格式: Ref { posts.user_id > users.id [delete: cascade] }
- 复合外键: Ref: (table1.col1, table1.col2) > (table2.col1, table2.col2)
- 关系设置: [delete: cascade, update: no action, color: #79AD51]

索引语法：
- 单列索引: created_at [name: 'idx_created', note: '创建时间索引']
- 复合索引: (user_id, created_at) [unique]
- 索引类型: booking_date [type: btree]或booking_date [type: hash]
- 表达式索引: (`id*2`) [name: 'idx_double_id']
- 主键索引: (id, country) [pk]

## 高级语法
- TableGroup分组: 逻辑分组相关表
  * TableGroup group_name { table1, table2 }
  * 支持设置: [note: '说明', color: #345]
- Schema多模式: 使用schema_name.table_name定义跨模式表
  * Table core.users { ... }, Table blog.posts { ... }
  * 默认schema为public
  * 跨模式关系: Ref: blog.posts.user_id > core.users.id
- Note定义: 支持Markdown格式
  * 单引号: Note: '简单说明'
  * 三引号: Note: '''多行Markdown内容'''
- Sticky Notes: 独立便签
  * Note note_name { '便签内容' }

## 数据类型支持
- 整数: integer, int, bigint, smallint, tinyint
- 小数: decimal(p,s), numeric(p,s), float, double, real
- 字符串: varchar(n), char(n), text, nvarchar(n)
- 日期时间: timestamp, datetime, date, time
- 布尔: boolean, bool
- 二进制: blob, bytea, binary
- JSON: json, jsonb
- 其他: uuid, xml, enum

Kroki 限制（重要）：
- 节点数建议 ≤ 50（过多影响可读性）
- 不支持 TablePartial、Check 约束等新特性（DBML 官方支持，但 Kroki 解析器未实现）
- 不支持字段级 check 约束: age int [check: `age >= 18`]
- 不支持表级 checks 块: checks { ... }
- 复杂表达式可能在某些导出格式中显示异常
- 推荐使用标准SQL类型，避免数据库特定类型
- 重复字段时手动展开，不要使用模板复用

## 常见错误
- Table小写: table会编译失败
  * ❌ table users { id int }
  * ✓ Table users { id int }
- 类型缺少长度: varchar/decimal必须指定
  * ❌ name varchar, price decimal
  * ✓ name varchar(100), price decimal(10,2)
- 引用不存在的表: 先定义被引用表
  * ❌ Table orders { user_id int [ref: > users.id] } // users未定义
  * ✓ 先定义Table users，再定义orders
- 使用不支持的 TablePartial: Kroki 不支持此特性
  * ❌ TablePartial timestamps { created_at timestamp }
  * ✓ 在每个表中重复定义: created_at timestamp [default: `now()`]
- 使用 check 约束: Kroki 不支持
  * ❌ age int [check: `age >= 18`]
  * ✓ 在注释中说明: age int [note: '必须 >= 18']
- 表设置无空格: Table和设置之间必须有空格
  * ❌ Table users[headercolor: #3498DB] { ... }
  * ✓ Table users [headercolor: #3498DB] { ... }
- Note多行字符串: 单引号不支持多行
  * ❌ Note: '第一行\n第二行'
  * ✓ Note: '''第一行\n第二行'''


## 示例

### 基础示例：用户订单系统

```dbml
// 基础示例：用户订单系统
Table users {
  id integer [pk, increment]
  name varchar(100) [not null]
  email varchar(255) [unique]
  created_at timestamp [default: `now()`]

  Note: '用户表，存储系统用户信息'
}

Table orders {
  id integer [pk, increment]
  user_id integer [not null, ref: > users.id]
  total_amount decimal(10,2) [not null]
  status varchar(20)
  created_at timestamp [default: `now()`]

  Note: '订单表，关联用户'
}

Table order_items {
  order_id integer [ref: > orders.id]
  product_id integer
  quantity integer [not null]
  price decimal(10,2)

  indexes {
    (order_id, product_id) [pk]
  }
}

Ref: orders.user_id > users.id [delete: cascade]
```

### 进阶示例：使用 Schema 和 TableGroup

```dbml
// 进阶示例：使用 Schema 和 TableGroup
// 核心模式
Table core.users {
  id integer [pk, increment]
  username varchar(50) [unique, not null]
  email varchar(100) [unique, not null]
  age integer [not null, note: '必须 >= 18']
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (username, email) [unique]
  }
}

// 电商模式
Table shop.products {
  id integer [pk, increment]
  name varchar(200) [not null]
  price decimal(10,2) [not null, note: '必须 > 0']
  stock integer [default: 0, note: '库存数量，必须 >= 0']
  is_deleted boolean [default: false]
  deleted_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table shop.orders {
  id integer [pk, increment]
  user_id integer [ref: > core.users.id]
  total decimal(10,2) [not null, note: '订单总额，必须 >= 0']
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

// 表分组
TableGroup 核心模块 [note: '用户认证相关表', color: #d0e0d0] {
  core.users
}

TableGroup 电商模块 [color: #ececfc] {
  shop.products
  shop.orders
}
```

### 完整特性演示：枚举、关系、索引

```dbml
// 完整特性演示：枚举、关系、索引
Enum order_status {
  pending [note: '待处理']
  processing [note: '处理中']
  shipped [note: '已发货']
  delivered [note: '已送达']
  cancelled [note: '已取消']
}

Table customers {
  id integer [pk, increment]
  name varchar(100) [not null]
  email varchar(255) [unique, not null]
  phone varchar(20)

  indexes {
    email [unique, name: 'idx_email']
    (name, email) [name: 'idx_name_email']
  }

  Note: '''
  # 客户表
  存储客户基本信息
  - 支持邮箱和手机号查询
  - 邮箱必须唯一
  '''
}

Table products {
  id integer [pk, increment]
  sku varchar(50) [unique, not null]
  name varchar(200) [not null]
  price decimal(10,2) [not null, note: '单价，必须 > 0']
  stock integer [default: 0]
}

Table orders {
  id integer [pk, increment]
  order_no varchar(50) [unique, not null]
  customer_id integer [not null]
  status order_status [default: 'pending']
  total_amount decimal(10,2) [note: '订单总额，必须 >= 0']
  created_at timestamp [default: `now()`]

  indexes {
    order_no [unique]
    customer_id
    (customer_id, created_at) [name: 'idx_customer_time']
  }
}

// 关系定义（多种方式）
Ref: orders.customer_id > customers.id [delete: cascade, update: no action]
```
