import { useEffect, useMemo, useState, type JSX } from "react";
import { Gauge, Flame, Truck, Users, Timer, BarChart2, Activity, PackageOpen, AlertTriangle } from "lucide-react";
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import "./App.css";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f7f", "#8dd1e1", "#a4de6c"];

function kFormat(n: number) {
  if (n === 0) return "0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 1000) return sign + abs.toString();
  if (abs < 1_000_000) return sign + (abs / 1000).toFixed(1) + "k";
  return sign + (abs / 1_000_000).toFixed(1) + "M";
}
function gaugeColor(pct: number) {
  if (pct >= 0.9) return "green";
  if (pct >= 0.75) return "orange";
  return "crimson";
}
function chipClass(pct: number) {
  if (pct >= 0.9) return "badge badge-green";
  if (pct >= 0.75) return "badge badge-amber";
  return "badge badge-red";
}

const initialStations = Array.from({ length: 18 })
  .map((_, i) => ({
    id: `KA-${100 + i}`,
    dept: i < 8 ? "ÖN SEÇİM" : i < 14 ? "KALİTE" : "PRES",
    targetKg: 900,
    completedKg: Math.floor(400 + Math.random() * 450),
    remainingKg: 0,
    lastLogMin: Math.floor(Math.random() * 18),
    fireKg: Math.random() < 0.25 ? Math.floor(10 + Math.random() * 50) : 0,
    pinePct: Math.random() < 0.3 ? +(1 + Math.random() * 3).toFixed(1) : +(0.5 + Math.random()).toFixed(1),
  }))
  .map((s) => ({ ...s, remainingKg: Math.max(0, s.targetKg - s.completedKg) }));

const qualityMix = [
  { name: "Krem", value: 12 },
  { name: "Ekstra", value: 22 },
  { name: "Sınıf 1", value: 28 },
  { name: "Sınıf 2", value: 18 },
  { name: "Sınıf 3", value: 12 },
  { name: "Sınıf 4-5/Çöp", value: 8 },
];

const pineTrend = Array.from({ length: 12 }).map((_, i) => ({ t: `${i * 2}:00`, pct: +(0.5 + Math.random() * 2.5).toFixed(2) }));

const funnel = [
  { name: "Giriş", kg: 14800 },
  { name: "Tamamlanan", kg: 12650 },
  { name: "Kalan", kg: 2150 },
];

const shipments = [
  { name: "Zamanında", val: 18 },
  { name: "Risk", val: 3 },
  { name: "Gecikmiş", val: 1 },
];

export default function App() {
  const [stations, setStations] = useState(initialStations);
  const [selected, setSelected] = useState<typeof stations[0] | null>(null);

  const completedKg = useMemo(() => stations.reduce((a, s) => a + s.completedKg, 0), [stations]);
  const targetKg = useMemo(() => stations.reduce((a, s) => a + s.targetKg, 0), [stations]);
  const remainingKg = Math.max(0, targetKg - completedKg);
  const completionRate = targetKg ? completedKg / targetKg : 0;
  const capacityPct = useMemo(() => {
    const active = stations.filter((s) => s.lastLogMin < 15).length;
    const planned = stations.length;
    return planned ? active / planned : 0;
  }, [stations]);

  useEffect(() => {
    const t = setInterval(() => {
      setStations((prev) =>
        prev.map((s) => {
          const bump = Math.random() < 0.35 ? Math.floor(Math.random() * 6) : 0;
          const newCompleted = Math.min(s.targetKg, s.completedKg + bump);
          const newRemaining = Math.max(0, s.targetKg - newCompleted);
          const lastLogMin = bump > 0 ? 0 : Math.min(60, s.lastLogMin + 1);
          return { ...s, completedKg: newCompleted, remainingKg: newRemaining, lastLogMin };
        })
      );
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const atRisk = useMemo(() => {
    return stations
      .map((s) => {
        const timeRisk = s.lastLogMin > 15;
        const completion = s.completedKg / s.targetKg;
        const burnRisk = completion < 0.75 && s.remainingKg > 200;
        const fireRisk = s.fireKg > 40;
        const pineRisk = s.pinePct > 3.0;
        const score = (timeRisk ? 1 : 0) + (burnRisk ? 1 : 0) + (fireRisk ? 1 : 0) + (pineRisk ? 1 : 0);
        return { ...s, timeRisk, burnRisk, fireRisk, pineRisk, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [stations]);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Canlı Sahip Panosu</h1>
          <p className="muted">30 saniyede resim: planında mıyız, nerede takıldı, müşteri riski var mı?</p>
        </div>
        <div className="actions">
          <input className="input" placeholder="Ara: KA-10x, ürün, kişi…" />
          <button className="btn btn-outline"><BarChart2 size={16}/> Rapor Al</button>
        </div>
      </header>

      {/* HERO STRIP */}
      <section className="grid hero">
        <StatCard icon={<Gauge size={18}/>} title="Tamamlama % (Bugün)"
          value={(completionRate * 100).toFixed(1) + "%"}
          hint={`${kFormat(completedKg)} / ${kFormat(targetKg)} kg`}
          tone={gaugeColor(completionRate)}
        />
        <StatCard icon={<PackageOpen size={18}/>} title="Kalan (kg)"
          value={kFormat(remainingKg)}
          hint="Bitime göre otomatik renk"
          tone={remainingKg > 3000 ? "crimson" : remainingKg > 1500 ? "orange" : "green"}
        />
        <StatCard icon={<Flame size={18}/>} title="Fire (kg) • Pine %"
          value={`~${kFormat(stations.reduce((a, s) => a + s.fireKg, 0))} • ${(pineTrend.at(-1)?.pct ?? 0).toFixed(2)}%`}
          hint="eşik aşımı kırmızı"
          tone="crimson"
        />
        <StatCard icon={<Activity size={18}/>} title="Kalite Endeksi" value="B+" hint="sınıf dağılımından skor" tone="#0ea5e9" />
        <StatCard icon={<Truck size={18}/>} title="Zamanında Sevkiyat %" value="94%" hint="bugün" tone="green" />
        <StatCard icon={<Users size={18}/>} title="Kapasite Kullanımı %" value={(capacityPct * 100).toFixed(0) + "%"} hint="aktif masa / planlı" tone="#4f46e5" />
      </section>

      <div className="grid content">
        {/* LEFT: MAP + AT-RISK */}
        <div className="leftCol">
          <div className="card">
            <div className="cardHeader">
              <div className="title">Tesis Haritası</div>
              <div className="tags">
                <span className="badge">ÖN SEÇİM</span>
                <span className="badge">KALİTE</span>
                <span className="badge">PRES</span>
              </div>
            </div>
            <div className="cardBody">
              <div className="stations">
                {stations.map((s) => {
                  const pct = s.completedKg / s.targetKg;
                  const idle = s.lastLogMin > 15;
                  return (
                    <button key={s.id} className={`station ${idle ? "station-warn" : ""}`} onClick={() => setSelected(s)}>
                      <div className="row between">
                        <div className="bold">{s.id}</div>
                        <span className={chipClass(pct)}>{(pct * 100).toFixed(0)}%</span>
                      </div>
                      <div className="muted tiny">{s.dept}</div>
                      <div className="kpis tiny">
                        <div>Hedef<br/><b>{kFormat(s.targetKg)}</b></div>
                        <div>Giriş<br/><b>{kFormat(s.completedKg)}</b></div>
                        <div>Kalan<br/><b>{kFormat(s.remainingKg)}</b></div>
                      </div>
                      <div className="bar"><div className={`barFill ${pct>=0.9 ? "ok" : pct>=0.75 ? "mid" : "bad"}`} style={{width: `${Math.min(100, pct*100)}%`}}/></div>
                      <div className="row between tiny muted">
                        <span className="row gap4"><Timer size={12}/> son {s.lastLogMin} dk</span>
                        {s.fireKg>40 && <span className="row gap4 red"><Flame size={12}/> fire {s.fireKg}kg</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="cardHeader">
              <div className="title">At-Risk Akışı</div>
              <span className="badge badge-outline row gap4"><AlertTriangle size={12}/> kritik: {atRisk.length}</span>
            </div>
            <div className="cardBody vstack gap8">
              {atRisk.map((r) => (
                <div key={r.id} className="riskRow">
                  <div>
                    <div className="bold">{r.id} • {r.dept}</div>
                    <div className="chips">
                      {r.burnRisk && <span className="chip red">Tamamlama {(r.completedKg/r.targetKg*100).toFixed(0)}%</span>}
                      {r.timeRisk && <span className="chip amber">Son kayıt {r.lastLogMin}dk</span>}
                      {r.fireRisk && <span className="chip red">Fire {r.fireKg}kg</span>}
                      {r.pineRisk && <span className="chip amber">Pine {r.pinePct}%</span>}
                    </div>
                  </div>
                  <div className="row gap6">
                    <button className="btn btn-outline" onClick={() => setSelected(r)}>İncele</button>
                    <button className="btn">Sorumlu Ata</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: FUNNEL + QUALITY + SHIPMENTS */}
        <div className="rightCol vstack gap12">
          <div className="card">
            <div className="cardHeader"><div className="title">Üretim Hunisi</div></div>
            <div className="cardBody chartBox">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="kg" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="cardHeader"><div className="title">Kalite Karışımı</div></div>
            <div className="cardBody chartBox">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={qualityMix} dataKey="value" nameKey="name" outerRadius={70}>
                    {qualityMix.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="cardHeader"><div className="title">Pine % (son 24 saat)</div></div>
            <div className="cardBody chartBox">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pineTrend}>
                  <XAxis dataKey="t" />
                  <YAxis domain={[0, 6]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pct" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="cardHeader"><div className="title">Sevkiyat Sağlığı</div></div>
            <div className="cardBody chartBox">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shipments}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="val" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* DRAWER */}
      {selected && (
        <>
          <div className="overlay" onClick={() => setSelected(null)} />
          <div className="drawer">
            <div className="drawerHeader">
              <div className="bold">{selected.id} • {selected.dept}</div>
              <span className={chipClass(selected.completedKg/selected.targetKg)}>
                {((selected.completedKg/selected.targetKg)*100).toFixed(0)}%
              </span>
            </div>
            <div className="drawerBody">
              <div className="kv">
                <div><div className="tiny muted">Hedef</div><div className="bold">{kFormat(selected.targetKg)} kg</div></div>
                <div><div className="tiny muted">Giriş</div><div className="bold">{kFormat(selected.completedKg)} kg</div></div>
                <div><div className="tiny muted">Kalan</div><div className="bold">{kFormat(selected.remainingKg)} kg</div></div>
                <div><div className="tiny muted">Son kayıt</div><div className="bold">{selected.lastLogMin} dk önce</div></div>
                <div><div className="tiny muted">Fire</div><div className="bold">{selected.fireKg} kg</div></div>
                <div><div className="tiny muted">Pine</div><div className="bold">{selected.pinePct}%</div></div>
              </div>
              <div className="row gap6">
                <button className="btn">Sorumlu Ata</button>
                <button className="btn btn-outline" onClick={() => setSelected(null)}>Kapat</button>
              </div>
              <p className="tiny muted">Not: Burada normalde görev detayları, kişi süreleri ve WorkLog akışı listelenir.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, hint, tone }: { icon: JSX.Element; title: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="card">
      <div className="cardBody">
        <div className="row between">
          <div className="muted">{icon}</div>
          <div className="value" style={{ color: tone }}>{value}</div>
        </div>
        <div className="tiny muted">{title}</div>
        {hint && <div className="tiny very-muted">{hint}</div>}
      </div>
    </div>
  );
}
