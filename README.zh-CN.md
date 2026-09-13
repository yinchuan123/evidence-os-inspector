# Evidence OS Inspector

**看清证据变化时，什么会跟着变。**

把研究主张定位到来源原文片段，记录人工审阅；来源改变时，看出哪些主张需要重新审核。完全在浏览器内运行：无需账号，不上传资料，不需要 API Key。

[English](README.md) · **[在线演示](https://yinchuan123.github.io/evidence-os-inspector/)** · [版本下载](https://github.com/yinchuan123/evidence-os-inspector/releases) · [常见问题](docs/FAQ.md#中文) · [路线图](ROADMAP.md)

> **状态：v0.1 alpha。** 自动完成的是内容定位、结构检查、依赖追踪、变化提示和报告生成。片段是否真的支持主张，由审阅者判断并记录。见[它不做什么](#它不做什么)。

![录屏：更正来源 A 后，C1 与 C4 被标为需复核，C2、C3、C5 保持已审阅。](docs/media/demo-loop.gif)

## 两分钟试用

1. 打开[在线演示](https://yinchuan123.github.io/evidence-os-inspector/)，点击 **试用示例**。
2. 选中主张 **C1**，来源 A 中它绑定的片段会高亮。
3. 在"来源"中选择 "Synthetic cohort report A"，点击 **修订来源**，再点 **载入建议的更正**，保存。
4. 阅读影响提示：**C1** 直接受影响，**C4** 经已确认的依赖受影响，C2、C3、C5 不受影响。
5. 选中 C1，从第 2 版绑定片段，记录新的审阅。旧审阅保留在历史中。
6. 点击 **导出 HTML 报告**，得到一个可以发给合作者的独立文件。

然后点击 **审阅自己的文字**，粘贴一段自己的文字，切分为主张，加入要核对的来源文本，重复以上过程。

演示里的"研究"全部是虚构的，只用于展示机制，不代表真实证据。演示文本目前为英文；界面支持中文。

## 截图

| 主张与来源片段对照 | 来源更正的影响 | 独立 HTML 报告 |
|---|---|---|
| ![来源对照](docs/media/shot-source-comparison.png) | ![变更影响](docs/media/shot-change-impact.png) | ![导出报告](docs/media/shot-report.png) |

## 三个场景

1. **更正影响。** 五条主张、三个来源、三条已确认的依赖。来源 A 更正主要结果。工具根据记录的绑定和已确认依赖计算出 C1 与 C4 需复核，其余不受影响。
2. **范围核查。** 来源只报告了 70 岁以上人群中某个特定结局的关联。一条草稿句子扩大了人群、换了结局、并使用因果措辞。审阅者的理由逐项记录与绑定片段的不一致。
3. **缺失与补充。** 某主张无法从试验摘要判断。之后补入附录，绑定片段并重新审阅。早先的"无法判断"结论仍留在历史中。

## 工作方式

- **版本不可变。** 编辑来源或主张会产生带 SHA-256 内容哈希的新版本，旧版本保留。
- **绑定按位置。** 主张绑定到某个来源版本中的字符区间。纯文本不伪造页码。
- **审阅有锚点。** 审阅记录标签、理由，以及当时依据的来源版本与上游主张的审阅。
- **依赖显式。** 主张之间的关系由你添加并标为已确认或未确认。环与悬空引用会被拒绝。
- **不自动反转。** 依据变化时，主张被标为"需复核"，并给出原因和依赖路径。未确认的关系只产生"潜在影响"提示。
- **导出显式。** JSON 保留全部内容供继续工作；HTML 报告包含主张、绑定片段、状态和历史；只有导出前勾选"报告含来源全文"才会包含来源全文。

详情：[docs/CONCEPTS.md](docs/CONCEPTS.md) · JSON 格式：[docs/FORMAT.md](docs/FORMAT.md)

## 它不做什么

- 不判断片段是否支持主张。判断由你做。
- 不验证 DOI 或 URL，不抓取论文。标识符按"用户提供，未验证"保存。
- 没有 PDF/OCR 导入、AI 阅读、数据库、多人服务器、自动 GRADE 或 Meta 分析。下一步考虑的方向见[路线图](ROADMAP.md)。
- 内容哈希只说明记录的文本是否变化，不说明科学真实性、作者身份或语义。

## 隐私

你的文字在浏览器内处理，不会离开浏览器。生产构建带有严格的 Content-Security-Policy：`connect-src 'none'` 完全禁止 fetch、XHR 与 WebSocket，脚本、样式、图片与媒体只允许来自站点自身域名。加载后页面只会向同一静态站点请求演示媒体，不会联系任何其他域名。导出只生成本地文件。你自己的工作区保存在标签页的 session storage 中，刷新不丢失；演示工作区每次重新构建。托管页面的普通 Web 访问日志属于 GitHub Pages，与任何静态站点相同。

## 本地运行

需要 Node.js 22.12 或更新（锁定的测试运行器要求）。

```bash
git clone https://github.com/yinchuan123/evidence-os-inspector.git
cd evidence-os-inspector
npm ci
npm run dev
```

打开 http://localhost:5173。其他命令：

```bash
npm test            # 单元测试（vitest）
npm run build       # 生产构建到 dist/
npm run verify      # 类型检查 + lint + 测试 + Pages 构建 + e2e（需先 npx playwright install chromium）
```

## 输入格式

- 粘贴文本，或把 `.txt` / `.md` 导入主张框或作为来源文本。
- 导入本工具导出的工作区 JSON（`eosi-workspace`，格式 0.1）。

## 参与

现阶段最有价值的贡献是真实使用反馈。见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可与引用

代码采用 [MIT 许可](LICENSE)。引用软件请使用 [CITATION.cff](CITATION.cff) 中的元数据（GitHub 页面有 "Cite this repository" 按钮）。

## 与 Evidence OS 的关系

Inspector 是从一个更大的私有证据编译系统中抽出的小型独立工具。它共享版本化来源、位置绑定和更正传播的思路，但它不是那个系统，也不包含其数据。未来的公开接口只会在有真实公开材料时列入路线图。
