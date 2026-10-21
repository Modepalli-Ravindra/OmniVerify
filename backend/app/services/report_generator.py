from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any
from ..api.schemas import VideoAnalysisResult
from ..core.config import settings, REPORTS_DIR

class ForensicReportGenerator:
    @staticmethod
    def generate_json_report(analysis: VideoAnalysisResult) -> Path:
        timestamp_int = int(datetime.now(timezone.utc).timestamp())
        filename = f"OmniVerify_Report_{analysis.video_filename}_{timestamp_int}.json"
        filepath = REPORTS_DIR / filename
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(analysis.model_dump_json(indent=2))
        return filepath

    @staticmethod
    def generate_html_report(analysis: VideoAnalysisResult) -> Path:
        timestamp_int = int(datetime.now(timezone.utc).timestamp())
        filename = f"OmniVerify_Dossier_{analysis.video_filename}_{timestamp_int}.html"
        filepath = REPORTS_DIR / filename

        verdict_color = "#0F766E" if analysis.verdict == "REAL" else ("#B91C1C" if analysis.verdict == "MANIPULATED" else "#B45309")
        verdict_bg = "#D1FAE5" if analysis.verdict == "REAL" else ("#FEE2E2" if analysis.verdict == "MANIPULATED" else "#FEF3C7")

        signal_rows = "".join(
            f"""<tr>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E2DED5; font-weight: 600;">{sb.signal_name}</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E2DED5; text-align: center;">{sb.raw_score:.3f}</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E2DED5; text-align: center;">{int(sb.weight * 100)}%</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E2DED5; text-align: center;"><span style="padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: {'#FEE2E2' if sb.status == 'Anomalous' else ('#FEF3C7' if sb.status == 'Suspicious' else '#D1FAE5')}; color: {'#991B1B' if sb.status == 'Anomalous' else ('#92400E' if sb.status == 'Suspicious' else '#065F46')};">{sb.status}</span></td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E2DED5; font-size: 13px; color: #64716D;">{sb.description}</td>
            </tr>"""
            for sb in analysis.signal_breakdowns
        )

        interval_rows = "".join(
            f"""<div style="background: #FFFFFF; border: 1px solid #E2DED5; border-left: 4px solid #B91C1C; border-radius: 6px; padding: 12px 16px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <strong style="color: #004741;">Timestamp: {inv.start_formatted} &rarr; {inv.end_formatted} (Frames {inv.start_frame}&ndash;{inv.end_frame})</strong>
                    <span style="font-size: 12px; font-weight: 700; color: #B91C1C;">Anomaly Score: {inv.average_anomaly_score:.2f}</span>
                </div>
                <div style="font-size: 13px; color: #101816;"><b>Primary Signal:</b> {inv.primary_contributing_signal}</div>
                <div style="font-size: 13px; color: #64716D; margin-top: 4px;">{inv.evidence_rationale}</div>
            </div>"""
            for inv in analysis.suspicious_intervals
        ) or "<p style='color: #64716D; font-style: italic;'>No anomalous temporal intervals detected above forensic threshold.</p>"

        explanations_list = "".join(f"<li style='margin-bottom: 8px;'>{exp}</li>" for exp in analysis.traceable_explanations)

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>OmniVerify Forensic Examination Dossier — {analysis.video_filename}</title>
    <style>
        @media print {{ body {{ margin: 0; padding: 15mm; background: #FFFFFF !important; }} }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #F0EDE4;
            color: #101816;
            margin: 0;
            padding: 30px;
            line-height: 1.5;
        }}
        .report-container {{
            max-width: 900px;
            margin: 0 auto;
            background: #FAF9F5;
            border: 1px solid #D5CFC2;
            border-radius: 8px;
            padding: 36px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #004741;
            padding-bottom: 20px;
            margin-bottom: 24px;
        }}
        .brand-title {{
            font-size: 26px;
            font-weight: 800;
            color: #004741;
            letter-spacing: -0.5px;
            margin: 0;
        }}
        .brand-subtitle {{
            font-size: 13px;
            color: #64716D;
            margin: 4px 0 0 0;
        }}
        .verdict-banner {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: {verdict_bg};
            border: 2px solid {verdict_color};
            border-radius: 8px;
            padding: 18px 24px;
            margin-bottom: 28px;
        }}
        .verdict-title {{
            font-size: 28px;
            font-weight: 900;
            color: {verdict_color};
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .confidence-badge {{
            font-size: 18px;
            font-weight: 700;
            color: {verdict_color};
        }}
        .meta-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px 24px;
            background: #FFFFFF;
            border: 1px solid #E2DED5;
            border-radius: 6px;
            padding: 16px 20px;
            margin-bottom: 28px;
            font-size: 13px;
        }}
        .meta-label {{
            color: #64716D;
            font-weight: 600;
        }}
        .meta-value {{
            color: #101816;
            font-family: monospace;
            word-break: break-all;
        }}
        .section-title {{
            font-size: 18px;
            font-weight: 700;
            color: #004741;
            border-left: 4px solid #004741;
            padding-left: 10px;
            margin: 28px 0 14px 0;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            background: #FFFFFF;
            border: 1px solid #E2DED5;
            border-radius: 6px;
            overflow: hidden;
            font-size: 14px;
            margin-bottom: 24px;
        }}
        th {{
            background: #004741;
            color: #FFFFFF;
            padding: 10px 14px;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .disclaimer-box {{
            background: #F4F1EA;
            border-left: 3px solid #64716D;
            padding: 14px 18px;
            font-size: 12px;
            color: #64716D;
            border-radius: 4px;
            margin-top: 36px;
            line-height: 1.6;
        }}
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <div>
                <h1 class="brand-title">OmniVerify Forensic Examination Dossier</h1>
                <p class="brand-subtitle">{settings.APP_TITLE} &bull; Academic Year {settings.ACADEMIC_YEAR}</p>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64716D;">
                <div><b>Date:</b> {analysis.processed_at_iso[:10]}</div>
                <div><b>Time:</b> {analysis.processed_at_iso[11:19]} UTC</div>
                <div><b>Standard:</b> ISO/IEC 27037 Digital Forensics</div>
            </div>
        </div>

        <div class="verdict-banner">
            <div>
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: {verdict_color}; font-weight: 700;">Final Forensic Determination</div>
                <h2 class="verdict-title">{analysis.verdict}</h2>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 12px; color: {verdict_color};">Calibrated Confidence</div>
                <div class="confidence-badge">{analysis.calibrated_confidence * 100:.1f}%</div>
            </div>
        </div>

        <div class="section-title">Video Custody & Evidence Metadata</div>
        <div class="meta-grid">
            <div><span class="meta-label">Target File:</span> <span class="meta-value">{analysis.video_filename}</span></div>
            <div><span class="meta-label">Duration:</span> <span class="meta-value">{analysis.duration_seconds}s ({analysis.total_frames} frames @ {analysis.fps} FPS)</span></div>
            <div><span class="meta-label">Canvas Resolution:</span> <span class="meta-value">{analysis.resolution}</span></div>
            <div><span class="meta-label">Analysis Sample Bounded:</span> <span class="meta-value">{analysis.sampled_frames_count} frames evaluated</span></div>
            <div style="grid-column: span 2;"><span class="meta-label">SHA-256 Digest:</span> <span class="meta-value">{analysis.video_hash_sha256}</span></div>
        </div>

        <div class="section-title">Multi-Signal Forensic Breakdown</div>
        <table>
            <thead>
                <tr>
                    <th>Forensic Domain</th>
                    <th style="text-align: center;">Raw Score</th>
                    <th style="text-align: center;">Weight</th>
                    <th style="text-align: center;">Status</th>
                    <th>Analytical Domain Scope</th>
                </tr>
            </thead>
            <tbody>
                {signal_rows}
            </tbody>
        </table>

        <div class="section-title">Temporally Localized Suspicious Intervals</div>
        <div>
            {interval_rows}
        </div>

        <div class="section-title">Traceable Evidence Findings</div>
        <ul style="padding-left: 20px; font-size: 14px; color: #101816; line-height: 1.6;">
            {explanations_list}
        </ul>

        <div class="disclaimer-box">
            <b>FORENSIC NOTICE & METHODOLOGICAL LIMITATION:</b><br>
            {analysis.limitations_disclaimer}
        </div>
    </div>
</body>
</html>"""
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html_content)
        return filepath

report_generator = ForensicReportGenerator()
