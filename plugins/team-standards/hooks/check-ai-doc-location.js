#!/usr/bin/env node
// 兼容旧宿主的已退役入口：不再限制文档必须写入个人 ai-docs。
// 当前 dispatcher 不加载此文件；文档归属由项目约定与 Markdown Skill 判断。
// 这不是路径权限或沙箱检查，真实访问控制仍由宿主负责。
process.stdin.resume();
