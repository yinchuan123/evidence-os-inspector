# FAQ

[中文](#中文)

**Is there any AI in it?**
No. Version 0.1 contains no language model and calls no AI service. Sentence
splitting is a plain heuristic. Every review label is entered by a person.
A future adapter may let an AI assistant *propose* bindings or rationales for a
person to confirm; proposals would be clearly marked as unreviewed.

**Does it upload my text?**
No. The app runs in your browser tab. The production build ships a
Content-Security-Policy with `connect-src 'none'`, so the page cannot make
network requests after it loads. Exporting creates a file on your computer.
The hosting page (GitHub Pages) keeps ordinary web-server access logs like any
static site; that is the host's log, not your text.

**Does it decide whether a claim is true or supported?**
No. It records *your* judgement (supported within stated scope, partially
supported, not supported, cannot determine) together with the exact source
version and passage you looked at. Finding a passage is not the same as the
passage supporting the claim, and a missing source is not the same as the
claim being wrong.

**What does "needs re-review" mean?**
Something the review was based on has changed: the claim text, a bound source
version, a newly bound passage, or a claim it depends on. The tool shows which
one and, for dependencies, the path. It never changes your verdict; you record
a new review when you have looked again.

**What happens when a source changes?**
Revising a source creates a new immutable version. The tool lists claims bound
to that source (direct), claims that depend on them through confirmed links
(indirect), claims reachable only through unconfirmed links (potential, not
propagated), and everything else (unaffected). Direct and indirect claims are
marked "needs re-review".

**How do I continue work later?**
Export JSON. It contains all versions, bindings, dependencies, reviews and
history. Import it into the app on any machine. The format has a version
identifier; the app refuses files it does not understand rather than guessing.
Within one browser session the current workspace is also kept in session
storage so an accidental refresh does not lose it.

**Can I share results with a co-author?**
Export an HTML report. It is a single self-contained file with claims, bound
passages, states, reasons and history. Full source text is not included unless
you choose to include it. Send it however you normally send files.

**What does the content hash prove?**
Only that the recorded text is identical or not. It does not establish
authorship, publication status, or scientific truth.

**Which inputs work?**
Pasted text, `.txt`, `.md`, and this tool's JSON. No PDF or OCR in v0.1.

**How do I contribute?**
Report what you tried and where it broke or fell short. See
[CONTRIBUTING.md](../CONTRIBUTING.md). Code contributions are welcome after an
issue discussion.

**Is this a medical or clinical product?**
No. It is a general writing-and-review aid. Nothing in it is a clinical
recommendation, and no institution or journal endorses it.

---

## 中文

**里面有 AI 吗？**
没有。v0.1 不包含语言模型，也不调用任何 AI 服务。句子切分只是简单规则。所有审阅标签都由人填写。未来的适配器可能让 AI 助手*提议*绑定或理由，由人确认；提议会被清楚标为未审阅。

**会上传我的文字吗？**
不会。应用在你的浏览器标签页内运行。生产构建的 Content-Security-Policy 含 `connect-src 'none'`，页面加载后无法发起网络请求。导出只在你的电脑上生成文件。托管页面（GitHub Pages）像任何静态站点一样有普通的 Web 访问日志，那是托管方的日志，不是你的文字。

**它会判断主张是否真实或被支持吗？**
不会。它记录*你*的判断（所述范围内支持、部分支持、不支持、无法判断），连同你当时查看的来源版本和片段。定位到片段不等于片段支持主张；来源缺失也不等于主张错误。

**"需复核"是什么意思？**
审阅所依据的东西变了：主张文本、绑定的来源版本、新绑定的片段，或它依赖的主张。工具会指出是哪一项；对于依赖关系，会给出路径。它从不改变你的结论；你重新看过之后记录新的审阅。

**来源变化时会发生什么？**
修订来源会创建一个新的不可变版本。工具列出绑定到该来源的主张（直接）、经已确认关系依赖它们的主张（间接）、只能经未确认关系到达的主张（潜在，不传播），以及其余主张（不受影响）。直接和间接受影响的主张被标为"需复核"。

**如何继续之前的工作？**
导出 JSON。它包含全部版本、绑定、依赖、审阅和历史。在任何机器上导入即可。格式带版本标识；应用拒绝无法理解的文件，而不是猜测。同一浏览器会话内当前工作区也会保存在 session storage，误刷新不会丢失。

**能和合作者分享结果吗？**
导出 HTML 报告。它是一个独立文件，包含主张、绑定片段、状态、原因和历史。默认不含来源全文，除非你选择包含。用你平时发文件的方式发送即可。

**内容哈希证明什么？**
只证明记录的文本是否完全相同。它不证明作者身份、发表状态或科学真实性。

**支持哪些输入？**
粘贴文本、`.txt`、`.md`，以及本工具的 JSON。v0.1 没有 PDF 或 OCR。

**怎样参与？**
报告你试了什么、在哪里出了问题或不够用。见 [CONTRIBUTING.md](../CONTRIBUTING.md)。代码贡献欢迎先在 issue 中讨论。

**这是医疗或临床产品吗？**
不是。它是通用的写作与审阅辅助工具。其中没有任何临床建议，也没有机构或期刊背书。
