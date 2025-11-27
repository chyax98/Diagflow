---
type: er
description: 实体关系图（Entity-Relationship Diagram），展示数据库实体和它们之间的关系
use_cases:
  - 数据库ER建模
  - 实体关系设计
  - 数据模型
  - 数据库设计
  - 关系分析
---

文件结构要求：
- 严格顺序: 1.全局指令(可选) → 2.实体定义 → 3.关系定义
- 违反顺序会导致语法错误
- 注释只支持 # 单行注释，不支持块注释

实体定义：
语法: [实体名]
      属性列表（缩进）
- 实体名命名: ASCII字母/数字/下划线
- 空格/特殊字符: 必须用引号包裹（``, '', ""）
- 示例: [Person], [`Birth Place`], ['User Account'], ["Order Item"]

属性标记系统：
- * (星号) = Primary Key（主键）
  * 在ER图中显示为下划线
  * 每个实体至少要有一个主键
  * 可以有多个主键（复合主键）

- + (加号) = Foreign Key（外键）
  * 在ER图中显示为斜体
  * 用于引用其他实体的主键
  * 外键名通常以 _id 结尾

- *+ 或 +* = 复合键
  * 既是主键又是外键
  * 用于多对多关系的关联表
  * 顺序无关（*+ 和 +* 等价）

属性命名惯例：
- 主键: 通常为 id 或 {实体名}_id
- 外键: {关联实体}_id（如 user_id, product_id）
- 布尔: is_/has_ 前缀（如 is_active, has_discount）
- 时间: _at/_date 后缀（如 created_at, birth_date）
- 使用小写下划线命名法（snake_case）

关系定义：
语法: 实体A 基数1--基数2 实体B {label:"描述"}
- 位置: 必须在所有实体定义之后
- 顺序: 先定义所有实体，再定义关系
- 标签: 使用 {label:"描述文本"} 添加关系说明

基数符号（Cardinality）：
- ? = 零或一 (0..1)
- 1 = 恰好一 (1)
- * = 零或多 (0..*)
- + = 一或多 (1..*)

基数必须明确双方：
✓ Person *--1 Address （一个人可以有多个地址，每个地址属于一个人）
✓ Student *--* Course （多对多关系）
✓ Employee ?--1 Department （员工可能没有部门，但有部门时只属于一个）
❌ Person -- Address （缺少基数，错误）

关系标签规则：
- 自引用关系: 必须添加标签区分
  ✓ Employee ?--1 Employee {label: "manages"}
  ❌ Employee ?--1 Employee （缺少标签，错误）

- 多关系: 同一对实体间有多个关系时，每个关系都需要标签
  ✓ Person 1--* Order {label: "places"}
  ✓ Person 1--* Order {label: "receives"}

- 标签语法: {label: "描述文本"} 或 {label:"描述文本"}（空格可选）

全局指令（可选，必须在文件开头）：
1. title指令:
   语法: title {label: "标题文本", size: "字号", color: "颜色", font: "字体"}
   示例: title {label: "电商数据库ER图", size: "20"}
   支持属性:
   - label: 标题文本
   - size: 字体大小（数字字符串）
   - color: 颜色（CSS颜色名或十六进制）
   - font: 字体名称

2. header指令:
   语法: header {bgcolor: "背景色", color: "字体色", size: "字号"}
   示例: header {bgcolor: "#d0e0d0", color: "#333", size: "16"}
   作用: 自定义所有实体头部样式
   支持属性:
   - bgcolor: 背景颜色
   - color: 字体颜色
   - size: 字体大小

属性分组惯例：
推荐顺序:
1. 主键（*标记）
2. 外键（+标记）
3. 普通属性（按重要性）
4. 时间戳（created_at, updated_at）

示例:
[User]
  *user_id
  +organization_id
  username
  email
  is_active
  created_at
  updated_at

Kroki 限制和注意事项：
- 实体数建议 ≤ 30（过多会导致布局混乱）
- 属性数建议每实体 ≤ 15（过多影响可读性）
- 不支持属性类型声明（如 `name varchar(100)`）
- 不支持 UQ(Unique) 标记，只有 PK 和 FK
- 颜色/字体设置可能在某些输出格式失效
- 推荐使用基本ASCII字符，中文需测试
- 不支持嵌套实体或条件逻辑

常见错误和解决方法：
1. 实体未定义就引用:
   ❌ Person *--1 Address  // Address未定义
       [Address]
       ...
   ✓ [Address]  // 先定义Address
       *address_id
     [Person]
       *person_id
       +address_id
     Person *--1 Address  // 再定义关系

2. 关系缺少基数:
   ❌ Person -- Address
   ✓ Person *--1 Address

3. 自引用无标签:
   ❌ Employee ?--1 Employee
   ✓ Employee ?--1 Employee {label: "manages"}

4. 属性无主键:
   ❌ [User]
       name
       email
   ✓ [User]
       *user_id
       name
       email

5. 全局指令位置错误:
   ❌ [Person]
       *id
     title {label: "ER图"}
   ✓ title {label: "ER图"}
     [Person]
       *id

6. 外键未引用实际主键:
   ❌ [User]
       *user_id
     [Order]
       *order_id
       +customer_id  // 没有Customer实体
   ✓ [User]
       *user_id
     [Order]
       *order_id
       +user_id  // 引用User的主键

最佳实践：
- 使用有意义的实体名和属性名
- 保持命名一致性（全部用snake_case）
- 复杂关系添加标签说明
- 主键统一使用 {实体名}_id 格式
- 外键名与引用的主键名保持一致
- 时间戳属性统一使用 created_at/updated_at
- 布尔属性使用 is_/has_ 前缀
- 避免循环依赖和过度复杂的关系网


## 示例

### 示例 1

```erd
# 基础示例：人员与地址关系
[Person]
  *person_id
  name
  +birth_place_id

[Address]
  *address_id
  city
  country

# 一个人对应一个出生地
Person *--1 Address {label: "born in"}

# 自引用关系：员工管理层级
[Employee]
  *employee_id
  name
  +manager_id

# 员工可能有上级（0或1），一个上级管理多个下属
Employee ?--1 Employee {label: "manages"}
```

### 示例 2

```erd
# 高级示例：电商系统完整ER图
title {label: "电商系统数据库ER图", size: "20"}
header {bgcolor: "#d0e0d0", color: "#333"}

[Customer]
  *customer_id
  username
  email
  password_hash
  registration_date
  is_active

[Order]
  *order_id
  +customer_id
  order_date
  total_amount
  status
  shipping_address
  created_at
  updated_at

[Product]
  *product_id
  +category_id
  product_name
  description
  price
  stock_quantity
  is_available

[OrderItem]
  *+order_id
  *+product_id
  quantity
  unit_price
  subtotal

[Category]
  *category_id
  +parent_category_id
  category_name
  description

[Review]
  *review_id
  +customer_id
  +product_id
  rating
  comment
  review_date

# 一对多关系
Customer 1--* Order {label: "places"}
Product 1--* Review {label: "has"}
Customer 1--* Review {label: "writes"}

# 多对多关系（通过关联表）
Order 1--* OrderItem {label: "contains"}
Product 1--* OrderItem {label: "included in"}

# 自引用：类别层级
Category ?--* Category {label: "parent of"}
```

### 示例 3

```erd
# 复杂示例：社交网络数据模型
title {label: "社交网络ER图", size: "18", color: "#2c3e50"}

[User]
  *user_id
  username
  email
  profile_picture_url
  bio
  created_at
  last_login_at

[Post]
  *post_id
  +author_id
  content
  media_url
  created_at
  updated_at
  is_deleted

[Comment]
  *comment_id
  +post_id
  +user_id
  +parent_comment_id
  content
  created_at

[Like]
  *+user_id
  *+post_id
  created_at

[Follow]
  *+follower_id
  *+followee_id
  created_at

[Tag]
  *tag_id
  tag_name

[PostTag]
  *+post_id
  *+tag_id

# 用户发帖
User 1--* Post {label: "creates"}

# 帖子评论
Post 1--* Comment {label: "has"}
User 1--* Comment {label: "writes"}

# 评论回复（自引用）
Comment ?--* Comment {label: "replies to"}

# 点赞（多对多）
User *--* Post {label: "likes via Like"}

# 关注（自引用多对多）
User *--* User {label: "follows via Follow"}

# 标签（多对多）
Post *--* Tag {label: "tagged via PostTag"}
```

### 示例 4

```erd
# 实战示例：项目管理系统
[Organization]
  *org_id
  org_name
  created_at

[Team]
  *team_id
  +org_id
  team_name
  description

[Member]
  *member_id
  +team_id
  +user_id
  role
  joined_at

[User]
  *user_id
  username
  email
  full_name

[Project]
  *project_id
  +team_id
  project_name
  description
  start_date
  end_date
  status

[Task]
  *task_id
  +project_id
  +assignee_id
  +reporter_id
  title
  description
  priority
  status
  due_date
  created_at

[TaskComment]
  *comment_id
  +task_id
  +author_id
  content
  created_at

# 组织层级
Organization 1--* Team {label: "has"}
Team 1--* Member {label: "has"}
User 1--* Member {label: "joins as"}

# 项目管理
Team 1--* Project {label: "owns"}
Project 1--* Task {label: "contains"}

# 任务分配
User 1--* Task {label: "assigned to"}
User 1--* Task {label: "reports"}

# 任务评论
Task 1--* TaskComment {label: "has"}
User 1--* TaskComment {label: "writes"}
```

### 示例 5

```erd
# 示例：在线教育平台
title {label: "在线教育平台数据模型"}

[Student]
  *student_id
  username
  email
  enrollment_date

[Instructor]
  *instructor_id
  name
  email
  bio
  rating

[Course]
  *course_id
  +instructor_id
  course_name
  description
  duration_weeks
  price
  is_published

[Enrollment]
  *+student_id
  *+course_id
  enrollment_date
  completion_status
  progress_percentage

[Lesson]
  *lesson_id
  +course_id
  lesson_title
  content
  video_url
  order_number

[Quiz]
  *quiz_id
  +lesson_id
  quiz_title
  passing_score

[QuizAttempt]
  *attempt_id
  +student_id
  +quiz_id
  score
  attempt_date
  passed

[Certificate]
  *certificate_id
  +student_id
  +course_id
  issue_date
  certificate_url

# 课程关系
Instructor 1--* Course {label: "teaches"}
Course 1--* Lesson {label: "contains"}
Lesson 1--? Quiz {label: "has"}

# 学生学习
Student *--* Course {label: "enrolled via Enrollment"}
Student 1--* QuizAttempt {label: "takes"}
Quiz 1--* QuizAttempt {label: "attempted in"}

# 证书颁发
Student 1--* Certificate {label: "earns"}
Course 1--* Certificate {label: "issues"}
```
