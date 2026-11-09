import CricketBall from "@/components/CricketBall";

/** Hero artwork: spinning 3D ball, swinging bat and stumps. Pure SVG + CSS (see app/globals.css). */
export default function CricketScene() {
  return (
    <div className="cricket-scene" aria-hidden>
      <svg className="bat" viewBox="0 0 110 330" width="110" height="330" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bcc-wood-b" x1="0" x2="1"><stop offset="0" stopColor="#c79a55"/><stop offset=".5" stopColor="#f3dca8"/><stop offset="1" stopColor="#b98a45"/></linearGradient></defs><rect x="47" y="0" width="16" height="104" rx="7" fill="#1b1b1b"/><g stroke="#C8372D" strokeWidth="3"><line x1="47" y1="14" x2="63" y2="20"/><line x1="47" y1="30" x2="63" y2="36"/><line x1="47" y1="46" x2="63" y2="52"/><line x1="47" y1="62" x2="63" y2="68"/><line x1="47" y1="78" x2="63" y2="84"/></g><path d="M47 100 L63 100 L82 132 L28 132 Z" fill="url(#bcc-wood-b)"/><path d="M30 128 H80 Q86 128 86 136 V298 Q86 324 55 324 Q24 324 24 298 V136 Q24 128 30 128 Z" fill="url(#bcc-wood-b)"/><rect x="53" y="134" width="4" height="184" rx="2" fill="#000" opacity=".12"/><rect x="34" y="168" width="42" height="26" rx="5" fill="#C8372D"/><text x="55" y="186" fontFamily="Anton,Impact,sans-serif" fontSize="15" fill="#fff" textAnchor="middle" letterSpacing="1">BCC</text></svg>
      <svg className="stumps" viewBox="0 0 120 232" width="120" height="232" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bcc-wood-s" x1="0" x2="1"><stop offset="0" stopColor="#b98a45"/><stop offset=".45" stopColor="#f0d9a2"/><stop offset="1" stopColor="#a57634"/></linearGradient></defs><ellipse cx="60" cy="226" rx="58" ry="6" fill="#000" opacity=".35"/><rect x="10" y="34" width="16" height="190" rx="8" fill="url(#bcc-wood-s)"/><rect x="52" y="34" width="16" height="190" rx="8" fill="url(#bcc-wood-s)"/><rect x="94" y="34" width="16" height="190" rx="8" fill="url(#bcc-wood-s)"/><g className="bail b1"><rect x="12" y="25" width="42" height="8" rx="4" fill="#f0d9a2" stroke="#a57634" strokeWidth="1"/></g><g className="bail b2"><rect x="66" y="25" width="42" height="8" rx="4" fill="#f0d9a2" stroke="#a57634" strokeWidth="1"/></g></svg>
      <div className="cs-shadow" />
      <CricketBall size={130} className="cs-ball" />
    </div>
  );
}
