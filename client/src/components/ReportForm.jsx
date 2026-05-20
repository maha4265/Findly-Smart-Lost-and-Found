import { useEffect, useState } from "react";
import { Flame, ImagePlus } from "lucide-react";
import Field from "./Field.jsx";
import { categories, locations } from "../constants/options.js";

export default function ReportForm({ loading, onSubmit }) {
  const [preview, setPreview] = useState("");
  const [reportType, setReportType] = useState("lost");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    setPreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return file ? URL.createObjectURL(file) : "";
    });
  };

  return (
    <section className="panel report-layout">
      <form className="form" onSubmit={onSubmit} encType="multipart/form-data">
        <div className="form-grid">
          <Field label="Report type">
            <select name="type" required onChange={(e) => setReportType(e.target.value)}>
              <option value="lost">Lost item</option>
              <option value="found">Found item</option>
            </select>
          </Field>
          <Field label="Category">
            <select name="category" required>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location">
            <select name="location" required>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date and time">
            <input name="occurredAt" type="datetime-local" required />
          </Field>
        </div>

        <Field label="Item image">
          <input name="image" type="file" accept="image/*" required={reportType === "found"} onChange={handleImageChange} />
          {reportType === "lost" && <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>Optional for lost items</p>}
        </Field>

        {(preview || reportType === "found") && (
          <div className="preview-row">
            <div className="image-preview">
              {preview ? <img src={preview} alt="Selected item" /> : <ImagePlus size={38} />}
            </div>
            <div className="ai-panel">
              <Flame size={20} />
              <div>
                <h3>AI service ready</h3>
                <p>{reportType === "found" ? "The server will generate image features and a description for matching with lost reports." : "Image will help AI compare against found reports."}</p>
              </div>
            </div>
          </div>
        )}

        <Field label="Extra details">
          <textarea name="details" rows="4" placeholder="Brand, color, marks, serial number, last seen context..." />
        </Field>

        {reportType === "found" && (
          <>
            <Field label="Verification question">
              <input name="verificationQuestion" placeholder="Example: What sticker is on the laptop?" required />
            </Field>
            <Field label="Correct answer">
              <input name="verificationAnswer" placeholder="Kept private for claim verification" required />
            </Field>
          </>
        )}
        <button className="primary" disabled={loading}>
          {loading ? "Submitting..." : "Submit report"}
        </button>
      </form>
      <aside className="side-note">
        <h3>{reportType === "found" ? "Found Item Flow" : "Lost Item Flow"}</h3>
        <p>
          {reportType === "found"
            ? "Provide a photo and verification question. Lost users will search for your found item and answer your question to prove ownership."
            : "Describe your lost item. Search through found reports and answer the finder's verification question to confirm you're the owner."}
        </p>
      </aside>
    </section>
  );
}
