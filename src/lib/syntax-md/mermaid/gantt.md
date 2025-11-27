---
type: gantt
description: 甘特图，展示项目任务和时间线
use_cases:
  - 项目管理
  - 任务计划
  - 时间线规划
  - 里程碑管理
  - 资源调度
---

## 核心语法
- 声明: gantt
- 标题（可选）: title 项目计划

- 日期格式声明:
  * dateFormat YYYY-MM-DD（推荐 ISO 8601）
  * 必须在任务定义之前声明
  * 致命错误: 日期格式与 dateFormat 不一致会编译失败

- 任务格式:
  * 基本格式: 任务名称 : 开始日期, 持续时间
  * 完整格式: 任务名称 : 状态, 任务ID, 开始日期, 持续时间
  * 示例: 需求分析 : done, task1, 2024-01-01, 7d

- 任务状态:
  * done - 已完成
  * active - 进行中
  * crit - 关键任务
  * 不写 - 未开始
  * 可组合: done, crit

- 时间单位:
  * d - 天（如 7d）
  * h - 小时（如 24h）
  * m - 分钟（如 120m）
  * w - 周（如 2w）
  * 数字和单位间无空格

- 里程碑:
  * 关键字: milestone
  * 持续时间必须为 0d
  * 格式: 任务名称 : milestone, 日期, 0d
  * 示例: 项目上线 : milestone, crit, 2024-12-31, 0d

- 任务依赖:
  * 语法: after 任务ID
  * 单依赖: after task1
  * 多依赖: after task1 task2 task3
  * 依赖的任务必须先定义

- 分组（section）:
  * 语法: section 阶段名称
  * 后续任务属于该分组
  * 可以有多个 section

- 排除日期:
  * excludes weekends - 排除周末
  * excludes YYYY-MM-DD - 排除特定日期
  * 可多次使用

## 高级语法
- 今日标记:
  * todayMarker off - 关闭今日标记
  * todayMarker stroke-width:5px - 自定义标记样式

- 任务点击事件:
  * 语法: click 任务ID href "URL"
  * 示例: click task1 href "https://example.com"

- 坐标轴格式:
  * axisFormat %Y-%m-%d - 自定义日期显示格式
  * axisFormat %m/%d - 简化日期格式

## 时间计算规则
- 起始日期 + 持续时间 = 结束日期
- 依赖任务在前置任务完成后开始
- 周末和排除日期不计入工作日

## 设计建议
- 任务数量: 10-30 个为佳
- 时间跨度: 1 个月到 1 年
- 分组: 3-7 个阶段
- 里程碑: 5-10 个关键节点
- 依赖链: 避免过长（≤5 层）

## Kroki 限制
- ✓ 完全支持所有任务状态
- ✓ 支持任务依赖
- ✓ 支持里程碑
- ⚠️ 任务建议 ≤50 个
- ⚠️ 时间跨度建议 ≤2 年

常见错误排查：
1. 日期格式不一致
   ❌ dateFormat YYYY-MM-DD
      任务 : 2024/01/01, 7d
   ✓ dateFormat YYYY-MM-DD
      任务 : 2024-01-01, 7d

2. 里程碑持续时间非零
   ❌ 上线 : milestone, 2024-12-31, 1d
   ✓ 上线 : milestone, 2024-12-31, 0d

3. 时间单位有空格
   ❌ 任务 : 2024-01-01, 7 d
   ✓ 任务 : 2024-01-01, 7d

4. 依赖任务未定义
   ❌ 任务B : after task1, 5d（task1 未定义）
   ✓ 任务A : task1, 2024-01-01, 3d
      任务B : after task1, 5d

5. section 拼写错误
   ❌ Section 阶段1
   ✓ section 阶段1


## 示例

### 示例 1

```mermaid
gantt
    title 项目开发计划
    dateFormat YYYY-MM-DD
    section 前期准备
    需求分析 : done, task1, 2024-01-01, 7d
    系统设计 : active, task2, after task1, 5d
    section 开发阶段
    前端开发 : task3, after task2, 10d
    后端开发 : task4, after task2, 10d
    项目上线 : milestone, crit, after task3 task4, 0d
```

### 示例 2

```mermaid
gantt
    title 产品发布时间线
    dateFormat YYYY-MM-DD
    excludes weekends

    section 设计阶段
    需求调研 : done, research, 2024-01-01, 5d
    原型设计 : done, prototype, after research, 7d
    UI设计 : active, ui_design, after prototype, 10d

    section 开发阶段
    前端开发 : crit, fe_dev, after ui_design, 15d
    后端开发 : crit, be_dev, after prototype, 20d
    API集成 : integration, after fe_dev be_dev, 5d

    section 测试阶段
    功能测试 : testing, after integration, 7d
    性能测试 : perf_test, after integration, 5d

    section 发布
    预发布 : milestone, after testing perf_test, 0d
    正式发布 : milestone, crit, after testing perf_test, 0d
```

### 示例 3

```mermaid
gantt
    title 敏捷冲刺计划
    dateFormat YYYY-MM-DD

    section Sprint 1
    需求拆分 : done, s1_plan, 2024-01-01, 1d
    开发任务1 : done, s1_dev1, 2024-01-02, 4d
    开发任务2 : done, s1_dev2, 2024-01-02, 4d
    代码审查 : done, s1_review, after s1_dev1 s1_dev2, 1d
    Sprint回顾 : milestone, done, after s1_review, 0d

    section Sprint 2
    需求拆分 : active, s2_plan, after s1_review, 1d
    开发任务1 : crit, s2_dev1, after s2_plan, 5d
    开发任务2 : s2_dev2, after s2_plan, 5d
    代码审查 : s2_review, after s2_dev1 s2_dev2, 1d
    Sprint回顾 : milestone, crit, after s2_review, 0d
```
