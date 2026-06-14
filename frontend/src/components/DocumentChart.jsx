import "./DocumentChart.css";

const TOPIC_COLORS = ["#0f766e", "#e11d48", "#b45309", "#7c3aed", "#0369a1", "#be185d"];

function DocumentChart({ docInfo }) {
  const { file_name, page_count, word_count, char_count, chunk_count, topics, page_stats, preview } =
    docInfo;

  const maxWords = Math.max(...(page_stats || []).map((p) => p.words), 1);

  return (
    <section className="doc-chart">
      <div className="doc-chart-top">
        <div className="doc-chart-title">
          <h2>Document Insights</h2>
          <span className="doc-file-name">{file_name}</span>
        </div>
        <div className="doc-status">
          <span className="status-dot" />
          Ready to chat
        </div>
      </div>

      <p className="doc-preview">{preview}</p>

      <div className="doc-metrics">
        <div className="metric-tile">
          <span className="metric-icon">📄</span>
          <span className="metric-value">{page_count}</span>
          <span className="metric-label">Pages</span>
        </div>
        <div className="metric-tile">
          <span className="metric-icon">✍️</span>
          <span className="metric-value">{word_count.toLocaleString()}</span>
          <span className="metric-label">Words</span>
        </div>
        <div className="metric-tile">
          <span className="metric-icon">🔤</span>
          <span className="metric-value">{char_count.toLocaleString()}</span>
          <span className="metric-label">Characters</span>
        </div>
        <div className="metric-tile">
          <span className="metric-icon">🧩</span>
          <span className="metric-value">{chunk_count}</span>
          <span className="metric-label">Sections</span>
        </div>
      </div>

      <div className="doc-chart-panels">
        {topics && topics.length > 0 && (
          <div className="chart-panel topics-panel">
            <h3>Main Topics</h3>
            <div className="topics-list">
              {topics.map((topic, i) => (
                <div key={i} className="topic-row">
                  <span className="topic-name">{topic.name}</span>
                  <div className="topic-bar-track">
                    <div
                      className="topic-bar-fill"
                      style={{
                        width: `${topic.weight}%`,
                        background: TOPIC_COLORS[i % TOPIC_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="topic-weight">{topic.weight}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {page_stats && page_stats.length > 1 && (
          <div className="chart-panel pages-panel">
            <h3>Words per Page</h3>
            <div className="page-bars">
              {page_stats.map((page, i) => (
                <div
                  key={page.page}
                  className="page-bar-col"
                  title={`Page ${page.page}: ${page.words} words`}
                >
                  <div
                    className="page-bar-fill"
                    style={{
                      height: `${Math.max(10, (page.words / maxWords) * 100)}%`,
                      background: TOPIC_COLORS[i % TOPIC_COLORS.length],
                    }}
                  />
                  <span className="page-bar-label">{page.page}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default DocumentChart;
