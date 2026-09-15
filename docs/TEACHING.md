# Classroom exercise: when a source is corrected

[中文](#中文)

A 20-minute exercise for teaching evidence-based medicine, systematic review methods or a journal club. It uses the [live demo](https://yinchuan123.github.io/evidence-os-inspector/). All studies in the demo are invented.

## Learning objectives

After the exercise, students can explain that:

- a claim rests on specific passages in specific versions of its sources, not on "the paper" in general;
- a claim can depend on a source directly (it cites a passage) or indirectly (it reasons from another claim that does);
- a correction makes the reviews built on it stale, but it does not decide the new verdict. A person still has to judge.

## What you need

- A browser. Nothing to install, no account.
- The demo texts are in English. The interface follows the browser language; switch it with the **中文** / **English** button at the top right.
- Everything stays in the browser tab. A demo starts fresh each time it opens. Refreshing, going back to the start page or opening another demo undoes the exercise. If students need to hand in their work, click **Export JSON** (or **Export HTML report**) first.

## Steps (about 20 minutes)

**1. Predict (3 min).** Give students the direct link to the [Correction impact demo](https://yinchuan123.github.io/evidence-os-inspector/#demo/correction-impact). The start page shows a recording of this exercise, which gives the answer away. Students use the *Sources* drop-down to read each source, and select claims to see their *Dependencies*, but do not click **Revise source** yet. Each student writes down: if source A is corrected, which claims need another look, and why?

**2. Run the correction (5 min).** In *Sources*, pick "Synthetic cohort report A", click **Revise source**, then **Load suggested correction**, then **Save as new version**. Read the **Impact of revision** banner and compare it with the written prediction.

**3. Re-bind and review C1 (5 min).** Select C1 and look at the *Review* pane. The old passage is marked **Bound source changed**. Click **Find this passage in the current version**: it is not found, because the sentence itself changed. In *Sources*, select (highlight) the corrected sentence in version 2 and click **Bind selection to C1**. Choose a label, write a rationale and click **Record review**. Then look at C4 again. On a narrow screen, switch between the *Claims*, *Sources* and *Review* tabs.

**4. Discuss (7 min).** Pick two or three of the questions below.

**5. Optional: the other two demos (extra time).** Export first: opening another demo undoes this one. Open [Scope check](https://yinchuan123.github.io/evidence-os-inspector/#demo/scope-check) or [Missing, then supplemented](https://yinchuan123.github.io/evidence-os-inspector/#demo/missing-then-supplemented) directly, or return to the start page (click the app name at the top left) and click **Try demo** on the *Scope check* or *Missing, then supplemented* card.

- **Scope check.** One fictional registry analysis (D) and three sentences. S1 and S3 stay within the source. S2 was reviewed as **Not supported**: it widens the population, replaces discharge destination with "poor recovery", and uses causal wording although the source says its design cannot establish cause.
- **Missing, then supplemented.** Sentence M2 is about unplanned clinic contacts. The trial summary (E) does not report them, so the first review was **Cannot determine**. Appendix F was added later, a passage was bound, and M2 was re-reviewed as **Supported within stated scope**. Both reviews stay in **Review history**.

## Discussion questions

1. C4 has no passage bound to source A. Why is it affected?
2. Like C4, C5 mentions bed-days. Why is it not affected? What would happen if someone had forgotten to record a dependency?
3. Why does an unconfirmed dependency only produce a "potential" note instead of marking the claim for re-review?
4. The tool marks C1 **Needs re-review** but keeps its old verdict. Why does it not switch the verdict to **Not supported** by itself?
5. After C1 is re-reviewed, C4 still needs re-review. Is that right?
6. In a real review, a correction to an included trial can change the extracted numbers, the pooled estimate and its confidence interval. This tool sees none of that. How much can such changes matter? For retracted trials, removing them changed statistical significance in 16.0% of affected meta-analyses that could be re-analysed (Xu et al., BMJ 2025). In reviews in high-impact general and internal medicine journals that included retracted studies, another study found that 96% of recalculated meta-analyses stayed within the original confidence interval, and statistical significance changed in 11% (Graña Possamai et al., JAMA Intern Med 2025). What would you check, and who in a team that keeps a review up to date would do it?

## Facilitator notes

**Expected answers**

- Banner after step 2: directly affected **C1**; indirectly affected **C4** (path C1 → C4); potential only: none; not affected: C2, C3, C5.
- Claim states: C1 and C4 show **Needs re-review**. C2, C3 and C5 stay **Reviewed for current version**. C1 keeps its old label until someone records a new review.
- Q1: C4 reasons from the stay difference in C1, and that link is recorded as a confirmed dependency (select C4 and look under *Dependencies*). Impact follows recorded links.
- Q2: C5 depends on C2 and C3, which rest on sources B and C. The tool follows recorded links, not topic. A missing link means a missed flag, and the tool cannot notice it.
- Q3: an unconfirmed link is a guess nobody has checked. Only confirmed links propagate, so unchecked guesses do not fill the list with false alarms. To show this (extra time, on the facilitator's own screen, after students have exported), reload the demo, select C5, add a dependency on C4 with status *unconfirmed* (**Add dependency**), then run step 2. C5 appears under **Potential only (through an unconfirmed dependency; not propagated)** (C1 → C4 → C5) and its state does not change.
- Q4: the corrected passage could support a changed claim, a narrower claim, or nothing. Choosing is a judgement. The tool records the label, the rationale and the versions the review was based on.
- Q5: yes. C4's review was based on C1's old review. After C1 is re-reviewed, C4 shows **A claim it depends on was re-reviewed after this review** until C4 is reviewed too.
- Step 3: a reasonable label for C1 as written is **Not supported**, because version 2 withdraws the stay difference. Editing the claim text first (**Save as new version**) and then reviewing the new claim version is also acceptable.

**Common confusions**

- "The tool checked the correction." It did not. It only compared versions and followed recorded links.
- "Needs re-review means wrong." It means the basis changed. The old label is kept.
- "Bound passage means supported." Binding shows where to look. The label is a separate human judgement.
- "I recorded a review but C1 still needs re-review." The review was based on the old passage. Bind the version 2 passage first, then record the review.

**Limits to say out loud**

- All data are synthetic. This is a teaching and demonstration tool, not a clinical tool.
- It does not judge whether a passage supports a claim.
- It does not detect retractions, corrections or new versions. Here the demo supplies the corrected text. In real use, someone has to notice the correction and paste it in.
- It does not bind to numbers in extraction tables or see pooled estimates. Binding is manual, so it does not scale to large reviews, and there is no collaboration.

## License

The text of this exercise may be reused and adapted under the repository's [MIT License](../LICENSE).

---

## 中文

**课堂练习：来源被更正时。** 面向循证医学、系统综述方法学或文献研读会（journal club）的 20 分钟练习，使用[在线演示](https://yinchuan123.github.io/evidence-os-inspector/)。演示中的研究全部是虚构的。

### 学习目标

完成练习后，学生能够说明：

- 一条主张依赖的是具体来源版本中的具体片段，而不是笼统的"那篇文章"；
- 主张对来源的依赖可以是直接的（绑定了片段），也可以是间接的（从另一条主张推理而来）；
- 更正会让建立在它上面的审阅过时，但不会替人决定新的结论，仍需要人来判断。

### 准备

- 一个浏览器。无需安装，无需账号。
- 演示文本是英文。界面语言跟随浏览器，可用右上角的 **中文** / **English** 按钮切换。
- 所有内容只留在当前浏览器标签页。演示每次打开都会重新生成；刷新、回到首页或打开另一个演示都会丢掉练习进度。如需提交作业，请先点 **导出 JSON**（或 **导出 HTML 报告**）。

### 步骤（约 20 分钟）

**1. 先预测（3 分钟）。** 把[更正影响演示](https://yinchuan123.github.io/evidence-os-inspector/#demo/correction-impact)的直接链接发给学生。首页有本练习的录屏，会提前泄露答案。学生用"来源"下拉框逐个阅读来源，选中主张查看"依赖关系"，但先不要点 **修订来源**。每位学生写下：如果来源 A 被更正，哪些主张需要复核？为什么？

**2. 执行更正（5 分钟）。** 在"来源"里选择 "Synthetic cohort report A"，点 **修订来源**，再点 **载入建议的更正**，然后点 **保存为新版本**。阅读 **本次修订的影响** 提示，与写下的预测对照。

**3. 重新绑定并审阅 C1（5 分钟）。** 选中 C1，查看"审阅"面板。旧片段标有 **绑定的来源已变化**。点 **在当前版本中查找该片段**：找不到，因为这句话本身被改了。在"来源"里选中（高亮）第 2 版中更正后的句子，点 **将选中片段绑定到 C1**。选择标签，写理由，点 **记录审阅**。然后再看一次 C4。窄屏上需要在"主张""来源""审阅"标签页之间切换。

**4. 讨论（7 分钟）。** 从下面的问题中挑两三个。

**5. 选做：另外两个演示（额外时间）。** 先导出：打开另一个演示会丢掉当前进度。直接打开[范围核查](https://yinchuan123.github.io/evidence-os-inspector/#demo/scope-check)或[缺失与补充](https://yinchuan123.github.io/evidence-os-inspector/#demo/missing-then-supplemented)；也可以点左上角的应用名称回到首页，在"范围核查"或"缺失与补充"卡片上点 **试用示例**。

- **范围核查。** 一份虚构的登记库分析（D）和三句话。S1 和 S3 没有超出来源范围。S2 的审阅结论是 **不支持**：它扩大了人群，把"出院去向"换成"恢复不良"，还用了因果措辞，而来源明确说其设计无法确立因果。
- **缺失与补充。** 主张 M2 说的是计划外的门诊联系。试验摘要（E）没有报告这项结局，所以第一次审阅是 **无法判断**。之后加入附录 F，绑定片段，M2 被重新审阅为 **所述范围内支持**。两条审阅都保留在 **审阅历史** 中。

### 讨论问题

1. C4 没有绑定来源 A 的任何片段，为什么也受影响？
2. C5 和 C4 一样提到床日，为什么它不受影响？如果有人忘了记录某条依赖，会发生什么？
3. 为什么未确认的依赖只产生"潜在影响"提示，而不把主张标为需复核？
4. 工具把 C1 标为 **需复核**，却保留旧结论。为什么它不自己把结论改成 **不支持**？
5. C1 重新审阅之后，C4 仍然需复核。这样对吗？
6. 在真实综述中，纳入试验的更正可能改变提取的数字、合并效应量及其置信区间，而本工具看不到这些。这类变化有多大影响？以撤稿试验为例：在可重新分析的受影响 Meta 分析中，剔除撤稿试验后，16.0% 的统计学显著性结论发生改变（Xu 等，BMJ 2025）；另一项针对高影响因子综合与内科期刊中含撤稿研究的综述的研究发现，96% 的重算 Meta 分析仍落在原置信区间内，统计学显著性改变的占 11%（Graña Possamai 等，JAMA Intern Med 2025）。你会核查什么？在持续更新综述的团队里，这件事由谁来做？

### 带教说明

**参考答案**

- 第 2 步后的提示：直接受影响 **C1**；间接受影响 **C4**（路径 C1 → C4）；仅潜在影响：无；不受本次变更影响：C2、C3、C5。
- 主张状态：C1 和 C4 显示 **需复核**；C2、C3、C5 保持 **当前版本已审阅**。在有人记录新审阅之前，C1 保留旧标签。
- 问题 1：C4 依据 C1 中的住院时间差异进行推理，这条关系被记录为已确认的依赖（选中 C4，在"依赖关系"下可以看到）。影响沿已记录的关系传播。
- 问题 2：C5 依赖 C2 和 C3，它们建立在来源 B 和 C 上。工具沿已记录的关系走，不看话题是否相近。漏记一条依赖就会漏掉一次提示，而工具无法察觉。
- 问题 3：未确认的关系是没人核实过的猜测。只有已确认的关系会传播，这样未经核实的猜测不会让清单塞满误报。演示方法（额外时间；学生导出后，在带教者自己的屏幕上做）：重新加载演示，选中 C5，添加对 C4 的依赖并把状态设为"未确认"（**添加依赖**），再做第 2 步。C5 出现在 **仅潜在影响（经未确认的依赖；不传播）** 下（C1 → C4 → C5），其状态不变。
- 问题 4：更正后的片段可能支持修改后的主张、范围更窄的主张，或什么都不支持。怎么选是判断。工具记录的是标签、理由，以及审阅所依据的版本。
- 问题 5：对。C4 的审阅依据的是 C1 的旧审阅。C1 重新审阅后，C4 会显示 **所依赖的主张在本次审阅后被重新审阅**，直到 C4 也被重新审阅。
- 第 3 步：如果 C1 的文本不改，合理的标签是 **不支持**，因为第 2 版撤回了住院时间差异。也可以先修改主张文本（**保存为新版本**），再审阅新的主张版本。

**常见误解**

- "工具核查了更正内容。"没有。它只比较版本、沿已记录的关系查找。
- "需复核就是错了。"不是，它表示依据变了，旧标签仍保留。
- "绑定了片段就等于支持。"绑定只说明去哪里看；标签是另一项人工判断。
- "我记录了审阅，C1 却仍然需复核。"这条审阅依据的是旧片段。先绑定第 2 版的片段，再记录审阅。

**需要明确告诉学生的局限**

- 所有数据都是合成的。这是教学与演示工具，不是临床工具。
- 它不判断片段是否支持主张。
- 它不发现撤稿、更正或新版本。本练习由演示提供更正文本；实际使用时需要有人发现更正并手动粘贴。
- 它不绑定提取表里的数字，也看不到合并效应量。绑定靠手工，不适合大型综述，也不支持协作。

### 许可

本练习文本可按本仓库的 [MIT 许可证](../LICENSE) 复用和改编。
