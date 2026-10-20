import { GLOSSARY } from '../data/glossary'

export default function Glossary() {
  return (
    <section className="lesson lesson-single" aria-labelledby="glossary-title">
      <div className="panel">
        <h2 id="glossary-title">Glossary</h2>
        <p className="lede">
          Every term the lessons use, with the Cantonese word where there is one. Hover or tap any
          underlined word in a lesson for the short version.
        </p>
        <dl className="glossary">
          {GLOSSARY.map((t) => (
            <div key={t.id} className="glossary-item" id={`term-${t.id}`}>
              <dt>
                {t.term}
                {t.chinese && (
                  <span className="glossary-cjk">
                    <span lang="zh-Hant">{t.chinese}</span>
                    {t.say && <span className="glossary-say">{t.say}</span>}
                  </span>
                )}
              </dt>
              <dd>
                <p>{t.short}</p>
                <p className="hint">{t.long}</p>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
