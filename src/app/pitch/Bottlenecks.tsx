'use client';

import { useState } from 'react';
import { CloudRain, Landmark, Soup, Handshake, Pause, Play } from 'lucide-react';

const bottlenecks = [
  { Icon: CloudRain, title: 'Lịch trình gián đoạn do thời tiết', detail: 'Cơn mưa bất chợt cắt ngang tuyến tham quan ngoài trời. Du khách phải tự tìm một phương án khác.', short: 'Mưa làm đứt quãng hành trình', effect: 'weather' },
  { Icon: Landmark, title: 'Trải nghiệm di sản thiếu chiều sâu', detail: 'Đứng trước một công trình đẹp nhưng thiếu câu chuyện và thuyết minh để hiểu ý nghĩa của di sản.', short: 'Nhìn thấy di sản, chưa nghe được câu chuyện', effect: 'heritage' },
  { Icon: Soup, title: 'Bỏ quên ẩm thực “ngõ hẻm” địa phương', detail: 'Những quán nhỏ nằm ngoài tuyến quen thuộc bị bỏ qua. Du khách đi ngang mà chưa biết trải nghiệm đáng thử.', short: 'Điểm ngon nằm ngoài đường quen thuộc', effect: 'food' },
  { Icon: Handshake, title: 'Thiếu liên kết với các hộ kinh doanh & làng nghề truyền thống', detail: 'Du khách và người làm nghề ở gần nhau, nhưng chưa có cầu nối để tìm thấy và đặt trải nghiệm phù hợp.', short: 'Hai phía ở gần, kết nối còn thiếu', effect: 'partners' },
];

function Effect({ kind }: { kind: string }) {
  return <div className={`bottleneck-effect effect-${kind}`} aria-hidden="true">
    {kind === 'weather' && <><div className="storm-cloud">☁</div><div className="local-rain">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ left: `${(i * 17) % 100}%`, animationDelay: `${-(i % 7) * .18}s` }}/>)}</div><svg viewBox="0 0 360 100"><path d="M30 75Q85 20 137 64" className="route-before"/><path d="M204 66Q263 20 330 72" className="route-after"/><circle cx="30" cy="75" r="6" fill="#ad641c"/><circle cx="330" cy="72" r="6" fill="#ad641c"/><path d="M164 54l20 20m0-20l-20 20" stroke="#b03d27" strokeWidth="5" className="route-break"/></svg><span className="effect-label">LỊCH TRÌNH BỊ GIÁN ĐOẠN</span></>}
    {kind === 'heritage' && <><svg viewBox="0 0 360 110"><path d="M77 90H205M88 89V46H194V89M75 45L108 24H175L207 45M113 23L140 10L170 23" stroke="#a66628" strokeWidth="4" fill="#e9c793"/><path d="M125 89V67a16 16 0 0 1 32 0v22" fill="#9d602f"/><path d="M228 30H319V79H258L241 92V79H228Z" fill="#fff9ef" stroke="#cda96b" strokeWidth="2"/>{[248,273,297].map((x,i)=><circle key={x} cx={x} cy="54" r="4" fill="#a66628" className="missing-story" style={{animationDelay:`${i*.3}s`}}/>)}</svg><span className="effect-label">CÂU CHUYỆN CÒN BỎ TRỐNG</span></>}
    {kind === 'food' && <><svg viewBox="0 0 360 110"><path d="M15 82H345" stroke="#d9bd8b" strokeWidth="15"/><path d="M168 82V16H290" stroke="#e2d2b4" strokeWidth="9" fill="none"/><path d="M15 82H345" stroke="#b77a32" strokeWidth="2" strokeDasharray="8 7"/><circle cx="50" cy="82" r="7" fill="#965325" className="passing-traveler"/><g className="hidden-food"><circle cx="283" cy="20" r="18" fill="#f8e9ce" stroke="#b36b22" strokeWidth="2"/><path d="M271 20q12 21 24 0Z" fill="#ba782e"/><path d="M278 14q-6-5 0-9m7 9q-6-5 0-9" stroke="#b46b25" fill="none"/></g><text x="203" y="58" fill="#a66c35" fontSize="12">Ngõ nhỏ</text></svg><span className="effect-label">QUÁN NGON BỊ ĐI QUA</span></>}
    {kind === 'partners' && <><svg viewBox="0 0 360 110"><g fill="#f8ead3" stroke="#ba803c" strokeWidth="2"><circle cx="55" cy="53" r="28"/><circle cx="301" cy="28" r="23"/><circle cx="301" cy="86" r="23"/></g><path d="M48 60v-9q7-10 14 0v9m-7-27a6 6 0 1 0 0 12a6 6 0 1 0 0-12" fill="#aa6a28"/><path d="M285 36V21h31v15m-36-16l20-12l20 12" fill="none" stroke="#aa6a28" strokeWidth="3"/><path d="M291 72q-7 12-2 24h24q5-12-2-24Z" fill="#aa6a28"/><path d="M85 51L158 34M206 32L274 28M85 58L158 79M206 80L274 86" stroke="#b77a32" strokeWidth="3" strokeDasharray="7 6" className="broken-links"/><text x="174" y="66" fill="#b04c28" fontSize="37">?</text></svg><span className="effect-label">CHƯA CÓ CẦU NỐI</span></>}
  </div>;
}

export default function Bottlenecks() {
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  return <section className={`bottlenecks ${paused ? 'effects-paused' : ''}`}>
    <div className="heritage-title"><h1>Đâu là “điểm nghẽn”?</h1><img src="/pitch/gate.webp" alt=""/></div>
    <div className="bottleneck-stage"><img className="gold-cloud cloud-left" src="/pitch/gold-cloud.webp" alt=""/><img className="gold-cloud cloud-right" src="/pitch/gold-cloud.webp" alt=""/><img className="heritage-boat" src="/pitch/boat.webp" alt=""/>
      <div className="bottleneck-grid">{bottlenecks.map(({ Icon, title, effect }, i) => <button key={effect} aria-pressed={selected === i} onClick={() => setSelected(i)} className={`bottleneck-card ${selected === i ? 'is-active' : ''}`}><span className="bottleneck-icon"><Icon size={24}/></span><h2>{title}</h2>{selected === i ? <Effect kind={effect}/> : <span className="activate-effect">Chạm để xem tình huống <span>↗</span></span>}</button>)}</div>
    </div>
    <div className="bottleneck-description"><div aria-live="polite"><strong>{bottlenecks[selected].short}</strong><p>{bottlenecks[selected].detail}</p></div><button onClick={() => setPaused(p => !p)} aria-label={paused ? 'Tiếp tục hiệu ứng' : 'Tạm dừng hiệu ứng'}>{paused ? <Play size={15}/> : <Pause size={15}/>}<span>{paused ? 'Tiếp tục' : 'Tạm dừng'}</span></button></div>
    <p className="reference-note">Bản slide gốc ghi: tổng hợp từ phỏng vấn sâu du khách tự túc & hộ kinh doanh tại Huế (tháng 8/2026). Hiệu ứng minh họa tình huống; chưa có dữ liệu mẫu phỏng vấn kèm theo.</p>
  </section>;
}
