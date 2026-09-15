# Evidence OS Inspector

**看清证据变化时，什么会跟着变。**

把研究主张定位到来源原文片段，记录人工审阅；来源改变时，看出哪些主张需要重新审核。完全在浏览器内运行：无需账号，不上传资料，不需要 API Key。

[English](README.md) · **[在线演示](https://yinchuan123.github.io/evidence-os-inspector/)** · [版本下载](https://github.com/yinchuan123/evidence-os-inspector/releases) · [常见问题](docs/FAQ.md#中文) · [路线图](ROADMAP.md)

> **状态：v0.1 alpha。** 自动完成的是版本追踪、结构检查、依赖追踪、变化提示和报告生成；绑定哪一段原文由你选择。片段是否真的支持主张，由审阅者判断并记录。见[它不做什么](#它不做什么)。

![录屏：更正来源 A 后，C1 与 C4 被标为需复核，C2、C3、C5 保持已审阅。](docs/media/demo-loop.gif)

## 两分钟试用

1. 打开[在线演示](https://yinchuan123.github.io/evidence-os-inspector/)，点击 **试用示例**。
2. 选中主张 **C1**，来源 A 中它绑定的片段会高亮（手机上请切到"来源"标签查看）。
3. 在"来源"中选择 "Synthetic cohort report A"，点击 **修订来源**，再点 **载入建议的更正**，保存。
4. 阅读影响提示：**C1** 直接受影响，**C4** 经已确认的依赖受影响，C2、C3、C5 不受影响。
5. 选中 C1。在"来源"中用鼠标选中第 2 版里更正后的句子，点击 **将选中片段绑定到 C1**；然后选择标签、填写理由，点击 **记录审阅**。旧审阅保留在历史中。
6. 点击 **导出 HTML 报告**，得到一个可以发给合作者的独立文件。

然后点击左上角的应用名称回到首页，点击 **审阅自己的文字**，粘贴一段自己的文字，切分为主张，加入要核对的来源文本，重复以上过程。

演示里的"研究"全部是虚构的，只用于展示机制，不代表真实证据。演示文本目前为英文；界面支持中文。

## 适合谁用

Inspector 是一个小型工具，用于演示这一机制、教学和收集反馈，不是面向系统综述团队的生产工具。

**适合**

- 长期维护证据的团队（动态系统综述、指南制定组、循证中心与 HTA 机构），想先在少量关键主张上试用这一机制。
- 研究方法教学：主张怎样依赖证据，一次更正会带来什么。见[课堂练习](docs/TEACHING.md)。

**目前不适合**

- 发现撤稿或更正。Inspector 不做这件事；这类提醒请用文献级工具，例如 [Zotero 的撤稿条目提醒](https://www.zotero.org/blog/retracted-item-notifications/)（仅撤稿）或 [scite Reference Check](https://scite.ai/blog/how-do-i-use-the-scite-reference-check)（撤稿与更正通知）。
- 追踪数据提取表中数字的变化。Inspector 绑定的是文本片段。
- 纳入几百项研究的综述。绑定靠手工完成。
- 团队协作。没有共享工作区。

**为什么重要。** 1330 项撤稿试验中，有 312 项被合并进 847 篇系统综述的 4095 个 Meta 分析；在可重新分析的 3902 个 Meta 分析中，去掉这些试验后 16.0% 的统计学显著性发生改变（Xu 2025, BMJ）。试验在综述发表后才被撤稿的，196 篇综述中有 9 篇、43 份指南中有 2 份后来被更正或撤回（Kataoka 2022, J Clin Epidemiol）。去掉撤稿研究后重算的 166 个 Meta 分析中，96% 仍在原置信区间内，但 11% 的统计学显著性发生改变（Graña Possamai 2025, JAMA Intern Med）。Inspector 只处理已知来源变化之后的一步：哪些已记录的主张直接绑定到被改动的来源，或经已确认的依赖关系间接受其影响。

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

## 相关工具

这一机制并不新。类似的思路已在其他地方使用：

- 需求追溯工具会在被链接的条目变化时，把链接标为"可疑"（suspect link），例如 [Doorstop](https://github.com/doorstop-dev/doorstop)。
- 近期的开源项目把类似思路用于其他领域，例如 [Proofline](https://github.com/thangldw/proofline)：把工程决策绑定到来源版本和引文片段，并在来源变化时沿依赖关系提示受影响的决策需要复核。
- 药企推广材料审核使用的声明管理软件，把声明锚定到参考文献中的片段，例如 [Veeva Vault PromoMats](https://commercial.veevavault.help/en/gr/57379/)。
- 在证据综合领域，已有工具在整篇文献层面提示撤稿或更正，例如 [Zotero](https://www.zotero.org/blog/retracted-item-notifications/)（撤稿）和 [scite Reference Check](https://scite.ai/blog/how-do-i-use-the-scite-reference-check)（撤稿与更正通知）。

我们还没有找到一个证据综合领域的工具，把片段绑定、绑定版本的审阅和传递式复核提示结合在一起。如果你知道，请[提交 issue](https://github.com/yinchuan123/evidence-os-inspector/issues)。

## 隐私

你的文字在浏览器内处理，不会离开浏览器。生产构建带有严格的 Content-Security-Policy：`connect-src 'none'` 完全禁止 fetch、XHR 与 WebSocket，脚本、样式、图片与媒体只允许来自站点自身域名。加载后页面只会向同一静态站点请求演示媒体，不会联系任何其他域名。导出只生成本地文件。你自己的工作区（包括你导入的文件）保存在标签页的 session storage 中，刷新不丢失；演示工作区每次重新构建，不会替换你的工作区。托管页面的普通 Web 访问日志属于 GitHub Pages，与任何静态站点相同。

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
