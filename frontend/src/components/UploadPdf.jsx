import { useRef } from "react";
import "./UploadPdf.css";

function UploadPdf({ onUpload, loading }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (loading) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") onUpload(file);
  };

  const handleDragOver = (e) => e.preventDefault();

  return (
    <div
      className={`upload-pdf ${loading ? "disabled" : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => !loading && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        hidden
        disabled={loading}
      />

      <div className="upload-pdf-ring">
        <div className="upload-pdf-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <h3>Choose a PDF file</h3>
      <p>Drag and drop here, or click to browse your device</p>

      <div className="upload-pdf-tags">
        <span>PDF only</span>
        <span>Up to 50 pages</span>
        <span>Text-based files</span>
      </div>
    </div>
  );
}

export default UploadPdf;
