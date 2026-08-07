# 技术栈落地规则

## Java / Spring

Controller 只做协议适配；Application Service 编排事务；Domain Service 承载跨实体规则；Repository 接口位于 domain，JPA/MyBatis 实现位于 infrastructure。禁止将 Entity、DTO 和数据库对象混为同一模型。

## Python

FastAPI、Django 或 Flask 路由只做输入输出适配；用例放 application；业务模型不依赖 Web 框架；ORM 模型与领域模型边界明确。

## Flutter / Dart

Page 和 Widget 只表达 UI；状态管理对象负责展示状态与用例调用，不直接写持久化或复杂业务规则；domain 不依赖 Flutter。

## React / Vue

组件负责展示和交互；业务用例放 feature service/use-case；API、缓存和浏览器能力通过适配器访问；避免把完整业务流程塞入组件 hook。

## Dart 服务端

Route/Handler 做协议适配；application 编排；domain 保持框架无关；数据库和远程调用实现放 infrastructure。

