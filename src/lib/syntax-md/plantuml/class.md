---
type: class
description: 类图，展示面向对象设计中的类和关系
use_cases:
  - 面向对象设计
  - 系统架构
  - 领域建模
  - 设计模式
  - API设计
---

## 核心语法
- 声明包裹:
  * @startuml 和 @enduml 包裹所有内容

- 类定义方式:
  * 方式1（推荐）:
    class 类名 {
        属性
        方法
    }
  * 方式2（简化）:
    class 类名

- 可见性修饰符（必须标注）:
  * - private（私有）
  * + public（公开）
  * # protected（受保护）
  * ~ package（包级别）

- 属性语法:
  * 格式: 可见性 类型 名称
  * 示例: - String name
  * 示例: + int age
  * 静态属性: {static} 或下划线
  * 示例: - {static} int count

- 方法语法:
  * 格式: 可见性 返回类型 方法名(参数类型 参数名)
  * 示例: + void setName(String name)
  * 示例: + String getName()
  * 静态方法: {static}
  * 示例: + {static} getInstance() Singleton
  * 抽象方法: {abstract}
  * 示例: + {abstract} void eat()

- 关系类型:
  * <|-- 继承（实线三角箭头，子类→父类）
  * <|.. 实现（虚线三角箭头，实现类→接口）
  * *-- 组合（实心菱形，整体→部分，生命周期绑定）
  * o-- 聚合（空心菱形，整体→部分，生命周期独立）
  * --> 关联（实线箭头）
  * ..> 依赖（虚线箭头）
  * -- 无方向关联

- 关系方向规则:
  * 继承/实现: 子类→父类，实现类→接口
  * 组合/聚合: 整体→部分
  * 关联/依赖: 根据语义决定

- 类修饰符:
  * abstract class 抽象类名 - 抽象类
  * interface 接口名 - 接口
  * class 类名 <<stereotype>> - 构造型
  * 常用构造型: <<interface>>, <<abstract>>, <<enumeration>>, <<entity>>, <<service>>

- 基数/多重性:
  * 语法: "1", "0..1", "1..*", "*", "0..*"
  * 示例: Class1 "1" --> "0..*" Class2

- 命名规范:
  * 类名: PascalCase（如 UserService）
  * 方法/属性: camelCase（如 getUserName）
  * 常量: UPPER_SNAKE_CASE（如 MAX_SIZE）

## 高级语法
- 泛型:
  * 语法: class List<T>
  * 示例: class Map<K,V>

- 枚举类:
  * 语法:
    enum 枚举名 {
        值1
        值2
    }
  * 或使用 <<enumeration>> 构造型

- 内部类:
  * 语法:
    class Outer {
        class Inner
    }

- 抽象类和方法:
  * 抽象类: abstract class 类名
  * 抽象方法: {abstract} 或斜体标记

- 包/命名空间:
  * 语法:
    package 包名 {
        class 类名
    }

- 注释:
  * note left of 类名: 注释
  * note right of 类名: 注释
  * note top of 类名: 注释
  * note bottom of 类名: 注释
  * note "注释" as N1
  * 类名 .. N1

- 样式定制:
  * 类名 #线条颜色 - 设置边框颜色
  * 类名 ##背景颜色 - 设置背景色
  * 示例: class User #red

- 关系标签:
  * 语法: Class1 --> Class2 : 标签
  * 示例: Dog --|> Animal : extends

- 隐藏成员:
  * hide 类名 members - 隐藏成员
  * hide empty members - 隐藏空成员
  * show 类名 methods - 只显示方法

## 设计建议
- 类数量: 5-20 个为佳
- 关系数量: 8-30 条
- 继承层级: ≤5 层
- 每个类: 3-10 个属性/方法
- 避免循环依赖

## Kroki 限制
- ✓ 完全支持所有关系类型
- ✓ 支持泛型
- ✓ 支持枚举和抽象类
- ✓ 支持包/命名空间
- ⚠️ 类建议 ≤30 个
- ⚠️ 关系建议 ≤50 条

常见错误排查：
1. 缺少可见性修饰符
   ❌ String name
   ✓ + String name

2. 关系方向错误
   ❌ Animal <|-- Dog（父类→子类错误）
   ✓ Dog --|> Animal（子类→父类正确）

3. 抽象方法语法错误
   ❌ abstract void eat()
   ✓ + {abstract} void eat()

4. 泛型语法错误（PlantUML支持<>）
   ✓ class List<T>
   ✓ class Map<K,V>

5. 方法参数格式错误
   ❌ + setName(name)
   ✓ + setName(String name)


## 示例

### 示例 1

```plantuml
@startuml
abstract class Animal {
    - String name
    - int age
    + {abstract} void eat()
    + void sleep()
}

class Dog {
    - String breed
    + void bark()
    + void eat()
}

class Cat {
    - boolean indoor
    + void meow()
    + void eat()
}

Animal <|-- Dog
Animal <|-- Cat
@enduml
```

### 示例 2

```plantuml
@startuml
interface Shape {
    + {abstract} double area()
    + {abstract} double perimeter()
}

enum Color {
    RED
    GREEN
    BLUE
}

class Circle {
    - double radius
    - Color color
    + Circle(double r)
    + double area()
    + double perimeter()
    + void setColor(Color c)
}

class Rectangle {
    - double width
    - double height
    + Rectangle(double w, double h)
    + double area()
    + double perimeter()
}

Shape <|.. Circle
Shape <|.. Rectangle
Circle --> Color : uses

note right of Circle: 圆形实现
note right of Rectangle: 矩形实现
@enduml
```

### 示例 3

```plantuml
@startuml
package "电商系统" {
    class Order {
        - int orderId
        - Date orderDate
        - OrderStatus status
        + void placeOrder()
        + void cancel()
        + double getTotal()
    }

    class OrderItem {
        - int quantity
        - double price
        + double getSubtotal()
    }

    class Product {
        - int productId
        - String name
        - double price
        - int stock
        + void updateStock(int delta)
    }

    class Customer {
        - int customerId
        - String name
        - String email
        + void register()
        + void login()
    }

    enum OrderStatus {
        PENDING
        PAID
        SHIPPED
        DELIVERED
        CANCELLED
    }
}

Order *-- OrderItem : contains "1..*"
OrderItem --> Product : refers "1"
Customer "1" --> "0..*" Order : places
Order --> OrderStatus : has

note top of Order: 订单聚合根
note right of OrderStatus: 订单状态枚举
@enduml
```
