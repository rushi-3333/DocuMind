import { useState } from "react";
import UploadPdf from "./components/UploadPdf";
import DocumentChart from "./components/DocumentChart";
import ChatPanel from "./components/ChatPanel";
import { SITE, FEATURES } from "./config/site";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const FEATURE_ICONS = {
  upload: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" strokeLinecap="round" />
    </svg>
  ),
  chart: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" strokeLinecap="round" />
    </svg>
  ),
  chat: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function App() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [docInfo, setDocInfo] = useState(null);

  const handleUpload = async (file) => {
    setUploading(true);
    setError("");
    setDocInfo(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to process PDF.");
      }

      setDocInfo(data.data);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setDocInfo(null);
    setError("");
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="brand">
            <span className="brand-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
            </span>
            <span className="brand-name">{SITE.title}</span>
          </div>

          {docInfo && (
            <div className="navbar-doc">
              <span className="navbar-file">{docInfo.file_name}</span>
              <button type="button" className="btn-ghost" onClick={handleReset}>
                New PDF
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="main">
        {!docInfo && (
          <div className="landing">
            <section className="hero">
              <p className="hero-eyebrow">DocuMind</p>
              <h1>{SITE.tagline}</h1>
              <p className="hero-desc">{SITE.subtitle}</p>
            </section>

            <div className="landing-grid">
              <div className="landing-left">
                <div className="feature-cards">
                  {FEATURES.map((f) => (
                    <article key={f.title} className="feature-card">
                      <div className="feature-icon">{FEATURE_ICONS[f.icon]}</div>
                      <div>
                        <h3>{f.title}</h3>
                        <p>{f.desc}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="landing-right">
                <UploadPdf onUpload={handleUpload} loading={uploading} />

                {error && <div className="error-banner">{error}</div>}

                {uploading && (
                  <div className="loading-card">
                    <div className="spinner" />
                    <p>Indexing your document…</p>
                    <span>Reading pages, splitting content, and building your knowledge base.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {docInfo && (
          <div className="workspace">
            {error && <div className="error-banner">{error}</div>}

            <DocumentChart docInfo={docInfo} />

            <ChatPanel
              sessionId={docInfo.session_id}
              fileName={docInfo.file_name}
              onError={setError}
            />
          </div>
        )}
      </main>

      <footer className="footer">
        <p>© {SITE.copyrightYear} {SITE.title} · Answers sourced only from your uploaded PDF</p>
      </footer>
    </div>
  );
}

export default App;
