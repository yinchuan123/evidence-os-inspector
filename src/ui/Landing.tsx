import { t, type Locale } from '../core/i18n'
import { DEMOS, type DemoId } from '../demos'
import { UI } from './strings'

export const REPO_URL = 'https://github.com/yinchuan123/evidence-os-inspector'

export function Landing({
  locale,
  onDemo,
  onOwn,
  onToggleLocale,
}: {
  locale: Locale
  onDemo: (id: DemoId) => void
  onOwn: () => void
  onToggleLocale: () => void
}) {
  const s = UI[locale].landing
  const nav = UI[locale].nav
  const d = t(locale)
  const media = (name: string) => `${import.meta.env.BASE_URL}media/${name}`
  const faqHref = `${import.meta.env.BASE_URL}docs/FAQ.html${locale === 'zh-CN' ? '#zh' : ''}`
  return (
    <div>
      <header className="topbar">
        <span className="brand">{d.appName}</span>
        <span className="badge">v0.1 alpha</span>
        <span className="spacer" />
        <a href={faqHref}>{nav.faq}</a>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          {nav.github}
        </a>
        <button className="small" data-testid="locale-toggle" onClick={onToggleLocale}>
          {nav.switchLocale}
        </button>
      </header>
      <main className="landing">
        <section className="hero">
          <h1>{s.hero}</h1>
          <p className="sub">{s.sub}</p>
          <p className="muted">{s.alphaLine}</p>
          <div className="cta">
            <button className="primary" data-testid="try-demo-hero" onClick={() => onDemo('correction-impact')}>
              {nav.tryDemo}
            </button>
            <button data-testid="review-own-text" onClick={onOwn}>
              {nav.reviewOwn}
            </button>
            <a className="button" href={REPO_URL} target="_blank" rel="noopener noreferrer">
              {nav.github}
            </a>
          </div>
        </section>

        <section>
          <img className="shot" src={media('demo-loop.gif')} alt={s.gifAlt} width={960} height={600} loading="lazy" />
          <details>
            <summary className="muted">{s.videoSummary}</summary>
            <video key={locale} className="shot" controls preload="none" playsInline poster={media('shot-change-impact.png')} width={1280} height={800}>
              <source src={media(locale === 'zh-CN' ? 'demo-zh.mp4' : 'demo-en.mp4')} type="video/mp4" />
            </video>
          </details>
        </section>

        <section>
          <h2>{s.demosTitle}</h2>
          <p className="muted">{s.demosNote}</p>
          <div className="demo-grid">
            {DEMOS.map((demo) => (
              <div className="card" key={demo.id}>
                <h3>
                  {demo.title[locale]} <span className="badge synthetic">{d.syntheticBadge}</span>
                </h3>
                <p>{demo.summary[locale]}</p>
                <button className="small" data-testid={`try-demo-${demo.id}`} onClick={() => onDemo(demo.id)}>
                  {nav.tryDemo}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>{s.ownTitle}</h2>
          <p>{s.ownText}</p>
          <button onClick={onOwn}>{nav.reviewOwn}</button>
        </section>

        <section>
          <h2>{s.scenarioTitle}</h2>
          <p>{s.scenario}</p>
        </section>

        <section>
          <h2>{s.howTitle}</h2>
          <ul>
            {s.how.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{s.boundariesTitle}</h2>
          <ul>
            {s.boundaries.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
          <p className="muted">{s.privacy}</p>
        </section>

        <footer>
          {s.footer} · <a href={REPO_URL} target="_blank" rel="noopener noreferrer">{nav.github}</a> ·{' '}
          <a href={faqHref}>{nav.faq}</a> ·{' '}
          <a href={`${REPO_URL}/blob/main/ROADMAP.md`} target="_blank" rel="noopener noreferrer">
            {nav.roadmap}
          </a>
        </footer>
      </main>
    </div>
  )
}
